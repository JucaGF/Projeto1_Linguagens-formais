import { EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import { useCallback, useState } from 'react'
import { edgeGeometry, labelCenter, selfLoopGeometry } from '@/lib/automaton/geometry'
import { formatSymbols } from '@/lib/automaton/symbols'
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

export function TransitionEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<TransitionFlowEdge>) {
  const [editing, setEditing] = useState(false)
  const [labelSize, measureLabel] = useSize()
  if (!data) return null

  const source = { x: sourceX, y: sourceY }
  const geometry = data.selfLoop
    ? selfLoopGeometry(source)
    : edgeGeometry(source, { x: targetX, y: targetY }, data.curved)
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
      <EdgeLabelRenderer>
        <div
          ref={measureLabel}
          className="edge-label edge-tone nodrag nopan"
          data-tone={tone}
          style={{ transform: `translate(-50%, -50%) translate(${label.x}px, ${label.y}px)` }}
          onClick={() => useEditor.getState().clickTransition(id)}
          onDoubleClick={() => {
            if (useEditor.getState().tool === 'select') setEditing(true)
          }}
        >
          {editing ? (
            <InlineInput
              initial={text}
              label="Símbolos da transição"
              apply={(input) => useEditor.getState().setTransitionSymbols(id, input)}
              close={() => setEditing(false)}
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
