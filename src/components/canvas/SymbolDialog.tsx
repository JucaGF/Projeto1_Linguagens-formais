import { type FormEvent, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { State, StateId } from '@/lib/automaton/types'
import { useEditor } from '@/store/editor'

type Pending = { from: StateId; to: StateId }

const labelOf = (states: State[], id: StateId) => states.find((s) => s.id === id)?.label ?? '?'

const MathText = ({ children }: { children: string }) => (
  <span className="font-[family-name:var(--font-math)] text-[15px] text-foreground italic">
    {children}
  </span>
)

function SymbolForm({ pending }: { pending: Pending }) {
  const [error, setError] = useState<string | null>(null)
  const from = useEditor((s) => labelOf(s.automaton.states, pending.from))
  const to = useEditor((s) => labelOf(s.automaton.states, pending.to))

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const input = new FormData(event.currentTarget).get('symbols')
    setError(useEditor.getState().confirmTransition(String(input ?? '')))
  }

  return (
    <form onSubmit={submit} className="grid gap-6">
      <DialogHeader>
        <DialogTitle>{pending.from === pending.to ? 'Novo laço' : 'Nova transição'}</DialogTitle>
        <DialogDescription>
          {pending.from === pending.to ? (
            <>
              De <MathText>{from}</MathText> para ele mesmo.
            </>
          ) : (
            <>
              De <MathText>{from}</MathText> para <MathText>{to}</MathText>.
            </>
          )}{' '}
          Separe os símbolos por vírgula e use <code>eps</code> para ε.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-2">
        <Label htmlFor="transition-symbols">Símbolos</Label>
        <Input
          id="transition-symbols"
          name="symbols"
          placeholder="a, b, eps"
          autoComplete="off"
          spellCheck={false}
          autoFocus
          aria-invalid={error !== null}
          aria-describedby={error === null ? undefined : 'transition-symbols-error'}
          onChange={() => setError(null)}
        />
        {error !== null && (
          <p id="transition-symbols-error" role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => useEditor.getState().cancelTransition()}>
          Cancelar
        </Button>
        <Button type="submit">Criar transição</Button>
      </DialogFooter>
    </form>
  )
}

/** Pede os símbolos da transição escolhida em dois cliques. Fica aberto enquanto há erro. */
export function SymbolDialog() {
  const pending = useEditor((s) => s.pendingTransition)
  // o conteúdo continua montado com a última transição durante a animação de saída
  const [shown, setShown] = useState<{ pending: Pending; round: number } | null>(null)
  if (pending !== null && pending !== shown?.pending) {
    setShown({ pending, round: (shown?.round ?? 0) + 1 })
  }

  return (
    <Dialog
      open={pending !== null}
      onOpenChange={(open) => {
        if (!open) useEditor.getState().cancelTransition()
      }}
    >
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        {shown && <SymbolForm key={shown.round} pending={shown.pending} />}
      </DialogContent>
    </Dialog>
  )
}
