import { ReactFlowProvider } from '@xyflow/react'
import { AutomatonCanvas } from '@/components/canvas/AutomatonCanvas'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

function App() {
  return (
    <TooltipProvider>
      <ReactFlowProvider>
        <main className="h-dvh w-full overflow-hidden">
          <AutomatonCanvas />
        </main>
      </ReactFlowProvider>
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}

export default App
