import { ReactFlowProvider } from '@xyflow/react'
import { MotionConfig } from 'motion/react'
import { AutomatonCanvas } from '@/components/canvas/AutomatonCanvas'
import { SidePanel } from '@/components/panels/SidePanel'
import { StatusIsland } from '@/components/toolbar/StatusIsland'
import { ToolDock } from '@/components/toolbar/ToolDock'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

/** Os toasts sobem logo acima do dock (`--toast-bottom` em index.css), em qualquer largura. */
const TOAST_OFFSET = { bottom: 'var(--toast-bottom)' }

/** A primeira dica espera um pouco; as vizinhas abrem na hora, enquanto o ponteiro passa. */
const TOOLTIP_DELAY_MS = 500

function App() {
  useKeyboardShortcuts()

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
        <ReactFlowProvider>
          <div className="flex h-dvh w-full overflow-hidden">
            <main className="@container/canvas relative h-full min-w-0 flex-1 max-md:pb-15">
              <AutomatonCanvas />
              <StatusIsland />
              <ToolDock />
            </main>
            <SidePanel />
          </div>
        </ReactFlowProvider>
        <Toaster position="bottom-center" offset={TOAST_OFFSET} mobileOffset={TOAST_OFFSET} />
      </TooltipProvider>
    </MotionConfig>
  )
}

export default App
