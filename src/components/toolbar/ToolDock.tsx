import { useReactFlow } from '@xyflow/react'
import {
  ArrowRightIcon,
  BracesIcon,
  CirclePlusIcon,
  DownloadIcon,
  EllipsisIcon,
  EraserIcon,
  FileImageIcon,
  FileJsonIcon,
  ImageIcon,
  LibraryBigIcon,
  LinkIcon,
  type LucideIcon,
  MousePointer2Icon,
  Redo2Icon,
  Trash2Icon,
  Undo2Icon,
} from 'lucide-react'
import {
  motion,
  type MotionValue,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'motion/react'
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Toolbar } from 'radix-ui'
import { toast } from 'sonner'
import { useStore } from 'zustand'
import { FIT_VIEW } from '@/components/canvas/toFlow'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { EXAMPLES, type Example } from '@/examples'
import { redo, TOOL_KEYS, undo } from '@/hooks/useKeyboardShortcuts'
import { useShareLink } from '@/hooks/useShareLink'
import { emptyAutomaton } from '@/lib/automaton/operations'
import { toExtendedJson, toProfessorJson } from '@/lib/automaton/serialize'
import { toSvg } from '@/lib/automaton/svg'
import type { Automaton } from '@/lib/automaton/types'
import { downloadFile, svgToPngBlob } from '@/lib/export/download'
import { type Tool, useEditor } from '@/store/editor'

const TOOLS: { tool: Tool; label: string; icon: LucideIcon }[] = [
  { tool: 'select', label: 'Selecionar', icon: MousePointer2Icon },
  { tool: 'add-state', label: 'Estado', icon: CirclePlusIcon },
  { tool: 'add-transition', label: 'Transição', icon: ArrowRightIcon },
  { tool: 'delete', label: 'Apagar', icon: EraserIcon },
]

const keyOf = (tool: Tool) =>
  Object.keys(TOOL_KEYS)
    .find((key) => TOOL_KEYS[key] === tool)
    ?.toUpperCase()

const platform =
  (navigator as Navigator & { userAgentData?: { platform: string } }).userAgentData?.platform ??
  navigator.userAgent
const IS_MAC = /mac|iphone|ipad/i.test(platform)
const UNDO_KEYS = IS_MAC ? '⌘Z' : 'Ctrl+Z'
const REDO_KEYS = IS_MAC ? '⇧⌘Z' : 'Ctrl+Shift+Z'

interface ExportFormat {
  label: string
  file: string
  icon: LucideIcon
  save(a: Automaton): Promise<void> | void
}

const EXPORTS: ExportFormat[] = [
  {
    label: 'SVG',
    file: 'automato.svg',
    icon: FileImageIcon,
    save: (a) => downloadFile('automato.svg', toSvg(a), 'image/svg+xml'),
  },
  {
    label: 'PNG',
    file: 'automato.png',
    icon: ImageIcon,
    save: async (a) => downloadFile('automato.png', await svgToPngBlob(toSvg(a), 2), 'image/png'),
  },
  {
    label: 'JSON (formato do professor)',
    file: 'automato.json',
    icon: BracesIcon,
    save: (a) =>
      downloadFile('automato.json', JSON.stringify(toProfessorJson(a), null, 2), 'application/json'),
  },
  {
    label: 'JSON completo',
    file: 'automato-completo.json',
    icon: FileJsonIcon,
    save: (a) =>
      downloadFile(
        'automato-completo.json',
        JSON.stringify(toExtendedJson(a), null, 2),
        'application/json',
      ),
  },
]

async function saveAs(format: ExportFormat) {
  try {
    await format.save(useEditor.getState().automaton)
  } catch {
    toast.error(`Não foi possível exportar o ${format.label}`)
  }
}

type Confirmation = { kind: 'example'; example: Example } | { kind: 'clear' }

function confirmationCopy(c: Confirmation) {
  switch (c.kind) {
    case 'example':
      return {
        title: 'Substituir o autômato atual?',
        description: `O exemplo “${c.example.name}” toma o lugar do que está no canvas.`,
        action: 'Substituir',
        destructive: false,
      }
    case 'clear':
      return {
        title: 'Limpar o autômato?',
        description: 'Todos os estados e transições serão apagados.',
        action: 'Limpar',
        destructive: true,
      }
  }
}

/* Ampliação do dock ao passar o mouse: só com ponteiro fino e sem movimento reduzido */

const FINE_POINTER = '(hover: hover) and (pointer: fine)'
const MAGNIFY_RANGE = 110
const MAGNIFY_SCALE = 1.16
const MAGNIFY_SPRING = { mass: 0.1, stiffness: 170, damping: 14 }

const finePointerQuery = window.matchMedia(FINE_POINTER)

function subscribeFinePointer(onChange: () => void) {
  finePointerQuery.addEventListener('change', onChange)
  return () => finePointerQuery.removeEventListener('change', onChange)
}

const useFinePointer = () => useSyncExternalStore(subscribeFinePointer, () => finePointerQuery.matches)

const PointerX = createContext<MotionValue<number> | null>(null)

function Magnified({ pointerX, children }: { pointerX: MotionValue<number>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const target = useTransform(pointerX, (x) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return 1
    const distance = Math.abs(x - (box.left + box.width / 2))
    return 1 + (MAGNIFY_SCALE - 1) * Math.max(0, 1 - distance / MAGNIFY_RANGE)
  })
  const scale = useSpring(target, MAGNIFY_SPRING)
  return (
    <motion.div ref={ref} style={{ scale, transformOrigin: '50% 100%' }}>
      {children}
    </motion.div>
  )
}

function DockSlot({ children }: { children: ReactNode }) {
  const pointerX = useContext(PointerX)
  return pointerX ? <Magnified pointerX={pointerX}>{children}</Magnified> : children
}

/* Botões */

const DOCK_BUTTON =
  'flex size-9 items-center justify-center rounded-xl text-neutral-600 outline-none select-none @2xl/canvas:size-10 ' +
  'transition-transform duration-150 ease-(--ease-out) motion-safe:active:scale-[0.97] ' +
  'hover:bg-neutral-100 hover:text-neutral-900 aria-expanded:bg-neutral-100 aria-expanded:text-neutral-900 ' +
  'aria-pressed:bg-neutral-900 aria-pressed:text-white aria-pressed:hover:bg-neutral-800 ' +
  'focus-visible:ring-2 focus-visible:ring-(--canvas-selection) ' +
  'disabled:text-neutral-300 disabled:hover:bg-transparent [&_svg]:size-[18px]'

/** Um botão do dock. Fica dentro de `Toolbar.Button` ou `Toolbar.ToggleItem`, que dão o foco itinerante. */
function DockButton({ icon: Icon, ...props }: ComponentProps<'button'> & { icon: LucideIcon }) {
  return (
    <button type="button" className={DOCK_BUTTON} {...props}>
      <Icon aria-hidden />
    </button>
  )
}

function DockAction(props: ComponentProps<typeof DockButton>) {
  return (
    <Toolbar.Button asChild disabled={props.disabled}>
      <DockButton {...props} />
    </Toolbar.Button>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-[4px] bg-background/15 px-1 py-px font-sans text-[11px] leading-none text-background/80">
      {children}
    </kbd>
  )
}

/** Dica acima do botão: rótulo e, quando há, a tecla do atalho. */
function Hint({ label, keys, children }: { label: string; keys?: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={10}>
        {label}
        {keys && <Kbd>{keys}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

function Separator() {
  return <Toolbar.Separator className="mx-0.5 h-6 w-px self-center bg-neutral-200" />
}

/* Itens dos menus, usados no dock largo e no menu "Mais" do dock estreito */

/** `brief` mostra só os nomes, para o menu caber na largura do celular. */
function ExampleItems({ choose, brief = false }: { choose(e: Example): void; brief?: boolean }) {
  return EXAMPLES.map((example) => (
    <DropdownMenuItem
      key={example.id}
      onSelect={() => choose(example)}
      className="flex-col items-start gap-0.5"
    >
      <span className={brief ? undefined : 'font-medium'}>{example.name}</span>
      {!brief && (
        <span className="text-xs leading-snug text-muted-foreground">{example.description}</span>
      )}
    </DropdownMenuItem>
  ))
}

function ExportItems({ disabled = false }: { disabled?: boolean }) {
  return EXPORTS.map((format) => (
    <DropdownMenuItem key={format.file} disabled={disabled} onSelect={() => saveAs(format)}>
      <format.icon aria-hidden />
      {format.label}
      <DropdownMenuShortcut className="tracking-normal">{format.file}</DropdownMenuShortcut>
    </DropdownMenuItem>
  ))
}

const MENU = 'w-auto min-w-44'

/** Escolher um item com o ponteiro não devolve o foco ao botão, que mostraria o anel e a dica. */
function DockMenuContent(props: ComponentProps<typeof DropdownMenuContent>) {
  const byPointer = useRef(false)
  return (
    <DropdownMenuContent
      side="top"
      sideOffset={12}
      {...props}
      onPointerDown={() => (byPointer.current = true)}
      onKeyDown={() => (byPointer.current = false)}
      onCloseAutoFocus={(event) => {
        if (byPointer.current) event.preventDefault()
        byPointer.current = false
      }}
    />
  )
}

export function ToolDock() {
  const tool = useEditor((s) => s.tool)
  const isEmpty = useEditor((s) => s.automaton.states.length === 0)
  const canUndo = useStore(useEditor.temporal, (s) => s.pastStates.length > 0)
  const canRedo = useStore(useEditor.temporal, (s) => s.futureStates.length > 0)
  const { fitView } = useReactFlow()
  const { copyShareLink } = useShareLink()

  const pointerX = useMotionValue(Infinity)
  const finePointer = useFinePointer()
  const reduceMotion = useReducedMotion()
  const magnify = finePointer && !reduceMotion

  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const load = (a: Automaton) => {
    useEditor.getState().loadAutomaton(a)
    requestAnimationFrame(() => fitView(FIT_VIEW))
  }

  const ask = (c: Confirmation) => {
    setConfirmation(c)
    setConfirmOpen(true)
  }

  const chooseExample = (example: Example) => {
    if (useEditor.getState().automaton.states.length === 0) load(example.automaton)
    else ask({ kind: 'example', example })
  }

  const confirm = () => {
    if (confirmation?.kind === 'example') load(confirmation.example.automaton)
    if (confirmation?.kind === 'clear') useEditor.getState().loadAutomaton(emptyAutomaton())
    setConfirmOpen(false)
  }

  const copy = confirmation && confirmationCopy(confirmation)

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-(--dock-bottom) z-10 flex justify-center px-3">
      <PointerX.Provider value={magnify ? pointerX : null}>
        <Toolbar.Root
          aria-label="Ferramentas"
          onMouseMove={(event) => pointerX.set(event.clientX)}
          onMouseLeave={() => pointerX.set(Infinity)}
          className="pointer-events-auto flex items-end gap-1 rounded-2xl bg-white/90 p-1.5 shadow-[0_8px_28px_oklch(0_0_0/12%),0_0_0_1px_oklch(0_0_0/7%)] backdrop-blur-md"
        >
          {/* Botões alternados (aria-pressed), não rádios: o papel de grupo e de item é sobrescrito */}
          <Toolbar.ToggleGroup
            type="single"
            role="group"
            aria-label="Ferramenta"
            value={tool}
            onValueChange={(value) => value && useEditor.getState().setTool(value as Tool)}
            className="flex items-end gap-1"
          >
            {TOOLS.map(({ tool: t, label, icon }) => (
              <DockSlot key={t}>
                <Hint label={label} keys={keyOf(t)}>
                  <Toolbar.ToggleItem
                    value={t}
                    asChild
                    role={undefined}
                    aria-checked={undefined}
                    aria-pressed={tool === t}
                  >
                    <DockButton icon={icon} aria-label={label} />
                  </Toolbar.ToggleItem>
                </Hint>
              </DockSlot>
            ))}
          </Toolbar.ToggleGroup>

          <Separator />
          <DockSlot>
            <Hint label="Desfazer" keys={UNDO_KEYS}>
              <DockAction icon={Undo2Icon} aria-label="Desfazer" disabled={!canUndo} onClick={undo} />
            </Hint>
          </DockSlot>
          <DockSlot>
            <Hint label="Refazer" keys={REDO_KEYS}>
              <DockAction icon={Redo2Icon} aria-label="Refazer" disabled={!canRedo} onClick={redo} />
            </Hint>
          </DockSlot>

          <Separator />
          <div className="hidden items-end gap-1 @2xl/canvas:flex">
            <DockSlot>
              <DropdownMenu modal={false}>
                <Hint label="Exemplos">
                  <DropdownMenuTrigger asChild>
                    <DockAction icon={LibraryBigIcon} aria-label="Exemplos" />
                  </DropdownMenuTrigger>
                </Hint>
                <DockMenuContent align="center" className="w-80">
                  <ExampleItems choose={chooseExample} />
                </DockMenuContent>
              </DropdownMenu>
            </DockSlot>

            <Separator />
            <DockSlot>
              <DropdownMenu modal={false}>
                <Hint label="Exportar">
                  <DropdownMenuTrigger asChild>
                    <DockAction icon={DownloadIcon} aria-label="Exportar" disabled={isEmpty} />
                  </DropdownMenuTrigger>
                </Hint>
                <DockMenuContent align="center" className={MENU}>
                  <ExportItems />
                </DockMenuContent>
              </DropdownMenu>
            </DockSlot>

            <Separator />
            <DockSlot>
              <Hint label="Compartilhar link">
                <DockAction
                  icon={LinkIcon}
                  aria-label="Compartilhar link"
                  disabled={isEmpty}
                  onClick={copyShareLink}
                />
              </Hint>
            </DockSlot>

            <Separator />
            <DockSlot>
              <Hint label="Limpar">
                <DockAction
                  icon={Trash2Icon}
                  aria-label="Limpar"
                  disabled={isEmpty}
                  onClick={() => ask({ kind: 'clear' })}
                />
              </Hint>
            </DockSlot>
          </div>

          <div className="@2xl/canvas:hidden">
            <DropdownMenu modal={false}>
              <Hint label="Mais ações">
                <DropdownMenuTrigger asChild>
                  <DockAction icon={EllipsisIcon} aria-label="Mais ações" />
                </DropdownMenuTrigger>
              </Hint>
              <DockMenuContent align="end" className={MENU}>
                <DropdownMenuLabel>Exemplos</DropdownMenuLabel>
                <ExampleItems choose={chooseExample} brief />
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Exportar</DropdownMenuLabel>
                <ExportItems disabled={isEmpty} />
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled={isEmpty} onSelect={copyShareLink}>
                  <LinkIcon aria-hidden />
                  Compartilhar link
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isEmpty}
                  onSelect={() => ask({ kind: 'clear' })}
                >
                  <Trash2Icon aria-hidden />
                  Limpar
                </DropdownMenuItem>
              </DockMenuContent>
            </DropdownMenu>
          </div>
        </Toolbar.Root>
      </PointerX.Provider>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          {copy && (
            <>
              <DialogHeader>
                <DialogTitle>{copy.title}</DialogTitle>
                <DialogDescription>
                  {copy.description} Dá para desfazer depois.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  variant={copy.destructive ? 'destructive' : 'default'}
                  onClick={confirm}
                >
                  {copy.action}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
