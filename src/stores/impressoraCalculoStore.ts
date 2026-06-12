import { useSyncExternalStore } from 'react'
import {
  configDeImpressora,
  configOperacionalPadrao,
  type ConfigOperacional,
} from '@/lib/calculadora'
import type { ImpressoraConfiguracao } from '@/tipos/database'

interface EstadoImpressoraCalculo {
  impressoraId: string
  config: ConfigOperacional
}

let estado: EstadoImpressoraCalculo = {
  impressoraId: '',
  config: configOperacionalPadrao(),
}

const ouvintes = new Set<() => void>()

function notificar() {
  ouvintes.forEach((fn) => fn())
}

export const impressoraCalculoStore = {
  getState: () => estado,

  subscribe: (ouvinte: () => void) => {
    ouvintes.add(ouvinte)
    return () => ouvintes.delete(ouvinte)
  },

  setImpressoraId: (id: string) => {
    estado = { ...estado, impressoraId: id }
    notificar()
  },

  setConfig: (config: ConfigOperacional) => {
    estado = { ...estado, config }
    notificar()
  },

  aplicarImpressora: (imp: ImpressoraConfiguracao) => {
    estado = {
      impressoraId: imp.id,
      config: configDeImpressora(imp),
    }
    notificar()
  },

  definir: (parcial: Partial<EstadoImpressoraCalculo>) => {
    estado = { ...estado, ...parcial }
    notificar()
  },
}

export function useImpressoraCalculo() {
  return useSyncExternalStore(
    impressoraCalculoStore.subscribe,
    impressoraCalculoStore.getState,
    impressoraCalculoStore.getState,
  )
}
