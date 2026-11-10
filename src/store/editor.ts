import { temporal } from 'zundo'
import { create } from 'zustand'
import * as ops from '@/lib/automaton/operations'
import { simulate } from '@/lib/automaton/simulate'
import type { SimTrace } from '@/lib/automaton/simulate'
import { parseSymbols } from '@/lib/automaton/symbols'
import type { Automaton, Point, StateId, TransitionId } from '@/lib/automaton/types'

export type Tool = 'select' | 'add-state' | 'add-transition' | 'delete'
export type Selection = { kind: 'state' | 'transition'; id: string } | null

export interface SimulationState {
  trace: SimTrace
  step: number
  playing: boolean
}

export interface EditorState {
  automaton: Automaton
  tool: Tool
  selection: Selection
  /** Origem escolhida no primeiro clique do modo transição. */
  pendingFrom: StateId | null
  /** Transição à espera dos símbolos no diálogo. */
  pendingTransition: { from: StateId; to: StateId } | null
  simulation: SimulationState | null

  setTool(t: Tool): void
  select(s: Selection): void
  /** Devolve o id do estado criado. */
  addStateAt(p: Point): StateId
  moveState(id: StateId, p: Point): void
  /** Devolve a mensagem de erro, ou `null` se o nome foi aplicado. */
  renameState(id: StateId, label: string): string | null
  setInitial(id: StateId): void
  toggleAccepting(id: StateId): void
  removeState(id: StateId): void
  removeTransition(id: TransitionId): void
  /** Devolve a mensagem de erro, ou `null` se os símbolos foram aplicados. */
  setTransitionSymbols(id: TransitionId, input: string): string | null
  deleteSelection(): void
  /** Select: seleciona. Add-transition: dois cliques. Delete: remove. */
  clickState(id: StateId): void
  /** Select: seleciona. Delete: remove. As ferramentas de criação ignoram o clique. */
  clickTransition(id: TransitionId): void
  /** Devolve a mensagem de erro (e mantém o diálogo aberto), ou `null` se a transição foi criada. */
  confirmTransition(input: string): string | null
  cancelTransition(): void
  /** Esquece a origem escolhida no primeiro clique do modo transição. */
  cancelPending(): void
  loadAutomaton(a: Automaton): void
  startSimulation(input: string): void
  stepTo(n: number): void
  setPlaying(p: boolean): void
  stopSimulation(): void
}

function selectionExists(automaton: Automaton, selection: Selection): boolean {
  if (selection === null) return false
  const items = selection.kind === 'state' ? automaton.states : automaton.transitions
  return items.some((item) => item.id === selection.id)
}

const hasState = (automaton: Automaton, id: StateId) => automaton.states.some((s) => s.id === id)

const sameAutomaton = (a: Automaton, b: Automaton) =>
  a === b || JSON.stringify(a) === JSON.stringify(b)

type ParsedSymbols = { ok: true; symbols: string[] } | { ok: false; error: string }

function readSymbols(input: string): ParsedSymbols {
  const { symbols, invalid } = parseSymbols(input)
  if (invalid.length > 0) return { ok: false, error: `Símbolo inválido: ${invalid.join(', ')}` }
  if (symbols.length === 0) return { ok: false, error: 'Informe ao menos um símbolo' }
  return { ok: true, symbols }
}

export const useEditor = create<EditorState>()(
  temporal(
    (set, get) => {
      const commit = (next: Automaton) => {
        if (!sameAutomaton(next, get().automaton)) set({ automaton: next })
      }
      const edit = (change: (a: Automaton) => Automaton) => commit(change(get().automaton))

      const patchSimulation = (patch: Partial<SimulationState>) => {
        const { simulation } = get()
        if (simulation !== null) set({ simulation: { ...simulation, ...patch } })
      }

      return {
        automaton: ops.emptyAutomaton(),
        tool: 'select',
        selection: null,
        pendingFrom: null,
        pendingTransition: null,
        simulation: null,

        setTool: (tool) => set({ tool, pendingFrom: null }),
        select: (selection) => set({ selection }),

        addStateAt: (p) => {
          const { automaton, state } = ops.addState(get().automaton, p)
          commit(automaton)
          return state.id
        },
        moveState: (id, p) => edit((a) => ops.moveState(a, id, p)),
        renameState: (id, label) => {
          const error = ops.labelError(get().automaton, id, label)
          if (error === null) edit((a) => ops.renameState(a, id, label))
          return error
        },
        setInitial: (id) => edit((a) => ops.setInitial(a, id)),
        toggleAccepting: (id) => edit((a) => ops.toggleAccepting(a, id)),
        removeState: (id) => edit((a) => ops.removeState(a, id)),
        removeTransition: (id) => edit((a) => ops.removeTransition(a, id)),
        setTransitionSymbols: (id, input) => {
          const parsed = readSymbols(input)
          if (!parsed.ok) return parsed.error
          edit((a) => ops.setTransitionSymbols(a, id, parsed.symbols))
          return null
        },
        deleteSelection: () => {
          const { selection } = get()
          if (selection === null) return
          edit((a) =>
            selection.kind === 'state'
              ? ops.removeState(a, selection.id)
              : ops.removeTransition(a, selection.id),
          )
        },

        clickState: (id) => {
          const { tool, pendingFrom } = get()
          switch (tool) {
            case 'select':
              set({ selection: { kind: 'state', id } })
              return
            case 'delete':
              edit((a) => ops.removeState(a, id))
              return
            case 'add-transition':
              if (pendingFrom === null) set({ pendingFrom: id })
              else set({ pendingFrom: null, pendingTransition: { from: pendingFrom, to: id } })
              return
            case 'add-state':
              // estados novos nascem do clique no canvas, não de um clique em outro estado
              return
          }
        },
        clickTransition: (id) => {
          switch (get().tool) {
            case 'select':
              set({ selection: { kind: 'transition', id } })
              return
            case 'delete':
              edit((a) => ops.removeTransition(a, id))
              return
            case 'add-state':
            case 'add-transition':
              return
          }
        },
        confirmTransition: (input) => {
          const { pendingTransition } = get()
          if (pendingTransition === null) return null
          const parsed = readSymbols(input)
          if (!parsed.ok) return parsed.error
          set({ pendingTransition: null })
          edit((a) =>
            ops.addTransition(a, pendingTransition.from, pendingTransition.to, parsed.symbols),
          )
          return null
        },
        cancelTransition: () => set({ pendingTransition: null }),
        cancelPending: () => set({ pendingFrom: null }),

        loadAutomaton: (a) => {
          set({ selection: null })
          commit(a)
        },

        startSimulation: (input) =>
          set({
            simulation: { trace: simulate(get().automaton, input), step: 0, playing: false },
          }),
        stepTo: (n) => {
          const { simulation } = get()
          if (simulation === null) return
          const last = simulation.trace.steps.length - 1
          patchSimulation({ step: Math.max(0, Math.min(n, last)) })
        },
        setPlaying: (playing) => patchSimulation({ playing }),
        stopSimulation: () => set({ simulation: null }),
      }
    },
    {
      partialize: (s) => ({ automaton: s.automaton }),
      limit: 100,
      equality: (past, current) => past.automaton === current.automaton,
    },
  ),
)

/**
 * Toda mudança do autômato descarta a simulação e a origem pendente, e a seleção e a transição
 * em diálogo cujos estados sumiram. A regra fica numa assinatura, e não nas ações, porque
 * desfazer e refazer do zundo trocam o autômato por fora delas.
 */
useEditor.subscribe((state, previous) => {
  if (state.automaton === previous.automaton) return
  const { automaton, pendingTransition } = state
  const selection = selectionExists(automaton, state.selection) ? state.selection : null
  const dialog =
    pendingTransition !== null &&
    hasState(automaton, pendingTransition.from) &&
    hasState(automaton, pendingTransition.to)
      ? pendingTransition
      : null
  if (
    state.simulation !== null ||
    state.pendingFrom !== null ||
    selection !== state.selection ||
    dialog !== pendingTransition
  ) {
    useEditor.setState({ simulation: null, pendingFrom: null, selection, pendingTransition: dialog })
  }
})
