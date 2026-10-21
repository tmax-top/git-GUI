import { useCallback, useEffect, useRef, useState } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebglAddon } from '@xterm/addon-webgl'
import '@xterm/xterm/css/xterm.css'
import { useApp } from '../store'
import { t, tf } from '../i18n'
import { Resizer, useResizableSetting } from '../components/Resizer'

interface TabState {
  key: number
  ptyId: string
  exited: boolean
  exitCode?: number
}

interface Instance {
  ptyId: string
  term: Terminal
  fit: FitAddon
}

/** Cap for output that arrives before its xterm instance exists. */
const MAX_BUFFER = 256 * 1024

/**
 * Bottom-anchored embedded terminal (node-pty + xterm). Multiple tabs, each
 * one pty session; hidden when closed but sessions stay alive until the panel
 * unmounts (repo closed) or the tab is closed.
 */
export function TerminalPanel(): React.JSX.Element {
  const open = useApp((s) => s.terminalOpen)
  const toggle = useApp((s) => s.toggleTerminal)
  const repoPath = useApp((s) => s.repoPath)
  const fontFamily = useApp((s) => s.settings.terminalFontFamily)
  const fontSize = useApp((s) => s.settings.terminalFontSize)
  const height = useResizableSetting('terminalHeight', 240, 120, 600)

  const [tabs, setTabs] = useState<TabState[]>([])
  const [active, setActive] = useState<number | null>(null)
  const nextKey = useRef(1)

  const instances = useRef(new Map<number, Instance>())
  const containers = useRef(new Map<number, HTMLDivElement>())
  const buffers = useRef(new Map<string, string>())
  const bodyRef = useRef<HTMLDivElement>(null)
  const tabsRef = useRef<TabState[]>([])
  useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])

  const fitActive = useCallback((): void => {
    const key = active
    if (key == null) return
    const inst = instances.current.get(key)
    const el = containers.current.get(key)
    if (!inst || !el || el.clientWidth === 0) return
    try {
      inst.fit.fit()
    } catch {
      /* detached / zero-size */
    }
  }, [active])

  const createTab = useCallback(async (): Promise<void> => {
    try {
      const { id } = await window.api.terminalCreate({
        cwd: repoPath ?? undefined,
        cols: 80,
        rows: 24
      })
      const key = nextKey.current++
      setTabs((prev) => [...prev, { key, ptyId: id, exited: false }])
      setActive(key)
    } catch (e) {
      useApp.setState({ error: e instanceof Error ? e.message : t('error.generic') })
    }
  }, [repoPath])

  // First open with no session → spawn one (not on every re-close, hence the ref).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current && tabsRef.current.length === 0) void createTab()
    wasOpen.current = open
  }, [open, createTab])

  // Instantiate xterm for tabs whose container div is mounted.
  useEffect(() => {
    for (const tab of tabs) {
      if (instances.current.has(tab.key)) continue
      const el = containers.current.get(tab.key)
      if (!el) continue
      const term = new Terminal({
        fontFamily: fontFamily || undefined,
        fontSize,
        cursorBlink: true,
        scrollback: 5000,
        theme: {
          background: '#09090b',
          foreground: '#f4f4f5',
          cursor: '#a1a1aa',
          selectionBackground: '#3f3f46'
        }
      })
      const fit = new FitAddon()
      term.loadAddon(fit)
      // xterm v6 ships no core text renderer — load the WebGL addon so the
      // terminal actually paints glyphs (falls back to the built-in DOM
      // renderer, which only draws the cursor, if WebGL is unavailable).
      try {
        term.loadAddon(new WebglAddon())
      } catch {
        /* WebGL unavailable — keep the DOM fallback */
      }
      term.open(el)
      term.onData((data) => {
        void window.api.terminalWrite({ id: tab.ptyId, data })
      })
      term.onResize(({ cols, rows }) => {
        void window.api.terminalResize({ id: tab.ptyId, cols, rows })
      })
      instances.current.set(tab.key, { ptyId: tab.ptyId, term, fit })
      // flush output that arrived before the instance existed
      const pending = buffers.current.get(tab.ptyId)
      if (pending) {
        buffers.current.delete(tab.ptyId)
        term.write(pending)
      }
      if (tab.key === active) {
        try {
          fit.fit()
        } catch {
          /* ignore */
        }
        term.focus()
      }
    }
  }, [tabs, active, fontFamily, fontSize])

  // pty output → the matching xterm instance.
  useEffect(() => {
    const unsubData = window.api.onTerminalData(({ id, data }) => {
      for (const inst of instances.current.values()) {
        if (inst.ptyId === id) {
          inst.term.write(data)
          return
        }
      }
      const buf = (buffers.current.get(id) ?? '') + data
      buffers.current.set(id, buf.length > MAX_BUFFER ? buf.slice(-MAX_BUFFER) : buf)
    })
    const unsubExit = window.api.onTerminalExit(({ id, exitCode }) => {
      let inst: Instance | undefined
      for (const candidate of instances.current.values()) {
        if (candidate.ptyId === id) {
          inst = candidate
          break
        }
      }
      if (inst) {
        inst.term.write(`\r\n\x1b[90m${tf('terminal.exited', { n: exitCode })}\x1b[0m\r\n`)
      }
      setTabs((prev) =>
        prev.map((tab) => (tab.ptyId === id ? { ...tab, exited: true, exitCode } : tab))
      )
    })
    return () => {
      unsubData()
      unsubExit()
    }
  }, [])

  // Font settings apply live.
  useEffect(() => {
    for (const inst of instances.current.values()) {
      inst.term.options.fontFamily = fontFamily || undefined
      inst.term.options.fontSize = fontSize
    }
    fitActive()
  }, [fontFamily, fontSize, fitActive])

  // Refit on panel size changes (toggle / drag).
  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const ro = new ResizeObserver(() => fitActive())
    ro.observe(body)
    return () => ro.disconnect()
  }, [fitActive])

  // Refit when switching tabs (hidden → visible).
  useEffect(() => {
    fitActive()
    instances.current.get(active ?? -1)?.term.focus()
  }, [active, fitActive])

  const closeTab = useCallback((tab: TabState): void => {
    const inst = instances.current.get(tab.key)
    instances.current.delete(tab.key)
    inst?.term.dispose()
    void window.api.terminalKill({ id: tab.ptyId }).catch(() => undefined)
    setTabs((prev) => prev.filter((t2) => t2.key !== tab.key))
    setActive((cur) => {
      if (cur !== tab.key) return cur
      const rest = tabsRef.current.filter((t2) => t2.key !== tab.key)
      return rest.length > 0 ? rest[rest.length - 1].key : null
    })
  }, [])

  // Kill every session when the panel unmounts (repo closed / app teardown).
  useEffect(() => {
    const insts = instances.current
    const liveTabs = tabsRef.current
    return () => {
      for (const [, inst] of insts) {
        void window.api.terminalKill({ id: inst.ptyId }).catch(() => undefined)
        inst.term.dispose()
      }
      insts.clear()
      for (const tab of liveTabs) {
        void window.api.terminalKill({ id: tab.ptyId }).catch(() => undefined)
      }
    }
  }, [])

  return (
    <>
      {open && (
        <Resizer
          orientation="horizontal"
          onDelta={(d) => height.onDelta(-d)}
          onCommit={height.onCommit}
        />
      )}
      <section
        data-testid="terminal-panel"
        className="flex shrink-0 flex-col border-t border-zinc-800 bg-zinc-950"
        style={{ height: height.value, display: open ? 'flex' : 'none' }}
      >
      <header className="flex items-center gap-1 border-b border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-xs">
        <span className="px-1 text-zinc-500" data-testid="terminal-title">
          {t('terminal.title')}
        </span>
        {tabs.map((tab, i) => (
          <span
            key={tab.key}
            className={`flex items-center gap-0.5 rounded pl-2 pr-1 ${
              tab.key === active
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <button
              className="max-w-36 truncate hover:text-sky-400"
              onClick={() => setActive(tab.key)}
              title={tab.exited ? tf('terminal.exited', { n: tab.exitCode ?? 0 }) : t('terminal.title')}
              data-testid="terminal-tab"
            >
              {tab.exited ? '✕ ' : '❯ '}
              {`tab ${i + 1}`}
            </button>
            <button
              className="rounded px-0.5 hover:bg-zinc-600"
              onClick={() => closeTab(tab)}
              title={t('terminal.close')}
              data-testid="terminal-close-tab"
            >
              ×
            </button>
          </span>
        ))}
        <button
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800"
          onClick={() => void createTab()}
          title={t('terminal.new')}
          data-testid="terminal-new-tab"
        >
          ＋
        </button>
        <span className="flex-1" />
        <button
          className="rounded px-1.5 py-0.5 text-zinc-400 hover:bg-zinc-800"
          onClick={toggle}
          title={t('common.close')}
          data-testid="terminal-close-panel"
        >
          ✕
        </button>
      </header>

      <div ref={bodyRef} className="relative min-h-0 flex-1">
        {tabs.map((tab) => (
          <div
            key={tab.key}
            ref={(el) => {
              if (el) containers.current.set(tab.key, el)
              else containers.current.delete(tab.key)
            }}
            className="absolute inset-0 p-1"
            style={{ display: tab.key === active ? 'block' : 'none' }}
            data-testid="terminal-tab-body"
          />
        ))}
        {tabs.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-500">
            <span>{t('terminal.noRepoHint')}</span>
            <button className="text-sky-400 hover:text-sky-300" onClick={() => void createTab()}>
              {t('terminal.new')}
            </button>
          </div>
        )}
      </div>
      </section>
    </>
  )
}
