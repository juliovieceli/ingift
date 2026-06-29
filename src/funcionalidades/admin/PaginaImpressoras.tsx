import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalImpressora } from '@/funcionalidades/admin/modais/ModalImpressora'
import type { ImpressoraConfiguracao } from '@/tipos/database'

export function PaginaImpressoras() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ aberto: boolean; impressora: ImpressoraConfiguracao | null }>({
    aberto: false,
    impressora: null,
  })

  const lista = useQuery({
    queryKey: ['impressoras'],
    queryFn: async () => {
      if (!supabase) return []
      const { data } = await supabase.from('ImpressoraConfiguracao').select('*').order('nome')
      return (data ?? []) as ImpressoraConfiguracao[]
    },
  })

  const dados = lista.data ?? []
  const tabela = useOrdenacaoPaginacao(dados, 'nome', 'asc')

  const abrirEditar = useCallback((imp: ImpressoraConfiguracao) => {
    setModal({ aberto: true, impressora: imp })
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--texto)]">Configuração de impressoras</h2>
          <p className="mt-1 text-sm text-[var(--texto-muted)]">
            Cada impressora guarda máquina/energia e margens como base da calculadora.
          </p>
        </div>
        <Botao onClick={() => setModal({ aberto: true, impressora: null })}>Nova impressora</Botao>
      </div>

      <div className="mt-6">
        <TabelaDados
          idTabela="impressoras-lista"
          colunasPadraoMobile={['nome', 'modelo', 'ativo', 'acoes']}
          colunas={[
            { id: 'nome', rotulo: 'Nome', ordenavel: true, obrigatoria: true },
            { id: 'modelo', rotulo: 'Modelo', render: (i) => i.modelo ?? '—' },
            {
              id: 'margemMultiplicador',
              rotulo: 'Margem',
              render: (i) => `${i.margemMultiplicador}x`,
            },
            {
              id: 'taxaFalha',
              rotulo: 'Taxa falha',
              render: (i) => `${(Number(i.taxaFalha) * 100).toFixed(0)}%`,
            },
            {
              id: 'ativo',
              rotulo: 'Ativo',
              render: (i) => (i.ativo ? 'Sim' : 'Não'),
            },
            {
              id: 'acoes',
              rotulo: '',
              render: (i) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); abrirEditar(i) }}
                  className="text-sm text-secondary-600 hover:underline"
                >
                  Editar
                </button>
              ),
            },
          ]}
          dados={tabela.dadosPaginados}
          chave={(i) => i.id}
          ordenacao={tabela.ordenacao}
          onOrdenar={tabela.alternarOrdenacao}
          onLinhaClick={abrirEditar}
          pagina={tabela.pagina}
          totalPaginas={tabela.totalPaginas}
          totalItens={tabela.totalItens}
          itensPorPagina={tabela.itensPorPagina}
          onPagina={tabela.irParaPagina}
          onItensPorPagina={tabela.setItensPorPagina}
        />
      </div>

      <ModalImpressora
        aberto={modal.aberto}
        impressora={modal.impressora}
        onFechar={() => setModal({ aberto: false, impressora: null })}
        onSalvo={() => qc.invalidateQueries({ queryKey: ['impressoras'] })}
      />
    </div>
  )
}
