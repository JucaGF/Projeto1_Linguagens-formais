import { EPSILON } from './types'
import type { Automaton, StateId, TransitionId } from './types'

export interface SimStep {
  /** Quantos símbolos já foram lidos. */
  consumed: number
  /** Símbolo lido neste passo (`null` no passo 0). */
  symbol: string | null
  /** Cópias vivas depois do fecho-ε, na ordem de `a.states`. */
  active: StateId[]
  /** Transições usadas para ler `symbol`, na ordem de `a.transitions`. */
  fired: TransitionId[]
  /** Estados ativos no passo anterior sem transição para `symbol`, na ordem de `a.states`. */
  died: StateId[]
}

export interface SimTrace {
  input: string
  steps: SimStep[]
  accepted: boolean
  error: 'no-initial' | null
}

export function epsilonClosure(a: Automaton, ids: Iterable<StateId>): Set<StateId> {
  const closure = new Set(ids)
  const pending = [...closure]
  for (let from = pending.pop(); from !== undefined; from = pending.pop()) {
    for (const t of a.transitions) {
      if (t.from === from && t.symbols.includes(EPSILON) && !closure.has(t.to)) {
        closure.add(t.to)
        pending.push(t.to)
      }
    }
  }
  return closure
}

function inStateOrder(a: Automaton, ids: ReadonlySet<StateId>): StateId[] {
  return a.states.filter((s) => ids.has(s.id)).map((s) => s.id)
}

export function simulate(a: Automaton, input: string): SimTrace {
  const initial = a.states.find((s) => s.isInitial)
  if (!initial) return { input, steps: [], accepted: false, error: 'no-initial' }

  let active = epsilonClosure(a, [initial.id])
  const steps: SimStep[] = [
    { consumed: 0, symbol: null, active: inStateOrder(a, active), fired: [], died: [] },
  ]

  for (let i = 0; i < input.length; i++) {
    const symbol = input.charAt(i)
    const used = a.transitions.filter(
      (t) => symbol !== EPSILON && active.has(t.from) && t.symbols.includes(symbol),
    )
    const survivors = new Set(used.map((t) => t.from))
    const died = inStateOrder(a, active).filter((id) => !survivors.has(id))
    active = epsilonClosure(a, used.map((t) => t.to))
    steps.push({
      consumed: i + 1,
      symbol,
      active: inStateOrder(a, active),
      fired: used.map((t) => t.id),
      died,
    })
  }

  const accepted = a.states.some((s) => s.isAccepting && active.has(s.id))
  return { input, steps, accepted, error: null }
}
