import type { Analysis } from '@/lib/automaton/analysis'
import { transitionTable } from '@/lib/automaton/analysis'
import type { Automaton, StateId } from '@/lib/automaton/types'

export const EMPTY_SET = '∅'

export function formatSet(items: string[]): string {
  return items.length === 0 ? EMPTY_SET : `{${items.join(', ')}}`
}

/**
 * Valor de δ(q, σ). No AFN, δ: Q × Σε → P(Q) e todo valor é um conjunto; no AFD, δ: Q × Σ → Q
 * e o valor é o próprio estado.
 */
export function deltaValue(targets: string[], kind: Analysis['kind']): string {
  if (targets.length === 0) return EMPTY_SET
  return kind === 'NFA' || targets.length > 1 ? formatSet(targets) : targets[0]
}

export function labelsOf(a: Automaton): (ids: StateId[]) => string[] {
  const labels = new Map(a.states.map((s) => [s.id, s.label]))
  return (ids) => ids.map((id) => labels.get(id) ?? id)
}

export interface DeltaEntry {
  state: string
  symbol: string
  value: string
}

/** As entradas definidas de δ, na ordem dos estados e da tabela (ε por último). */
export function deltaEntries(a: Automaton, kind: Analysis['kind']): DeltaEntry[] {
  const { columns, rows } = transitionTable(a)
  const labels = labelsOf(a)
  return rows.flatMap(({ state, cells }) =>
    columns
      .filter((symbol) => cells[symbol].length > 0)
      .map((symbol) => ({
        state: state.label,
        symbol,
        value: deltaValue(labels(cells[symbol]), kind),
      })),
  )
}
