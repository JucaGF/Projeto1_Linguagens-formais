import { useEffect } from 'react'
import { type SimulationState, useEditor } from '@/store/editor'

/** Intervalo entre passos; não pode ser menor que os 0,6s do token na aresta. */
export const PLAYBACK_INTERVAL_MS = 700

/** Um tique da reprodução: avança um passo e pausa ao chegar no último. */
export function advancePlayback(simulation: SimulationState): Pick<SimulationState, 'step' | 'playing'> {
  const last = Math.max(simulation.trace.steps.length - 1, 0)
  const step = Math.min(simulation.step + 1, last)
  return { step, playing: step < last }
}

/** Enquanto `playing`, avança um passo a cada 700ms. Pausar, parar ou desmontar cancela o tique. */
export function useSimulationPlayback() {
  const simulation = useEditor((s) => s.simulation)

  useEffect(() => {
    if (simulation === null || !simulation.playing) return
    const timer = setTimeout(() => {
      const { step, playing } = advancePlayback(simulation)
      const editor = useEditor.getState()
      editor.stepTo(step)
      if (!playing) editor.setPlaying(false)
    }, PLAYBACK_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [simulation])
}
