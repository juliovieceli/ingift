import { useEffect, useState } from 'react'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'

interface ColunaOpcao {
  id: string
  rotulo: string
  obrigatoria?: boolean
  ocultavel?: boolean
}

interface Props {
  aberto: boolean
  onFechar: () => void
  colunas: ColunaOpcao[]
  visiveis: string[]
  onAplicar: (ids: string[]) => void
  onResetar: () => void
}

export function ModalColunasTabela({
  aberto,
  onFechar,
  colunas,
  visiveis,
  onAplicar,
  onResetar,
}: Props) {
  const [selecionadas, setSelecionadas] = useState<string[]>(visiveis)

  useEffect(() => {
    if (aberto) setSelecionadas(visiveis)
  }, [aberto, visiveis])

  const alternar = (id: string, obrigatoria?: boolean, ocultavel?: boolean) => {
    if (obrigatoria || ocultavel === false) return
    setSelecionadas((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    )
  }

  const aplicar = () => {
    onAplicar(selecionadas)
    onFechar()
  }

  const resetar = () => {
    onResetar()
    onFechar()
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo="Colunas visíveis"
      largura="md"
    >
      {aberto && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--texto-muted)]">
            Escolha quais colunas exibir na tabela. No celular, os dados aparecem em cards.
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {colunas.map((col) => {
              const desabilitado = col.obrigatoria || col.ocultavel === false
              const marcado = desabilitado || selecionadas.includes(col.id)
              return (
                <label
                  key={col.id}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
                    desabilitado ? 'opacity-60' : 'cursor-pointer hover:bg-[var(--superficie-elevada)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={desabilitado}
                    onChange={() => alternar(col.id, col.obrigatoria, col.ocultavel)}
                    className="h-4 w-4 rounded border-[var(--borda)]"
                  />
                  <span className="text-sm text-[var(--texto)]">
                    {col.rotulo || col.id}
                    {col.obrigatoria && (
                      <span className="ml-1 text-xs text-[var(--texto-muted)]">(obrigatória)</span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Botao type="button" variante="fantasma" onClick={resetar}>
              Restaurar padrão
            </Botao>
            <Botao type="button" variante="fantasma" onClick={onFechar}>
              Cancelar
            </Botao>
            <Botao type="button" onClick={aplicar}>
              Aplicar
            </Botao>
          </div>
        </div>
      )}
    </Modal>
  )
}
