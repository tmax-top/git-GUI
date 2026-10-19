import { useEffect, useRef, useState } from 'react'
import type { SearchCommitHitDto, SearchContentHitDto, SearchScope } from '@shared/ipc'
import { t, tf, type MessageKey } from '../i18n'
import { Modal, btnGhost, inputClass } from '../components/Modal'
import { useApp } from '../store'
import { relativeTime } from '../utils/format'

const SCOPES: readonly SearchScope[] = ['commits', 'files', 'content']

const SCOPE_LABEL_KEY: Record<SearchScope, MessageKey> = {
  commits: 'search.scopeCommits',
  files: 'search.scopeFiles',
  content: 'search.scopeContent'
}

const SCOPE_PLACEHOLDER_KEY: Record<SearchScope, MessageKey> = {
  commits: 'search.placeholderCommits',
  files: 'search.placeholderFiles',
  content: 'search.placeholderContent'
}

type ResultRow =
  | { kind: 'commit'; hit: SearchCommitHitDto }
  | { kind: 'file'; path: string }
  | { kind: 'content'; hit: SearchContentHitDto }

interface ResultState {
  q: string
  scope: SearchScope
  status: 'done' | 'error'
  rows: ResultRow[]
  error: string | null
}

export function SearchDialog(): React.JSX.Element | null {
  const open = useApp((s) => s.searchOpen)
  const close = useApp((s) => s.closeSearch)
  if (!open) return null
  return <SearchPanel onClose={close} />
}

function SearchPanel(props: { onClose: () => void }): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const selectCommit = useApp((s) => s.selectCommit)
  const selectFile = useApp((s) => s.selectFile)

  const [scope, setScope] = useState<SearchScope>('commits')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<ResultState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const q = query.trim()
  // The shown result is only valid while it matches the current query+scope;
  // "searching" is derived from the mismatch (no effect-body setState).
  const active = result && result.q === q && result.scope === scope ? result : null
  const searching = q.length > 0 && active === null

  // Debounced live search on query/scope change; setState only in callbacks.
  useEffect(() => {
    if (!repoPath || !q) return
    let cancelled = false
    const timer = setTimeout(() => {
      void window.api
        .gitSearch({ repoPath, scope, query: q })
        .then((found) => {
          if (cancelled) return
          const hits = found as (SearchCommitHitDto | string | SearchContentHitDto)[]
          setResult({
            q,
            scope,
            status: 'done',
            rows: hits.map((r) =>
              scope === 'commits'
                ? { kind: 'commit', hit: r as SearchCommitHitDto }
                : scope === 'files'
                  ? { kind: 'file', path: r as string }
                  : { kind: 'content', hit: r as SearchContentHitDto }
            ),
            error: null
          })
        })
        .catch((e: unknown) => {
          if (cancelled) return
          setResult({
            q,
            scope,
            status: 'error',
            rows: [],
            error: e instanceof Error ? e.message : String(e)
          })
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [repoPath, scope, q])

  const rows: ResultRow[] | null = active?.status === 'error' ? [] : (active?.rows ?? null)
  const searchError = active?.error ?? null
  const count = rows?.length ?? 0

  const pick = (row: ResultRow): void => {
    if (row.kind === 'commit') selectCommit(row.hit.oid)
    else if (row.kind === 'file') selectFile(row.path, false, false)
    else selectFile(row.hit.path, false, false)
    props.onClose()
  }

  return (
    <Modal title={t('search.title')} onClose={props.onClose}>
      <div className="space-y-3" onKeyDown={(e) => e.stopPropagation()}>
        <div className="flex gap-1">
          {SCOPES.map((s) => (
            <button
              key={s}
              className={`rounded px-2.5 py-1 text-xs ${
                scope === s
                  ? 'bg-emerald-700 text-white'
                  : 'border border-zinc-700 text-zinc-400 hover:bg-zinc-800'
              }`}
              onClick={() => setScope(s)}
            >
              {t(SCOPE_LABEL_KEY[s])}
            </button>
          ))}
        </div>

        <input
          ref={inputRef}
          className={inputClass()}
          placeholder={t(SCOPE_PLACEHOLDER_KEY[scope])}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && rows && count > 0) pick(rows[0])
          }}
        />

        {searchError && <div className="text-xs text-rose-400">{searchError}</div>}

        <div className="max-h-80 min-h-16 overflow-auto rounded border border-zinc-800">
          {rows === null && !searching && (
            <div className="p-3 text-xs text-zinc-500">{t('search.hint')}</div>
          )}
          {searching && rows === null && (
            <div className="p-3 text-xs text-zinc-500">{t('search.searching')}</div>
          )}
          {rows !== null && !searching && count === 0 && !searchError && (
            <div className="p-3 text-xs text-zinc-500">{t('search.noResults')}</div>
          )}
          {rows !== null && count > 0 && (
            <ul className="divide-y divide-zinc-800">
              {rows.map((row, i) => (
                <li key={i}>
                  <button
                    className="w-full px-3 py-1.5 text-left text-xs hover:bg-zinc-800/60"
                    onClick={() => pick(row)}
                  >
                    <ResultLine row={row} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {rows !== null && count > 0 && (
          <div className="text-[11px] text-zinc-500">{tf('search.results', { n: count })}</div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button className={btnGhost()} onClick={props.onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ResultLine(props: { row: ResultRow }): React.JSX.Element {
  const { row } = props
  if (row.kind === 'commit') {
    return (
      <span className="flex items-baseline gap-2">
        <code className="text-zinc-500">{row.hit.shortOid}</code>
        <span className="truncate text-zinc-200">{row.hit.subject}</span>
        <span className="ml-auto shrink-0 text-[11px] text-zinc-500">
          {row.hit.authorName} · {relativeTime(row.hit.authorTime)}
        </span>
      </span>
    )
  }
  if (row.kind === 'file') {
    return <span className="block truncate font-mono text-zinc-300">{row.path}</span>
  }
  return (
    <span className="block">
      <span className="font-mono text-zinc-500">
        {row.hit.path}:{row.hit.line}
      </span>{' '}
      <span className="font-mono text-zinc-300">{row.hit.text.trim()}</span>
    </span>
  )
}
