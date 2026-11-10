import type { Analysis } from '@/lib/automaton/analysis'
import type { Automaton } from '@/lib/automaton/types'
import type { SimulationState } from '@/store/editor'

export type IslandTone = 'empty' | 'dfa' | 'incomplete' | 'nfa' | 'simulating'

export interface IslandStatus {
  tone: IslandTone
  text: string
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function islandStatus(
  a: Automaton,
  analysis: Analysis,
  simulation: SimulationState | null,
): IslandStatus {
  if (a.states.length === 0) {
    return { tone: 'empty', text: 'Vazio — dê dois cliques para criar um estado' }
  }
  if (simulation !== null && simulation.trace.steps.length > 0) {
    const total = simulation.trace.steps.length - 1
    const symbol = simulation.trace.steps[simulation.step]?.symbol
    const reading = symbol == null ? '' : ` · lendo '${symbol}'`
    return { tone: 'simulating', text: `Passo ${simulation.step}/${total}${reading}` }
  }
  if (analysis.kind === 'NFA') {
    return {
      tone: 'nfa',
      text: `AFN · ${plural(analysis.conflicts.length, 'conflito', 'conflitos')}`,
    }
  }
  if (analysis.missing.length > 0) return { tone: 'incomplete', text: 'AFD incompleto' }
  return { tone: 'dfa', text: 'AFD ✓' }
}

/** O que a ilha lista ao expandir: o motivo de ser AFN, depois os avisos da análise. */
export function islandDetails(a: Automaton, analysis: Analysis): string[] {
  // sem estados, a própria ilha já diz o que fazer; "nenhum inicial" seria só ruído
  if (a.states.length === 0) return []
  const label = new Map(a.states.map((s) => [s.id, s.label]))
  const name = (id: string) => label.get(id) ?? id
  const transitions = new Map(a.transitions.map((t) => [t.id, t]))
  const conflicts = analysis.conflicts.map((c) => {
    if (c.kind === 'nondeterministic') {
      return `δ(${name(c.stateId)}, ${c.symbol}) tem ${plural(c.transitionIds.length, 'destino', 'destinos')}`
    }
    const t = transitions.get(c.transitionId)
    return t ? `ε-transição de ${name(t.from)} para ${name(t.to)}` : 'ε-transição'
  })
  return [...conflicts, ...analysis.warnings]
}
