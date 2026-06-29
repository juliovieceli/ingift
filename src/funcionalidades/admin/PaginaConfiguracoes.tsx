import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { Card, TituloCard } from '@/componentes/ui/Card'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalConfigSistema } from '@/funcionalidades/admin/modais/ModalConfigSistema'
import { ModalStatusOrcamento } from '@/funcionalidades/admin/modais/ModalStatusOrcamento'
import type { Database, OrcamentoStatus } from '@/tipos/database'

type ConfigSistema = Database['public']['Tables']['SistemaConfiguracao']['Row']

export function PaginaConfiguracoes() {
  const qc = useQueryClient()
  const [modalStatus, setModalStatus] = useState<{ aberto: boolean; status: OrcamentoStatus | null }>({
    aberto: false,
    status: null,
  })
  const [modalSistema, setModalSistema] = useState(false)

  const status = useQuery({
    queryKey: ['status-orcamento'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('OrcamentoStatus').select('*').order('ordem')
      return (data ?? []) as OrcamentoStatus[]
    },
  })

  const sistema = useQuery({
    queryKey: ['config-sistema'],
    queryFn: async () => {
      if (!supabase) return null
      const { data } = await supabase.from('SistemaConfiguracao').select('*').eq('id', 1).single()
      return data as ConfigSistema | null
    },
  })

  const dados = status.data ?? []
  const tabela = useOrdenacaoPaginacao(dados, 'ordem', 'asc')

  const abrirEditarStatus = useCallback((s: OrcamentoStatus) => {
    setModalStatus({ aberto: true, status: s })
  }, [])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--texto)]">Configurações</h2>

      <Card className="flex items-center justify-between">
        <div>
          <TituloCard>Sistema</TituloCard>
          <p className="text-sm text-[var(--texto-secundario)]">
            Validade padrão de orçamentos:{' '}
            <strong>{sistema.data?.validadeOrcamentoDias ?? 15} dias</strong>
          </p>
        </div>
        <Botao variante="fantasma" onClick={() => setModalSistema(true)}>Editar</Botao>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--texto)]">Status de orçamento</h3>
            <p className="text-sm text-[var(--texto-muted)]">
              Flags controlam reserva, baixa e travamento.
            </p>
          </div>
          <Botao onClick={() => setModalStatus({ aberto: true, status: null })}>Novo status</Botao>
        </div>

        <TabelaDados
          idTabela="config-status-orcamento"
          colunasPadraoMobile={['ordem', 'nome', 'ativo', 'acoes']}
          colunas={[
            { id: 'ordem', rotulo: 'Ordem', ordenavel: true },
            { id: 'nome', rotulo: 'Nome', ordenavel: true },
            { id: 'codigo', rotulo: 'Código', render: (s) => <span className="font-mono text-xs">{s.codigo}</span> },
            { id: 'reservaEstoque', rotulo: 'Reserva', render: (s) => (s.reservaEstoque ? '✓' : '—') },
            { id: 'baixaEstoque', rotulo: 'Baixa', render: (s) => (s.baixaEstoque ? '✓' : '—') },
            { id: 'travaEdicao', rotulo: 'Trava', render: (s) => (s.travaEdicao ? '✓' : '—') },
            { id: 'ativo', rotulo: 'Ativo', render: (s) => (s.ativo ? 'Sim' : 'Não') },
            {
              id: 'acoes',
              rotulo: '',
              render: (s) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); abrirEditarStatus(s) }}
                  className="text-sm text-secondary-600 hover:underline"
                >
                  Editar
                </button>
              ),
            },
          ]}
          dados={tabela.dadosPaginados}
          chave={(s) => s.id}
          ordenacao={tabela.ordenacao}
          onOrdenar={tabela.alternarOrdenacao}
          onLinhaClick={abrirEditarStatus}
          pagina={tabela.pagina}
          totalPaginas={tabela.totalPaginas}
          totalItens={tabela.totalItens}
          itensPorPagina={tabela.itensPorPagina}
          onPagina={tabela.irParaPagina}
          onItensPorPagina={tabela.setItensPorPagina}
        />
      </div>

      <ModalStatusOrcamento
        aberto={modalStatus.aberto}
        status={modalStatus.status}
        onFechar={() => setModalStatus({ aberto: false, status: null })}
        onSalvo={() => qc.invalidateQueries({ queryKey: ['status-orcamento'] })}
      />

      <ModalConfigSistema
        aberto={modalSistema}
        config={sistema.data ?? null}
        onFechar={() => setModalSistema(false)}
        onSalvo={() => qc.invalidateQueries({ queryKey: ['config-sistema'] })}
      />
    </div>
  )
}
