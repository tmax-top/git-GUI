import { Notification } from 'electron'
import type { ActivityEntryDto } from '../shared/ipc'

export type NotifyLang = 'zh' | 'en'

export interface DesktopNotification {
  title: string
  body: string
}

/** Substrings in git stderr that mark a conflict rather than a generic failure. */
const CONFLICT_MARKERS = ['CONFLICT', 'Automatic merge failed', 'could not be applied', 'Merge conflict']

export function looksLikeConflict(message: string | undefined): boolean {
  if (!message) return false
  return CONFLICT_MARKERS.some((m) => message.includes(m))
}

/**
 * Decide whether a sync/auto-fetch outcome deserves a desktop notification.
 * Returns null for outcomes we don't notify about (successful fetch/pull,
 * cancelled ops, …). Pure — unit-testable without Electron.
 */
export function notifyForSync(
  lang: NotifyLang,
  kind: ActivityEntryDto['kind'],
  ok: boolean,
  message?: string
): DesktopNotification | null {
  if (ok) {
    if (kind === 'push') {
      return lang === 'zh'
        ? { title: '推送完成', body: '分支已成功推送到远程。' }
        : { title: 'Push complete', body: 'Branch pushed to the remote successfully.' }
    }
    return null
  }
  if (looksLikeConflict(message)) {
    return lang === 'zh'
      ? { title: '合并冲突', body: '操作因冲突中止，请在应用内解决冲突。' }
      : { title: 'Merge conflict', body: 'The operation stopped on conflicts. Resolve them in the app.' }
  }
  if (kind === 'fetch' || kind === 'auto-fetch') {
    return lang === 'zh'
      ? { title: '获取远端失败', body: message ?? 'git fetch 失败。' }
      : { title: 'Fetch failed', body: message ?? 'git fetch failed.' }
  }
  // push/pull non-conflict failures already surface as in-app errors — stay quiet.
  return null
}

/** Show a system notification; no-op when unsupported (e.g. Linux w/o libnotify). */
export function showDesktopNotification(n: DesktopNotification): void {
  try {
    if (!Notification.isSupported()) return
    new Notification(n).show()
  } catch {
    /* notifications must never break the caller */
  }
}
