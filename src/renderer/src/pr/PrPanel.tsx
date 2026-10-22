import { useState } from 'react'
import { btnGhost, btnPrimary } from '../components/Modal'
import { t, tf } from '../i18n'
import { useApp } from '../store'
import type { PrMergeMethod, PrState } from '@shared/providers'

export function PrPanel(): React.JSX.Element | null {
  const open = useApp((s) => s.prPanelOpen)
  const toggle = useApp((s) => s.togglePrPanel)
  const openSettings = useApp((s) => s.openSettings)
  const openCreate = useApp((s) => s.openCreatePr)
  const activeRepoRef = useApp((s) => s.activeRepoRef)
  const providerAccounts = useApp((s) => s.settings.providerAccounts ?? [])
  const prs = useApp((s) => s.prs)
  const prLoading = useApp((s) => s.prLoading)
  const activePrId = useApp((s) => s.activePrId)
  const activePrDetail = useApp((s) => s.activePrDetail)
  const activePrLoading = useApp((s) => s.activePrLoading)
  const prFilter = useApp((s) => s.prFilter)
  const setPrFilter = useApp((s) => s.setPrFilter)
  const loadPrs = useApp((s) => s.loadPrs)
  const selectPr = useApp((s) => s.selectPr)
  const commentPr = useApp((s) => s.commentPr)
  const mergePr = useApp((s) => s.mergePr)
  const checkoutPr = useApp((s) => s.checkoutPr)

  const [activeTab, setActiveTab] = useState<'conversation' | 'changes'>('conversation')
  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [mergeMethod, setMergeMethod] = useState<PrMergeMethod>('merge')
  const [merging, setMerging] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [search, setSearch] = useState('')

  if (!open) return null

  const isConnected =
    activeRepoRef && providerAccounts.some((a) => a.provider === activeRepoRef.provider)

  const filteredPrs = prs.filter((p) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      p.title.toLowerCase().includes(q) ||
      String(p.number).includes(q) ||
      p.author.name.toLowerCase().includes(q) ||
      p.sourceBranch.toLowerCase().includes(q)
    )
  })

  const handleComment = async (): Promise<void> => {
    if (!commentText.trim() || commenting) return
    setCommenting(true)
    try {
      await commentPr(commentText.trim())
      setCommentText('')
    } finally {
      setCommenting(false)
    }
  }

  const handleMerge = async (): Promise<void> => {
    if (!activePrDetail || merging) return
    if (!window.confirm(tf('pr.mergeConfirm', { n: activePrDetail.number }))) return
    setMerging(true)
    try {
      await mergePr(mergeMethod)
    } finally {
      setMerging(false)
    }
  }

  const handleCheckout = async (): Promise<void> => {
    if (!activePrDetail || checkoutBusy) return
    setCheckoutBusy(true)
    try {
      await checkoutPr(activePrDetail.sourceBranch)
    } finally {
      setCheckoutBusy(false)
    }
  }

  const stateBadge = (state: PrState, draft?: boolean): React.JSX.Element => {
    if (draft) {
      return <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[10px] text-zinc-300">Draft</span>
    }
    if (state === 'open') {
      return <span className="rounded bg-emerald-950 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">Open</span>
    }
    if (state === 'merged') {
      return <span className="rounded bg-purple-950 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">Merged</span>
    }
    return <span className="rounded bg-rose-950 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">Closed</span>
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={toggle}
      role="presentation"
    >
      <div
        className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('pr.title')}
        data-testid="pr-panel"
      >
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-200">{t('pr.title')}</span>
            {activeRepoRef && (
              <span className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-zinc-400">
                {activeRepoRef.canonical}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isConnected && (
              <>
                <button
                  className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  onClick={() => void loadPrs()}
                  title={t('pr.refresh')}
                  data-testid="pr-refresh"
                >
                  ↻
                </button>
                <button
                  className={btnPrimary()}
                  onClick={openCreate}
                  data-testid="pr-new-btn"
                >
                  ＋ {t('pr.new')}
                </button>
              </>
            )}
            <button
              className="rounded px-2 py-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              onClick={toggle}
              aria-label={t('common.close')}
              data-testid="pr-close"
            >
              ✕
            </button>
          </div>
        </header>

        {/* Content area */}
        {!activeRepoRef ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-zinc-400">
            <span>{t('pr.notSupported')}</span>
          </div>
        ) : !isConnected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-zinc-400">
            <span>{t('pr.connectGuide')}</span>
            <button
              className={btnPrimary()}
              onClick={() => {
                toggle()
                openSettings()
              }}
            >
              {t('settings.title')}
            </button>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            {/* PR list sidebar */}
            <div className="flex w-80 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950">
              {/* Filter tabs */}
              <div className="flex border-b border-zinc-800 px-2 py-1.5 text-xs">
                {(['open', 'merged', 'closed', 'all'] as const).map((st) => (
                  <button
                    key={st}
                    className={`flex-1 rounded px-1.5 py-1 text-center font-medium ${
                      prFilter === st
                        ? 'bg-zinc-800 text-zinc-100'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    onClick={() => setPrFilter(st)}
                    data-testid={`pr-filter-${st}`}
                  >
                    {t(`pr.state.${st}` as 'pr.state.open')}
                  </button>
                ))}
              </div>

              {/* Search filter */}
              <div className="p-2 border-b border-zinc-800">
                <input
                  className="w-full rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t('pr.searchPlaceholder')}
                  data-testid="pr-search-input"
                />
              </div>

              {/* PR list */}
              <div className="flex-1 overflow-y-auto divide-y divide-zinc-900">
                {prLoading ? (
                  <div className="p-4 text-center text-xs text-zinc-500">{t('common.loading')}</div>
                ) : filteredPrs.length === 0 ? (
                  <div className="p-4 text-center text-xs text-zinc-600">{t('pr.noPrs')}</div>
                ) : (
                  filteredPrs.map((pr) => (
                    <button
                      key={pr.id}
                      className={`w-full p-2.5 text-left transition hover:bg-zinc-900/60 ${
                        activePrId === pr.id ? 'bg-zinc-900' : ''
                      }`}
                      onClick={() => void selectPr(pr.id)}
                      data-testid={`pr-item-${pr.number}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[11px] text-zinc-400">#{pr.number}</span>
                        {stateBadge(pr.state, pr.draft)}
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs font-medium text-zinc-200">
                        {pr.title}
                      </div>
                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-zinc-500">
                        <span className="truncate">{pr.author.name}</span>
                        <span className="font-mono text-zinc-400">
                          {pr.sourceBranch} → {pr.targetBranch}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* PR detail pane */}
            <div className="flex flex-1 flex-col overflow-y-auto bg-zinc-900/30">
              {activePrLoading ? (
                <div className="flex flex-1 items-center justify-center text-xs text-zinc-500">
                  {t('common.loading')}
                </div>
              ) : !activePrDetail ? (
                <div className="flex flex-1 items-center justify-center text-xs text-zinc-500">
                  {t('pr.selectHint')}
                </div>
              ) : (
                <div className="flex flex-1 flex-col p-4">
                  {/* PR Header */}
                  <div className="border-b border-zinc-800 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-zinc-400">
                            #{activePrDetail.number}
                          </span>
                          <h2 className="text-base font-semibold text-zinc-100" data-testid="pr-detail-title">
                            {activePrDetail.title}
                          </h2>
                          {stateBadge(activePrDetail.state, activePrDetail.draft)}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                          <span>{tf('pr.createdBy', { name: activePrDetail.author.name })}</span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[11px] text-zinc-300">
                            {activePrDetail.sourceBranch} → {activePrDetail.targetBranch}
                          </span>
                          <a
                            href={activePrDetail.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-400 hover:underline"
                          >
                            {t('pr.openInBrowser')} ↗
                          </a>
                        </div>
                      </div>

                      {/* Top Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          className={btnGhost()}
                          onClick={() => void handleCheckout()}
                          disabled={checkoutBusy}
                          title={t('pr.checkout')}
                          data-testid="pr-checkout-btn"
                        >
                          {checkoutBusy ? '…' : t('pr.checkout')}
                        </button>
                        {activePrDetail.state === 'open' && (
                          <div className="flex items-center gap-1">
                            <select
                              className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-200"
                              value={mergeMethod}
                              onChange={(e) => setMergeMethod(e.target.value as PrMergeMethod)}
                            >
                              <option value="merge">{t('pr.mergeMethod.merge')}</option>
                              <option value="squash">{t('pr.mergeMethod.squash')}</option>
                              <option value="rebase">{t('pr.mergeMethod.rebase')}</option>
                            </select>
                            <button
                              className={btnPrimary()}
                              onClick={() => void handleMerge()}
                              disabled={merging}
                              data-testid="pr-merge-btn"
                            >
                              {merging ? '…' : t('pr.merge')}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tabs switcher */}
                    <div className="mt-4 flex gap-4 text-xs">
                      <button
                        className={`border-b-2 pb-1.5 font-medium ${
                          activeTab === 'conversation'
                            ? 'border-sky-500 text-sky-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                        onClick={() => setActiveTab('conversation')}
                        data-testid="pr-tab-conversation"
                      >
                        {t('pr.conversation')} ({activePrDetail.comments.length})
                      </button>
                      <button
                        className={`border-b-2 pb-1.5 font-medium ${
                          activeTab === 'changes'
                            ? 'border-sky-500 text-sky-400'
                            : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                        onClick={() => setActiveTab('changes')}
                        data-testid="pr-tab-changes"
                      >
                        {t('pr.changes')}
                      </button>
                    </div>
                  </div>

                  {/* Tab Body */}
                  <div className="mt-4 flex-1">
                    {activeTab === 'conversation' ? (
                      <div className="flex flex-col gap-4">
                        {/* Description */}
                        {activePrDetail.description ? (
                          <div className="rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 whitespace-pre-wrap">
                            {activePrDetail.description}
                          </div>
                        ) : null}

                        {/* Comments timeline */}
                        <div className="flex flex-col gap-3">
                          {activePrDetail.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded border border-zinc-800/80 bg-zinc-950/70 p-3 text-xs"
                            >
                              <div className="flex items-center justify-between text-zinc-400 text-[11px] mb-1.5">
                                <span className="font-semibold text-zinc-200">
                                  {comment.author.name}
                                </span>
                                <span>{new Date(comment.createdAt).toLocaleString()}</span>
                              </div>
                              <div className="whitespace-pre-wrap text-zinc-300 leading-relaxed">
                                {comment.body}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Comment input box */}
                        <div className="mt-2 flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-950 p-3">
                          <textarea
                            className="w-full resize-y rounded border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-200 placeholder-zinc-500 focus:border-sky-500 focus:outline-none min-h-20"
                            placeholder={t('pr.commentPlaceholder')}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            data-testid="pr-comment-input"
                          />
                          <div className="flex justify-end">
                            <button
                              className={btnPrimary()}
                              disabled={!commentText.trim() || commenting}
                              onClick={() => void handleComment()}
                              data-testid="pr-comment-submit"
                            >
                              {commenting ? '…' : t('pr.commentSubmit')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Diff view */
                      <div className="rounded border border-zinc-800 bg-zinc-950 p-3">
                        <pre className="overflow-x-auto font-mono text-xs text-zinc-300 whitespace-pre">
                          {activePrDetail.diff || t('diff.empty')}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
