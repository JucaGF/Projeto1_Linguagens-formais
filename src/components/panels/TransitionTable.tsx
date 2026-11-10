import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAnalysis } from '@/hooks/use-analysis'
import { transitionTable } from '@/lib/automaton/analysis'
import { EPSILON } from '@/lib/automaton/types'
import { deltaValue, labelsOf } from './notation'

export function TransitionTable() {
  const { automaton, analysis } = useAnalysis()
  const { columns, rows } = useMemo(() => transitionTable(automaton), [automaton])
  const labels = labelsOf(automaton)

  if (rows.length === 0) {
    return <p className="p-4 text-sm text-muted-foreground">Nenhum estado ainda.</p>
  }

  // é esta célula que torna o autômato AFN: mais de um destino, ou uma ε-transição
  const makesNfa = (symbol: string, targets: string[]) =>
    targets.length > 1 || (symbol === EPSILON && targets.length > 0)
  const anyNfaCell = rows.some((row) => columns.some((c) => makesNfa(c, row.cells[c])))

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="overflow-hidden rounded-lg border">
        <Table className="math text-[16px]" data-testid="delta-table">
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-0 pl-3 text-muted-foreground">δ</TableHead>
              {columns.map((symbol) => (
                <TableHead key={symbol} className="text-center">
                  {symbol}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ state, cells }) => (
              <TableRow key={state.id} className="hover:bg-transparent">
                <TableCell className="pl-3 font-medium">
                  <span className="inline-block w-6 text-muted-foreground not-italic">
                    {state.isInitial ? '→' : ''}
                    {state.isAccepting ? '*' : ''}
                  </span>
                  {state.label}
                </TableCell>
                {columns.map((symbol) => {
                  const targets = cells[symbol]
                  const nfa = makesNfa(symbol, targets)
                  return (
                    <TableCell
                      key={symbol}
                      data-nfa={nfa || undefined}
                      className="text-center data-nfa:bg-(--status-nfa-bg) data-nfa:text-(--status-nfa-ink)"
                    >
                      {targets.length === 0 ? (
                        <span className="text-muted-foreground/70">∅</span>
                      ) : (
                        deltaValue(labels(targets), analysis.kind)
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li>
          <span className="math mr-1 text-sm">→</span>inicial
        </li>
        <li>
          <span className="math mr-1 text-sm">*</span>aceitação
        </li>
        <li>
          <span className="math mr-1 text-sm">∅</span>sem transição
        </li>
        {anyNfaCell && (
          <li className="flex items-center gap-1.5">
            <span className="size-3 rounded-sm bg-(--status-nfa-bg) ring-1 ring-(--status-nfa-ink)/30" />
            torna o autômato AFN
          </li>
        )}
      </ul>
    </div>
  )
}
