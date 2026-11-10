import { useReactFlow } from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { FIT_VIEW } from '@/components/canvas/toFlow'
import { decodeShare, encodeShare, MAX_SHARE_LENGTH } from '@/lib/automaton/serialize'
import { useEditor } from '@/store/editor'

const HASH_PREFIX = '#a='

/**
 * Carrega o autômato de `#a=<código>` e tira o código da barra: dali em diante o desenho salvo no
 * navegador (com as edições feitas depois) é o que um recarregar abre. Se havia um desenho no
 * canvas, desfazer o traz de volta; com o canvas vazio, o histórico começa no link.
 */
function loadFromHash(fitView: () => void): void {
  const { hash, pathname, search } = window.location
  if (!hash.startsWith(HASH_PREFIX)) return
  history.replaceState(null, '', pathname + search)

  const automaton = decodeShare(hash.slice(HASH_PREFIX.length))
  if (automaton === null) {
    toast.error('Link inválido')
    return
  }
  const hadWork = useEditor.getState().automaton.states.length > 0
  useEditor.getState().loadAutomaton(automaton)
  if (!hadWork) useEditor.temporal.getState().clear()
  requestAnimationFrame(fitView)
}

/** Lê o link ao abrir a página e quando ele é colado numa aba já aberta (`hashchange`). */
export function useShareLink(): { copyShareLink(): Promise<void> } {
  const { fitView } = useReactFlow()
  const read = useRef(false)

  useEffect(() => {
    const load = () => loadFromHash(() => fitView(FIT_VIEW))
    if (!read.current) {
      read.current = true
      load()
    }
    window.addEventListener('hashchange', load)
    return () => window.removeEventListener('hashchange', load)
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
      toast.success('Link copiado')
    } catch {
      toast.error('Não foi possível copiar o link')
    }
  }, [])

  return { copyShareLink }
}
