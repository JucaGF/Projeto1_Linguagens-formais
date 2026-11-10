import {
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
  StepBackIcon,
  StepForwardIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react'
import { useAnimate, useReducedMotion } from 'motion/react'
import { type FormEvent, type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BorderBeam } from '@/components/ui/border-beam'
import { Button } from '@/components/ui/button'
import { Confetti, type ConfettiRef } from '@/components/ui/confetti'
import { Input } from '@/components/ui/input'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import type { SimStep, SimTrace } from '@/lib/automaton/simulate'
import type { StateId } from '@/lib/automaton/types'
import { type SimulationState, useEditor } from '@/store/editor'
import { copiesText, tapeCells } from './simulation'

const CONFETTI_GLOBAL = { resize: true, useWorker: true, disableForReducedMotion: true }
const SHAKE = {
  transform: [0, -8, 8, -6, 6, 0].map((x) => `translateX(${x}px)`),
}

/**
 * Rodadas cujo resultado já foi revelado. O confete e o tremor tocam uma vez por rodada: voltar
 * e avançar até o fim, ou reabrir a aba, não os repete. Uma nova rodada é um novo `SimTrace`.
 */
const revealed = new WeakSet<SimTrace>()

export function SimulationPanel() {
  const simulation = useEditor((s) => s.simulation)
  const [input, setInput] = useState(() => simulation?.trace.input ?? '')
  const inputId = useId()
  const confetti = useRef<ConfettiRef>(null)

  const run = (event: FormEvent) => {
    event.preventDefault()
    const editor = useEditor.getState()
    editor.startSimulation(input)
    if ((useEditor.getState().simulation?.trace.steps.length ?? 0) > 1) editor.setPlaying(true)
  }

  const celebrate = useCallback((from: HTMLElement) => {
    const box = from.getBoundingClientRect()
    return (
      confetti.current?.fire({
        origin: {
          x: (box.left + box.width / 2) / window.innerWidth,
          y: (box.top + box.height / 2) / window.innerHeight,
        },
        particleCount: 90,
        spread: 75,
        startVelocity: 32,
        ticks: 160,
        scalar: 0.9,
      }) ?? false
    )
  }, [])

  return (
    <div className="flex flex-col gap-5 p-4">
      <form onSubmit={run} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-medium">
          Cadeia de entrada
        </label>
        <div className="flex gap-2">
          <Input
            id={inputId}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || !useEditor.getState().simulation) return
              event.stopPropagation()
              useEditor.getState().stopSimulation()
            }}
            placeholder="ex.: abba"
            autoComplete="off"
            spellCheck={false}
            className="math h-9 text-[15px] md:text-[15px]"
            data-testid="sim-input"
          />
          <ShimmerButton
            type="submit"
            className="h-9 shrink-0 px-4 text-sm font-medium"
            borderRadius="8px"
            shimmerDuration="2.5s"
            shimmer={!simulation}
          >
            Simular
          </ShimmerButton>
        </div>
        <p className="text-xs text-muted-foreground">
          Deixe vazio para testar a cadeia vazia (ε).
        </p>
      </form>

      {/* antes da rodada: o efeito que cria o canvas do confete roda antes do efeito do resultado */}
      {createPortal(
        <Confetti
          ref={confetti}
          manualstart
          globalOptions={CONFETTI_GLOBAL}
          className="pointer-events-none fixed inset-0 z-50 size-full"
          aria-hidden
        />,
        document.body,
      )}

      {simulation?.trace.error === 'no-initial' ? (
        <p
          role="alert"
          data-testid="sim-error"
          className="flex items-center gap-2 rounded-lg border border-(--status-warn)/40 bg-(--status-nfa-bg)/60 px-3 py-2.5 text-sm text-(--status-nfa-ink)"
        >
          <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
          Defina um estado inicial antes de simular
        </p>
      ) : simulation ? (
        <Run trace={simulation.trace} step={simulation.step} playing={simulation.playing} onAccept={celebrate} />
      ) : null}

      <p aria-live="polite" className="sr-only" data-testid="sim-announce">
        {announcement(simulation)}
      </p>
    </div>
  )
}

function announcement(simulation: SimulationState | null) {
  if (!simulation || simulation.trace.error) return ''
  if (simulation.step < simulation.trace.steps.length - 1) return ''
  return simulation.trace.accepted ? 'Cadeia aceita' : 'Cadeia rejeitada'
}

function Run({
  trace,
  step,
  playing,
  onAccept,
}: {
  trace: SimTrace
  step: number
  playing: boolean
  onAccept: (from: HTMLElement) => boolean
}) {
  const states = useEditor((s) => s.automaton.states)
  const label = (id: StateId) => states.find((s) => s.id === id)?.label ?? id
  const reduceMotion = useReducedMotion()
  const last = trace.steps.length - 1
  const current = trace.steps[step]

  return (
    <div className="flex flex-col gap-5">
      <section className="relative flex flex-col gap-3 rounded-xl border bg-card p-3" data-testid="sim-tape-card">
        <header className="flex items-center justify-between">
          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Fita</h3>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground tabular-nums" data-testid="sim-step">
              Passo {step}/{last}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Encerrar simulação"
              onClick={() => useEditor.getState().stopSimulation()}
            >
              <XIcon />
            </Button>
          </div>
        </header>
        <Tape input={trace.input} consumed={current.consumed} />
        <Controls step={step} last={last} playing={playing} />
        {playing && !reduceMotion && (
          <BorderBeam
            size={70}
            duration={2.4}
            borderWidth={1.5}
            colorFrom="var(--canvas-active)"
            colorTo="var(--canvas-firing)"
          />
        )}
      </section>

      <Copies step={current} label={label} />

      {step === last && <Result trace={trace} onAccept={onAccept} />}
    </div>
  )
}

function Tape({ input, consumed }: { input: string; consumed: number }) {
  const strip = useRef<HTMLOListElement>(null)
  const cells = tapeCells(input, consumed)
  const head = consumed - 1

  // a célula lida fica à vista sem rolagem animada: o passo pode vir do teclado
  useLayoutEffect(() => {
    const list = strip.current
    if (!list) return
    const cell = head < 0 ? undefined : (list.children[head] as HTMLElement | undefined)
    list.scrollLeft = cell ? cell.offsetLeft - list.clientWidth / 2 + cell.offsetWidth / 2 : 0
  }, [head, input])

  return (
    <ol
      ref={strip}
      aria-label="Fita de entrada"
      data-testid="sim-tape"
      className="relative flex gap-1 overflow-x-auto overscroll-contain pb-1"
    >
      {cells.map((cell, i) => (
        <li
          key={i}
          data-state={cell.state}
          aria-current={cell.state === 'current' ? 'step' : undefined}
          className="math flex h-9 min-w-8 shrink-0 items-center justify-center rounded-md border px-1.5 text-[17px] data-[state=current]:border-(--canvas-active-stroke) data-[state=current]:bg-(--canvas-active-fill) data-[state=current]:shadow-[0_0_0_3px_color-mix(in_oklch,var(--canvas-active)_30%,transparent)] data-[state=empty]:text-muted-foreground data-[state=read]:border-transparent data-[state=read]:bg-muted/60 data-[state=read]:text-muted-foreground/60"
        >
          {cell.symbol}
        </li>
      ))}
    </ol>
  )
}

function Controls({ step, last, playing }: { step: number; last: number; playing: boolean }) {
  const goTo = (n: number) => {
    const editor = useEditor.getState()
    editor.setPlaying(false)
    editor.stepTo(n)
  }
  const togglePlay = () => {
    const editor = useEditor.getState()
    if (playing) return editor.setPlaying(false)
    if (step === last) editor.stepTo(0)
    editor.setPlaying(true)
  }

  return (
    <div className="flex items-center justify-center gap-1" role="group" aria-label="Controles da simulação">
      <ControlButton label="Voltar ao início" disabled={step === 0} onClick={() => goTo(0)}>
        <SkipBackIcon />
      </ControlButton>
      <ControlButton label="Passo anterior" disabled={step === 0} onClick={() => goTo(step - 1)}>
        <StepBackIcon />
      </ControlButton>
      <Button
        size="icon"
        className="mx-1 rounded-full"
        aria-label={playing ? 'Pausar' : step === last ? 'Reproduzir de novo' : 'Reproduzir'}
        disabled={last === 0}
        onClick={togglePlay}
        data-testid="sim-play"
      >
        {playing ? <PauseIcon className="fill-current" /> : <PlayIcon className="fill-current" />}
      </Button>
      <ControlButton label="Próximo passo" disabled={step === last} onClick={() => goTo(step + 1)}>
        <StepForwardIcon />
      </ControlButton>
      <ControlButton label="Ir para o fim" disabled={step === last} onClick={() => goTo(last)}>
        <SkipForwardIcon />
      </ControlButton>
    </div>
  )
}

function ControlButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  // aria-disabled em vez de disabled: o botão desativado no limite continua com o foco do teclado
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
    >
      {children}
    </Button>
  )
}

function Copies({ step, label }: { step: SimStep; label: (id: StateId) => string }) {
  return (
    <section className="flex flex-col gap-2" data-testid="sim-copies">
      <header className="flex items-baseline justify-between">
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Cópias ativas
        </h3>
        <span className="text-sm font-medium tabular-nums" data-testid="sim-copies-count">
          {copiesText(step.active.length)}
        </span>
      </header>
      <ul className="flex min-h-7 flex-wrap gap-1.5">
        {step.active.map((id) => (
          <li
            key={`active-${id}`}
            data-copy="active"
            className="math rounded-full border border-(--canvas-active-stroke) bg-(--canvas-active-fill) px-2.5 py-0.5 text-[15px]"
          >
            {label(id)}
          </li>
        ))}
        {step.died.map((id) => (
          <li
            key={`died-${id}`}
            data-copy="died"
            className="math rounded-full border border-dashed border-(--canvas-died)/50 px-2.5 py-0.5 text-[15px] text-(--canvas-died)/80 line-through"
          >
            {label(id)}
            <span className="sr-only"> (morreu)</span>
          </li>
        ))}
      </ul>
      {step.died.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Riscadas: cópias que não tinham transição para '{step.symbol}' e morreram.
        </p>
      )}
    </section>
  )
}

function Result({ trace, onAccept }: { trace: SimTrace; onAccept: (from: HTMLElement) => boolean }) {
  const [scope, animate] = useAnimate<HTMLParagraphElement>()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (revealed.has(trace)) return
    if (reduceMotion) {
      revealed.add(trace)
      return
    }
    if (trace.accepted) {
      // um quadro depois: ao reabrir a aba, o StrictMode reinicia o canvas recém-montado do confete
      const from = scope.current
      const frame = requestAnimationFrame(() => {
        if (onAccept(from)) revealed.add(trace)
      })
      return () => cancelAnimationFrame(frame)
    }
    // um tremor interrompido (desmontagem, StrictMode) não conta como revelado e toca de novo
    let interrupted = false
    const shake = animate(scope.current, SHAKE, { duration: 0.3, ease: 'easeOut' })
    void shake.then(() => {
      if (!interrupted) revealed.add(trace)
    })
    return () => {
      interrupted = true
      shake.stop()
    }
  }, [trace, reduceMotion, onAccept, animate, scope])

  return (
    <div className="flex flex-col items-start gap-1.5">
      <p
        ref={scope}
        data-testid="sim-result"
        data-accepted={trace.accepted}
        className="rounded-full px-3 py-1 text-sm font-semibold data-[accepted=false]:bg-destructive/10 data-[accepted=false]:text-destructive data-[accepted=true]:bg-(--status-ok)/12 data-[accepted=true]:text-(--status-ok)"
      >
        {trace.accepted ? 'Aceita ✓' : 'Rejeitada ✗'}
      </p>
      <p className="text-xs text-muted-foreground">
        {trace.accepted
          ? 'Ao fim da leitura, alguma cópia está num estado de aceitação.'
          : 'Ao fim da leitura, nenhuma cópia está num estado de aceitação.'}
      </p>
    </div>
  )
}
