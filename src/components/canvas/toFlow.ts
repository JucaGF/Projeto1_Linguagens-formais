import { type Edge, type Node, type NodeHandle, Position } from '@xyflow/react'
import { STATE_RADIUS, transitionShape } from '@/lib/automaton/geometry'
import type { Automaton, StateId, TransitionId } from '@/lib/automaton/types'
import type { Selection } from '@/store/editor'

export interface FlowContext {
  selection: Selection
  pendingFrom: StateId | null
  active: Set<StateId>
  died: Set<StateId>
  fired: Set<TransitionId>
  conflicts: Set<TransitionId>
  stepKey: number
}

export type StateNodeData = {
  label: string
  isInitial: boolean
  isAccepting: boolean
  selected: boolean
  pending: boolean
  active: boolean
  died: boolean
  /** Muda a cada passo da simulação, para o pulso de `died` tocar de novo. */
  stepKey: number
}

export type TransitionEdgeData = {
  symbols: string[]
  curved: boolean
  selfLoop: boolean
  selected: boolean
  firing: boolean
  conflict: boolean
  stepKey: number
}

export type StateFlowNode = Node<StateNodeData, 'state'>
export type TransitionFlowEdge = Edge<TransitionEdgeData, 'transition'>

const NODE_SIZE = 2 * STATE_RADIUS

/**
 * Handles de tamanho zero no centro: as arestas recebem o centro do estado como `sourceX/Y`.
 * Ficam declarados no nó (além de renderizados) porque o React Flow descarta os handles medidos
 * quando o array de nós é trocado a partir do store, e as arestas sumiriam até a nova medição.
 */
const CENTER_HANDLES: NodeHandle[] = (['source', 'target'] as const).map((type) => ({
  type,
  position: Position.Top,
  x: STATE_RADIUS,
  y: STATE_RADIUS,
  width: 0,
  height: 0,
}))

const isSelected = (ctx: FlowContext, kind: 'state' | 'transition', id: string) =>
  ctx.selection?.kind === kind && ctx.selection.id === id

/** Um nó `state` por estado. A posição do React Flow é o canto do quadrado, não o centro. */
export function toFlowNodes(a: Automaton, ctx: FlowContext): StateFlowNode[] {
  return a.states.map((s) => ({
    id: s.id,
    type: 'state',
    position: { x: s.x - STATE_RADIUS, y: s.y - STATE_RADIUS },
    width: NODE_SIZE,
    height: NODE_SIZE,
    handles: CENTER_HANDLES,
    data: {
      label: s.label,
      isInitial: s.isInitial,
      isAccepting: s.isAccepting,
      selected: isSelected(ctx, 'state', s.id),
      pending: ctx.pendingFrom === s.id,
      active: ctx.active.has(s.id),
      died: ctx.died.has(s.id),
      stepKey: ctx.stepKey,
    },
  }))
}

/** Uma aresta `transition` por transição, com a forma decidida por `transitionShape`. */
export function toFlowEdges(a: Automaton, ctx: FlowContext): TransitionFlowEdge[] {
  return a.transitions.map((t) => {
    const shape = transitionShape(a, t)
    return {
      id: t.id,
      type: 'transition',
      source: t.from,
      target: t.to,
      data: {
        symbols: t.symbols,
        curved: shape === 'curved',
        selfLoop: shape === 'loop',
        selected: isSelected(ctx, 'transition', t.id),
        firing: ctx.fired.has(t.id),
        conflict: ctx.conflicts.has(t.id),
        stepKey: ctx.stepKey,
      },
    }
  })
}
