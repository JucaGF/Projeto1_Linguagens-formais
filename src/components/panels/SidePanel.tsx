import { ChevronUpIcon } from 'lucide-react'
import { type ReactNode, useId, useRef, useState, useSyncExternalStore } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/animate-ui/components/radix/tabs'
import { FormalDefinition } from './FormalDefinition'
import { JsonPanel } from './JsonPanel'
import { TransitionTable } from './TransitionTable'

const TABS: { value: string; label: string; content: ReactNode }[] = [
  { value: 'definicao', label: 'Definição', content: <FormalDefinition /> },
  { value: 'tabela', label: 'Tabela δ', content: <TransitionTable /> },
  { value: 'json', label: 'JSON', content: <JsonPanel /> },
  {
    value: 'simular',
    label: 'Simular',
    content: <p className="p-8 text-center text-sm text-muted-foreground">Em breve</p>,
  },
]

const CONTENT_FADE = { duration: 0.18, ease: [0.23, 1, 0.32, 1] } as const

/** Mesmo corte do `max-md:` do Tailwind e do `@media (width < 48rem)` do index.css. */
const DRAWER_QUERY = window.matchMedia('(width < 48rem)')
const subscribeDrawer = (onChange: () => void) => {
  DRAWER_QUERY.addEventListener('change', onChange)
  return () => DRAWER_QUERY.removeEventListener('change', onChange)
}
const isDrawer = () => DRAWER_QUERY.matches

/**
 * Painel de 380px à direita do canvas. Abaixo de 768px vira uma gaveta presa à base da tela,
 * fechada com só o cabeçalho à mostra.
 */
export function SidePanel() {
  const [tab, setTab] = useState(TABS[0].value)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const drawer = useSyncExternalStore(subscribeDrawer, isDrawer)
  // gaveta fechada: o conteúdo está fora da tela e não pode receber foco
  const contentHidden = drawer && !drawerOpen
  const contentId = useId()
  const toggle = useRef<HTMLButtonElement>(null)

  return (
    <aside
      data-open={drawerOpen}
      aria-label="Painel do autômato"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !drawer || !drawerOpen) return
        setDrawerOpen(false)
        toggle.current?.focus()
      }}
      className="side-panel z-20 flex flex-col bg-background md:relative md:h-full md:w-[380px] md:shrink-0 md:border-l max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:h-[min(72dvh,600px)] max-md:rounded-t-2xl max-md:border-t max-md:shadow-[0_-8px_30px_oklch(0_0_0/10%)]"
    >
      <button
        ref={toggle}
        type="button"
        onClick={() => setDrawerOpen((open) => !open)}
        aria-expanded={drawerOpen}
        aria-controls={contentId}
        className="relative flex h-(--drawer-peek) shrink-0 items-center justify-between px-4 pt-2 md:hidden"
      >
        <span
          className="absolute top-2 left-1/2 h-1 w-9 -translate-x-1/2 rounded-full bg-border"
          aria-hidden
        />
        <span
          className="math text-[17px] transition-opacity duration-200 ease-(--ease-out) in-data-[open=true]:opacity-0"
          aria-hidden
        >
          M = (Q, Σ, δ, q₀, F)
        </span>
        <span className="sr-only">{drawerOpen ? 'Fechar painel' : 'Abrir painel'}</span>
        <ChevronUpIcon
          className="size-5 text-muted-foreground transition-transform duration-200 ease-(--ease-out) in-data-[open=true]:rotate-180"
          aria-hidden
        />
      </button>

      <Tabs
        id={contentId}
        inert={contentHidden}
        value={tab}
        onValueChange={setTab}
        className="min-h-0 flex-1 gap-0"
      >
        <div className="shrink-0 border-b px-3 pt-3 pb-3 max-md:pt-0">
          <TabsList className="w-full">
            {TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="text-[13px]">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} transition={CONTENT_FADE}>
              {t.content}
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </aside>
  )
}
