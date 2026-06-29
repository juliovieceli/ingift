import { useEffect, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { AbasModal } from '@/componentes/ui/AbasModal'
import { Botao } from '@/componentes/ui/Botao'
import { Checkbox } from '@/componentes/ui/Checkbox'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'
import { TabelaDados } from '@/componentes/ui/TabelaDados'
import { UNIDADE_FILAMENTO, UNIDADES_MEDIDA } from '@/lib/unidadesMedida'
import type { Material, EstoqueMovimentacao } from '@/tipos/database'

const CATEGORIAS = ['filamento', 'embalagem', 'adereco', 'adorno', 'outro'] as const

interface Props {
  aberto: boolean
  material: Material | null
  onFechar: () => void
  onSalvo: () => void
}

const formVazio = {
  nome: '',
  descricao: '',
  categoria: 'filamento' as string,
  unidadeMedida: UNIDADE_FILAMENTO as string,
  estoqueMinimo: 100,
  custoMedioUnitario: 0,
  tipoMaterial: 'PLA',
  cor: '',
  marca: '',
  ativo: true,
}

export function ModalMaterial({ aberto, material, onFechar, onSalvo }: Props) {
  const [aba, setAba] = useState('cadastro')
  const [form, setForm] = useState(formVazio)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (material) {
      setForm({
        nome: material.nome,
        descricao: material.descricao ?? '',
        categoria: material.categoria,
        unidadeMedida: material.categoria === 'filamento' ? UNIDADE_FILAMENTO : material.unidadeMedida,
        estoqueMinimo: Number(material.estoqueMinimo),
        custoMedioUnitario: Number(material.custoMedioUnitario),
        tipoMaterial: material.tipoMaterial ?? 'PLA',
        cor: material.cor ?? '',
        marca: material.marca ?? '',
        ativo: material.ativo,
      })
    } else {
      setForm(formVazio)
    }
    setAba('cadastro')
    setErro('')
  }, [material, aberto])

  const movimentacoes = useQuery({
    queryKey: ['movimentacoes-material', material?.id],
    enabled: Boolean(material?.id && aberto),
    queryFn: async () => {
      if (!supabase || !material) return []
      const { data } = await supabase
        .from('EstoqueMovimentacao')
        .select('*, EstoqueTipoMovimentacao(nome, codigo)')
        .eq('materialId', material.id)
        .order('criadoEm', { ascending: false })
        .limit(50)
      return (data ?? []) as (EstoqueMovimentacao & { EstoqueTipoMovimentacao?: { nome: string; codigo: string } })[]
    },
  })

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Supabase não configurado')
      const payload = {
        nome: form.nome,
        descricao: form.descricao || null,
        categoria: form.categoria,
        unidadeMedida: form.categoria === 'filamento' ? UNIDADE_FILAMENTO : form.unidadeMedida,
        estoqueMinimo: form.estoqueMinimo,
        custoMedioUnitario: form.custoMedioUnitario,
        tipoMaterial: form.categoria === 'filamento' ? form.tipoMaterial : null,
        cor: form.cor || null,
        marca: form.marca || null,
        ativo: form.ativo,
      }
      if (material) {
        const { error } = await supabase.from('Material').update(payload).eq('id', material.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('Material').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => { onSalvo(); onFechar() },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  const disp = material
    ? Number(material.estoqueAtual) - Number(material.estoqueReservado)
    : 0
  const temMovimentacoes = (movimentacoes.data?.length ?? 0) > 0
  const unidadeCusto = form.categoria === 'filamento' ? UNIDADE_FILAMENTO : form.unidadeMedida

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo={material ? 'Editar insumo' : 'Novo insumo'} largura="xl">
      <AbasModal
        abas={[
          { id: 'cadastro', rotulo: 'Cadastro' },
          ...(material ? [{ id: 'estoque', rotulo: 'Estoque' }] : []),
        ]}
        abaAtiva={aba}
        onMudarAba={setAba}
      >
        {aba === 'cadastro' && (
          <form onSubmit={(e) => { e.preventDefault(); salvar.mutate() }} className="space-y-3">
            <Input rotulo="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            <Input rotulo="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-[var(--texto-secundario)]">Categoria</span>
                <select
                  value={form.categoria}
                  onChange={(e) => {
                    const categoria = e.target.value
                    setForm({
                      ...form,
                      categoria,
                      unidadeMedida: categoria === 'filamento' ? UNIDADE_FILAMENTO : form.unidadeMedida,
                    })
                  }}
                  className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
                >
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              {form.categoria === 'filamento' ? (
                <Input rotulo="Unidade" value={UNIDADE_FILAMENTO} readOnly />
              ) : (
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-[var(--texto-secundario)]">Unidade</span>
                  <select
                    value={form.unidadeMedida}
                    onChange={(e) => setForm({ ...form, unidadeMedida: e.target.value })}
                    className="rounded-lg border border-[var(--borda)] bg-[var(--superficie)] px-3 py-2"
                  >
                    {UNIDADES_MEDIDA.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </label>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input rotulo="Estoque mínimo" type="number" value={form.estoqueMinimo} onChange={(e) => setForm({ ...form, estoqueMinimo: +e.target.value })} />
              <Input
                rotulo={`Custo unitário (R$/${unidadeCusto})`}
                type="number"
                step="0.0001"
                min="0"
                value={form.custoMedioUnitario}
                onChange={(e) => setForm({ ...form, custoMedioUnitario: +e.target.value })}
                readOnly={Boolean(material && temMovimentacoes)}
              />
            </div>
            {material && temMovimentacoes && (
              <p className="text-xs text-[var(--texto-muted)]">
                O custo unitário é recalculado automaticamente pelas entradas de estoque.
              </p>
            )}
            {form.categoria === 'filamento' && (
              <div className="grid grid-cols-3 gap-2">
                <Input rotulo="Tipo material" value={form.tipoMaterial} onChange={(e) => setForm({ ...form, tipoMaterial: e.target.value })} />
                <Input rotulo="Cor" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} />
                <Input rotulo="Marca" value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
              </div>
            )}
            {material && <Checkbox rotulo="Ativo" checked={form.ativo} onChange={(ativo) => setForm({ ...form, ativo })} />}
            {erro && <p className="text-sm text-erro">{erro}</p>}
            <div className="flex justify-end gap-2">
              <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
              <Botao type="submit" disabled={salvar.isPending}>Salvar</Botao>
            </div>
          </form>
        )}

        {aba === 'estoque' && material && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div><p className="text-[var(--texto-muted)]">Atual</p><p className="font-semibold">{material.estoqueAtual} {material.unidadeMedida}</p></div>
              <div><p className="text-[var(--texto-muted)]">Reservado</p><p className="font-semibold">{material.estoqueReservado}</p></div>
              <div><p className="text-[var(--texto-muted)]">Disponível</p><p className="font-semibold">{disp.toFixed(2)}</p></div>
            </div>
            <p className="text-sm text-[var(--texto-muted)]">
              Custo médio: {formatarMoeda(Number(material.custoMedioUnitario))}/{material.unidadeMedida}
            </p>
            <Link
              to={`/admin/movimentacoes?materialId=${material.id}`}
              className="text-sm text-secondary-600 hover:underline"
              onClick={onFechar}
            >
              Registrar movimentação →
            </Link>
            <TabelaDados
              idTabela="material-movimentacoes"
              colunasPadraoMobile={['criadoEm', 'tipo', 'quantidade']}
              colunas={[
                { id: 'criadoEm', rotulo: 'Data', render: (m) => new Date(m.criadoEm).toLocaleDateString('pt-BR') },
                { id: 'tipo', rotulo: 'Tipo', render: (m) => m.EstoqueTipoMovimentacao?.nome ?? '—' },
                { id: 'quantidade', rotulo: 'Qtd', render: (m) => m.quantidade ?? 0 },
                { id: 'valorTotal', rotulo: 'Valor', render: (m) => m.valorTotal != null ? formatarMoeda(Number(m.valorTotal)) : '—' },
                { id: 'observacoes', rotulo: 'Obs', render: (m) => m.observacoes ?? '—' },
              ]}
              dados={movimentacoes.data ?? []}
              chave={(m) => m.id}
              vazio="Sem movimentações."
            />
          </div>
        )}
      </AbasModal>
    </Modal>
  )
}
