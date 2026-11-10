import { type CSSProperties, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface InlineInputProps {
  initial: string
  label: string
  /** Aplica o valor e devolve a mensagem de erro, ou `null` se deu certo. */
  apply(value: string): string | null
  /** `byKeyboard` quando Enter ou Esc fecharam o campo: o dono devolve o foco. */
  close(byKeyboard: boolean): void
  style?: CSSProperties
}

/**
 * Campo de edição no próprio canvas. Enter aplica (e continua aberto se der erro), Esc cancela,
 * sair do campo aplica e fecha mesmo com erro. O erro aparece num toast.
 */
export function InlineInput({ initial, label, apply, close, style }: InlineInputProps) {
  const ref = useRef<HTMLInputElement>(null)
  const closed = useRef(false)

  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])

  const finish = (byKeyboard: boolean) => {
    closed.current = true
    close(byKeyboard)
  }

  const submit = (byKeyboard: boolean) => {
    if (closed.current) return
    const value = ref.current?.value ?? initial
    const error = value === initial ? null : apply(value)
    if (error === null) return finish(byKeyboard)
    toast.error(error)
    if (byKeyboard) ref.current?.select()
    else finish(false)
  }

  return (
    <input
      ref={ref}
      aria-label={label}
      defaultValue={initial}
      spellCheck={false}
      autoComplete="off"
      className="inline-input nodrag nopan"
      style={style}
      onKeyDown={(event) => {
        if (event.key === 'Enter') submit(true)
        if (event.key === 'Escape') finish(true)
      }}
      onBlur={() => submit(false)}
    />
  )
}
