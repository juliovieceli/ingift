import { useCallback, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { CampoPesquisa } from '@/componentes/ui/CampoPesquisa'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { usePesquisa } from '@/hooks/usePesquisa'
import {
  contarComposicao,
  excluirModelo,
  listarModelosPeca,
  renomearModelo,
  type ItemOrcamentoModeloComComposicao,
} from '@/lib/itemOrcamentoModelo'

export function PaginaModelosPeca() {
  const qc = useQueryClient()
  const [modalRenomear, setModalRenomear] = useState<{
    aberto: boolean
    modelo: ItemOrcamentoModeloComComposicao | null
  }>({ aberto: false, modelo: null })
  const [modalExcluir, setModalExcluir] = useState<ItemOrcamentoModeloComComposicao | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [erro, setErro] = useState('')

  const lista = useQuery({
    queryKey: ['modelos-peca'],
    queryFn: async () => {
      if (!supabase) return []
      return listarModelosPeca(supabase)
    },
  })

  const extrairTexto = useCallback((m: ItemOrcamentoModeloComComposicao) => {
    const { filamentos, insumos } = contarComposicao(m)
    return [
      m.nome,
      m.nomePeca,
      m.observacoes ?? '',
      `${filamentos} filamentos`,
      `${insumos} insumos`,
      new Date(m.criadoEm).toLocaleDateString('pt-BR'),
    ].join(' ')
  }, [])

  const { termo, setTermo, filtrados } = usePesquisa(lista.data ?? [], extrairTexto, 200)
  const tabela = useOrdenacaoPaginacao(filtrados, 'nome', 'asc')

  const abrirRenomear = useCallback((modelo: ItemOrcamentoModeloComComposicao) => {
    setNovoNome(modelo.nome)
    setErro('')
    setModalRenomear({ aberto: true, modelo })
  }, [])

  const renomear = useMutation({
    mutationFn: async () => {
      if (!supabase || !modalRenomear.modelo) throw new Error('Modelo inválido')
      const nome = novoNome.trim()
      if (!nome) throw new Error('Informe o nome')
      await renomearModelo(supabase, modalRenomear.modelo.id, nome)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelos-peca'] })
      setModalRenomear({ aberto: false, modelo: null })
      setErro('')
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao renomear'),
  })

  const excluir = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase não configurado')
      await excluirModelo(supabase, id)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modelos-peca'] })
      setModalExcluir(null)
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao excluir'),
  })

  const resumoExclusao = useMemo(() => {
    if (!modalExcluir) return null
    const { filamentos, insumos } = contarComposicao(modalExcluir)
    const partes: string[] = []
    if (filamentos > 0) partes.push(`${filamentos} filamento(s)`)
    if (insumos > 0) partes.push(`${insumos} insumo(s)`)
    return partes.join(' · ') || 'Sem composição'
  }, [modalExcluir])

  return (
    <div>
      <Link
        to="/admin/orcamentos"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--texto-muted)] hover:text-[var(--texto)]"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar aos orçamentos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--texto)]">Modelos de peça</h2>
          <p className="mt-1 text-sm text-[var(--texto-muted)]">
            Gerencie receitas salvas para reutilizar em orçamentos. Excluir um modelo não afeta orçamentos já criados.
          </p>
        </div>
        {filtrados.length > 0 && (
          <p className="text-sm text-[var(--texto-muted)]">
            {filtrados.length} {filtrados.length === 1 ? 'modelo' : 'modelos'}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl border border-[var(--borda)] bg-[var(--superficie)] p-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[var(--texto-secundario)]">Pesquisar modelo</span>
          <CampoPesquisa
            valor={termo}
            onChange={setTermo}
            placeholder="Por nome do modelo ou da peça..."
            className="w-full max-w-none"
          />
        </label>
      </div>

      <div className="mt-6">
        <TabelaDados
          idTabela="modelos-peca-lista"
          colunasPadraoMobile={['nome', 'nomePeca', 'composicao', 'acoes']}
          colunas={[
            { id: 'nome', rotulo: 'Modelo', ordenavel: true, obrigatoria: true },
            { id: 'nomePeca', rotulo: 'Peça', ordenavel: true, render: (m) => m.nomePeca },
            {
              id: 'composicao',
              rotulo: 'Composição',
              render: (m) => {
                const { filamentos, insumos } = contarComposicao(m)
                const partes: string[] = []
                if (filamentos > 0) partes.push(`${filamentos} fil.`)
                if (insumos > 0) partes.push(`${insumos} ins.`)
                return partes.join(', ') || '—'
              },
            },
            {
              id: 'quantidade',
              rotulo: 'Qtd padrão',
              render: (m) => m.quantidade,
            },
            {
              id: 'criadoEm',
              rotulo: 'Criado em',
              ordenavel: true,
              render: (m) => new Date(m.criadoEm).toLocaleDateString('pt-BR'),
            },
            {
              id: 'acoes',
              rotulo: '',
              obrigatoria: true,
              ocultavel: false,
              exibirNoCard: true,
              render: (m) => (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); abrirRenomear(m) }}
                    className="text-sm text-secondary-600 hover:underline dark:text-secondary-400"
                  >
                    Renomear
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setModalExcluir(m) }}
                    className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg text-erro hover:bg-erro/10"
                    aria-label={`Excluir modelo ${m.nome}`}
                    title="Excluir modelo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ),
            },
          ]}
          dados={tabela.dadosPaginados}
          chave={(m) => m.id}
          ordenacao={tabela.ordenacao}
          onOrdenar={tabela.alternarOrdenacao}
          onLinhaClick={abrirRenomear}
          pagina={tabela.pagina}
          totalPaginas={tabela.totalPaginas}
          totalItens={tabela.totalItens}
          itensPorPagina={tabela.itensPorPagina}
          onPagina={tabela.irParaPagina}
          onItensPorPagina={tabela.setItensPorPagina}
          vazio={
            termo
              ? 'Nenhum modelo encontrado para essa pesquisa.'
              : 'Nenhum modelo salvo. Salve uma peça no orçamento usando o ícone de bandeirinha.'
          }
        />
      </div>

      <Modal
        aberto={modalRenomear.aberto}
        onFechar={() => setModalRenomear({ aberto: false, modelo: null })}
        titulo="Renomear modelo"
        largura="md"
      >
        <div className="space-y-4">
          <Input
            rotulo="Nome do modelo"
            value={novoNome}
            onChange={(e) => setNovoNome(e.target.value)}
            autoFocus
          />
          {erro && <p className="text-sm text-erro">{erro}</p>}
          <div className="flex justify-end gap-2">
            <Botao type="button" variante="fantasma" onClick={() => setModalRenomear({ aberto: false, modelo: null })}>
              Cancelar
            </Botao>
            <Botao onClick={() => renomear.mutate()} disabled={renomear.isPending || !novoNome.trim()}>
              {renomear.isPending ? 'Salvando...' : 'Salvar'}
            </Botao>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={Boolean(modalExcluir)}
        onFechar={() => setModalExcluir(null)}
        titulo="Excluir modelo"
        largura="md"
      >
        {modalExcluir && (
          <div className="space-y-4">
            <p className="text-sm text-[var(--texto-secundario)]">
              O modelo <strong className="text-[var(--texto)]">{modalExcluir.nome}</strong> será removido
              e não aparecerá mais ao adicionar peças em novos orçamentos.
            </p>
            <div className="rounded-lg border border-[var(--borda)] bg-[var(--fundo)]/50 px-3 py-2 text-sm">
              <p><span className="text-[var(--texto-muted)]">Peça:</span> {modalExcluir.nomePeca}</p>
              <p className="mt-1"><span className="text-[var(--texto-muted)]">Composição:</span> {resumoExclusao}</p>
              <p className="mt-1"><span className="text-[var(--texto-muted)]">Qtd padrão:</span> {modalExcluir.quantidade}</p>
            </div>
            <p className="text-xs text-[var(--texto-muted)]">
              Orçamentos que já usaram esta receita não são alterados.
            </p>
            {erro && <p className="text-sm text-erro">{erro}</p>}
            <div className="flex justify-end gap-2">
              <Botao type="button" variante="fantasma" onClick={() => setModalExcluir(null)}>
                Cancelar
              </Botao>
              <Botao
                type="button"
                className="bg-erro text-white hover:opacity-90"
                onClick={() => excluir.mutate(modalExcluir.id)}
                disabled={excluir.isPending}
              >
                {excluir.isPending ? 'Excluindo...' : 'Excluir modelo'}
              </Botao>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
