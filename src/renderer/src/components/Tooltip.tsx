import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TipProps {
  label?: string
  children: React.ReactNode
  /** Preferred side; flips automatically when there is no room. */
  side?: 'bottom' | 'top'
  /** Hover delay in ms — native `title` takes ~1s and is not configurable. */
  delay?: number
  /** Replaces the default wrapper classes (needed for full-width controls). */
  className?: string
}

interface TipPos {
  left: number
  top: number
  placement: 'bottom' | 'top'
}

/**
 * Fast, theme-aware tooltip that also works for **disabled** buttons.
 *
 * Chromium never shows a native `title` tooltip on a disabled control, which is
 * why half of the toolbar's hints looked "broken". Wrapping the control in a
 * span puts the hover target on an element that is always interactive.
 */
export function Tip({
  label,
  children,
  side = 'bottom',
  delay = 320,
  className
}: TipProps): React.JSX.Element {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<number | null>(null)
  const [pos, setPos] = useState<TipPos | null>(null)

  const clearTimer = useCallback((): void => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const hide = useCallback((): void => {
    clearTimer()
    setPos(null)
  }, [clearTimer])

  const show = useCallback((): void => {
    if (!label) return
    clearTimer()
    timerRef.current = window.setTimeout(() => {
      const el = anchorRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      // Flip above when the bubble would leave the viewport at the bottom.
      const placement: TipPos['placement'] =
        side === 'bottom' && r.bottom + 44 > window.innerHeight ? 'top' : side
      setPos({
        left: Math.min(Math.max(r.left + r.width / 2, 12), window.innerWidth - 12),
        top: placement === 'bottom' ? r.bottom + 6 : r.top - 6,
        placement
      })
    }, delay)
  }, [clearTimer, delay, label, side])

  useEffect(() => clearTimer, [clearTimer])

  return (
    <>
      <span
        ref={anchorRef}
        className={className ?? 'inline-flex min-w-0'}
        onMouseEnter={show}
        onMouseLeave={hide}
        onMouseDown={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </span>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            className="pointer-events-none fixed z-[100] max-w-[320px] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] leading-snug text-zinc-100 shadow-lg"
            style={{
              left: pos.left,
              top: pos.top,
              transform: `translateX(-50%)${pos.placement === 'top' ? ' translateY(-100%)' : ''}`
            }}
          >
            {label}
          </div>,
          document.body
        )}
    </>
  )
}
