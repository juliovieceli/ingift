-- =============================================================================
-- PASSO 3/3 — Recalcula o preço de venda dos itens importados e o total do
-- orçamento, reproduzindo em SQL a mesma fórmula de
-- src/lib/calculadora.ts (aplicarPrecificacaoItem).
--
-- Por quê: o PASSO 2 só importou os CUSTOS dos itens legados — a calculadora
-- antiga guardava apenas o preço sugerido do ORÇAMENTO, não um preço por
-- item. Por isso "OrcamentoItem.precoFinal" ficou 0 até o item ser reaberto
-- e salvo manualmente na tela (o que já recalcula certo). Este script faz
-- esse recálculo em massa, sem precisar abrir item por item.
--
-- Seguro para rodar mais de uma vez (idempotente) e seguro para rodar contra
-- toda a base: só afeta itens com "precoFinal" = 0 e custo de produção > 0,
-- que é sempre um estado "ainda não calculado" (nunca um preço legítimo).
-- =============================================================================

BEGIN;

WITH calc AS (
  SELECT
    io."id",
    io."custoProducaoTotal" AS custo_producao,
    GREATEST(1, io."quantidade") AS qtd,
    io."aplicarMargem" AS aplica_margem,
    io."margemMultiplicador" AS margem_multiplicador,
    io."adicional" AS adicional,
    io."desconto" AS desconto,
    LEAST(GREATEST(COALESCE(io."taxaMarketplace", 0), 0), 0.95) AS taxa,
    (CASE
       WHEN NOT io."aplicarMargem" THEN io."custoProducaoTotal"
       WHEN io."tipoItem" = 'peca' THEN io."custoProducaoTotal" * (1 + io."taxaFalha")
       ELSE io."custoProducaoTotal"
     END) AS custo_apos_falha
  FROM public."OrcamentoItem" io
  WHERE io."precoFinal" = 0 AND io."custoProducaoTotal" > 0
),
calc2 AS (
  SELECT
    id, custo_producao, qtd, aplica_margem, adicional, desconto, taxa, custo_apos_falha,
    (CASE WHEN aplica_margem THEN custo_apos_falha * margem_multiplicador ELSE custo_apos_falha END) AS preco_com_margem
  FROM calc
),
calc3 AS (
  SELECT
    id, custo_producao, qtd, aplica_margem, desconto, taxa, custo_apos_falha, preco_com_margem,
    (CASE WHEN aplica_margem THEN preco_com_margem + adicional ELSE preco_com_margem END) AS preco_antes_taxa
  FROM calc2
),
calc4 AS (
  SELECT
    id, custo_producao, qtd, aplica_margem, desconto, custo_apos_falha,
    (CASE WHEN aplica_margem AND taxa > 0 THEN preco_antes_taxa / (1 - taxa) ELSE preco_antes_taxa END) AS preco_venda
  FROM calc3
),
resultado AS (
  SELECT
    id, custo_producao, qtd, custo_apos_falha, preco_venda,
    (CASE WHEN aplica_margem THEN GREATEST(0, preco_venda - desconto) ELSE preco_venda END) AS preco_final
  FROM calc4
)
UPDATE public."OrcamentoItem" io
SET
  "custoAposFalha" = r.custo_apos_falha,
  "precoVenda"     = r.preco_venda,
  "precoFinal"     = r.preco_final,
  "precoTotal"     = r.preco_final,
  "precoUnitario"  = r.preco_final / r.qtd,
  "lucroEfetivo"   = r.preco_final - r.custo_producao,
  "margemEfetiva"  = CASE WHEN r.custo_producao > 0 THEN (r.preco_final - r.custo_producao) / r.custo_producao ELSE 0 END
FROM resultado r
WHERE io."id" = r.id;

-- Recalcula os totais do orçamento (mesma lógica de recalcularTotaisOrcamento
-- em src/lib/orcamento.ts) para todo orçamento que tenha itens.
WITH totais AS (
  SELECT
    io."orcamentoId" AS id,
    SUM(io."custoProducaoTotal") AS custo_subtotal,
    SUM(COALESCE(io."precoFinal", io."precoTotal")) AS preco_total
  FROM public."OrcamentoItem" io
  GROUP BY io."orcamentoId"
)
UPDATE public."Orcamento" o
SET
  "custoSubtotal" = t.custo_subtotal,
  "precoTotal"    = t.preco_total
FROM totais t
WHERE o."id" = t.id;

COMMIT;
