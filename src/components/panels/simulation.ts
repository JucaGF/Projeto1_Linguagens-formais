import { EPSILON } from '@/lib/automaton/types'

/** `read`: lida em passos anteriores. `current`: lida neste passo. `empty`: a cadeia vazia. */
export type TapeCellState = 'read' | 'current' | 'pending' | 'empty'

export interface TapeCell {
  symbol: string
  state: TapeCellState
}

/** As células da fita depois de ler `consumed` símbolos. A cadeia vazia vira uma célula `ε`. */
export function tapeCells(input: string, consumed: number): TapeCell[] {
  if (input === '') return [{ symbol: EPSILON, state: 'empty' }]
  // mesma divisão do `simulate`, que lê a cadeia com `charAt`
  return input.split('').map((symbol, i) => ({
    symbol,
    state: i < consumed - 1 ? 'read' : i === consumed - 1 ? 'current' : 'pending',
  }))
}

export const copiesText = (n: number) => `${n} ${n === 1 ? 'cópia' : 'cópias'}`
