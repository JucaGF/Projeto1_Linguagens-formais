import type { Automaton, Point, Transition } from './types'

export const STATE_RADIUS = 28
export const CURVE_OFFSET = 40

const LABEL_GAP = 12
const LOOP_RISE = 72
const LOOP_SPREAD = 40
const LOOP_START_ANGLE = (-2 * Math.PI) / 3
const LOOP_END_ANGLE = -Math.PI / 3
const INITIAL_ARROW_LENGTH = 40

const LAYOUT_CENTER: Point = { x: 320, y: 260 }
const LAYOUT_RADIUS = 180

/** Distribui `count` estados num círculo, o primeiro à esquerda e os seguintes no sentido horário da tela. */
export function circleLayout(count: number, index: number): Point {
  const angle = Math.PI + (2 * Math.PI * index) / count
  return {
    x: Math.round(LAYOUT_CENTER.x + LAYOUT_RADIUS * Math.cos(angle)),
    y: Math.round(LAYOUT_CENTER.y + LAYOUT_RADIUS * Math.sin(angle)),
  }
}

export type TransitionShape = 'loop' | 'curved' | 'straight'

/** Laço quando `from === to`; curva quando existe a transição inversa, para o par não se sobrepor. */
export function transitionShape(a: Automaton, t: Transition): TransitionShape {
  if (t.from === t.to) return 'loop'
  return a.transitions.some((other) => other.from === t.to && other.to === t.from)
    ? 'curved'
    : 'straight'
}

export interface EdgeGeometry {
  path: string
  labelX: number
  labelY: number
}

function round2(n: number): number {
  const rounded = Math.round(n * 100) / 100
  return rounded === 0 ? 0 : rounded
}

/** Número com no máximo 2 casas e sem zeros à direita, como vai nos atributos do SVG. */
export function formatNumber(n: number): string {
  return String(round2(n))
}

const coords = (p: Point) => `${formatNumber(p.x)} ${formatNumber(p.y)}`

function direction(from: Point, to: Point): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y)
  if (length === 0) return { x: 1, y: 0 }
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
}

const along = (p: Point, dir: Point, distance: number): Point => ({
  x: p.x + dir.x * distance,
  y: p.y + dir.y * distance,
})

const onCircle = (center: Point, angle: number): Point => ({
  x: center.x + STATE_RADIUS * Math.cos(angle),
  y: center.y + STATE_RADIUS * Math.sin(angle),
})

const labelAt = (p: Point): Pick<EdgeGeometry, 'labelX' | 'labelY'> => ({
  labelX: round2(p.x),
  labelY: round2(p.y),
})

/**
 * Aresta entre dois estados, de borda a borda. Curva (Q) para o lado da perpendicular
 * (dy, -dx)/|d| de `from → to`, de modo que um par de ida e volta se separa sozinho.
 */
export function edgeGeometry(from: Point, to: Point, curved: boolean): EdgeGeometry {
  const dir = direction(from, to)
  const normal = { x: dir.y, y: -dir.x }
  const middle = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }

  if (!curved) {
    const start = along(from, dir, STATE_RADIUS)
    const end = along(to, dir, -STATE_RADIUS)
    return {
      path: `M ${coords(start)} L ${coords(end)}`,
      ...labelAt(along(middle, normal, LABEL_GAP)),
    }
  }

  const control = along(middle, normal, CURVE_OFFSET)
  const start = along(from, direction(from, control), STATE_RADIUS)
  const end = along(to, direction(to, control), STATE_RADIUS)
  return {
    path: `M ${coords(start)} Q ${coords(control)} ${coords(end)}`,
    ...labelAt(along(middle, normal, CURVE_OFFSET / 2 + LABEL_GAP)),
  }
}

/** Laço acima do estado: sai da borda a -120° e chega a -60°. */
export function selfLoopGeometry(center: Point): EdgeGeometry {
  const start = onCircle(center, LOOP_START_ANGLE)
  const end = onCircle(center, LOOP_END_ANGLE)
  const control1 = { x: center.x - LOOP_SPREAD, y: center.y - LOOP_RISE }
  const control2 = { x: center.x + LOOP_SPREAD, y: center.y - LOOP_RISE }
  return {
    path: `M ${coords(start)} C ${coords(control1)} ${coords(control2)} ${coords(end)}`,
    ...labelAt({ x: center.x, y: center.y - LOOP_RISE }),
  }
}

/** Seta de entrada do estado inicial: vem da esquerda, na altura do centro, até a borda. */
export function initialArrowPath(center: Point): string {
  const end = { x: center.x - STATE_RADIUS, y: center.y }
  const start = { x: end.x - INITIAL_ARROW_LENGTH, y: end.y }
  return `M ${coords(start)} L ${coords(end)}`
}
