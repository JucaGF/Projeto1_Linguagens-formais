import { Handle, type NodeProps, Position } from '@xyflow/react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { type CSSProperties, useRef, useState } from 'react'
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { initialArrowPath, STATE_RADIUS } from '@/lib/automaton/geometry'
import { useEditor } from '@/store/editor'
import { arrowUrl } from './ArrowDefs'
import { InlineInput } from './InlineInput'
import type { StateFlowNode } from './toFlow'

const CENTER = { x: STATE_RADIUS, y: STATE_RADIUS }
const ACCEPTING_RING_INSET = 5
const HALO_GAP = 5
const DIED_PULSE_RADIUS = STATE_RADIUS + 14

/** Handle de tamanho zero no centro: o React Flow passa o centro do estado para as arestas. */
const CENTER_HANDLE: CSSProperties = {
  top: '50%',
  left: '50%',
  width: 0,
  height: 0,
  minWidth: 0,
  minHeight: 0,
  border: 0,
  opacity: 0,
}

const RENAME_INPUT: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  width: 76,
  height: 30,
  transform: 'translate(-50%, -50%)',
  fontSize: 16,
}

function DiedPulse() {
  const reduceMotion = useReducedMotion()
  if (reduceMotion) {
    return (
      <motion.circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={STATE_RADIUS}
        fill="var(--canvas-died)"
        initial={{ opacity: 0.35 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      />
    )
  }
  return (
    <motion.circle
      cx={CENTER.x}
      cy={CENTER.y}
      fill="none"
      stroke="var(--canvas-died)"
      strokeWidth={2.5}
      initial={{ r: STATE_RADIUS, opacity: 0.9 }}
      animate={{ r: DIED_PULSE_RADIUS, opacity: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    />
  )
}

export function StateNode({ id, data }: NodeProps<StateFlowNode>) {
  const [renaming, setRenaming] = useState(false)
  // "Renomear" no menu só abre o campo quando o menu devolve o foco; antes disso o menu o tomaria
  const renameAfterMenu = useRef(false)

  const startRename = () => {
    if (useEditor.getState().tool === 'select') setRenaming(true)
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) useEditor.getState().select({ kind: 'state', id })
      }}
    >
      <ContextMenuTrigger asChild>
        <div
          className="state-node"
          data-selected={data.selected}
          data-pending={data.pending}
          data-active={data.active}
          onDoubleClick={startRename}
        >
          <svg width={2 * STATE_RADIUS} height={2 * STATE_RADIUS} aria-hidden>
            {data.isInitial && (
              <path
                className="state-initial"
                d={initialArrowPath(CENTER)}
                markerEnd={arrowUrl('default')}
              />
            )}
            <circle
              className="state-halo"
              cx={CENTER.x}
              cy={CENTER.y}
              r={STATE_RADIUS + HALO_GAP}
            />
            <circle className="state-circle" cx={CENTER.x} cy={CENTER.y} r={STATE_RADIUS} />
            {data.isAccepting && (
              <circle
                className="state-ring"
                cx={CENTER.x}
                cy={CENTER.y}
                r={STATE_RADIUS - ACCEPTING_RING_INSET}
              />
            )}
            {data.died && <DiedPulse />}
          </svg>
          {renaming ? (
            <InlineInput
              initial={data.label}
              label="Nome do estado"
              apply={(label) => useEditor.getState().renameState(id, label)}
              close={() => setRenaming(false)}
              style={RENAME_INPUT}
            />
          ) : (
            <span className="state-label">{data.label}</span>
          )}
          <Handle type="target" position={Position.Top} isConnectable={false} style={CENTER_HANDLE} />
          <Handle type="source" position={Position.Top} isConnectable={false} style={CENTER_HANDLE} />
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent
        className="w-52"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          if (renameAfterMenu.current) setRenaming(true)
          renameAfterMenu.current = false
        }}
      >
        <ContextMenuCheckboxItem
          checked={data.isInitial}
          onSelect={() => useEditor.getState().setInitial(id)}
        >
          Marcar como inicial
        </ContextMenuCheckboxItem>
        <ContextMenuCheckboxItem
          checked={data.isAccepting}
          onSelect={() => useEditor.getState().toggleAccepting(id)}
        >
          Alternar aceitação
        </ContextMenuCheckboxItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => (renameAfterMenu.current = true)}>
          <PencilIcon />
          Renomear
        </ContextMenuItem>
        <ContextMenuItem variant="destructive" onSelect={() => useEditor.getState().removeState(id)}>
          <Trash2Icon />
          Excluir
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
