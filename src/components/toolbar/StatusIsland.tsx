import { TriangleAlertIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useAnalysis } from '@/hooks/use-analysis'
import { useEditor } from '@/store/editor'
import { islandDetails, islandStatus } from './status'

/** Mola com cara de Dynamic Island: assenta em ~250ms, quase sem quique. */
const MORPH = { type: 'spring', visualDuration: 0.25, bounce: 0.15 } as const
const FADE = { duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const

/**
 * Barra de status no topo do canvas. Mudanças de texto trocam na hora (vêm de edições, muitas
 * pelo teclado); só a expansão ao passar o mouse anima, por isso `layoutDependency={expanded}`.
 */
export function StatusIsland() {
  const { automaton, analysis } = useAnalysis()
  const simulation = useEditor((s) => s.simulation)
  const status = islandStatus(automaton, analysis, simulation)
  const details = useMemo(() => islandDetails(automaton, analysis), [automaton, analysis])
  const [hovered, setHovered] = useState(false)
  const expanded = hovered && details.length > 0

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <motion.div
        layout
        layoutDependency={expanded}
        transition={MORPH}
        data-tone={status.tone}
        data-expanded={expanded}
        data-testid="status-island"
        onHoverStart={() => setHovered(true)}
        onHoverEnd={() => setHovered(false)}
        onPointerUp={(event) => {
          if (event.pointerType !== 'mouse') setHovered((h) => !h)
        }}
        style={{ borderRadius: 20 }}
        className="status-island pointer-events-auto max-w-full overflow-hidden bg-neutral-950 text-neutral-100 shadow-[0_6px_20px_oklch(0_0_0/18%),0_0_0_1px_oklch(1_0_0/6%)_inset]"
      >
        <motion.div
          layout="position"
          layoutDependency={expanded}
          transition={MORPH}
          className="flex h-9 items-center gap-2 px-4"
        >
          <span className="status-dot size-2 shrink-0 rounded-full" aria-hidden />
          <span
            role="status"
            data-testid="status-text"
            className="status-text truncate text-[13px] font-medium whitespace-nowrap"
          >
            {status.text}
          </span>
          {details.length > 0 && (
            <span
              className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-neutral-300 tabular-nums"
              aria-label={`${details.length} avisos`}
            >
              <TriangleAlertIcon className="size-3" aria-hidden />
              {details.length}
            </span>
          )}
        </motion.div>

        <AnimatePresence initial={false} mode="popLayout">
          {expanded && (
            <motion.ul
              key="details"
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.1 } }}
              transition={FADE}
              className="flex w-72 max-w-full flex-col gap-1.5 px-4 pt-0.5 pb-3.5"
              data-testid="status-details"
            >
              {details.map((line) => (
                <li key={line} className="flex items-start gap-2 text-[12.5px] leading-snug text-neutral-300">
                  <span className="mt-[7px] size-1 shrink-0 rounded-full bg-neutral-500" aria-hidden />
                  {line}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
