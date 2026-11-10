import { circleLayout } from './geometry'
import { mergeSymbols, parseSymbols } from './symbols'
import type { Automaton, State, Transition } from './types'

export interface AutomatonSpec {
  states: string[]
  initial?: string
  accepting?: string[]
  transitions: [from: string, symbols: string, to: string][]
}

/** Monta um autômato a partir de uma descrição literal. Ids = rótulos. Lança erro se a descrição for inconsistente. */
export function build(spec: AutomatonSpec): Automaton {
  const labels = new Set<string>()
  for (const label of spec.states) {
    if (labels.has(label)) throw new Error(`Estado repetido em build(): "${label}"`)
    labels.add(label)
  }
  const requireState = (label: string): string => {
    if (!labels.has(label)) throw new Error(`Estado desconhecido em build(): "${label}"`)
    return label
  }

  const initial = spec.initial === undefined ? undefined : requireState(spec.initial)
  const accepting = new Set((spec.accepting ?? []).map(requireState))

  const states: State[] = spec.states.map((label, index) => ({
    id: label,
    label,
    ...circleLayout(spec.states.length, index),
    isInitial: label === initial,
    isAccepting: accepting.has(label),
  }))

  const transitions = new Map<string, Transition>()
  for (const [from, raw, to] of spec.transitions) {
    const { symbols, invalid } = parseSymbols(raw)
    if (invalid.length > 0) throw new Error(`Símbolo inválido em build(): "${invalid[0]}"`)
    const id = `${requireState(from)}-${requireState(to)}`
    const existing = transitions.get(id)
    transitions.set(id, {
      id,
      from,
      to,
      symbols: mergeSymbols(existing?.symbols ?? [], symbols),
    })
  }

  return { states, transitions: [...transitions.values()] }
}
