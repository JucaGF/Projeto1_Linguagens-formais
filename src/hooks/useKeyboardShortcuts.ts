import { useEffect } from 'react'
import { type Tool, useEditor } from '@/store/editor'

export const TOOL_KEYS: Record<string, Tool> = {
  v: 'select',
  s: 'add-state',
  t: 'add-transition',
  d: 'delete',
}

export type Shortcut =
  | { kind: 'tool'; tool: Tool }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'delete' }
  | { kind: 'cancel' }

export type ShortcutKey = Pick<
  KeyboardEvent,
  'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'defaultPrevented' | 'target'
>

const OWNS_KEYS = 'input, textarea, select, [role="dialog"], [role="menu"]'

/** Campos de texto, diálogos e menus tratam as próprias teclas. */
function ownsKeys(target: EventTarget | null): boolean {
  if (target === null || !('closest' in target)) return false
  const element = target as Element & { isContentEditable?: boolean }
  return element.isContentEditable === true || element.closest(OWNS_KEYS) !== null
}

/** O atalho que a tecla pede, ou null quando ela não é um atalho ou outro elemento a trata. */
export function shortcutFor(event: ShortcutKey): Shortcut | null {
  if (event.defaultPrevented || ownsKeys(event.target)) return null
  const key = event.key.toLowerCase()

  if ((event.metaKey || event.ctrlKey) && !event.altKey && key === 'z') {
    return { kind: event.shiftKey ? 'redo' : 'undo' }
  }
  if (event.metaKey || event.ctrlKey || event.altKey) return null

  if (key in TOOL_KEYS) return { kind: 'tool', tool: TOOL_KEYS[key] }
  if (event.key === 'Delete' || event.key === 'Backspace') return { kind: 'delete' }
  if (event.key === 'Escape') return { kind: 'cancel' }
  return null
}

export function undo() {
  useEditor.temporal.getState().undo()
}

export function redo() {
  useEditor.temporal.getState().redo()
}

function handleKey(event: KeyboardEvent) {
  const shortcut = shortcutFor(event)
  if (shortcut === null) return
  const editor = useEditor.getState()

  switch (shortcut.kind) {
    case 'tool':
      return editor.setTool(shortcut.tool)
    case 'undo':
      event.preventDefault()
      return undo()
    case 'redo':
      event.preventDefault()
      return redo()
    case 'delete':
      event.preventDefault()
      return editor.deleteSelection()
    case 'cancel':
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
