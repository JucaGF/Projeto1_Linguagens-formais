import {
  Background,
  BackgroundVariant,
  Controls,
  type EdgeTypes,
  type NodeTypes,
  ReactFlow,
  useNodesState,
  useReactFlow,
  ViewportPortal,
} from '@xyflow/react'
import { type MouseEvent, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { useSimulationPlayback } from '@/hooks/useSimulationPlayback'
import { analyze } from '@/lib/automaton/analysis'
import { STATE_RADIUS } from '@/lib/automaton/geometry'
import type { Automaton, Point, StateId, TransitionId } from '@/lib/automaton/types'
import { useEditor } from '@/store/editor'
import { ArrowDefs } from './ArrowDefs'
import { StateNode } from './StateNode'
import { SymbolDialog } from './SymbolDialog'
import {
  FIT_VIEW,
  type FlowContext,
  type StateFlowNode,
  toFlowEdges,
  toFlowNodes,
} from './toFlow'
import { TransitionEdge } from './TransitionEdge'

const nodeTypes: NodeTypes = { state: StateNode }
const edgeTypes: EdgeTypes = { transition: TransitionEdge }

const NONE = new Set<string>()

const roundPoint = (p: Point): Point => ({ x: Math.round(p.x), y: Math.round(p.y) })

const centerOf = (node: StateFlowNode): Point =>
  roundPoint({ x: node.position.x + STATE_RADIUS, y: node.position.y + STATE_RADIUS })

const isPane = (target: EventTarget) =>
  target instanceof Element && target.classList.contains('react-flow__pane')

function conflictIds(conflicts: ReturnType<typeof analyze>['conflicts']): Set<TransitionId> {
  return new Set(
    conflicts.flatMap((c) => (c.kind === 'epsilon' ? [c.transitionId] : c.transitionIds)),
  )
}

/** Linha tracejada da origem escolhida até o ponteiro, enquanto falta o segundo clique. */
function PendingLink({ from }: { from: StateId }) {
  const { screenToFlowPosition } = useReactFlow()
  const origin = useEditor((s) => s.automaton.states.find((state) => state.id === from))
  const [pointer, setPointer] = useState<Point | null>(null)

  useEffect(() => {
    const follow = (event: PointerEvent) =>
      setPointer(screenToFlowPosition({ x: event.clientX, y: event.clientY }))
    window.addEventListener('pointermove', follow)
    return () => window.removeEventListener('pointermove', follow)
  }, [screenToFlowPosition])

  if (!origin || !pointer) return null
  const distance = Math.hypot(pointer.x - origin.x, pointer.y - origin.y)
  if (distance <= STATE_RADIUS) return null
  const start = {
    x: origin.x + ((pointer.x - origin.x) / distance) * STATE_RADIUS,
    y: origin.y + ((pointer.y - origin.y) / distance) * STATE_RADIUS,
  }

  return (
    <ViewportPortal>
      <svg className="pointer-events-none absolute top-0 left-0 overflow-visible" aria-hidden>
        <line
          x1={start.x}
          y1={start.y}
          x2={pointer.x}
          y2={pointer.y}
          stroke="var(--canvas-selection)"
          strokeWidth={1.5}
          strokeDasharray="5 4"
        />
      </svg>
    </ViewportPortal>
  )
}

export function AutomatonCanvas() {
  const automaton = useEditor((s) => s.automaton)
  const selection = useEditor((s) => s.selection)
  const pendingFrom = useEditor((s) => s.pendingFrom)
  const tool = useEditor((s) => s.tool)
  const simulation = useEditor((s) => s.simulation)
  const { screenToFlowPosition } = useReactFlow()
  // o painel desmonta a aba Simular quando ela não está à vista; o canvas está sempre montado
  useSimulationPlayback()

  // a entrada anima só o estado criado pelo ponteiro; desfazer, refazer e carregar não animam
  const [created, setCreated] = useState<{ id: StateId; automaton: Automaton } | null>(null)
  if (created !== null && created.automaton !== automaton) setCreated(null)
  const entering = created?.id ?? null

  const conflicts = useMemo(() => conflictIds(analyze(automaton).conflicts), [automaton])
  const simStep = simulation?.trace.steps[simulation.step]
  const stepKey = simulation?.step ?? 0
  const ctx = useMemo<FlowContext>(
    () => ({
      selection,
      pendingFrom,
      active: simStep ? new Set(simStep.active) : NONE,
      died: simStep ? new Set(simStep.died) : NONE,
      fired: simStep ? new Set(simStep.fired) : NONE,
      conflicts,
      stepKey,
      entering,
    }),
    [selection, pendingFrom, conflicts, entering, simStep, stepKey],
  )

  const flowNodes = useMemo(() => toFlowNodes(automaton, ctx), [automaton, ctx])
  const edges = useMemo(() => toFlowEdges(automaton, ctx), [automaton, ctx])

  // posições ao vivo ficam locais durante o arrasto; o store só recebe a posição final
  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes)
  useLayoutEffect(
    () =>
      setNodes((current) => {
        const live = new Map(current.map((n) => [n.id, n]))
        return flowNodes.map((n) => {
          const old = live.get(n.id)
          if (old === undefined) return n
          // o React Flow descarta medidas e handles de um nó que chega sem `measured`
          const measured = { ...n, measured: old.measured }
          return old.dragging ? { ...measured, position: old.position, dragging: true } : measured
        })
      }),
    [flowNodes, setNodes],
  )

  const flowPoint = (event: MouseEvent) =>
    roundPoint(screenToFlowPosition({ x: event.clientX, y: event.clientY }))

  const createState = (event: MouseEvent) => {
    const id = useEditor.getState().addStateAt(flowPoint(event))
    setCreated({ id, automaton: useEditor.getState().automaton })
  }

  const onPaneClick = (event: MouseEvent) => {
    const editor = useEditor.getState()
    if (editor.tool === 'add-state') return createState(event)
    editor.select(null)
    editor.cancelPending()
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (isPane(event.target)) createState(event)
  }

  return (
    <div className="automaton-canvas relative h-full w-full" data-tool={tool}>
      <ArrowDefs />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onNodeClick={(_, node) => useEditor.getState().clickState(node.id)}
        onNodeDragStop={(_, node) => useEditor.getState().moveState(node.id, centerOf(node))}
        onEdgeClick={(_, edge) => useEditor.getState().clickTransition(edge.id)}
        onPaneClick={onPaneClick}
        onDoubleClick={onDoubleClick}
        nodesDraggable={tool === 'select' || tool === 'add-state'}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        nodeDragThreshold={2}
        zoomOnDoubleClick={false}
        deleteKeyCode={null}
        selectionKeyCode={null}
        multiSelectionKeyCode={null}
        fitView
        fitViewOptions={FIT_VIEW}
        minZoom={0.3}
        maxZoom={2.5}
      >
        <Background variant={BackgroundVariant.Dots} gap={22} size={1.3} color="var(--canvas-dot)" />
        <Controls showInteractive={false} position="bottom-left" fitViewOptions={FIT_VIEW} />
        {pendingFrom !== null && <PendingLink from={pendingFrom} />}
      </ReactFlow>
      <EmptyHint visible={automaton.states.length === 0} />
      <SymbolDialog />
    </div>
  )
}

function EmptyHint({ visible }: { visible: boolean }) {
  return (
    <div
      aria-hidden={!visible}
      className="pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-200 ease-(--ease-out)"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <p className="text-sm text-muted-foreground">
        Dê dois cliques no fundo para criar um estado
      </p>
    </div>
  )
}
