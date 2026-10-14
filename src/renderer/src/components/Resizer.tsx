import { useCallback, useEffect, useRef, useState } from 'react'
import { useApp } from '../store'
import type { AppSettingsDto } from '@shared/ipc'

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

/**
 * Live-resizable numeric setting: drag mutates local state instantly,
 * pointer-up persists the final value via IPC.
 */
export function useResizableSetting(
  key: NumberSettingKey,
  fallback: number,
  min: number,
  max: number
): { value: number; onDelta: (delta: number) => void; onCommit: () => void } {
  const raw = useApp((s) => s.settings[key])
  const updateSettings = useApp((s) => s.updateSettings)
  const value = clamp(typeof raw === 'number' ? raw : fallback, min, max)
  const [draft, setDraft] = useState<number | null>(null)
  const draftRef = useRef<number | null>(null)

  // Store caught up with the last committed drag → drop the draft overlay.
  useEffect(() => {
    if (draftRef.current != null && draftRef.current === value) {
      draftRef.current = null
      setDraft(null)
    }
  }, [value])

  const onDelta = useCallback(
    (delta: number) => {
      const base = draftRef.current ?? value
      const next = clamp(base + delta, min, max)
      draftRef.current = next
      setDraft(next)
    },
    [value, min, max]
  )

  const onCommit = useCallback(() => {
    const next = draftRef.current
    if (next != null && next !== value) {
      void updateSettings({ [key]: next } as Partial<AppSettingsDto>)
    }
  }, [key, value, updateSettings])

  return { value: draft ?? value, onDelta, onCommit }
}

export type NumberSettingKey =
  | 'leftPanelWidth'
  | 'rightPanelWidth'
  | 'graphSplitPct'
  | 'graphAuthorWidth'
  | 'graphDateWidth'
  | 'graphOidWidth'

interface ResizerProps {
  /** vertical = drag left/right (col-resize); horizontal = drag up/down (row-resize). */
  orientation: 'vertical' | 'horizontal'
  onDelta: (deltaPx: number) => void
  onCommit: () => void
  className?: string
}

export function Resizer(props: ResizerProps): React.JSX.Element {
  const last = useRef(0)

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    last.current = props.orientation === 'vertical' ? e.clientX : e.clientY

    const move = (ev: PointerEvent): void => {
      const cur = props.orientation === 'vertical' ? ev.clientX : ev.clientY
      const delta = cur - last.current
      if (delta === 0) return
      last.current = cur
      props.onDelta(delta)
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      props.onCommit()
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const orientationCls =
    props.orientation === 'vertical'
      ? 'w-1 cursor-col-resize'
      : 'h-1 cursor-row-resize'

  return (
    <div
      role="separator"
      aria-orientation={props.orientation === 'vertical' ? 'vertical' : 'horizontal'}
      className={`shrink-0 bg-zinc-800 hover:bg-sky-500/50 active:bg-sky-500/70 ${orientationCls} ${props.className ?? ''}`}
      onPointerDown={onPointerDown}
    />
  )
}
