import { Handle, type NodeProps, Position } from '@xyflow/react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { type CSSProperties, type KeyboardEvent, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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
import { arrowUrl } from './markers'
import { InlineInput } from './InlineInput'
import type { StateFlowNode, StateNodeData } from './toFlow'

const CENTER = { x: STATE_RADIUS, y: STATE_RADIUS }
const ACCEPTING_RING_INSET = 5
const HALO_GAP = 5
const DIED_PULSE_SCALE = 1.5

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

const PULSE_EASE = [0.23, 1, 0.32, 1] as const
const PULSE_ORIGIN: CSSProperties = { transformBox: 'fill-box', transformOrigin: 'center' }

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
        transition={{ duration: 0.3, ease: PULSE_EASE }}
      />
    )
  }
  return (
    <motion.circle
      cx={CENTER.x}
      cy={CENTER.y}
      r={STATE_RADIUS}
      fill="none"
      stroke="var(--canvas-died)"
      strokeWidth={2.5}
      vectorEffect="non-scaling-stroke"
      style={PULSE_ORIGIN}
      initial={{ scale: 1, opacity: 0.9 }}
      animate={{ scale: DIED_PULSE_SCALE, opacity: 0 }}
      transition={{ duration: 0.3, ease: PULSE_EASE }}
    />
  )
}

/** Abre o menu de contexto do Radix, que só escuta o evento do ponteiro, a partir do teclado. */
function openContextMenu(element: HTMLElement) {
  const box = element.getBoundingClientRect()
  element.dispatchEvent(
    new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: box.left + box.width / 2,
      clientY: box.top + box.height / 2,
    }),
  )
}

function describeState(data: StateNodeData): string {
  const roles = [data.isInitial && 'inicial', data.isAccepting && 'de aceitação'].filter(Boolean)
  return ['Estado ' + data.label, ...roles].join(', ')
}

export function StateNode({ id, data }: NodeProps<StateFlowNode>) {
  const [renaming, setRenaming] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)
  // "Renomear" no menu só abre o campo quando o menu devolve o foco; antes disso o menu o tomaria
  const renameAfterMenu = useRef(false)

  const startRename = () => {
    if (useEditor.getState().tool === 'select') setRenaming(true)
  }

  // Enter age como o clique; Enter de novo num estado já selecionado (ou F2) renomeia
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return
    if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
      event.preventDefault()
      openContextMenu(event.currentTarget)
    } else if (
      useEditor.getState().tool === 'select' &&
      (event.key === 'F2' || (event.key === 'Enter' && data.selected))
    ) {
      event.preventDefault()
      setRenaming(true)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      useEditor.getState().clickState(id)
    }
  }

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) useEditor.getState().select({ kind: 'state', id })
      }}
    >
      <ContextMenuTrigger asChild>
        <div
          ref={nodeRef}
          role={renaming ? undefined : 'button'}
          tabIndex={renaming ? undefined : 0}
          aria-label={renaming ? undefined : describeState(data)}
          className="state-node"
          data-selected={data.selected}
          data-pending={data.pending}
          data-active={data.active}
          data-entering={data.entering}
          onDoubleClick={startRename}
          onKeyDown={onKeyDown}
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
            {data.died && <DiedPulse key={data.stepKey} />}
          </svg>
          {renaming ? (
            <InlineInput
              initial={data.label}
              label="Nome do estado"
              apply={(label) => useEditor.getState().renameState(id, label)}
              close={(byKeyboard) => {
                flushSync(() => setRenaming(false))
                if (byKeyboard) nodeRef.current?.focus()
              }}
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
          else nodeRef.current?.focus()
          renameAfterMenu.current = false
        }}
      >
        <ContextMenuCheckboxItem
          checked={data.isInitial}
          disabled={data.isInitial}
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
