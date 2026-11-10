import { useMemo } from 'react'
import { analyze } from '@/lib/automaton/analysis'
import { useEditor } from '@/store/editor'

/** O autômato atual e a sua análise, recalculada só quando o autômato muda. */
export function useAnalysis() {
  const automaton = useEditor((s) => s.automaton)
  const analysis = useMemo(() => analyze(automaton), [automaton])
  return { automaton, analysis }
}
