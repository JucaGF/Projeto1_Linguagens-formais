import { ReactFlowProvider } from '@xyflow/react'
import { MotionConfig } from 'motion/react'
import { AutomatonCanvas } from '@/components/canvas/AutomatonCanvas'
import { SidePanel } from '@/components/panels/SidePanel'
import { StatusIsland } from '@/components/toolbar/StatusIsland'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

/** Os toasts sobem da base, longe da ilha de status; no celular, acima da gaveta fechada. */
const TOAST_OFFSET = { bottom: 88 }

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <ReactFlowProvider>
          <div className="flex h-dvh w-full overflow-hidden">
            <main className="relative h-full min-w-0 flex-1 max-md:pb-15">
              <AutomatonCanvas />
              <StatusIsland />
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
