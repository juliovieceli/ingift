import { describe, expect, it } from 'vitest'
import {
  aplicarModeloComEscolha,
  compararModeloComPrecosAtuais,
  type ItemOrcamentoModeloComComposicao,
} from './itemOrcamentoModelo'
import type { ImpressoraConfiguracao, Material } from '@/tipos/database'

const modeloBase: ItemOrcamentoModeloComComposicao = {
  id: 'mod-1',
  nome: 'Chaveiro PLA',
  nomePeca: 'Chaveiro',
  tempoHoras: 1,
  tempoMinutos: 30,
  quantidade: 2,
  observacoes: null,
  configuracaoImpressoraId: 'imp-1',
  consumoKwh: 0.15,
  precoKwh: 0.85,
  valorMaquina: 3500,
  vidaUtilHoras: 5000,
  taxaFalha: 0.15,
  margemMultiplicador: 2.5,
  taxaMarketplace: 0,
  adicional: 0,
  desconto: 0,
  ativo: true,
  criadoEm: '2026-01-01',
  atualizadoEm: '2026-01-01',
  criadoPor: null,
  atualizadoPor: null,
  ItemOrcamentoModeloComposicao: [
    {
      id: 'c1',
      modeloItemId: 'mod-1',
      materialId: 'mat-fil',
      categoria: 'filamento',
      descricao: 'PLA Preto',
      tipo: 'PLA',
      cor: 'Preto',
      quantidade: 15,
      unidadeMedida: 'gr',
      custoUnitario: 0.08,
      pesoG: 15,
      ordem: 0,
    },
    {
      id: 'c2',
      modeloItemId: 'mod-1',
      materialId: 'mat-ins',
      categoria: 'insumo',
      descricao: 'Ímã',
      tipo: 'Ímã',
      cor: null,
      quantidade: 1,
      unidadeMedida: 'un',
      custoUnitario: 2,
      pesoG: null,
      ordem: 1,
    },
  ],
}

const materiais: Material[] = [
  {
    id: 'mat-fil',
    nome: 'PLA Preto',
    descricao: null,
    categoria: 'filamento',
    unidadeMedida: 'kg',
    estoqueAtual: 1000,
    estoqueReservado: 0,
    estoqueMinimo: 0,
    custoMedioUnitario: 0.09,
    tipoMaterial: 'PLA',
    cor: 'Preto',
    marca: null,
    ativo: true,
    criadoEm: '',
    atualizadoEm: '',
    criadoPor: null,
    atualizadoPor: null,
  },
  {
    id: 'mat-ins',
    nome: 'Ímã 10mm',
    descricao: null,
    categoria: 'insumo',
    unidadeMedida: 'un',
    estoqueAtual: 50,
    estoqueReservado: 0,
    estoqueMinimo: 0,
    custoMedioUnitario: 2.5,
    tipoMaterial: null,
    cor: null,
    marca: null,
    ativo: true,
    criadoEm: '',
    atualizadoEm: '',
    criadoPor: null,
    atualizadoPor: null,
  },
]

const impressoraAtual: ImpressoraConfiguracao = {
  id: 'imp-1',
  nome: 'Bambu',
  modelo: null,
  consumoKwh: 0.2,
  precoKwh: 0.9,
  valorMaquina: 4000,
  vidaUtilHoras: 6000,
  margemMultiplicador: 3,
  taxaFalha: 0.1,
  taxaMarketplace: 0.05,
  ativo: true,
  criadoEm: '',
  atualizadoEm: '',
  criadoPor: null,
  atualizadoPor: null,
}

describe('compararModeloComPrecosAtuais', () => {
  it('detecta divergência de material e impressora', () => {
    const divs = compararModeloComPrecosAtuais(modeloBase, materiais, impressoraAtual)
    const tipos = divs.map((d) => d.tipo)
    expect(tipos).toContain('filamento')
    expect(tipos).toContain('insumo')
    expect(tipos).toContain('impressora')
    expect(tipos).toContain('margem')
  })

  it('não reporta divergência quando valores coincidem', () => {
    const modeloAtual = {
      ...modeloBase,
      consumoKwh: impressoraAtual.consumoKwh,
      precoKwh: impressoraAtual.precoKwh,
      valorMaquina: impressoraAtual.valorMaquina,
      vidaUtilHoras: impressoraAtual.vidaUtilHoras,
      taxaFalha: impressoraAtual.taxaFalha,
      margemMultiplicador: impressoraAtual.margemMultiplicador,
      taxaMarketplace: impressoraAtual.taxaMarketplace,
      ItemOrcamentoModeloComposicao: [
        { ...modeloBase.ItemOrcamentoModeloComposicao![0], custoUnitario: 0.09 },
        { ...modeloBase.ItemOrcamentoModeloComposicao![1], custoUnitario: 2.5 },
      ],
    }
    const divs = compararModeloComPrecosAtuais(modeloAtual, materiais, impressoraAtual)
    expect(divs).toHaveLength(0)
  })

  it('reporta material ausente', () => {
    const divs = compararModeloComPrecosAtuais(modeloBase, [], impressoraAtual)
    expect(divs.some((d) => d.tipo === 'material_ausente')).toBe(true)
  })
})

describe('aplicarModeloComEscolha', () => {
  it('mantém snapshot do modelo', () => {
    const r = aplicarModeloComEscolha(modeloBase, 'modelo', materiais, impressoraAtual)
    expect(r.peca.filamentos[0].precoPorKg).toBe(80)
    expect(r.config.consumoKwh).toBe(0.15)
    expect(r.params.margemMultiplicador).toBe(2.5)
  })

  it('atualiza preços com escolha atuais', () => {
    const r = aplicarModeloComEscolha(modeloBase, 'atuais', materiais, impressoraAtual)
    expect(r.peca.filamentos[0].precoPorKg).toBe(90)
    expect(r.peca.insumos[0].custoUnitario).toBe(2.5)
    expect(r.config.consumoKwh).toBe(0.2)
    expect(r.params.margemMultiplicador).toBe(3)
    expect(r.params.adicional).toBe(0)
  })
})
