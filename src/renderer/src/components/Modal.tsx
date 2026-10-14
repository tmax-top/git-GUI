import type { ReactNode } from 'react'
import { t } from '../i18n'

export function Modal(props: {
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={props.onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') props.onClose()
      }}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="text-sm font-semibold text-zinc-100">{props.title}</h2>
          <button
            className="rounded px-2 py-0.5 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            onClick={props.onClose}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-auto p-4">{props.children}</div>
        {props.footer && (
          <div className="flex justify-end gap-2 border-t border-zinc-800 px-4 py-3">
            {props.footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function btnPrimary(): string {
  return 'rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50'
}

export function btnGhost(): string {
  return 'rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50'
}

export function btnDanger(): string {
  return 'rounded bg-rose-700 px-3 py-1.5 text-sm text-white hover:bg-rose-600 disabled:opacity-50'
}

export function inputClass(): string {
  return 'w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-100 outline-none focus:border-emerald-600'
}
