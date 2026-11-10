import { useEffect } from 'react'
import { type Tool, useEditor } from '@/store/editor'

export const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  s: 'add-state',
  t: 'add-transition',
  d: 'delete',
}

/** Campos de texto, diálogos e menus tratam as próprias teclas. */
function ownsKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest('input, textarea, select, [role="dialog"], [role="menu"]') !== null
  )
}

export function undo() {
  useEditor.temporal.getState().undo()
}

export function redo() {
  useEditor.temporal.getState().redo()
}

function handleKey(event: KeyboardEvent) {
  if (event.defaultPrevented || ownsKeys(event.target)) return
  const editor = useEditor.getState()
  const key = event.key.toLowerCase()

  if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'z') {
    event.preventDefault()
    if (event.shiftKey) redo()
    else undo()
    return
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return

  if (key in TOOL_KEYS) {
    editor.setTool(TOOL_KEYS[key])
  } else if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault()
    editor.deleteSelection()
  } else if (event.key === 'Escape') {
    editor.cancelPending()
    editor.cancelTransition()
    editor.stopSimulation()
  }
}

/** V/S/T/D trocam a ferramenta, Delete apaga a seleção, ⌘Z/⇧⌘Z desfazem e refazem, Esc cancela. */
export function useKeyboardShortcuts() {
  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
}
