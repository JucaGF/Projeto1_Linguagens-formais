import { CircleCheckIcon, TriangleAlertIcon } from 'lucide-react'
import { useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { NumberTicker } from '@/components/ui/number-ticker'
import { useAnalysis } from '@/hooks/use-analysis'
import { deltaEntries, formatSet, labelsOf } from './notation'

const KIND_NAME = {
  DFA: 'Autômato finito determinístico (AFD)',
  NFA: 'Autômato finito não determinístico (AFN)',
} as const

const SIGNATURE = {
  DFA: <>δ : Q × Σ → Q</>,
  NFA: (
    <>
      δ : Q × Σ<sub>ε</sub> → P(Q)
    </>
  ),
} as const

function Count({ symbol, value }: { symbol: string; value: number }) {
  const reduceMotion = useReducedMotion()
  // a aba é desmontada ao trocar de aba: sem isso, o contador recomeçaria do zero a cada visita
  const [mountedValue] = useState(value)
  return (
    <div className="flex items-baseline gap-1.5 rounded-lg bg-muted/70 px-2.5 py-1.5">
      <span className="math text-sm text-muted-foreground">|{symbol}|</span>
      {reduceMotion ? (
        <span className="text-sm font-semibold tabular-nums" data-testid={`count-${symbol}`}>
          {value}
        </span>
      ) : (
        <NumberTicker
          value={value}
          startValue={mountedValue}
          data-testid={`count-${symbol}`}
          className="text-sm font-semibold tracking-normal text-foreground" />
      )}
    </div>
  )
}

function Row({ name, value }: { name: string; value: string }) {
  return (
    <>
      <dt className="math text-right text-muted-foreground">{name}</dt>
      <dd className="math min-w-0 break-words" data-testid={`def-${name}`}>
        <span className="text-muted-foreground">= </span>
        {value}
      </dd>
    </>
  )
}

export function FormalDefinition() {
  const { automaton, analysis } = useAnalysis()
  const labels = labelsOf(automaton)
  const delta = deltaEntries(automaton, analysis.kind)

  return (
    <div className="flex flex-col gap-6 p-4">
      <header className="flex flex-col gap-3">
        <p className="math text-[26px] leading-none tracking-tight">
          M = (Q, Σ, δ, q₀, F)
        </p>
        <p className="text-xs text-muted-foreground">{KIND_NAME[analysis.kind]}</p>
        <div className="flex gap-2">
          <Count symbol="Q" value={automaton.states.length} />
          <Count symbol="Σ" value={analysis.alphabet.length} />
        </div>
      </header>

      <dl className="grid grid-cols-[2.25rem_1fr] gap-x-2 gap-y-1.5 text-[17px] leading-snug">
        <Row name="Q" value={formatSet(automaton.states.map((s) => s.label))} />
        <Row name="Σ" value={formatSet(analysis.alphabet)} />
        <Row name="q₀" value={analysis.initial === null ? '—' : labels([analysis.initial])[0]} />
        <Row name="F" value={formatSet(labels(analysis.accepting))} />
      </dl>

      <section className="flex flex-col gap-2">
        <h3 className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
          Função de transição
          <span className="math text-sm">{SIGNATURE[analysis.kind]}</span>
        </h3>
        {delta.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma transição ainda.</p>
        ) : (
          <ul
            className="math grid grid-cols-[auto_auto_1fr] gap-x-2 gap-y-1 text-[16px]"
            data-testid="delta-list"
          >
            {delta.map((entry) => (
              <li key={`${entry.state}\u0000${entry.symbol}`} className="col-span-3 grid grid-cols-subgrid">
                <span>
                  δ({entry.state}, {entry.symbol})
                </span>
                <span className="text-muted-foreground">=</span>
                <span className="break-words">{entry.value}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-medium text-muted-foreground">Avisos</h3>
        {analysis.warnings.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleCheckIcon className="size-4 text-(--status-ok)" aria-hidden />
            Nenhum aviso
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5" data-testid="warnings">
            {analysis.warnings.map((warning) => (
              <li key={warning} className="flex items-start gap-2 text-sm">
                <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-(--status-warn)" aria-hidden />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
