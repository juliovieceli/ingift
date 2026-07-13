import type { PecaCalculo } from '@/lib/calculadora'

export type ErrosPecaOrcamento = Record<string, string>

export function validarPecaOrcamento(peca: PecaCalculo): ErrosPecaOrcamento {
  const erros: ErrosPecaOrcamento = {}

  if (!peca.nomePeca.trim()) {
    erros.nomePeca = 'Informe o nome da peça'
  }
  if (!peca.quantidade || peca.quantidade < 1) {
    erros.quantidade = 'Quantidade mínima é 1'
  }
  if (peca.filamentos.length === 0) {
    erros.filamentos = 'Adicione pelo menos um filamento'
  }
  peca.filamentos.forEach((fil, idx) => {
    if (!fil.materialId) {
      erros[`filamento.${idx}.materialId`] = 'Selecione o material de estoque'
    }
    if (!fil.pesoG || fil.pesoG <= 0) {
      erros[`filamento.${idx}.pesoG`] = 'Informe o peso em gramas'
    }
  })

  return erros
}

export function pecaVazia(): PecaCalculo {
  return {
    nomePeca: '',
    tempoHoras: 0,
    tempoMinutos: 0,
    quantidade: 1,
    observacoes: '',
    filamentos: [],
    insumos: [],
  }
}
