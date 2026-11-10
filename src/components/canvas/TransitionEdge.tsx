import { EdgeLabelRenderer, type EdgeProps } from '@xyflow/react'
import { useState } from 'react'
import { edgeGeometry, selfLoopGeometry } from '@/lib/automaton/geometry'
import { formatSymbols } from '@/lib/automaton/symbols'
import { useEditor } from '@/store/editor'
import { arrowUrl, type EdgeTone } from './ArrowDefs'
import { InlineInput } from './InlineInput'
import type { TransitionEdgeData, TransitionFlowEdge } from './toFlow'

const INTERACTION_WIDTH = 16

function toneOf(data: TransitionEdgeData): EdgeTone {
  if (data.firing) return 'firing'
  if (data.selected) return 'selected'
  if (data.conflict) return 'conflict'
  return 'default'
}

export function TransitionEdge({ id, sourceX, sourceY, targetX, targetY, data }: EdgeProps<TransitionFlowEdge>) {
  const [editing, setEditing] = useState(false)
  if (!data) return null

  const source = { x: sourceX, y: sourceY }
  const { path, labelX, labelY } = data.selfLoop
    ? selfLoopGeometry(source)
    : edgeGeometry(source, { x: targetX, y: targetY }, data.curved)
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
          className="edge-label edge-tone nodrag nopan"
          data-tone={tone}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
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
