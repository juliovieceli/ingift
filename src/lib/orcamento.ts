import type { SupabaseClient } from '@supabase/supabase-js'

export async function recalcularTotaisOrcamento(
  supabase: SupabaseClient,
  orcamentoId: string,
) {
  const { data: itens } = await supabase
    .from('OrcamentoItem')
    .select('custoMaterial, custoEnergia, custoDepreciacao, precoTotal')
    .eq('orcamentoId', orcamentoId)

  const lista = itens ?? []
  const custoSubtotal = lista.reduce(
    (s, i) => s + Number(i.custoMaterial) + Number(i.custoEnergia) + Number(i.custoDepreciacao),
    0,
  )
  const precoTotal = lista.reduce((s, i) => s + Number(i.precoTotal), 0)

  await supabase
    .from('Orcamento')
    .update({ custoSubtotal, precoTotal })
    .eq('id', orcamentoId)

  return { custoSubtotal, precoTotal }
}

export async function salvarOrcamentoItem(
  supabase: SupabaseClient,
  orcamentoId: string,
  peca: import('@/lib/calculadora').PecaCalculo,
  resultado: import('@/lib/calculadora').ResultadoPeca,
  ordem: number,
) {
  const { data: item, error: errItem } = await supabase
    .from('OrcamentoItem')
    .insert({
      orcamentoId,
      nomePeca: peca.nomePeca,
      tempoHoras: peca.tempoHoras,
      tempoMinutos: peca.tempoMinutos,
      quantidade: peca.quantidade,
      pesoTotalG: resultado.pesoTotalG,
      observacoes: peca.observacoes || null,
      custoMaterial: resultado.custoMaterial,
      custoEnergia: resultado.custoEnergia,
      custoDepreciacao: resultado.custoDepreciacao,
      precoUnitario: resultado.precoUnitario,
      precoTotal: resultado.precoTotal,
      detalheCustos: resultado,
      ordem,
    })
    .select('id')
    .single()

  if (errItem || !item) throw errItem ?? new Error('Falha ao criar item')

  const itemId = (item as { id: string }).id

  for (const [idx, fil] of peca.filamentos.entries()) {
    const custo = resultado.custosFilamentos[idx]?.custo ?? 0
    await supabase.from('OrcamentoItemFilamento').insert({
      itemOrcamentoId: itemId,
      filamentoId: fil.materialId || null,
      tipo: fil.tipo,
      cor: fil.cor || null,
      precoPorKg: fil.precoPorKg,
      pesoG: fil.pesoG,
      custoUnitario: custo,
      ordem: idx,
    })
    if (fil.materialId) {
      try {
        await supabase.from('OrcamentoItemMaterial').insert({
          itemOrcamentoId: itemId,
          materialId: fil.materialId,
          tipo: fil.tipo,
          cor: fil.cor || null,
          quantidade: fil.pesoG,
          precoUnitario: fil.precoPorKg / 1000,
          custoUnitario: custo,
          ordem: idx,
        })
      } catch {
        /* tabela pode não existir antes da migration */
      }
    }
  }

  for (const [idx, ins] of (peca.insumos ?? []).entries()) {
    if (!ins.materialId) continue
    try {
      await supabase.from('OrcamentoItemMaterial').insert({
        itemOrcamentoId: itemId,
        materialId: ins.materialId,
        tipo: ins.nome,
        quantidade: ins.quantidade,
        precoUnitario: ins.custoUnitario,
        custoUnitario: ins.quantidade * ins.custoUnitario,
        ordem: peca.filamentos.length + idx,
      })
    } catch {
      /* tabela pode não existir antes da migration */
    }
  }

  await recalcularTotaisOrcamento(supabase, orcamentoId)
}
