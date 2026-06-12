export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Tabela<T extends Record<string, unknown>> = {
  Row: T
  Insert: Partial<T> & Record<string, unknown>
  Update: Partial<T>
}

export interface Database {
  public: {
    Tables: {
      Perfil: Tabela<{
        id: string
        nomeCompleto: string
        papel: string
        ativo: boolean
        criadoEm: string
        atualizadoEm: string
      }>
      ImpressoraConfiguracao: Tabela<{
        id: string
        nome: string
        modelo: string | null
        consumoKwh: number
        precoKwh: number
        valorMaquina: number
        vidaUtilHoras: number
        margemMultiplicador: number
        taxaFalha: number
        taxaMarketplace: number
        custoEmbalagem: number
        custoFrete: number
        custoAcabamento: number
        outrosFixos: number
        ativo: boolean
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      SistemaConfiguracao: Tabela<{
        id: number
        validadeOrcamentoDias: number
        templateMargemMultiplicador: number
        templateTaxaFalha: number
        templateTaxaMarketplace: number
        templateCustoEmbalagem: number
        templateCustoFrete: number
        templateCustoAcabamento: number
        templateOutrosFixos: number
        atualizadoEm: string
        atualizadoPor: string | null
      }>
      Cliente: Tabela<{
        id: string
        nome: string
        telefone: string | null
        email: string | null
        documento: string | null
        endereco: string | null
        observacoes: string | null
        ativo: boolean
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      OrcamentoStatus: Tabela<{
        id: string
        codigo: string
        nome: string
        ordem: number
        cor: string | null
        ativo: boolean
        travaEdicao: boolean
        reservaEstoque: boolean
        baixaEstoque: boolean
        liberaReserva: boolean
      }>
      SecaoLanding: Tabela<{
        id: string
        slug: string
        titulo: string
        conteudo: Json
        publicado: boolean
        ordem: number
        atualizadoEm: string
        atualizadoPor: string | null
      }>
      PortfolioItem: Tabela<{
        id: string
        titulo: string
        descricao: string | null
        urlImagem: string
        publicado: boolean
        ordem: number
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      Orcamento: Tabela<{
        id: string
        numeroSequencial: number
        clienteId: string
        statusOrcamentoId: string
        configuracaoImpressoraId: string | null
        travado: boolean
        validoAte: string | null
        observacoes: string | null
        custoSubtotal: number
        precoTotal: number
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      Filamento: Tabela<{
        id: string
        nome: string
        tipoMaterial: string
        cor: string | null
        marca: string | null
        pesoRoloG: number
        estoqueGramas: number
        estoqueReservadoGramas: number
        estoqueMinimoG: number
        custoMedioPorKg: number
        ativo: boolean
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      Material: Tabela<{
        id: string
        nome: string
        descricao: string | null
        categoria: string
        unidadeMedida: string
        estoqueAtual: number
        estoqueReservado: number
        estoqueMinimo: number
        custoMedioUnitario: number
        tipoMaterial: string | null
        cor: string | null
        marca: string | null
        ativo: boolean
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      EstoqueMovimentacao: Tabela<{
        id: string
        filamentoId: string | null
        materialId: string | null
        tipoMovimentacaoId: string
        quantidadeG: number
        quantidade: number | null
        valorTotal: number | null
        fornecedor: string | null
        dataMovimentacao: string | null
        orcamentoId: string | null
        compraFilamentoId: string | null
        observacoes: string | null
        criadoEm: string
        criadoPor: string | null
      }>
      EstoqueTipoMovimentacao: Tabela<{
        id: string
        codigo: string
        nome: string
        ativo: boolean
      }>
      OrcamentoItem: Tabela<{
        id: string
        orcamentoId: string
        produtoId: string | null
        nomePeca: string
        tempoHoras: number
        tempoMinutos: number
        quantidade: number
        pesoTotalG: number
        observacoes: string | null
        custoMaterial: number
        custoEnergia: number
        custoDepreciacao: number
        precoUnitario: number
        precoTotal: number
        detalheCustos: Json
        ordem: number
        criadoEm: string
      }>
      OrcamentoItemMaterial: Tabela<{
        id: string
        itemOrcamentoId: string
        materialId: string | null
        tipo: string | null
        cor: string | null
        quantidade: number
        precoUnitario: number
        custoUnitario: number
        ordem: number
      }>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type ImpressoraConfiguracao = Database['public']['Tables']['ImpressoraConfiguracao']['Row']
export type Cliente = Database['public']['Tables']['Cliente']['Row']
export type OrcamentoStatus = Database['public']['Tables']['OrcamentoStatus']['Row']
export type SecaoLanding = Database['public']['Tables']['SecaoLanding']['Row']
export type PortfolioItem = Database['public']['Tables']['PortfolioItem']['Row']
export type Orcamento = Database['public']['Tables']['Orcamento']['Row']
export type Filamento = Database['public']['Tables']['Filamento']['Row']
export type Material = Database['public']['Tables']['Material']['Row']
export type EstoqueMovimentacao = Database['public']['Tables']['EstoqueMovimentacao']['Row']
export type EstoqueTipoMovimentacao = Database['public']['Tables']['EstoqueTipoMovimentacao']['Row']
export type OrcamentoItem = Database['public']['Tables']['OrcamentoItem']['Row']
export type OrcamentoItemMaterial = Database['public']['Tables']['OrcamentoItemMaterial']['Row']
export type Perfil = Database['public']['Tables']['Perfil']['Row']
