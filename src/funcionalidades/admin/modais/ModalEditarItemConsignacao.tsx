import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { formatarMoeda } from '@/lib/calculadora'
import { atualizarItemConsignacao } from '@/lib/consignacao'
import type { ConsignacaoItem } from '@/tipos/database'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'

interface FormProps {
  item: ConsignacaoItem
  consignacaoId: string
  onFechar: () => void
}

function FormularioEditarItem({ item, consignacaoId, onFechar }: FormProps) {
  const qc = useQueryClient()
  const [descricao, setDescricao] = useState(item.descricao)
  const [quantidade, setQuantidade] = useState(String(Number(item.quantidade)))
  const [precoUnitario, setPrecoUnitario] = useState(Number(item.precoUnitario).toFixed(2))
  const [erro, setErro] = useState('')

  const qtdNum = Number(quantidade)
  const precoNum = Number(precoUnitario)
  const total = Number.isFinite(qtdNum) && Number.isFinite(precoNum) ? qtdNum * precoNum : 0

  const salvar = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('Item inválido')
      if (!Number.isFinite(precoNum) || precoNum < 0) throw new Error('Informe um preço válido')
      if (!Number.isFinite(qtdNum) || qtdNum <= 0) throw new Error('Informe uma quantidade válida')
      await atualizarItemConsignacao(supabase, {
        itemId: item.id,
        precoUnitario: precoNum,
        quantidade: qtdNum,
        descricao: descricao.trim() || undefined,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consignacao-itens', consignacaoId] })
      qc.invalidateQueries({ queryKey: ['consignacoes'] })
      onFechar()
    },
    onError: (e) => setErro(e instanceof Error ? e.message : 'Erro ao salvar'),
  })

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); salvar.mutate() }}
      className="flex flex-col gap-4"
    >
      <Input
        rotulo="Descrição"
        value={descricao}
        onChange={(e) => setDescricao(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          rotulo="Quantidade"
          type="number"
          step="1"
          min="1"
          value={quantidade}
          onChange={(e) => setQuantidade(e.target.value)}
          required
        />
        <Input
          rotulo="Preço de repasse (un)"
          type="number"
          step="0.01"
          min="0"
          value={precoUnitario}
          onChange={(e) => setPrecoUnitario(e.target.value)}
          required
        />
      </div>

      <div className="rounded-lg bg-[var(--superficie-elevada)]/50 px-4 py-2 text-sm">
        <span className="text-[var(--texto-muted)]">Total da peça: </span>
        <strong className="tabular-nums text-[var(--texto)]">{formatarMoeda(total)}</strong>
      </div>

      {erro && <p className="text-sm text-erro">{erro}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        <Botao type="submit" disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando...' : 'Salvar'}
        </Botao>
      </div>
    </form>
  )
}

interface Props {
  aberto: boolean
  item: ConsignacaoItem | null
  consignacaoId: string
  onFechar: () => void
}

export function ModalEditarItemConsignacao({ aberto, item, consignacaoId, onFechar }: Props) {
  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Editar peça consignada" largura="md">
      {aberto && item && (
        <FormularioEditarItem key={item.id} item={item} consignacaoId={consignacaoId} onFechar={onFechar} />
      )}
    </Modal>
  )
}
