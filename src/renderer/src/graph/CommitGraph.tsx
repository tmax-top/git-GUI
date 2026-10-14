import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { layoutGraph } from './layout'
import { useApp } from '../store'
import { t } from '../i18n'
import { relativeTime } from '../utils/format'
import { Resizer, useResizableSetting } from '../components/Resizer'

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

  const authorCol = useResizableSetting('graphAuthorWidth', 112, 60, 400)
  const dateCol = useResizableSetting('graphDateWidth', 48, 40, 200)
  const oidCol = useResizableSetting('graphOidWidth', 40, 40, 160)

  const layout = useMemo(
    () => layoutGraph(commits.map((c) => ({ oid: c.oid, parents: c.parents }))),
    [commits]
  )

  const labelsByOid = useMemo(() => {
    const map = new Map<string, { text: string; color: string }[]>()
    const push = (oid: string, text: string, color: string): void => {
      const arr = map.get(oid) ?? []
      arr.push({ text, color })
      map.set(oid, arr)
    }
    for (const b of refs?.branches ?? []) {
      if (b.isRemote) push(b.oid, b.name, '#0369a1')
      else push(b.oid, b.name, '#15803d')
    }
    for (const tag of refs?.tags ?? []) push(tag.oid, tag.name, '#b45309')
    return map
  }, [refs])

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

  const laneColW = Math.max(layout.laneCount, 1) * LANE_W + PAD_X * 2
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
    const color = (lane: number): string => LANE_COLORS[lane % LANE_COLORS.length]

    ctx.lineCap = 'round'

    // Row contents (WIP = index 0, commit[i] = index i+1).
    for (const v of items) {
      const i = v.index
      const y = yOf(i)

      if (i === 0) {
        // WIP node → connects down to the first commit on lane 0.
        if (commits.length > 0 && first <= 1) {
          ctx.strokeStyle = color(0)
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

      // Vertical continuations in the gap below this row — skipped for lanes a
      // branch segment is opening in this same gap (the curve is the only
      // connector there; a parallel vertical would leave a free-floating tip).
      if (i < totalRows - 1) {
        const branchOpened = new Set(
          layout.segments.filter((s) => s.row === ci && s.kind === 'branch').map((s) => s.toLane)
        )
        for (const lane of row.activeBelow) {
          if (branchOpened.has(lane)) continue
          ctx.strokeStyle = color(lane)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(cx(lane), y)
          ctx.lineTo(cx(lane), y + ROW_H)
          ctx.stroke()
        }
      }

      // Segments: converge joins extra lanes into this commit's dot (same row);
      // merge/branch live in the gap below.
      for (const seg of layout.segments) {
        if (seg.row !== ci) continue
        const x1 = cx(seg.fromLane)
        const x2 = cx(seg.toLane)
        if (seg.kind === 'converge') {
          ctx.strokeStyle = color(seg.fromLane)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(x1, y)
          const midX = (x1 + x2) / 2
          ctx.bezierCurveTo(midX, y - 6, midX, y - 6, x2, y)
          ctx.stroke()
          continue
        }
        const y2 = y + ROW_H
        ctx.strokeStyle = color(seg.fromLane)
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

      // Commit dot — solid filled circle (branch-head style).
      const isSelected = selection.kind === 'commit' && selection.oid === row.oid
      ctx.beginPath()
      ctx.arc(cx(row.lane), y, isSelected ? RADIUS + 1 : RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = color(row.lane)
      ctx.fill()
      if (isSelected) {
        ctx.beginPath()
        ctx.arc(cx(row.lane), y, RADIUS + 3.5, 0, Math.PI * 2)
        ctx.lineWidth = 1.5
        ctx.strokeStyle = color(row.lane)
        ctx.globalAlpha = 0.45
        ctx.stroke()
        ctx.globalAlpha = 1
      }
    }
  }, [items, layout, selection, commits, laneColW, totalRows])

  const wipCount = (status?.files.length ?? 0) > 0
  const stagedCount = status?.files.filter((f) => f.indexStatus !== ' ' && f.indexStatus !== '?').length ?? 0

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
            onDelta={authorCol.onDelta}
            onCommit={authorCol.onCommit}
            className="self-stretch"
          />
          <div className="shrink-0 truncate px-2" style={{ width: authorCol.value }}>
            {t('graph.author')}
          </div>
          <Resizer
            orientation="vertical"
            onDelta={dateCol.onDelta}
            onCommit={dateCol.onCommit}
            className="self-stretch"
          />
          <div className="shrink-0 truncate px-2 text-right" style={{ width: dateCol.value }}>
            {t('graph.date')}
          </div>
          <Resizer
            orientation="vertical"
            onDelta={oidCol.onDelta}
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
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="truncate text-zinc-200" title={commit.subject}>
                      {commit.subject || '(no message)'}
                    </span>
                    {labels.map((l) => (
                      <span
                        key={l.text}
                        className="shrink-0 rounded px-1 py-px text-[10px] font-medium"
                        style={{ backgroundColor: `${l.color}22`, color: l.color }}
                      >
                        {l.text}
                      </span>
                    ))}
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
                    {relativeTime(commit.committerTime)}
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
