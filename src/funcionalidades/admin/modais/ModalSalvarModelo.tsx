import { useEffect, useState } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { Input } from '@/componentes/ui/Input'
import { Modal } from '@/componentes/ui/Modal'

interface Props {
  aberto: boolean
  nomeSugerido?: string
  onFechar: () => void
  onSalvar: (nome: string) => void
  salvando?: boolean
  erro?: string
}

export function ModalSalvarModelo({
  aberto,
  nomeSugerido = '',
  onFechar,
  onSalvar,
  salvando = false,
  erro = '',
}: Props) {
  const [nome, setNome] = useState(nomeSugerido)

  useEffect(() => {
    if (aberto) setNome(nomeSugerido)
  }, [aberto, nomeSugerido])

  const tentarSalvar = () => {
    const n = nome.trim()
    if (!n) return
    onSalvar(n)
  }

  return (
    <Modal aberto={aberto} onFechar={onFechar} titulo="Salvar como modelo" largura="md">
      <div className="space-y-4">
        <p className="text-sm text-[var(--texto-muted)]">
          O modelo guarda a receita da peça (filamentos, insumos, tempo e configuração) para reutilizar em outros orçamentos.
        </p>
        <Input
          rotulo="Nome do modelo"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Suporte monitor v2"
          autoFocus
        />
        {erro && <p className="text-sm text-erro">{erro}</p>}
        <div className="flex justify-end gap-2">
          <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
          <Botao type="button" onClick={tentarSalvar} disabled={!nome.trim() || salvando}>
            {salvando ? 'Salvando...' : 'Salvar modelo'}
          </Botao>
        </div>
      </div>
    </Modal>
  )
}
