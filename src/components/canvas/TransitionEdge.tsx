import { EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import { useReducedMotion } from 'motion/react'
import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import { edgeGeometry, labelCenter, selfLoopGeometry } from '@/lib/automaton/geometry'
import { formatSymbols } from '@/lib/automaton/symbols'
import type { State, StateId } from '@/lib/automaton/types'
import { useEditor } from '@/store/editor'
import { InlineInput } from './InlineInput'
import { arrowUrl, type EdgeTone } from './markers'
import type { TransitionEdgeData, TransitionFlowEdge } from './toFlow'

const INTERACTION_WIDTH = 16

function toneOf(data: TransitionEdgeData): EdgeTone {
  if (data.firing) return 'firing'
  if (data.selected) return 'selected'
  if (data.conflict) return 'conflict'
  return 'default'
}

interface Size {
  width: number
  height: number
}

/** Tamanho de layout do elemento (sem o zoom do canvas), atualizado quando ele muda. */
function useSize(): [Size, (element: HTMLElement | null) => (() => void) | undefined] {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const measure = useCallback((element: HTMLElement | null) => {
    if (element === null) return
    const update = () => {
      const width = element.offsetWidth
      const height = element.offsetHeight
      setSize((s) => (s.width === width && s.height === height ? s : { width, height }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [size, measure]
}

/** Mesma curva do `--ease-in-out` forte: movimento na tela acelera e desacelera. */
const TOKEN_EASE = '0.77 0 0.175 1'

/**
 * A cópia viajando pela aresta no passo atual. `begin="indefinite"` + `beginElement()` porque
 * uma animação SMIL inserida depois do carregamento do `<svg>` contaria o tempo desde o início
 * do documento e já nasceria no fim.
 */
function Token({ path }: { path: string }) {
  const start = useCallback((token: SVGCircleElement | null) => {
    token?.querySelectorAll('animate, animateMotion').forEach((animation) => {
      ;(animation as SVGAnimationElement).beginElement()
    })
  }, [])
  return (
    <circle ref={start} className="edge-token" r={6} opacity={0}>
      <animateMotion
        dur="0.6s"
        fill="freeze"
        begin="indefinite"
        path={path}
        calcMode="spline"
        keyPoints="0;1"
        keyTimes="0;1"
        keySplines={TOKEN_EASE}
      />
      <animate
        attributeName="opacity"
        dur="0.6s"
        fill="freeze"
        begin="indefinite"
        values="0;1;1;0"
        keyTimes="0;0.12;0.82;1"
      />
    </circle>
  )
}

const labelOf = (states: State[], id: StateId) => states.find((s) => s.id === id)?.label ?? '?'

export function TransitionEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps<TransitionFlowEdge>) {
  const [editing, setEditing] = useState(false)
  const [labelSize, measureLabel] = useSize()
  const reduceMotion = useReducedMotion()
  const labelRef = useRef<HTMLDivElement>(null)
  const attachLabel = useCallback(
    (element: HTMLDivElement | null) => {
      labelRef.current = element
      return measureLabel(element)
    },
    [measureLabel],
  )
  const from = useEditor((s) => labelOf(s.automaton.states, source))
  const to = useEditor((s) => labelOf(s.automaton.states, target))
  if (!data) return null

  const startEditing = () => {
    if (useEditor.getState().tool === 'select') setEditing(true)
  }

  // Enter age como o clique; Enter de novo numa transição já selecionada (ou F2) edita
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (
      useEditor.getState().tool === 'select' &&
      (event.key === 'F2' || (event.key === 'Enter' && data.selected))
    ) {
      event.preventDefault()
      setEditing(true)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      useEditor.getState().clickTransition(id)
    }
  }

  const origin = { x: sourceX, y: sourceY }
  const geometry = data.selfLoop
    ? selfLoopGeometry(origin)
    : edgeGeometry(origin, { x: targetX, y: targetY }, data.curved)
  const { path } = geometry
  const label = labelCenter(geometry, labelSize.width, labelSize.height)
  const tone = toneOf(data)
  const text = formatSymbols(data.symbols)

  return (
    <>
      <path className="transition-path edge-tone" data-tone={tone} d={path} markerEnd={arrowUrl(tone)} />
      <path
        className="react-flow__edge-interaction"
        d={path}
        fill="none"
        strokeOpacity={0}
        strokeWidth={INTERACTION_WIDTH}
      />
      {data.firing && !reduceMotion && <Token key={data.stepKey} path={path} />}
      <EdgeLabelRenderer>
        <div
          ref={attachLabel}
          role="button"
          tabIndex={0}
          aria-label={`Transição de ${from} para ${to}: ${text}`}
          className="edge-label edge-tone nodrag nopan"
          data-tone={tone}
          style={{ transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)` }}
          onClick={() => useEditor.getState().clickTransition(id)}
          onDoubleClick={startEditing}
          onKeyDown={onKeyDown}
        >
          {editing ? (
            <InlineInput
              initial={text}
              label="Símbolos da transição"
              apply={(input) => useEditor.getState().setTransitionSymbols(id, input)}
              close={(byKeyboard) => {
                setEditing(false)
                if (byKeyboard) labelRef.current?.focus()
              }}
              style={{ width: Math.max(56, text.length * 9 + 24), height: 26, fontSize: 15 }}
            />
          ) : (
            <span className="edge-label-text">{text}</span>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
