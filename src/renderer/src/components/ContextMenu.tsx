import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  label: string
  danger?: boolean
  disabled?: boolean
  onClick: () => void
}

export type ContextMenuEntry = ContextMenuItem | { separator: true }

export function isSeparator(e: ContextMenuEntry): e is { separator: true } {
  return (e as { separator?: boolean }).separator === true
}

export function ContextMenu(props: {
  x: number
  y: number
  items: ContextMenuEntry[]
  onClose: () => void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: props.x, y: props.y })

  // Clamp inside the viewport once the menu has a measurable box.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let x = props.x
    let y = props.y
    if (x + r.width > window.innerWidth) x = window.innerWidth - r.width - 4
    if (y + r.height > window.innerHeight) y = window.innerHeight - r.height - 4
    setPos({ x: Math.max(4, x), y: Math.max(4, y) })
  }, [props.x, props.y])

  useEffect(() => {
    const onDown = (e: PointerEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) props.onClose()
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') props.onClose()
    }
    // Capture phase so the originating contextmenu's pointerup doesn't immediately re-close.
    window.addEventListener('pointerdown', onDown, true)
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', props.onClose)
    return () => {
      window.removeEventListener('pointerdown', onDown, true)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', props.onClose)
    }
  }, [props])

  return (
    <div
      ref={ref}
      className="fixed z-[60] min-w-44 rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-2xl"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
    >
      {props.items.map((item, i) =>
        isSeparator(item) ? (
          <div key={i} className="my-1 border-t border-zinc-800" role="separator" />
        ) : (
          <button
            key={i}
            role="menuitem"
            disabled={item.disabled}
            className={`block w-full px-3 py-1.5 text-left text-xs ${
              item.disabled
                ? 'cursor-not-allowed text-zinc-600'
                : item.danger
                  ? 'text-rose-400 hover:bg-rose-500/10'
                  : 'text-zinc-200 hover:bg-zinc-800'
            }`}
            onClick={() => {
              if (item.disabled) return
              props.onClose()
              item.onClick()
            }}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  )
}
