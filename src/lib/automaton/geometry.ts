import type { Automaton, Point, Transition } from './types'

export const STATE_RADIUS = 28
export const CURVE_OFFSET = 40

/** Folga entre a aresta e o ponto mais próximo da caixa do rótulo. */
export const LABEL_GAP = 3
const LOOP_RISE = 72
const LOOP_SPREAD = 40
const LOOP_START_ANGLE = (-2 * Math.PI) / 3
const LOOP_END_ANGLE = -Math.PI / 3
const INITIAL_ARROW_LENGTH = 40
const UP: Point = { x: 0, y: -1 }

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
  /** Âncora do rótulo: a LABEL_GAP da aresta, do lado de `labelSide`. */
  labelX: number
  labelY: number
  /** Normal unitária que aponta da aresta para o rótulo. */
  labelSide: Point
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

const labelAt = (
  peak: Point,
  side: Point,
): Pick<EdgeGeometry, 'labelX' | 'labelY' | 'labelSide'> => ({
  labelX: round2(peak.x + side.x * LABEL_GAP),
  labelY: round2(peak.y + side.y * LABEL_GAP),
  labelSide: side,
})

/**
 * Centro de uma caixa `width × height` encostada na âncora: o ponto da caixa mais próximo da
 * aresta fica na âncora, então a caixa inteira fica a LABEL_GAP da aresta em qualquer ângulo.
 */
export function labelCenter(g: EdgeGeometry, width: number, height: number): Point {
  const { x: sx, y: sy } = g.labelSide
  const reach = (Math.abs(sx) * width + Math.abs(sy) * height) / 2
  return { x: g.labelX + sx * reach, y: g.labelY + sy * reach }
}

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
      ...labelAt(middle, normal),
    }
  }

  const control = along(middle, normal, CURVE_OFFSET)
  const start = along(from, direction(from, control), STATE_RADIUS)
  const end = along(to, direction(to, control), STATE_RADIUS)
  // ponto da curva em t = 1/2, onde ela mais se afasta da reta entre os estados
  const peak = {
    x: (start.x + 2 * control.x + end.x) / 4,
    y: (start.y + 2 * control.y + end.y) / 4,
  }
  return {
    path: `M ${coords(start)} Q ${coords(control)} ${coords(end)}`,
    ...labelAt(peak, normal),
  }
}

/** Laço acima do estado: sai da borda a -120° e chega a -60°. */
export function selfLoopGeometry(center: Point): EdgeGeometry {
  const start = onCircle(center, LOOP_START_ANGLE)
  const end = onCircle(center, LOOP_END_ANGLE)
  const control1 = { x: center.x - LOOP_SPREAD, y: center.y - LOOP_RISE }
  const control2 = { x: center.x + LOOP_SPREAD, y: center.y - LOOP_RISE }
  // topo da cúbica simétrica, em t = 1/2
  const peak = { x: center.x, y: (start.y + 3 * control1.y + 3 * control2.y + end.y) / 8 }
  return {
    path: `M ${coords(start)} C ${coords(control1)} ${coords(control2)} ${coords(end)}`,
    ...labelAt(peak, UP),
  }
}

/** Seta de entrada do estado inicial: vem da esquerda, na altura do centro, até a borda. */
export function initialArrowPath(center: Point): string {
  const end = { x: center.x - STATE_RADIUS, y: center.y }
  const start = { x: end.x - INITIAL_ARROW_LENGTH, y: end.y }
  return `M ${coords(start)} L ${coords(end)}`
}
