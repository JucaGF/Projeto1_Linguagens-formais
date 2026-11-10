import {
  type EdgeGeometry,
  edgeGeometry,
  formatNumber,
  initialArrowPath,
  selfLoopGeometry,
  STATE_RADIUS,
} from './geometry'
import { formatSymbols } from './symbols'
import type { Automaton, State, Transition } from './types'

const MARGIN = 60
const EMPTY_SIZE = 200
const ACCEPTING_RING_INSET = 5
const STROKE_WIDTH = 1.5
const STATE_FONT_SIZE = 16
const EDGE_FONT_SIZE = 14
const LABEL_HALO_WIDTH = 4
const TEXT_CENTERING = '0.35em'
const FONT_FAMILY = 'Georgia, Times New Roman, Times, serif'
const ARROW_URL = 'url(#arrow)'

const ARROW_DEFS = `<defs>
<marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
<path d="M 0 0 L 10 5 L 0 10 z" fill="#000"/>
</marker>
</defs>`

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const escapeXml = (text: string) => text.replace(/[&<>"']/g, (char) => XML_ESCAPES[char])

type Attributes = Record<string, string | number>

const attributeValue = (value: string | number) =>
  typeof value === 'number' ? formatNumber(value) : escapeXml(value)

const attributes = (attrs: Attributes) =>
  Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${attributeValue(value)}"`)
    .join('')

const leaf = (name: string, attrs: Attributes) => `<${name}${attributes(attrs)}/>`

const text = (attrs: Attributes, content: string) =>
  `<text${attributes(attrs)}>${escapeXml(content)}</text>`

const group = (attrs: Attributes, children: string[]) =>
  `<g${attributes(attrs)}>\n${children.join('\n')}\n</g>`

interface Box {
  x: number
  y: number
  width: number
  height: number
}

function boundingBox(states: State[]): Box {
  if (states.length === 0) return { x: 0, y: 0, width: EMPTY_SIZE, height: EMPTY_SIZE }
  const pad = STATE_RADIUS + MARGIN
  const left = Math.min(...states.map((s) => s.x)) - pad
  const top = Math.min(...states.map((s) => s.y)) - pad
  const right = Math.max(...states.map((s) => s.x)) + pad
  const bottom = Math.max(...states.map((s) => s.y)) + pad
  return { x: left, y: top, width: right - left, height: bottom - top }
}

/** Laço quando `from === to`; curva quando existe a transição inversa, para o par não se sobrepor. */
function transitionGeometry(a: Automaton, t: Transition, from: State, to: State): EdgeGeometry {
  if (t.from === t.to) return selfLoopGeometry(from)
  const curved = a.transitions.some((other) => other.from === t.to && other.to === t.from)
  return edgeGeometry(from, to, curved)
}

/** SVG autônomo do autômato: fundo branco, fonte serifada e a mesma geometria da tela. */
export function toSvg(a: Automaton): string {
  const box = boundingBox(a.states)
  const statesById = new Map(a.states.map((s) => [s.id, s]))

  const edgePaths: string[] = []
  const edgeLabels: string[] = []
  for (const t of a.transitions) {
    const from = statesById.get(t.from)
    const to = statesById.get(t.to)
    if (!from || !to) continue
    const { path, labelX, labelY } = transitionGeometry(a, t, from, to)
    edgePaths.push(leaf('path', { d: path, 'marker-end': ARROW_URL }))
    edgeLabels.push(text({ x: labelX, y: labelY, dy: TEXT_CENTERING }, formatSymbols(t.symbols)))
  }

  const initialArrows = a.states
    .filter((s) => s.isInitial)
    .map((s) => leaf('path', { d: initialArrowPath(s), 'marker-end': ARROW_URL }))

  const circles = a.states.flatMap((s) => [
    leaf('circle', { cx: s.x, cy: s.y, r: STATE_RADIUS }),
    ...(s.isAccepting
      ? [leaf('circle', { cx: s.x, cy: s.y, r: STATE_RADIUS - ACCEPTING_RING_INSET, fill: 'none' })]
      : []),
  ])

  const stateLabels = a.states.map((s) => text({ x: s.x, y: s.y, dy: TEXT_CENTERING }, s.label))

  const viewBox = [box.x, box.y, box.width, box.height].map(formatNumber).join(' ')
  const root = attributes({
    xmlns: 'http://www.w3.org/2000/svg',
    width: box.width,
    height: box.height,
    viewBox,
    'font-family': FONT_FAMILY,
    'font-size': STATE_FONT_SIZE,
    'text-anchor': 'middle',
  })

  return [
    `<svg${root}>`,
    ARROW_DEFS,
    leaf('rect', { ...box, fill: '#fff' }),
    group({ fill: 'none', stroke: '#000', 'stroke-width': STROKE_WIDTH }, [
      ...edgePaths,
      ...initialArrows,
    ]),
    group({ fill: '#fff', stroke: '#000', 'stroke-width': STROKE_WIDTH }, circles),
    group(
      {
        'font-size': EDGE_FONT_SIZE,
        stroke: '#fff',
        'stroke-width': LABEL_HALO_WIDTH,
        'stroke-linejoin': 'round',
        'paint-order': 'stroke',
      },
      edgeLabels,
    ),
    group({}, stateLabels),
    '</svg>',
  ].join('\n')
}
