import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalMaterial } from '@/funcionalidades/admin/modais/ModalMaterial'
import type { Material } from '@/tipos/database'

export function PaginaEstoque() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ aberto: boolean; material: Material | null }>({
    aberto: false,
    material: null,
  })

  const materiais = useQuery({
    queryKey: ['materiais'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('Material').select('*').eq('ativo', true).order('nome')
      if (error) throw error
      return (data ?? []) as Material[]
    },
  })

  const dados = materiais.data ?? []
  const tabela = useOrdenacaoPaginacao(dados, 'nome', 'asc')

  const abrirEditar = useCallback((m: Material) => setModal({ aberto: true, material: m }), [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--texto)]">Insumos de produção</h2>
          <p className="mt-1 text-sm text-[var(--texto-muted)]">
            Filamentos, embalagens, adereços e demais materiais usados na produção.
          </p>
        </div>
        <Botao onClick={() => setModal({ aberto: true, material: null })}>Novo insumo</Botao>
      </div>

      <div className="mt-6">
        <TabelaDados
          colunas={[
            { id: 'nome', rotulo: 'Nome', ordenavel: true },
            { id: 'categoria', rotulo: 'Categoria', ordenavel: true },
            { id: 'unidadeMedida', rotulo: 'Unidade' },
            {
              id: 'estoqueAtual',
              rotulo: 'Estoque',
              render: (m) => `${m.estoqueAtual} ${m.unidadeMedida}`,
            },
            {
              id: 'estoqueReservado',
              rotulo: 'Reservado',
              render: (m) => String(m.estoqueReservado),
            },
            {
              id: 'disponivel',
              rotulo: 'Disponível',
              render: (m) => {
                const d = Number(m.estoqueAtual) - Number(m.estoqueReservado)
                const baixo = d <= Number(m.estoqueMinimo)
                return <span className={baixo ? 'text-erro font-medium' : ''}>{d.toFixed(2)}</span>
              },
            },
            {
              id: 'custoMedioUnitario',
              rotulo: 'Custo médio',
              render: (m) => `${formatarMoeda(Number(m.custoMedioUnitario))}/${m.unidadeMedida}`,
            },
            {
              id: 'acoes',
              rotulo: '',
              render: (m) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); abrirEditar(m) }}
                  className="text-sm text-secondary-600 hover:underline"
                >
                  Editar
                </button>
              ),
            },
          ]}
          dados={tabela.dadosPaginados}
          chave={(m) => m.id}
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

      <ModalMaterial
        aberto={modal.aberto}
        material={modal.material}
        onFechar={() => setModal({ aberto: false, material: null })}
        onSalvo={() => {
          qc.invalidateQueries({ queryKey: ['materiais'] })
          qc.invalidateQueries({ queryKey: ['filamentos'] })
        }}
      />
    </div>
  )
}
