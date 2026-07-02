import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { criarOrcamentoVazio } from '@/lib/orcamento'
import {
  type CampoDataOrcamentoFiltro,
  passaFiltroDataOrcamento,
  ROTULOS_CAMPO_DATA_ORCAMENTO,
} from '@/lib/orcamentoFiltroData'
import { Botao } from '@/componentes/ui/Botao'
import { CampoPesquisa } from '@/componentes/ui/CampoPesquisa'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { usePesquisa } from '@/hooks/usePesquisa'
import type { Orcamento } from '@/tipos/database'

type OrcamentoLista = Orcamento & {
  Cliente?: { nome: string }
  OrcamentoStatus?: { nome: string; codigo: string }
  OrcamentoItem?: { nomePeca: string; ordem: number }[]
}

function nomesPecas(o: OrcamentoLista) {
  return [...(o.OrcamentoItem ?? [])]
    .sort((a, b) => a.ordem - b.ordem)
    .map((i) => i.nomePeca)
    .join(', ')
}

export function PaginaOrcamentos() {
  const navigate = useNavigate()
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [erro, setErro] = useState('')
  const [campoData, setCampoData] = useState<CampoDataOrcamentoFiltro>('lancamento')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const orcamentos = useQuery({
    queryKey: ['orcamentos'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('Orcamento')
        .select('*, Cliente(nome), OrcamentoStatus(nome, codigo), OrcamentoItem(nomePeca, ordem)')
        .order('criadoEm', { ascending: false })
      return (data ?? []) as OrcamentoLista[]
    },
  })

  const clientes = useQuery({
    queryKey: ['clientes'],
    enabled: modalNovo,
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('Cliente').select('id, nome').eq('ativo', true).order('nome')
      return (data ?? []) as { id: string; nome: string }[]
    },
  })

  const criar = useMutation({
    mutationFn: async () => {
      if (!supabase || !clienteId) throw new Error('Selecione um cliente')
      return criarOrcamentoVazio(supabase, clienteId)
    },
    onSuccess: (orcId) => {
      setModalNovo(false)
      setClienteId('')
      navigate(`/admin/orcamentos/${orcId}`)
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao criar orçamento'),
  })

  const extrairTexto = useCallback((o: OrcamentoLista) => {
    const parts = [
      `#${o.numeroSequencial}`,
      o.Cliente?.nome ?? '',
      o.OrcamentoStatus?.nome ?? '',
      new Date(o.criadoEm).toLocaleDateString('pt-BR'),
      o.validoAte ? new Date(o.validoAte).toLocaleDateString('pt-BR') : '',
      o.prazoEntrega ? new Date(o.prazoEntrega + 'T12:00:00').toLocaleDateString('pt-BR') : '',
      nomesPecas(o),
    ]
    return parts.join(' ')
  }, [])

  const { termo, setTermo, filtrados } = usePesquisa(orcamentos.data ?? [], extrairTexto, 200)

  const filtradosPorData = useMemo(
    () => filtrados.filter((o) => passaFiltroDataOrcamento(o, campoData, dataInicio, dataFim)),
    [filtrados, campoData, dataInicio, dataFim],
  )

  const tabela = useOrdenacaoPaginacao(filtradosPorData, 'criadoEm', 'desc')

  const limparFiltroData = () => {
    setDataInicio('')
    setDataFim('')
  }

  const dadosComSort = useMemo(() => {
    return tabela.dadosPaginados.map((o) => ({
      ...o,
      criadoEmSort: new Date(o.criadoEm).getTime(),
      numeroSequencial: o.numeroSequencial,
    }))
  }, [tabela.dadosPaginados])

  const irDetalhe = useCallback((o: OrcamentoLista) => {
    navigate(`/admin/orcamentos/${o.id}`)
  }, [navigate])

  const renderCardOrcamento = useCallback((o: OrcamentoLista) => (
    <button
      type="button"
      onClick={() => irDetalhe(o)}
      className="w-full rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-4 text-left transition hover:bg-[var(--superficie-elevada)]/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-[var(--texto-muted)]">#{o.numeroSequencial}</p>
          <p className="font-medium text-[var(--texto)]">{o.Cliente?.nome ?? '—'}</p>
          {nomesPecas(o) && (
            <p className="mt-0.5 truncate text-xs text-[var(--texto-muted)]">{nomesPecas(o)}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-secondary-500/15 px-2 py-0.5 text-xs text-secondary-700 dark:text-secondary-300">
          {o.OrcamentoStatus?.nome ?? '—'}
        </span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <div className="text-sm text-[var(--texto-muted)]">
          <p>{new Date(o.criadoEm).toLocaleDateString('pt-BR')}</p>
          {o.prazoEntrega && (
            <p className="text-xs">Entrega {new Date(o.prazoEntrega + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
          )}
          {o.validoAte && (
            <p className="text-xs">Válido até {new Date(o.validoAte).toLocaleDateString('pt-BR')}</p>
          )}
        </div>
        <p className="text-lg font-bold text-sucesso">{formatarMoeda(Number(o.precoTotal))}</p>
      </div>
    </button>
  ), [irDetalhe])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--texto)]">Orçamentos</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Botao className="w-full sm:w-auto" onClick={() => { setErro(''); setModalNovo(true) }}>Novo orçamento</Botao>
          <Link to="/admin/orcamentos/modelos" className="w-full sm:w-auto">
            <Botao type="button" variante="fantasma" className="w-full">Modelos de peça</Botao>
          </Link>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm lg:min-w-[220px]">
            <span className="text-[var(--texto-secundario)]">Pesquisar</span>
            <CampoPesquisa
              valor={termo}
              onChange={setTermo}
              placeholder="Por #, cliente, status ou data..."
              className="w-full max-w-none"
            />
          </label>
          <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-sm lg:max-w-[220px]">
            <span className="text-[var(--texto-secundario)]">Filtrar por</span>
            <select
              value={campoData}
              onChange={(e) => setCampoData(e.target.value as CampoDataOrcamentoFiltro)}
              className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2 text-[var(--texto)]"
            >
              {(Object.entries(ROTULOS_CAMPO_DATA_ORCAMENTO) as [CampoDataOrcamentoFiltro, string][]).map(
                ([valor, rotulo]) => (
                  <option key={valor} value={valor}>{rotulo}</option>
                ),
              )}
            </select>
          </label>
          <Input
            rotulo="Data início"
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="sm:w-40"
          />
          <Input
            rotulo="Data fim"
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="sm:w-40"
          />
          {(termo || dataInicio || dataFim) && (
            <Botao
              type="button"
              variante="fantasma"
              onClick={() => { setTermo(''); limparFiltroData() }}
              className="sm:mb-0.5"
            >
              Limpar filtros
            </Botao>
          )}
        </div>
      </div>

      <div className="mt-6">
        <TabelaDados
          idTabela="orcamentos-lista"
          colunasPadraoMobile={['numeroSequencial', 'cliente', 'precoTotal', 'status', 'acoes']}
          renderCard={renderCardOrcamento}
          colunas={[
            { id: 'numeroSequencial', rotulo: '#', ordenavel: true, obrigatoria: true, render: (o) => `#${o.numeroSequencial}` },
            { id: 'cliente', rotulo: 'Cliente', ordenavel: true, obrigatoria: true, render: (o) => o.Cliente?.nome ?? '—' },
            {
              id: 'pecas',
              rotulo: 'Peças',
              render: (o) => (
                <span className="line-clamp-1 max-w-[220px] text-[var(--texto-secundario)]" title={nomesPecas(o)}>
                  {nomesPecas(o) || '—'}
                </span>
              ),
            },
            {
              id: 'status',
              rotulo: 'Status',
              render: (o) => (
                <span className="rounded-full bg-secondary-500/15 px-2 py-0.5 text-xs text-secondary-700 dark:text-secondary-300">
                  {o.OrcamentoStatus?.nome ?? '—'}
                </span>
              ),
            },
            {
              id: 'precoTotal',
              rotulo: 'Total',
              ordenavel: true,
              render: (o) => <span className="font-medium">{formatarMoeda(Number(o.precoTotal))}</span>,
            },
            {
              id: 'prazoEntrega',
              rotulo: 'Previsão entrega',
              render: (o) => o.prazoEntrega
                ? new Date(o.prazoEntrega + 'T12:00:00').toLocaleDateString('pt-BR')
                : '—',
            },
            {
              id: 'validoAte',
              rotulo: 'Válido até',
              render: (o) => o.validoAte ? new Date(o.validoAte).toLocaleDateString('pt-BR') : '—',
            },
            {
              id: 'criadoEmSort',
              rotulo: 'Data',
              ordenavel: true,
              render: (o) => new Date(o.criadoEm).toLocaleDateString('pt-BR'),
            },
            {
              id: 'acoes',
              rotulo: '',
              obrigatoria: true,
              ocultavel: false,
              exibirNoCard: false,
              render: (o) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); irDetalhe(o) }}
                  className="inline-flex min-h-8 items-center text-sm text-secondary-600 hover:underline"
                >
                  Abrir
                </button>
              ),
            },
          ]}
          dados={dadosComSort}
          chave={(o) => o.id}
          ordenacao={tabela.ordenacao}
          onOrdenar={tabela.alternarOrdenacao}
          onLinhaClick={irDetalhe}
          pagina={tabela.pagina}
          totalPaginas={tabela.totalPaginas}
          totalItens={tabela.totalItens}
          itensPorPagina={tabela.itensPorPagina}
          onPagina={tabela.irParaPagina}
          onItensPorPagina={tabela.setItensPorPagina}
          vazio="Nenhum orçamento encontrado. Crie o primeiro orçamento."
        />
      </div>

      <Modal aberto={modalNovo} onFechar={() => setModalNovo(false)} titulo="Novo orçamento" largura="md">
        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-[var(--texto-secundario)]">Cliente *</span>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
            >
              <option value="">Selecionar...</option>
              {clientes.data?.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </label>
          {erro && <p className="text-sm text-erro">{erro}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao type="button" variante="fantasma" onClick={() => setModalNovo(false)}>Cancelar</Botao>
            <Botao type="button" onClick={() => criar.mutate()} disabled={criar.isPending || !clienteId}>
              {criar.isPending ? 'Criando...' : 'Criar orçamento'}
            </Botao>
          </div>
        </div>
      </Modal>
    </div>
  )
}
