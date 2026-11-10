import { useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { FIT_VIEW } from '@/components/canvas/toFlow'
import { decodeShare, encodeShare, MAX_SHARE_LENGTH } from '@/lib/automaton/serialize'
import { useEditor } from '@/store/editor'

const HASH_PREFIX = '#a='

/**
 * Ao montar, carrega o autômato de `#a=<código>`. O link vira o ponto de partida: o histórico de
 * desfazer começa nele, e o hash fica na barra para o recarregar abrir o mesmo autômato.
 */
export function useShareLink(): { copyShareLink(): Promise<void> } {
  const { fitView } = useReactFlow()
  const read = useRef(false)

  useEffect(() => {
    if (read.current) return
    read.current = true
    const { hash, pathname, search } = window.location
    if (!hash.startsWith(HASH_PREFIX)) return

    const automaton = decodeShare(hash.slice(HASH_PREFIX.length))
    if (automaton === null) {
      history.replaceState(null, '', pathname + search)
      toast.error('Link inválido')
      return
    }
    useEditor.getState().loadAutomaton(automaton)
    useEditor.temporal.getState().clear()
    requestAnimationFrame(() => fitView(FIT_VIEW))
  }, [fitView])

  const copyShareLink = useCallback(async () => {
    const code = encodeShare(useEditor.getState().automaton)
    // Um link mais longo que o limite seria recusado ao abrir
    if (code.length > MAX_SHARE_LENGTH) {
      toast.error('Autômato grande demais para link')
      return
    }
    const url = new URL(window.location.href)
    url.hash = HASH_PREFIX.slice(1) + code
    try {
      await navigator.clipboard.writeText(url.toString())
      history.replaceState(null, '', url)
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }, [])

  return { copyShareLink }
}
