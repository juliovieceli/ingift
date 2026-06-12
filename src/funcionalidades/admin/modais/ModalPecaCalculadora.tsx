import { useEffect, useState } from 'react'
import {
  calcularPeca,
  type PecaCalculo,
  type PecaSessao,
  type ResultadoPeca,
} from '@/lib/calculadora'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import { FormularioPecaOrcamento, pecaVazia } from '@/funcionalidades/admin/FormularioPecaOrcamento'
import { SeletorImpressoraCalculo } from '@/funcionalidades/admin/SeletorImpressoraCalculo'
import { useImpressoraCalculo } from '@/stores/impressoraCalculoStore'
import type { Material } from '@/tipos/database'

interface Props {
  aberto: boolean
  materiais: Material[]
  item: PecaSessao | null
  onFechar: () => void
  onSalvar: (item: PecaSessao) => void
}

function clonarPeca(p: PecaCalculo): PecaCalculo {
  return {
    ...p,
    filamentos: p.filamentos.map((f) => ({ ...f })),
    insumos: (p.insumos ?? []).map((i) => ({ ...i })),
  }
}

export function ModalPecaCalculadora({ aberto, materiais, item, onFechar, onSalvar }: Props) {
  const { config } = useImpressoraCalculo()
  const [peca, setPeca] = useState<PecaCalculo>(pecaVazia())
  const [resultado, setResultado] = useState<ResultadoPeca | null>(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto) return
    if (item) {
      setPeca(clonarPeca(item.peca))
      setResultado(item.resultado)
    } else {
      setPeca(pecaVazia())
      setResultado(null)
    }
    setErro('')
  }, [aberto, item])

  const salvar = () => {
    if (!peca.nomePeca.trim()) {
      setErro('Informe o nome da peça.')
      return
    }
    const r = resultado ?? calcularPeca(config, peca)
    onSalvar({
      id: item?.id ?? crypto.randomUUID(),
      peca: clonarPeca(peca),
      resultado: r,
    })
    onFechar()
  }

  return (
    <Modal
      aberto={aberto}
      onFechar={onFechar}
      titulo={item ? 'Editar peça' : 'Adicionar peça'}
      largura="xl"
    >
      <div className="space-y-4">
        <SeletorImpressoraCalculo onAlterar={() => setResultado(null)} />
        <FormularioPecaOrcamento
          config={config}
          peca={peca}
          onChange={(p) => { setPeca(p); setResultado(null) }}
          resultado={resultado}
          onResultado={setResultado}
          materiais={materiais}
        />
      </div>
      {erro && <p className="mt-2 text-sm text-erro">{erro}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <Botao type="button" variante="fantasma" onClick={onFechar}>Cancelar</Botao>
        <Botao type="button" onClick={salvar} disabled={!peca.nomePeca.trim()}>
          {item ? 'Salvar alterações' : 'Adicionar à sessão'}
        </Botao>
      </div>
    </Modal>
  )
}
