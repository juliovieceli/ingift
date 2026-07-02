import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Botao } from '@/componentes/ui/Botao'
import { Modal } from '@/componentes/ui/Modal'
import { formatarMoeda } from '@/lib/calculadora'
import type { DivergenciaPreco, EscolhaPrecosModelo } from '@/lib/itemOrcamentoModelo'

interface Props {
  aberto: boolean
  divergencias: DivergenciaPreco[]
  onCancelar: () => void
  onAplicar: (escolha: EscolhaPrecosModelo) => void
}

function formatarValor(div: DivergenciaPreco, valor: number) {
  if (div.tipo === 'filamento' || div.tipo === 'insumo' || div.tipo === 'material_ausente') {
    if (div.tipo === 'filamento') {
      return `${formatarMoeda(valor * 1000)}/kg`
    }
    return formatarMoeda(valor)
  }
  if (div.campo === 'taxaFalha' || div.campo === 'taxaMarketplace') {
    return `${(valor * 100).toFixed(1)}%`
  }
  if (div.campo === 'margemMultiplicador') {
    return `${valor}×`
  }
  return String(valor)
}

export function ModalDivergenciaPrecos({ aberto, divergencias, onCancelar, onAplicar }: Props) {
  const [escolha, setEscolha] = useState<EscolhaPrecosModelo>('atuais')

  return (
    <Modal aberto={aberto} onFechar={onCancelar} titulo="Preços alterados desde o modelo" largura="lg">
      <div className="space-y-4">
        <div className="flex gap-3 rounded-lg border border-alerta/30 bg-alerta/10 p-3 text-sm text-[var(--texto-secundario)]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alerta" />
          <p>
            Alguns valores do modelo salvos diferem dos preços e configurações atuais.
            Escolha como deseja aplicar o modelo no orçamento.
          </p>
        </div>

        <div className="max-h-48 overflow-y-auto rounded-lg border border-[var(--borda)]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[var(--superficie-elevada)]">
              <tr className="text-left text-[var(--texto-muted)]">
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">No modelo</th>
                <th className="px-3 py-2 font-medium">Atual</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--borda)]">
              {divergencias.map((d, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-[var(--texto)]">{d.descricao}</td>
                  <td className="px-3 py-2 tabular-nums text-[var(--texto-muted)]">
                    {d.tipo === 'material_ausente' ? '—' : formatarValor(d, d.valorModelo)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--texto)]">
                    {d.tipo === 'material_ausente' ? 'Indisponível' : formatarValor(d, d.valorAtual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-[var(--texto)]">O que fazer?</legend>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--borda)] p-3 has-[:checked]:border-secondary-500 has-[:checked]:bg-secondary-500/5">
            <input
              type="radio"
              name="escolha-precos"
              value="atuais"
              checked={escolha === 'atuais'}
              onChange={() => setEscolha('atuais')}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-[var(--texto)]">Usar preços atuais</span>
              <span className="text-sm text-[var(--texto-muted)]">
                Materiais e configuração da impressora selecionada; mantém adicional/desconto do modelo.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[var(--borda)] p-3 has-[:checked]:border-secondary-500 has-[:checked]:bg-secondary-500/5">
            <input
              type="radio"
              name="escolha-precos"
              value="modelo"
              checked={escolha === 'modelo'}
              onChange={() => setEscolha('modelo')}
              className="mt-1"
            />
            <span>
              <span className="block font-medium text-[var(--texto)]">Manter preços do modelo</span>
              <span className="text-sm text-[var(--texto-muted)]">
                Usa exatamente os valores salvos no modelo, inclusive configuração e margens.
              </span>
            </span>
          </label>
        </fieldset>

        <div className="flex justify-end gap-2">
          <Botao type="button" variante="fantasma" onClick={onCancelar}>Cancelar</Botao>
          <Botao type="button" onClick={() => onAplicar(escolha)}>Aplicar modelo</Botao>
        </div>
      </div>
    </Modal>
  )
}
