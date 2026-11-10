import { mergeSymbols } from './symbols'
import type { Automaton, Point, State, StateId, TransitionId } from './types'

let fallbackCount = 0

/** `crypto.randomUUID` só existe em contexto seguro (HTTPS ou localhost); fora dele, um id local basta. */
function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  fallbackCount++
  return `id-${Date.now().toString(36)}-${fallbackCount.toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

const hasState = (a: Automaton, id: StateId) => a.states.some((s) => s.id === id)

const hasTransition = (a: Automaton, id: TransitionId) => a.transitions.some((t) => t.id === id)

const mapState = (a: Automaton, id: StateId, change: (s: State) => State): Automaton =>
  hasState(a, id) ? { ...a, states: a.states.map((s) => (s.id === id ? change(s) : s)) } : a

function freeLabel(a: Automaton): string {
  const used = new Set(a.states.map((s) => s.label))
  let index = 0
  while (used.has(`q${index}`)) index++
  return `q${index}`
}

export function emptyAutomaton(): Automaton {
  return { states: [], transitions: [] }
}

export function addState(a: Automaton, at: Point): { automaton: Automaton; state: State } {
  const state: State = {
    id: newId(),
    label: freeLabel(a),
    x: at.x,
    y: at.y,
    isInitial: a.states.length === 0,
    isAccepting: false,
  }
  return { automaton: { ...a, states: [...a.states, state] }, state }
}

export function removeState(a: Automaton, id: StateId): Automaton {
  if (!hasState(a, id)) return a
  return {
    states: a.states.filter((s) => s.id !== id),
    transitions: a.transitions.filter((t) => t.from !== id && t.to !== id),
  }
}

export function moveState(a: Automaton, id: StateId, at: Point): Automaton {
  return mapState(a, id, (s) => ({ ...s, x: at.x, y: at.y }))
}

export function labelError(a: Automaton, id: StateId, label: string): string | null {
  const name = label.trim()
  if (name === '') return 'O nome não pode ser vazio'
  if (a.states.some((s) => s.id !== id && s.label === name)) {
    return `Já existe um estado chamado "${name}"`
  }
  return null
}

export function renameState(a: Automaton, id: StateId, label: string): Automaton {
  if (labelError(a, id, label) !== null) return a
  return mapState(a, id, (s) => ({ ...s, label: label.trim() }))
}

export function setInitial(a: Automaton, id: StateId): Automaton {
  if (!hasState(a, id)) return a
  return { ...a, states: a.states.map((s) => ({ ...s, isInitial: s.id === id })) }
}

export function toggleAccepting(a: Automaton, id: StateId): Automaton {
  return mapState(a, id, (s) => ({ ...s, isAccepting: !s.isAccepting }))
}

export function addTransition(
  a: Automaton,
  from: StateId,
  to: StateId,
  symbols: string[],
): Automaton {
  if (symbols.length === 0 || !hasState(a, from) || !hasState(a, to)) return a
  const existing = a.transitions.find((t) => t.from === from && t.to === to)
  if (!existing) {
    const transition = { id: newId(), from, to, symbols: mergeSymbols(symbols) }
    return { ...a, transitions: [...a.transitions, transition] }
  }
  return setTransitionSymbols(a, existing.id, mergeSymbols(existing.symbols, symbols))
}

export function setTransitionSymbols(
  a: Automaton,
  id: TransitionId,
  symbols: string[],
): Automaton {
  if (symbols.length === 0) return removeTransition(a, id)
  if (!hasTransition(a, id)) return a
  return {
    ...a,
    transitions: a.transitions.map((t) =>
      t.id === id ? { ...t, symbols: mergeSymbols(symbols) } : t,
    ),
  }
}

export function removeTransition(a: Automaton, id: TransitionId): Automaton {
  if (!hasTransition(a, id)) return a
  return { ...a, transitions: a.transitions.filter((t) => t.id !== id) }
}
