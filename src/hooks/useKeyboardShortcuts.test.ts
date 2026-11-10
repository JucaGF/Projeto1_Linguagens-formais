import { describe, expect, it } from 'vitest'
import { type ShortcutKey, shortcutFor } from './useKeyboardShortcuts'

interface FakeNode {
  tag: string
  role?: string
  editable?: boolean
}

/** Um elemento falso cujo `closest` entende seletores de tag e `[role="x"]` sobre a cadeia de ancestrais. */
function element(...chain: FakeNode[]): EventTarget {
  const matches = (node: FakeNode, selector: string) => {
    const role = /^\[role="(.+)"\]$/.exec(selector)
    return role ? node.role === role[1] : node.tag === selector
  }
  return {
    isContentEditable: chain.some((node) => node.editable),
    closest: (selectors: string) => {
      const list = selectors.split(',').map((s) => s.trim())
      return chain.find((node) => list.some((s) => matches(node, s))) ?? null
    },
  } as unknown as EventTarget
}

const canvas = element({ tag: 'div' }, { tag: 'main' })

function press(key: string, extra: Partial<ShortcutKey> = {}): ShortcutKey {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    defaultPrevented: false,
    target: canvas,
    ...extra,
  }
}

describe('shortcutFor', () => {
  it.each([
    ['v', 'select'],
    ['s', 'add-state'],
    ['t', 'add-transition'],
    ['d', 'delete'],
    ['S', 'add-state'],
  ] as const)('%s escolhe a ferramenta %s', (key, tool) => {
    expect(shortcutFor(press(key))).toEqual({ kind: 'tool', tool })
  })

  it('Ctrl+Z e ⌘Z desfazem; com Shift, refazem', () => {
    expect(shortcutFor(press('z', { ctrlKey: true }))).toEqual({ kind: 'undo' })
    expect(shortcutFor(press('z', { metaKey: true }))).toEqual({ kind: 'undo' })
    expect(shortcutFor(press('Z', { ctrlKey: true, shiftKey: true }))).toEqual({ kind: 'redo' })
    expect(shortcutFor(press('Z', { metaKey: true, shiftKey: true }))).toEqual({ kind: 'redo' })
  })

  it('Alt com Z, ou Ctrl com uma letra de ferramenta, não é atalho', () => {
    expect(shortcutFor(press('z', { ctrlKey: true, altKey: true }))).toBeNull()
    expect(shortcutFor(press('s', { metaKey: true }))).toBeNull()
    expect(shortcutFor(press('v', { ctrlKey: true }))).toBeNull()
    expect(shortcutFor(press('d', { altKey: true }))).toBeNull()
  })

  it('Delete e Backspace apagam; Esc cancela', () => {
    expect(shortcutFor(press('Delete'))).toEqual({ kind: 'delete' })
    expect(shortcutFor(press('Backspace'))).toEqual({ kind: 'delete' })
    expect(shortcutFor(press('Escape'))).toEqual({ kind: 'cancel' })
  })

  it('outras teclas não são atalho', () => {
    expect(shortcutFor(press('a'))).toBeNull()
    expect(shortcutFor(press('Enter'))).toBeNull()
    expect(shortcutFor(press('z'))).toBeNull()
  })

  it('a tecla já tratada por outro elemento é ignorada', () => {
    expect(shortcutFor(press('s', { defaultPrevented: true }))).toBeNull()
  })

  it('a janela como alvo ainda recebe atalhos', () => {
    expect(shortcutFor(press('Escape', { target: {} as EventTarget }))).toEqual({ kind: 'cancel' })
    expect(shortcutFor(press('Escape', { target: null }))).toEqual({ kind: 'cancel' })
  })

  it.each([
    ['um input', element({ tag: 'input' }, { tag: 'form' })],
    ['um textarea', element({ tag: 'textarea' })],
    ['um select', element({ tag: 'select' })],
    ['um texto editável', element({ tag: 'div', editable: true })],
    ['um botão dentro de um diálogo', element({ tag: 'button' }, { tag: 'div', role: 'dialog' })],
    ['um item de menu', element({ tag: 'div', role: 'menuitem' }, { tag: 'div', role: 'menu' })],
  ])('ignora teclas em %s', (_name, target) => {
    for (const key of ['s', 'Backspace', 'Delete', 'Escape']) {
      expect(shortcutFor(press(key, { target }))).toBeNull()
    }
    expect(shortcutFor(press('z', { metaKey: true, target }))).toBeNull()
  })
})
