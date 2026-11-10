import { describe, expect, it } from 'vitest'
import { build } from '@/lib/automaton/build'
import { STATE_RADIUS } from '@/lib/automaton/geometry'
import { PDF_EXAMPLE } from '@/examples'
import { type FlowContext, toFlowEdges, toFlowNodes } from './toFlow'

const context = (patch: Partial<FlowContext> = {}): FlowContext => ({
  selection: null,
  pendingFrom: null,
  active: new Set(),
  died: new Set(),
  fired: new Set(),
  conflicts: new Set(),
  stepKey: 0,
  ...patch,
})

const edgeFlags = (a: Parameters<typeof toFlowEdges>[0], ctx = context()) =>
  Object.fromEntries(
    toFlowEdges(a, ctx).map((e) => [`${e.source}>${e.target}`, e.data]),
  )

describe('toFlowNodes', () => {
  it('posiciona o nó pelo canto, a STATE_RADIUS do centro do estado', () => {
    const q0 = PDF_EXAMPLE.states.find((s) => s.id === 'q0')!
    const node = toFlowNodes(PDF_EXAMPLE, context()).find((n) => n.id === 'q0')!
    expect(node.type).toBe('state')
    expect(node.position).toEqual({ x: q0.x - STATE_RADIUS, y: q0.y - STATE_RADIUS })
  })

  it('declara um handle de origem e um de destino, de tamanho zero, no centro do nó', () => {
    const [node] = toFlowNodes(PDF_EXAMPLE, context())
    const center = { x: STATE_RADIUS, y: STATE_RADIUS, width: 0, height: 0 }
    expect(node.handles).toEqual([
      expect.objectContaining({ type: 'source', ...center }),
      expect.objectContaining({ type: 'target', ...center }),
    ])
  })

  it('leva rótulo, inicial e aceitação do estado', () => {
    const nodes = toFlowNodes(PDF_EXAMPLE, context())
    expect(nodes.map((n) => [n.id, n.data.label, n.data.isInitial, n.data.isAccepting])).toEqual([
      ['q0', 'q0', true, false],
      ['q1', 'q1', false, true],
    ])
  })

  it('marca seleção, origem pendente e os destaques da simulação, com o stepKey', () => {
    const nodes = toFlowNodes(
      PDF_EXAMPLE,
      context({
        selection: { kind: 'state', id: 'q1' },
        pendingFrom: 'q0',
        active: new Set(['q1']),
        died: new Set(['q0']),
        stepKey: 3,
      }),
    )
    const flags = Object.fromEntries(
      nodes.map((n) => [n.id, [n.data.selected, n.data.pending, n.data.active, n.data.died]]),
    )
    expect(flags).toEqual({ q0: [false, true, false, true], q1: [true, false, true, false] })
    expect(nodes.every((n) => n.data.stepKey === 3)).toBe(true)
  })

  it('não marca um estado quando a seleção é uma transição de mesmo id', () => {
    const nodes = toFlowNodes(PDF_EXAMPLE, context({ selection: { kind: 'transition', id: 'q0' } }))
    expect(nodes.every((n) => !n.data.selected)).toBe(true)
  })
})

describe('toFlowEdges', () => {
  it('curva as duas arestas de um par de ida e volta', () => {
    const flags = edgeFlags(
      build({ states: ['q0', 'q1'], transitions: [['q0', 'a', 'q1'], ['q1', 'b', 'q0']] }),
    )
    expect(flags['q0>q1']).toMatchObject({ curved: true, selfLoop: false })
    expect(flags['q1>q0']).toMatchObject({ curved: true, selfLoop: false })
  })

  it('deixa reta uma aresta sem a inversa', () => {
    const flags = edgeFlags(build({ states: ['q0', 'q1'], transitions: [['q0', 'a', 'q1']] }))
    expect(flags['q0>q1']).toMatchObject({ curved: false, selfLoop: false })
  })

  it('marca o laço', () => {
    const flags = edgeFlags(build({ states: ['q0'], transitions: [['q0', 'a,b', 'q0']] }))
    expect(flags['q0>q0']).toMatchObject({ selfLoop: true, curved: false, symbols: ['a', 'b'] })
  })

  it('gera uma aresta do tipo transition por transição, com o id dela', () => {
    const edges = toFlowEdges(PDF_EXAMPLE, context())
    expect(edges.map((e) => e.id)).toEqual(PDF_EXAMPLE.transitions.map((t) => t.id))
    expect(edges.every((e) => e.type === 'transition')).toBe(true)
  })

  it('marca disparo, conflito, seleção e repassa o stepKey', () => {
    const [first, second] = PDF_EXAMPLE.transitions
    const edges = toFlowEdges(
      PDF_EXAMPLE,
      context({
        fired: new Set([first.id]),
        conflicts: new Set([second.id]),
        selection: { kind: 'transition', id: second.id },
        stepKey: 7,
      }),
    )
    const byId = new Map(edges.map((e) => [e.id, e.data!]))
    expect(byId.get(first.id)).toMatchObject({ firing: true, conflict: false, selected: false })
    expect(byId.get(second.id)).toMatchObject({ firing: false, conflict: true, selected: true })
    expect(edges.every((e) => e.data!.stepKey === 7)).toBe(true)
  })
})
