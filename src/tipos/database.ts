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
        faturado: boolean
        validoAte: string | null
        prazoEntrega: string | null
        origem: string
        idExterno: string | null
        observacoes: string | null
        custoSubtotal: number
        precoTotal: number
        criadoEm: string
        atualizadoEm: string
        criadoPor: string | null
        atualizadoPor: string | null
      }>
      FinanceiroPlanoConta: Tabela<{
        id: string
        codigo: string
        nome: string
        tipo: 'receita' | 'despesa'
        paiId: string | null
        ordem: number
        ativo: boolean
        criadoEm: string
        criadoPor: string | null
      }>
      FinanceiroContaCaixa: Tabela<{
        id: string
        nome: string
        tipo: 'caixa' | 'banco' | 'pix' | 'outro'
        saldoAtual: number
        ativo: boolean
        criadoEm: string
        criadoPor: string | null
      }>
      FinanceiroTitulo: Tabela<{
        id: string
        tipo: 'receita' | 'despesa'
        planoContaId: string
        valor: number
        valorBaixado: number
        status: 'pendente' | 'parcial' | 'quitado'
        dataEmissao: string
        dataVencimento: string
        descricao: string
        clienteId: string | null
        orcamentoId: string | null
        movimentacaoEstoqueId: string | null
        fornecedor: string | null
        observacoes: string | null
        criadoEm: string
        criadoPor: string | null
      }>
      FinanceiroBaixa: Tabela<{
        id: string
        tituloId: string
        contaCaixaId: string
        valor: number
        dataBaixa: string
        observacoes: string | null
        criadoEm: string
        criadoPor: string | null
      }>
      FinanceiroLogOperacao: Tabela<{
        id: string
        operacao: 'estorno_baixa' | 'exclusao_titulo'
        tituloId: string | null
        orcamentoId: string | null
        snapshots: Json
        motivo: string | null
        executadoPor: string | null
        executadoEm: string
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
        materialId: string | null
        tipoMovimentacaoId: string
        quantidade: number | null
        quantidadeG: number | null
        valorTotal: number | null
        fornecedor: string | null
        dataMovimentacao: string | null
        orcamentoId: string | null
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
        tipoItem: string
        aplicarMargem: boolean
        nomePeca: string
        tempoHoras: number
        tempoMinutos: number
        quantidade: number
        pesoTotalG: number
        observacoes: string | null
        materialId: string | null
        custoUnitario: number
        consumoKwh: number
        precoKwh: number
        valorMaquina: number
        vidaUtilHoras: number
        taxaFalha: number
        margemMultiplicador: number
        taxaMarketplace: number
        adicional: number
        desconto: number
        custoMaterial: number
        custoEnergia: number
        custoDepreciacao: number
        custoProducaoTotal: number
        custoAposFalha: number
        precoUnitario: number
        precoTotal: number
        precoVenda: number
        precoFinal: number
        lucroEfetivo: number
        margemEfetiva: number
        idExterno: string | null
        ordem: number
        criadoEm: string
      }>
      OrcamentoItemComposicao: Tabela<{
        id: string
        itemOrcamentoId: string
        materialId: string
        categoria: string
        descricao: string | null
        tipo: string | null
        cor: string | null
        quantidade: number
        unidadeMedida: string
        custoUnitario: number
        custoTotal: number
        pesoG: number | null
        ordem: number
      }>
      OrcamentoHistoricoStatus: Tabela<{
        id: string
        orcamentoId: string
        statusAnteriorId: string | null
        statusNovoId: string
        observacoes: string | null
        alteradoEm: string
        alteradoPor: string | null
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
export type Material = Database['public']['Tables']['Material']['Row']
export type EstoqueMovimentacao = Database['public']['Tables']['EstoqueMovimentacao']['Row']
export type EstoqueTipoMovimentacao = Database['public']['Tables']['EstoqueTipoMovimentacao']['Row']
export type OrcamentoItem = Database['public']['Tables']['OrcamentoItem']['Row']
export type OrcamentoItemComposicao = Database['public']['Tables']['OrcamentoItemComposicao']['Row']
export type OrcamentoHistoricoStatus = Database['public']['Tables']['OrcamentoHistoricoStatus']['Row']
export type Perfil = Database['public']['Tables']['Perfil']['Row']
export type FinanceiroPlanoConta = Database['public']['Tables']['FinanceiroPlanoConta']['Row']
export type FinanceiroContaCaixa = Database['public']['Tables']['FinanceiroContaCaixa']['Row']
export type FinanceiroTitulo = Database['public']['Tables']['FinanceiroTitulo']['Row']
export type FinanceiroBaixa = Database['public']['Tables']['FinanceiroBaixa']['Row']
export type FinanceiroLogOperacao = Database['public']['Tables']['FinanceiroLogOperacao']['Row']
