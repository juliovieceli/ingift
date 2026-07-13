-- Excluir movimentação de estoque manual com estorno financeiro e reversão de saldo

CREATE OR REPLACE FUNCTION public."excluirMovimentacaoEstoque"(
  p_movimentacaoId UUID,
  p_motivo         TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_mov          RECORD;
  v_codigo       TEXT;
  v_qtd          NUMERIC;
  v_tituloId     UUID;
  v_baixaId      UUID;
  v_somaQtd      NUMERIC;
  v_somaValor    NUMERIC;
BEGIN
  IF NOT public."ehAdmin"() THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT m.*, tm."codigo" AS "tipoCodigo"
  INTO v_mov
  FROM public."EstoqueMovimentacao" m
  JOIN public."EstoqueTipoMovimentacao" tm ON tm."id" = m."tipoMovimentacaoId"
  WHERE m."id" = p_movimentacaoId
  FOR UPDATE OF m;

  IF NOT FOUND THEN RAISE EXCEPTION 'Movimentação não encontrada'; END IF;

  v_codigo := v_mov."tipoCodigo";

  IF v_codigo NOT IN ('entrada_compra', 'entrada_manual', 'perda', 'ajuste_manual') THEN
    RAISE EXCEPTION 'Só é possível excluir movimentações manuais. Use a alteração de status do orçamento para reverter estoque vinculado.';
  END IF;

  IF v_mov."orcamentoId" IS NOT NULL THEN
    RAISE EXCEPTION 'Só é possível excluir movimentações manuais. Use a alteração de status do orçamento para reverter estoque vinculado.';
  END IF;

  -- Estornar financeiro vinculado (despesa de compra)
  SELECT t."id" INTO v_tituloId
  FROM public."FinanceiroTitulo" t
  WHERE t."movimentacaoEstoqueId" = p_movimentacaoId
  FOR UPDATE;

  IF v_tituloId IS NOT NULL THEN
    FOR v_baixaId IN
      SELECT b."id" FROM public."FinanceiroBaixa" b WHERE b."tituloId" = v_tituloId
    LOOP
      PERFORM public."estornarBaixaTitulo"(v_baixaId, p_motivo);
    END LOOP;

    PERFORM public."excluirTituloFinanceiro"(v_tituloId, p_motivo);
  END IF;

  v_qtd := COALESCE(v_mov."quantidade", v_mov."quantidadeG");
  IF v_qtd IS NULL OR v_qtd <= 0 THEN
    v_qtd := 0;
  END IF;

  IF v_mov."materialId" IS NOT NULL AND v_qtd > 0 THEN
    PERFORM 1 FROM public."Material" WHERE "id" = v_mov."materialId" FOR UPDATE;

    IF v_codigo IN ('entrada_compra', 'entrada_manual') THEN
      UPDATE public."Material"
      SET "estoqueAtual" = GREATEST(0, "estoqueAtual" - v_qtd)
      WHERE "id" = v_mov."materialId";

      IF v_mov."valorTotal" IS NOT NULL AND v_mov."valorTotal" >= 0 THEN
        SELECT
          COALESCE(SUM(COALESCE(m."quantidade", m."quantidadeG")), 0),
          COALESCE(SUM(m."valorTotal"), 0)
        INTO v_somaQtd, v_somaValor
        FROM public."EstoqueMovimentacao" m
        JOIN public."EstoqueTipoMovimentacao" tm ON tm."id" = m."tipoMovimentacaoId"
        WHERE m."materialId" = v_mov."materialId"
          AND m."id" <> p_movimentacaoId
          AND tm."codigo" IN ('entrada_compra', 'entrada_manual')
          AND m."valorTotal" IS NOT NULL
          AND m."valorTotal" >= 0
          AND COALESCE(m."quantidade", m."quantidadeG") > 0;

        UPDATE public."Material"
        SET "custoMedioUnitario" = CASE
          WHEN v_somaQtd > 0 THEN v_somaValor / v_somaQtd
          ELSE 0
        END
        WHERE "id" = v_mov."materialId";
      END IF;
    ELSIF v_codigo IN ('perda', 'ajuste_manual') THEN
      UPDATE public."Material"
      SET "estoqueAtual" = "estoqueAtual" + v_qtd
      WHERE "id" = v_mov."materialId";
    END IF;
  END IF;

  DELETE FROM public."EstoqueMovimentacao" WHERE "id" = p_movimentacaoId;
END;
$$;

GRANT EXECUTE ON FUNCTION public."excluirMovimentacaoEstoque"(UUID, TEXT) TO authenticated;
