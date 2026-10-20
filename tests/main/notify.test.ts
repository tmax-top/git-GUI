import { describe, expect, it } from 'vitest'
import { looksLikeConflict, notifyForSync } from '@main/notify'

describe('notifyForSync', () => {
  it('notifies on successful push (zh and en)', () => {
    const zh = notifyForSync('zh', 'push', true)
    const en = notifyForSync('en', 'push', true)
    expect(zh?.title).toBe('推送完成')
    expect(en?.title).toBe('Push complete')
  })

  it('does not notify on successful fetch or pull', () => {
    expect(notifyForSync('zh', 'fetch', true)).toBeNull()
    expect(notifyForSync('zh', 'pull', true)).toBeNull()
    expect(notifyForSync('zh', 'auto-fetch', true)).toBeNull()
  })

  it('notifies on conflict failures regardless of kind', () => {
    const msg = 'git pull failed (1): CONFLICT (content): Merge conflict in file.txt'
    for (const kind of ['pull', 'push', 'fetch'] as const) {
      const n = notifyForSync('en', kind, false, msg)
      expect(n?.title).toBe('Merge conflict')
    }
    expect(notifyForSync('zh', 'pull', false, msg)?.title).toBe('合并冲突')
  })

  it('detects other conflict phrasings', () => {
    expect(looksLikeConflict('Automatic merge failed; fix conflicts')).toBe(true)
    expect(looksLikeConflict('error: could not be applied abc123..def456')).toBe(true)
    expect(looksLikeConflict('Merge conflict in a.txt')).toBe(true)
    expect(looksLikeConflict('network is unreachable')).toBe(false)
    expect(looksLikeConflict(undefined)).toBe(false)
  })

  it('notifies on failed fetch (manual and auto) with the message as body', () => {
    const n = notifyForSync('en', 'fetch', false, 'Could not resolve host: github.com')
    expect(n?.title).toBe('Fetch failed')
    expect(n?.body).toContain('Could not resolve host')

    const auto = notifyForSync('zh', 'auto-fetch', false, 'Could not resolve host: github.com')
    expect(auto?.title).toBe('获取远端失败')
    expect(auto?.body).toContain('Could not resolve host')
  })

  it('falls back to a default body when the failure has no message', () => {
    expect(notifyForSync('en', 'fetch', false)?.body).toBe('git fetch failed.')
    expect(notifyForSync('zh', 'fetch', false)?.body).toBe('git fetch 失败。')
  })

  it('stays quiet for non-conflict pull/push failures (in-app error already shown)', () => {
    expect(notifyForSync('en', 'pull', false, 'Permission denied (publickey)')).toBeNull()
    expect(notifyForSync('en', 'push', false, '! [rejected] non-fast-forward')).toBeNull()
  })
})
