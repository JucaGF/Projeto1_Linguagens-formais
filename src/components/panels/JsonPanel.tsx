import { useReactFlow } from '@xyflow/react'
import { CheckIcon, CopyIcon, DownloadIcon, FileUpIcon } from 'lucide-react'
import { type ChangeEvent, useId, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { FIT_VIEW } from '@/components/canvas/toFlow'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { downloadFile } from '@/lib/export/download'
import { parseAutomatonJson, toExtendedJson, toProfessorJson } from '@/lib/automaton/serialize'
import { useEditor } from '@/store/editor'

const FORMATS = [
  { id: 'professor', label: 'Formato do professor', serialize: toProfessorJson },
  { id: 'extended', label: 'Formato completo', serialize: toExtendedJson },
] as const

type FormatId = (typeof FORMATS)[number]['id']

const COPIED_FEEDBACK_MS = 1500

export function JsonPanel() {
  const automaton = useEditor((s) => s.automaton)
  const [formatId, setFormatId] = useState<FormatId>('professor')
  const format = FORMATS.find((f) => f.id === formatId) ?? FORMATS[0]
  const json = useMemo(() => JSON.stringify(format.serialize(automaton), null, 2), [format, automaton])

  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      toast.success('JSON copiado')
      setCopied(true)
      setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS)
    } catch {
      toast.error('Não foi possível copiar o JSON')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4">
      <section className="flex flex-col gap-3">
        <div
          role="radiogroup"
          aria-label="Formato do JSON"
          className="grid grid-cols-2 rounded-lg bg-muted p-[3px]"
        >
          {FORMATS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="radio"
              aria-checked={f.id === formatId}
              onClick={() => setFormatId(f.id)}
              className="h-7 rounded-md text-xs font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-150 ease-(--ease-out) aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
            >
              {f.label}
            </button>
          ))}
        </div>

        <pre
          data-testid="json-output"
          className="max-h-[22rem] overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[12.5px] leading-relaxed"
        >
          {json}
        </pre>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <CheckIcon className="text-(--status-ok)" /> : <CopyIcon />}
            Copiar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadFile('automato.json', json, 'application/json')}
          >
            <DownloadIcon />
            Baixar .json
          </Button>
        </div>
      </section>

      <ImportSection />
    </div>
  )
}

function ImportSection() {
  const { fitView } = useReactFlow()
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const errorId = useId()

  const load = (source: string) => {
    const result = parseAutomatonJson(source)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError(null)
    useEditor.getState().loadAutomaton(result.automaton)
    toast.success('Autômato carregado')
    requestAnimationFrame(() => fitView(FIT_VIEW))
  }

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const content = await file.text()
    setText(content)
    load(content)
  }

  return (
    <section className="flex flex-col gap-3 border-t pt-5">
      <h3 className="text-sm font-medium">Importar</h3>
      <Textarea
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setError(null)
        }}
        placeholder='{"q0": {"a": "q1", "b": "q0"}, "q1": {"a": "q0", "b": "q1"}}'
        spellCheck={false}
        aria-label="JSON para importar"
        aria-invalid={error !== null || undefined}
        aria-describedby={error ? errorId : undefined}
        className="max-h-48 min-h-24 font-mono text-[12.5px] md:text-[12.5px]"
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-destructive" data-testid="import-error">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => load(text)} disabled={text.trim() === ''}>
          Carregar
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}>
          <FileUpIcon />
          Abrir arquivo .json
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={onFile}
          data-testid="import-file"
        />
      </div>
    </section>
  )
}
