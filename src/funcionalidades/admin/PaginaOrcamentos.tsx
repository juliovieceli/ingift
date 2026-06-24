import { useCallback, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { criarOrcamentoVazio } from '@/lib/orcamento'
import { Botao } from '@/componentes/ui/Botao'
import { CampoPesquisa } from '@/componentes/ui/CampoPesquisa'
import { Modal } from '@/componentes/ui/Modal'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { usePesquisa } from '@/hooks/usePesquisa'
import type { Orcamento } from '@/tipos/database'

type OrcamentoLista = Orcamento & {
  Cliente?: { nome: string }
  OrcamentoStatus?: { nome: string; codigo: string }
}

export function PaginaOrcamentos() {
  const navigate = useNavigate()
  const [modalNovo, setModalNovo] = useState(false)
  const [clienteId, setClienteId] = useState('')
  const [erro, setErro] = useState('')

  const orcamentos = useQuery({
    queryKey: ['orcamentos'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase
        .from('Orcamento')
        .select('*, Cliente(nome), OrcamentoStatus(nome, codigo)')
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
    ]
    return parts.join(' ')
  }, [])

  const { termo, setTermo, filtrados } = usePesquisa(orcamentos.data ?? [], extrairTexto, 200)
  const tabela = useOrdenacaoPaginacao(filtrados, 'criadoEm', 'desc')

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

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-[var(--texto)]">Orçamentos</h2>
        <Botao onClick={() => { setErro(''); setModalNovo(true) }}>Novo orçamento</Botao>
      </div>

      <div className="mt-4">
        <CampoPesquisa
          valor={termo}
          onChange={setTermo}
          placeholder="Pesquisar por #, cliente, status ou data..."
        />
      </div>

      <div className="mt-6">
        <TabelaDados
          colunas={[
            { id: 'numeroSequencial', rotulo: '#', ordenavel: true, render: (o) => `#${o.numeroSequencial}` },
            { id: 'cliente', rotulo: 'Cliente', ordenavel: true, render: (o) => o.Cliente?.nome ?? '—' },
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
              render: (o) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); irDetalhe(o) }}
                  className="text-sm text-secondary-600 hover:underline"
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
          <div className="flex justify-end gap-2">
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
