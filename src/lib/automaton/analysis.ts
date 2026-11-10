import { EPSILON } from './types'
import type { Automaton, State, StateId, Transition, TransitionId } from './types'

export type Conflict =
  | { kind: 'nondeterministic'; stateId: StateId; symbol: string; transitionIds: TransitionId[] }
  | { kind: 'epsilon'; transitionId: TransitionId }

export interface Analysis {
  alphabet: string[]
  kind: 'DFA' | 'NFA'
  conflicts: Conflict[]
  missing: { stateId: StateId; symbol: string }[]
  initial: StateId | null
  accepting: StateId[]
  unreachable: StateId[]
  warnings: string[]
}

export interface TransitionTable {
  columns: string[]
  rows: { state: State; cells: Record<string, StateId[]> }[]
}

type Moves = Map<StateId, Map<string, Transition[]>>

function indexMoves(a: Automaton): Moves {
  const moves: Moves = new Map()
  for (const transition of a.transitions) {
    let bySymbol = moves.get(transition.from)
    if (!bySymbol) {
      bySymbol = new Map()
      moves.set(transition.from, bySymbol)
    }
    for (const symbol of transition.symbols) {
      const list = bySymbol.get(symbol)
      if (list) list.push(transition)
      else bySymbol.set(symbol, [transition])
    }
  }
  return moves
}

function movesOn(moves: Moves, from: StateId, symbol: string): Transition[] {
  return moves.get(from)?.get(symbol) ?? []
}

function epsilonTransitions(a: Automaton): Transition[] {
  return a.transitions.filter((t) => t.symbols.includes(EPSILON))
}

function alphabetOf(a: Automaton): string[] {
  const symbols = new Set(a.transitions.flatMap((t) => t.symbols))
  symbols.delete(EPSILON)
  return [...symbols].sort()
}

function findConflicts(a: Automaton, alphabet: string[], moves: Moves): Conflict[] {
  const nondeterministic = a.states.flatMap((state) =>
    alphabet.flatMap((symbol): Conflict[] => {
      const outgoing = movesOn(moves, state.id, symbol)
      if (outgoing.length < 2) return []
      return [{ kind: 'nondeterministic', stateId: state.id, symbol, transitionIds: outgoing.map((t) => t.id) }]
    }),
  )
  const epsilon = epsilonTransitions(a).map((t): Conflict => ({ kind: 'epsilon', transitionId: t.id }))
  return [...nondeterministic, ...epsilon]
}

function findMissing(a: Automaton, alphabet: string[], moves: Moves): Analysis['missing'] {
  return a.states.flatMap((state) =>
    alphabet
      .filter((symbol) => movesOn(moves, state.id, symbol).length === 0)
      .map((symbol) => ({ stateId: state.id, symbol })),
  )
}

function findUnreachable(a: Automaton, initial: StateId | null): State[] {
  if (initial === null) return []
  const seen = new Set([initial])
  const queue = [initial]
  for (const current of queue) {
    for (const t of a.transitions) {
      if (t.from === current && !seen.has(t.to)) {
        seen.add(t.to)
        queue.push(t.to)
      }
    }
  }
  return a.states.filter((s) => !seen.has(s.id))
}

export function analyze(a: Automaton): Analysis {
  const alphabet = alphabetOf(a)
  const moves = indexMoves(a)
  const conflicts = findConflicts(a, alphabet, moves)
  const kind = conflicts.length > 0 ? 'NFA' : 'DFA'
  const missing = kind === 'DFA' ? findMissing(a, alphabet, moves) : []
  const initial = a.states.find((s) => s.isInitial)?.id ?? null
  const accepting = a.states.filter((s) => s.isAccepting).map((s) => s.id)
  const unreachable = findUnreachable(a, initial)

  const warnings: string[] = []
  if (initial === null) warnings.push('Nenhum estado inicial')
  if (accepting.length === 0) warnings.push('Nenhum estado de aceitação')
  for (const state of unreachable) warnings.push(`Estado inalcançável: ${state.label}`)
  if (missing.length > 0) warnings.push(`AFD incompleto: faltam ${missing.length} transições`)

  return {
    alphabet,
    kind,
    conflicts,
    missing,
    initial,
    accepting,
    unreachable: unreachable.map((s) => s.id),
    warnings,
  }
}

export function transitionTable(a: Automaton): TransitionTable {
  const moves = indexMoves(a)
  const alphabet = alphabetOf(a)
  const columns = epsilonTransitions(a).length > 0 ? [...alphabet, EPSILON] : alphabet
  const rows = a.states.map((state) => ({
    state,
    cells: Object.fromEntries(
      columns.map((symbol): [string, StateId[]] => {
        const targets = new Set(movesOn(moves, state.id, symbol).map((t) => t.to))
        return [symbol, a.states.filter((s) => targets.has(s.id)).map((s) => s.id)]
      }),
    ),
  }))
  return { columns, rows }
}
