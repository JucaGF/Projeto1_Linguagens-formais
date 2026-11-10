import { InfoIcon, TriangleAlertIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useId, useMemo, useRef, useState } from 'react'
import { useAnalysis } from '@/hooks/use-analysis'
import { useEditor } from '@/store/editor'
import { islandDetails, islandStatus, warningCount } from './status'

/** Mola com cara de Dynamic Island: assenta em ~250ms, quase sem quique. */
const MORPH = { type: 'spring', visualDuration: 0.25, bounce: 0.15 } as const
const FADE = { duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const

/**
 * Barra de status no topo do canvas. Mudanças de texto trocam na hora (vêm de edições, muitas
 * pelo teclado); só a expansão anima, por isso `layoutDependency={expanded}`. Expande ao passar
 * o mouse, ao focar pelo teclado, com Enter/Espaço e com toque.
 */
export function StatusIsland() {
  const { automaton, analysis } = useAnalysis()
  const simulation = useEditor((s) => s.simulation)
  const status = islandStatus(automaton, analysis, simulation)
  const { nfaReasons, warnings } = useMemo(
    () => islandDetails(automaton, analysis),
    [automaton, analysis],
  )
  const hasDetails = nfaReasons.length > 0 || warnings.length > 0
  const [open, setOpen] = useState(false)
  const expanded = open && hasDetails
  const detailsId = useId()
  const trigger = useRef<HTMLButtonElement>(null)

  const summary = (
    <>
      <span className="status-dot size-2 shrink-0 rounded-full" aria-hidden />
      <span data-testid="status-text" className="status-text truncate text-[13px] font-medium whitespace-nowrap">
        {status.text}
      </span>
      {warnings.length > 0 && (
        <span
          data-testid="status-warnings"
          className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-medium text-neutral-300 tabular-nums"
        >
          <TriangleAlertIcon className="size-3" aria-hidden />
          <span aria-hidden>{warnings.length}</span>
          <span className="sr-only">{warningCount(warnings.length)}</span>
        </span>
      )}
    </>
  )
  const rowClass = 'flex h-9 w-full items-center gap-2 px-4 text-left outline-none'

  return (
    <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <span role="status" className="sr-only">
        {status.text}
      </span>
      <motion.div
        layout
        layoutDependency={expanded}
        transition={MORPH}
        data-tone={status.tone}
        data-expanded={expanded}
        data-testid="status-island"
        onHoverStart={() => setOpen(true)}
        onHoverEnd={() => {
          // quem abriu pelo teclado não perde a expansão porque o mouse passou por cima
          if (!trigger.current?.matches(':focus-visible')) setOpen(false)
        }}
        style={{ borderRadius: 20 }}
        className="status-island pointer-events-auto max-w-full overflow-hidden bg-neutral-950 text-neutral-100 shadow-[0_6px_20px_oklch(0_0_0/18%),0_0_0_1px_oklch(1_0_0/6%)_inset] has-focus-visible:ring-2 has-focus-visible:ring-ring"
      >
        <motion.div layout="position" layoutDependency={expanded} transition={MORPH}>
          {hasDetails ? (
            <button
              ref={trigger}
              type="button"
              aria-expanded={expanded}
              aria-controls={expanded ? detailsId : undefined}
              data-testid="status-trigger"
              className={rowClass}
              onFocus={(event) => {
                if (event.currentTarget.matches(':focus-visible')) setOpen(true)
              }}
              onBlur={() => setOpen(false)}
              // clique de teclado (Enter/Espaço) chega com detail 0; o mouse já expande no hover
              onClick={(event) => {
                if (event.detail === 0) setOpen((o) => !o)
              }}
              onPointerUp={(event) => {
                if (event.pointerType !== 'mouse') setOpen((o) => !o)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false)
              }}
            >
              {summary}
            </button>
          ) : (
            <div className={rowClass}>{summary}</div>
          )}
        </motion.div>

        <AnimatePresence initial={false} mode="popLayout">
          {expanded && (
            <motion.div
              key="details"
              id={detailsId}
              initial={{ opacity: 0, filter: 'blur(4px)' }}
              animate={{ opacity: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, filter: 'blur(4px)', transition: { duration: 0.1 } }}
              transition={FADE}
              className="flex w-72 max-w-full flex-col gap-3 px-4 pt-0.5 pb-3.5"
              data-testid="status-details"
            >
              {nfaReasons.length > 0 && (
                <DetailGroup
                  icon={<InfoIcon className="size-3.5" aria-hidden />}
                  title="Por que é AFN"
                  lines={nfaReasons}
                  testId="status-nfa-reasons"
                />
              )}
              {warnings.length > 0 && (
                <DetailGroup
                  icon={<TriangleAlertIcon className="size-3.5 text-(--status-warn)" aria-hidden />}
                  title={warningCount(warnings.length)}
                  lines={warnings}
                  testId="status-warning-list"
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

function DetailGroup({
  icon,
  title,
  lines,
  testId,
}: {
  icon: ReactNode
  title: string
  lines: string[]
  testId: string
}) {
  return (
    <section className="flex flex-col gap-1.5" data-testid={testId}>
      <h3 className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-neutral-400 uppercase">
        {icon}
        {title}
      </h3>
      <ul className="flex flex-col gap-1">
        {lines.map((line) => (
          <li key={line} className="flex items-start gap-2 text-[12.5px] leading-snug text-neutral-300">
            <span className="mt-[7px] size-1 shrink-0 rounded-full bg-neutral-500" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
    </section>
  )
}
