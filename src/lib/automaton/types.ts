export const EPSILON = 'ε'

export type StateId = string
export type TransitionId = string

export interface Point {
  x: number
  y: number
}

export interface State {
  id: StateId
  label: string
  /** Centro do círculo do estado. */
  x: number
  y: number
  isInitial: boolean
  isAccepting: boolean
}

export interface Transition {
  id: TransitionId
  from: StateId
  to: StateId
  /** Cada símbolo tem exatamente um caractere, exceto `EPSILON`. Nunca vazio, sem repetições. */
  symbols: string[]
}

export interface Automaton {
  states: State[]
  transitions: Transition[]
}
