import { useCallback, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Botao } from '@/componentes/ui/Botao'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { useOrdenacaoPaginacao } from '@/hooks/useOrdenacaoPaginacao'
import { ModalCliente } from '@/funcionalidades/admin/modais/ModalCliente'
import type { Cliente } from '@/tipos/database'

export function PaginaClientes() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<{ aberto: boolean; cliente: Cliente | null }>({ aberto: false, cliente: null })

  const clientes = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      if (!supabase) return [] as Cliente[]
      const { data } = await supabase.from('Cliente').select('*').order('nome')
      return (data ?? []) as Cliente[]
    },
  })

  const lista = clientes.data ?? []
  const tabela = useOrdenacaoPaginacao(lista, 'nome', 'asc')

  const abrirNovo = () => setModal({ aberto: true, cliente: null })
  const abrirEditar = useCallback((c: Cliente) => setModal({ aberto: true, cliente: c }), [])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--texto)]">Clientes</h2>
        <Botao onClick={abrirNovo}>Novo cliente</Botao>
      </div>

      <div className="mt-6">
        <TabelaDados
          colunas={[
            { id: 'nome', rotulo: 'Nome', ordenavel: true },
            { id: 'telefone', rotulo: 'Telefone', render: (c) => c.telefone ?? '—' },
            { id: 'email', rotulo: 'E-mail', render: (c) => c.email ?? '—' },
            { id: 'documento', rotulo: 'Documento', render: (c) => c.documento ?? '—' },
            {
              id: 'ativo',
              rotulo: 'Status',
              render: (c) => (
                <span className={c.ativo ? 'text-sucesso' : 'text-[var(--texto-muted)]'}>
                  {c.ativo ? 'Ativo' : 'Inativo'}
                </span>
              ),
            },
            {
              id: 'acoes',
              rotulo: '',
              render: (c) => (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); abrirEditar(c) }}
                  className="text-sm text-secondary-600 hover:underline"
                >
                  Editar
                </button>
              ),
            },
          ]}
          dados={tabela.dadosPaginados}
          chave={(c) => c.id}
          ordenacao={tabela.ordenacao}
          onOrdenar={tabela.alternarOrdenacao}
          onLinhaClick={abrirEditar}
          pagina={tabela.pagina}
          totalPaginas={tabela.totalPaginas}
          totalItens={tabela.totalItens}
          itensPorPagina={tabela.itensPorPagina}
          onPagina={tabela.irParaPagina}
          onItensPorPagina={tabela.setItensPorPagina}
          vazio="Nenhum cliente cadastrado."
        />
      </div>

      <ModalCliente
        aberto={modal.aberto}
        cliente={modal.cliente}
        onFechar={() => setModal({ aberto: false, cliente: null })}
        onSalvo={() => qc.invalidateQueries({ queryKey: ['clientes'] })}
      />
    </div>
  )
}
