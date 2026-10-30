import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { layoutGraph } from './layout'
import type { GraphSegment } from './layout'
import { useApp } from '../store'
import { t, tf } from '../i18n'
import { commitTimeLabel } from '../utils/format'
import { Resizer, useResizableSetting } from '../components/Resizer'
import { isStaged } from '@shared/status'

const ROW_H = 28
const LANE_W = 16
const PAD_X = 8
const RADIUS = 4.5
const LANE_COLORS = [
  '#15803d',
  '#0369a1',
  '#b45309',
  '#be123c',
  '#6d28d9',
  '#0f766e',
  '#4d7c0f',
  '#c2410c',
  '#0e7490',
  '#a21caf'
]

/** `origin/main` and `main` must share one colour, so strip the remote name. */
function branchKey(b: { name: string; isRemote: boolean }): string {
  if (!b.isRemote) return b.name
  const slash = b.name.indexOf('/')
  return slash >= 0 ? b.name.slice(slash + 1) : b.name
}

// Memoized: AppShell re-renders on every resizer move; this panel is the most
// expensive subtree (virtualizer + canvas) and takes no props.
export const CommitGraph = memo(function CommitGraph(): React.JSX.Element {
  const commits = useApp((s) => s.commits)
  const hasMore = useApp((s) => s.hasMore)
  const graphLoading = useApp((s) => s.graphLoading)
  const selection = useApp((s) => s.selection)
  const refs = useApp((s) => s.refs)
  const status = useApp((s) => s.status)
  const selectWip = useApp((s) => s.selectWip)
  const selectCommit = useApp((s) => s.selectCommit)
  const loadMore = useApp((s) => s.loadMore)
  const openMenu = useApp((s) => s.openMenu)
  const cherryPick = useApp((s) => s.cherryPick)
  const revert = useApp((s) => s.revert)
  const reset = useApp((s) => s.reset)
  const tagCreate = useApp((s) => s.tagCreate)
  const openRebaseDialog = useApp((s) => s.openRebaseDialog)
  const setConfirm = useApp((s) => s.setConfirm)
  const setPrompt = useApp((s) => s.setPrompt)

  const authorCol = useResizableSetting('graphAuthorWidth', 112, 60, 400)
  // Date column needs room for "今天 18:32" / "10-27 15:48"; the oid column for
  // 8 hex chars. Min values are raised too, so settings saved by older builds
  // (48 / 40) get clamped up instead of truncating the text.
  const dateCol = useResizableSetting('graphDateWidth', 96, 88, 220)
  const oidCol = useResizableSetting('graphOidWidth', 64, 64, 160)

  const layout = useMemo(
    () => layoutGraph(commits.map((c) => ({ oid: c.oid, parents: c.parents }))),
    [commits]
  )

  /**
   * One stable colour per branch name (remote prefix stripped, so `main` and
   * `origin/main` agree). Hash-based with collision probing: adding a branch
   * does not reshuffle every other colour.
   */
  const refColors = useMemo(() => {
    const map = new Map<string, string>()
    const keys = new Set<string>()
    for (const b of refs?.branches ?? []) keys.add(branchKey(b))
    const used = new Set<number>()
    for (const key of [...keys].sort()) {
      let h = 0
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
      let idx = h % LANE_COLORS.length
      while (used.size < LANE_COLORS.length && used.has(idx)) idx = (idx + 1) % LANE_COLORS.length
      used.add(idx)
      map.set(key, LANE_COLORS[idx])
    }
    return map
  }, [refs])

  const labelsByOid = useMemo(() => {
    const map = new Map<string, { text: string; color: string }[]>()
    const push = (oid: string, text: string, color: string): void => {
      const arr = map.get(oid) ?? []
      arr.push({ text, color })
      map.set(oid, arr)
    }
    for (const b of refs?.branches ?? []) {
      push(b.oid, b.name, refColors.get(branchKey(b)) ?? '#0369a1')
    }
    for (const tag of refs?.tags ?? []) push(tag.oid, tag.name, '#b45309')
    return map
  }, [refs, refColors])

  const segByRow = useMemo(() => {
    const map = new Map<number, GraphSegment[]>()
    for (const seg of layout.segments) {
      const arr = map.get(seg.row) ?? []
      arr.push(seg)
      map.set(seg.row, arr)
    }
    return map
  }, [layout])

  /**
   * Colour of every row's dot plus the colours of the lanes continuing below it.
   * A commit takes its branch's colour; a lane inherits the colour of the commit
   * that opened it, so a line keeps its branch colour until that branch ends.
   */
  const laneColors = useMemo(() => {
    const dot: string[] = []
    const below: string[][] = []
    const laneColor: (string | undefined)[] = []
    for (let ci = 0; ci < layout.rows.length; ci++) {
      const row = layout.rows[ci]
      const oid = commits[ci]?.oid
      const refColor = oid ? labelsByOid.get(oid)?.[0]?.color : undefined
      const c = refColor ?? laneColor[row.lane] ?? LANE_COLORS[row.lane % LANE_COLORS.length]
      laneColor[row.lane] = c
      dot[ci] = c
      // Lanes opened by a merge/branch take the colour of the parent's branch.
      for (const seg of segByRow.get(ci) ?? []) {
        if (!seg.parentOid) continue
        const parentColor = labelsByOid.get(seg.parentOid)?.[0]?.color
        if (parentColor) laneColor[seg.toLane] = parentColor
      }
      below[ci] = row.activeBelow.map(
        (lane) => laneColor[lane] ?? LANE_COLORS[lane % LANE_COLORS.length]
      )
    }
    return { dot, below }
  }, [layout, commits, labelsByOid, segByRow])

  const totalRows = commits.length + 1
  const parentRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: totalRows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_H,
    overscan: 8
  })
  const items = virtualizer.getVirtualItems()

  // Paginate when the viewport approaches the end of loaded commits.
  const lastIndex = items.length > 0 ? items[items.length - 1].index : -1
  useEffect(() => {
    if (lastIndex >= 0 && lastIndex >= totalRows - 25 && hasMore && !graphLoading) {
      void loadMore()
    }
  }, [lastIndex, totalRows, hasMore, graphLoading, loadMore])

  // Lane column width follows the lanes actually used by VISIBLE rows, not the
  // all-time peak (`layout.laneCount`). A deep history with one wide merge would
  // otherwise pin the graph column open and leave a huge gap before Subject.
  const visibleMaxLane = useMemo(() => {
    let max = 0
    const touch = (lane: number): void => {
      if (lane > max) max = lane
    }
    for (const v of items) {
      if (v.index === 0) continue // WIP row draws on lane 0
      const row = layout.rows[v.index - 1]
      if (!row) continue
      touch(row.lane)
      for (const lane of row.activeBelow) touch(lane)
    }
    // Segment endpoints on visible rows (curves must not be clipped).
    const visibleRows = new Set<number>()
    for (const v of items) if (v.index > 0) visibleRows.add(v.index - 1)
    for (const seg of layout.segments) {
      if (visibleRows.has(seg.row)) {
        touch(seg.fromLane)
        touch(seg.toLane)
      }
    }
    return max
  }, [items, layout])

  const laneColW = Math.max(visibleMaxLane + 1, 1) * LANE_W + PAD_X * 2
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Redraw visible lanes on the overlay canvas.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || items.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const first = items[0].index
    const last = items[items.length - 1].index
    const cssH = (last - first + 1) * ROW_H
    const cssW = laneColW
    if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
      canvas.width = Math.round(cssW * dpr)
      canvas.height = Math.round(cssH * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cssW, cssH)

    const cx = (lane: number): number => PAD_X + lane * LANE_W + LANE_W / 2
    const yOf = (virtualIndex: number): number => (virtualIndex - first) * ROW_H + ROW_H / 2
    const fallback = (lane: number): string => LANE_COLORS[lane % LANE_COLORS.length]

    ctx.lineCap = 'round'

    // Row contents (WIP = index 0, commit[i] = index i+1).
    for (const v of items) {
      const i = v.index
      const y = yOf(i)

      if (i === 0) {
        // WIP node → connects down to the first commit on lane 0.
        if (commits.length > 0 && first <= 1) {
          ctx.strokeStyle = laneColors.dot[0] ?? fallback(0)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(cx(0), y + RADIUS)
          ctx.lineTo(cx(0), yOf(1) - RADIUS)
          ctx.stroke()
        }
        continue
      }

      const ci = i - 1
      const row = layout.rows[ci]
      if (!row) continue
      const rowSegments = segByRow.get(ci) ?? []

      // Vertical continuations in the gap below this row — skipped for lanes a
      // branch segment is opening in this same gap (the curve is the only
      // connector there; a parallel vertical would leave a free-floating tip).
      if (i < totalRows - 1) {
        const branchOpened = new Set(
          rowSegments.filter((s) => s.kind === 'branch').map((s) => s.toLane)
        )
        row.activeBelow.forEach((lane, k) => {
          if (branchOpened.has(lane)) return
          ctx.strokeStyle = laneColors.below[ci]?.[k] ?? fallback(lane)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(cx(lane), y)
          ctx.lineTo(cx(lane), y + ROW_H)
          ctx.stroke()
        })
      }

      // Segments: converge joins extra lanes into this commit's dot (same row);
      // merge/branch live in the gap below.
      for (const seg of rowSegments) {
        const x1 = cx(seg.fromLane)
        const x2 = cx(seg.toLane)
        const parentColor = seg.parentOid
          ? labelsByOid.get(seg.parentOid)?.[0]?.color
          : undefined
        if (seg.kind === 'converge') {
          ctx.strokeStyle = laneColors.dot[ci] ?? fallback(seg.fromLane)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x1, y)
          const midX = (x1 + x2) / 2
          ctx.bezierCurveTo(midX, y - 6, midX, y - 6, x2, y)
          ctx.stroke()
          continue
        }
        const y2 = y + ROW_H
        ctx.strokeStyle = parentColor ?? laneColors.dot[ci] ?? fallback(seg.fromLane)
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x1, y)
        if (x1 === x2) {
          ctx.lineTo(x2, y2)
        } else {
          const midY = (y + y2) / 2
          ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2)
        }
        ctx.stroke()
      }

      // Commit dot — solid filled circle. Selection adds a crisp ring instead
      // of a translucent halo, which used to read as a hollow (merge) node.
      const isSelected = selection.kind === 'commit' && selection.oid === row.oid
      const r = isSelected ? RADIUS + 1 : RADIUS
      const dotColor = laneColors.dot[ci] ?? fallback(row.lane)
      ctx.beginPath()
      ctx.arc(cx(row.lane), y, r, 0, Math.PI * 2)
      ctx.fillStyle = dotColor
      ctx.fill()
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(cx(row.lane), y, r + 3, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = dotColor
        ctx.stroke()
      }
    }
  }, [items, layout, selection, commits, laneColW, totalRows, laneColors, segByRow, labelsByOid])

  const wipCount = (status?.files.length ?? 0) > 0
  const stagedCount = status?.files.filter(isStaged).length ?? 0

  const onCommitContextMenu = (e: React.MouseEvent, oid: string): void => {
    e.preventDefault()
    e.stopPropagation()
    selectCommit(oid)
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: t('menu.cherryPick'),
          onClick: () => void cherryPick([oid])
        },
        {
          label: t('menu.revert'),
          onClick: () => void revert([oid])
        },
        { separator: true },
        {
          label: t('menu.resetSoft'),
          onClick: () => void reset('soft', oid)
        },
        {
          label: t('menu.resetMixed'),
          onClick: () => void reset('mixed', oid)
        },
        {
          label: t('menu.resetHard'),
          danger: true,
          onClick: () =>
            setConfirm({
              title: t('menu.resetHard'),
              body: tf('menu.resetHardConfirm', { oid: oid.slice(0, 8) }),
              confirmLabel: t('menu.resetHard'),
              danger: true,
              onConfirm: () => reset('hard', oid)
            })
        },
        { separator: true },
        {
          label: t('menu.interactiveRebase'),
          disabled: oid === status?.oid,
          onClick: () => {
            const c = commits.find((x) => x.oid === oid)
            openRebaseDialog({
              base: oid,
              baseShort: oid.slice(0, 8),
              baseSubject: c?.subject ?? ''
            })
          }
        },
        { separator: true },
        {
          label: t('menu.tagHere'),
          onClick: () =>
            setPrompt({
              title: t('prompt.tagTitle'),
              label: t('prompt.tagName'),
              onSubmit: (name) => tagCreate(name.trim(), undefined, oid)
            })
        },
        {
          label: t('menu.copyOid'),
          onClick: () => void navigator.clipboard.writeText(oid)
        }
      ]
    })
  }

  // Horizontal scroll sync: the column header lives outside the scroll area
  // (sticky), so it mirrors the body's scrollLeft.
  const headerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const onScroll = (): void => {
      if (headerRef.current) headerRef.current.scrollLeft = el.scrollLeft
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Explicit content width = max(viewport, intrinsic minimum) so header and
  // rows share identical column geometry and wide lane sets scroll cleanly.
  const [viewportW, setViewportW] = useState(0)
  useEffect(() => {
    const el = parentRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setViewportW(el.clientWidth))
    ro.observe(el)
    setViewportW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  const fixedColsW =
    authorCol.value + dateCol.value + oidCol.value + 3 * 4 /* resizers */ + 12 /* pr-3 */
  const contentW = Math.max(viewportW, laneColW + 80 + fixedColsW)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={headerRef} className="shrink-0 overflow-hidden border-b border-black/5">
        <div
          className="flex select-none items-center bg-zinc-950 pr-3 text-[11px] font-medium text-zinc-500"
          style={{ width: contentW, minWidth: '100%' }}
        >
          <div style={{ width: laneColW, flexShrink: 0 }} aria-hidden />
          <div className="min-w-0 flex-1 truncate px-2">{t('graph.subject')}</div>
          <Resizer
            orientation="vertical"
            onDelta={(d) => authorCol.onDelta(-d)}
            onCommit={authorCol.onCommit}
            className="self-stretch"
          />
          <div className="shrink-0 truncate px-2" style={{ width: authorCol.value }}>
            {t('graph.author')}
          </div>
          <Resizer
            orientation="vertical"
            onDelta={(d) => dateCol.onDelta(-d)}
            onCommit={dateCol.onCommit}
            className="self-stretch"
          />
          <div className="shrink-0 truncate px-2 text-right" style={{ width: dateCol.value }}>
            {t('graph.date')}
          </div>
          <Resizer
            orientation="vertical"
            onDelta={(d) => oidCol.onDelta(-d)}
            onCommit={oidCol.onCommit}
            className="self-stretch"
          />
          <div className="shrink-0 truncate px-2 font-mono" style={{ width: oidCol.value }}>
            {t('graph.oid')}
          </div>
        </div>
      </div>

      <div ref={parentRef} className="relative flex-1 overflow-auto overscroll-contain">
      <div className="relative" style={{ height: virtualizer.getTotalSize(), width: contentW, minWidth: '100%' }}>
        {items.length > 0 && (
          <canvas
            ref={canvasRef}
            className="pointer-events-none absolute"
            style={{
              left: 0,
              top: items[0].start,
              width: laneColW,
              height: (items[items.length - 1].end - items[0].start) || ROW_H
            }}
          />
        )}

        {items.map((v) => {
          const i = v.index
          const isWip = i === 0
          const commit = isWip ? null : commits[i - 1]
          const selected = isWip
            ? selection.kind === 'wip'
            : commit && selection.kind === 'commit' && selection.oid === commit.oid
          const labels = commit ? labelsByOid.get(commit.oid) ?? [] : []

          return (
            <div
              key={v.key}
              data-index={i}
              ref={virtualizer.measureElement}
              className={`absolute left-0 flex w-full cursor-pointer items-center border-b border-black/5 pr-3 text-xs hover:bg-zinc-800/50 ${
                selected ? 'bg-sky-500/10' : ''
              }`}
              style={{ top: v.start, height: ROW_H }}
              onClick={() => (isWip ? selectWip() : commit && selectCommit(commit.oid))}
              onContextMenu={(e) => {
                if (!isWip && commit) onCommitContextMenu(e, commit.oid)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isWip && commit) selectCommit(commit.oid)
              }}
            >
              <div style={{ width: laneColW, flexShrink: 0 }} aria-hidden />
              {isWip ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${
                      wipCount ? 'bg-emerald-500 text-white' : 'bg-zinc-700 text-zinc-400'
                    }`}
                  >
                    {wipCount ? '!' : '·'}
                  </span>
                  <span className={wipCount ? 'text-emerald-300' : 'text-zinc-500'}>
                    {t('graph.wip')}
                  </span>
                  {wipCount && (
                    <span className="text-zinc-500">
                      · {stagedCount}/{status?.files.length}
                    </span>
                  )}
                </div>
              ) : commit ? (
                <>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5">
                    {labels.map((l) => (
                      <span
                        key={l.text}
                        className="max-w-[220px] shrink-0 truncate rounded px-1 py-px text-[10px] font-medium"
                        style={{ backgroundColor: `${l.color}22`, color: l.color }}
                        title={l.text}
                      >
                        {l.text}
                      </span>
                    ))}
                    <span className="min-w-0 truncate text-zinc-200" title={commit.subject}>
                      {commit.subject || '(no message)'}
                    </span>
                  </div>
                  <span
                    className="ml-3 hidden shrink-0 truncate text-zinc-500 md:inline"
                    style={{ width: authorCol.value }}
                  >
                    {commit.authorName}
                  </span>
                  <span
                    className="ml-3 shrink-0 text-right tabular-nums text-zinc-600"
                    style={{ width: dateCol.value }}
                  >
                    {commitTimeLabel(commit.committerTime, {
                      today: t('time.today'),
                      yesterday: t('time.yesterday'),
                      dayBefore: t('time.dayBefore')
                    })}
                  </span>
                  <span
                    className="ml-3 shrink-0 font-mono text-zinc-500"
                    style={{ width: oidCol.value }}
                  >
                    {commit.shortOid}
                  </span>
                </>
              ) : null}
            </div>
          )
        })}
      </div>

      {commits.length === 0 && (
        <div className="flex h-full items-center justify-center text-sm text-zinc-600">
          {graphLoading ? t('graph.loading') : t('graph.empty')}
        </div>
      )}

      {graphLoading && commits.length > 0 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded bg-zinc-800 px-2 py-1 text-xs text-zinc-400">
          {t('graph.loading')}
        </div>
      )}
      </div>
    </div>
  )
})
