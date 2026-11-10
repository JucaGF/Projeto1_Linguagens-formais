import { ReactFlowProvider } from '@xyflow/react'
import { MotionConfig } from 'motion/react'
import { AutomatonCanvas } from '@/components/canvas/AutomatonCanvas'
import { SidePanel } from '@/components/panels/SidePanel'
import { StatusIsland } from '@/components/toolbar/StatusIsland'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

/** Os toasts descem abaixo da ilha de status, que ocupa o topo. */
const TOAST_OFFSET = { top: 64 }

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
        <Toaster position="top-center" offset={TOAST_OFFSET} mobileOffset={TOAST_OFFSET} />
      </TooltipProvider>
    </MotionConfig>
  )
}

export default App
