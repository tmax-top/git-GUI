import { useMemo, useRef, useState } from 'react'
import { t, tf } from '../i18n'
import { useApp } from '../store'

export interface CommandItem {
  id: string
  title: string
  category: 'git' | 'repo' | 'view' | 'settings'
  shortcut?: string
  action: () => void | Promise<void>
}

export function CommandPalette(): React.JSX.Element | null {
  const open = useApp((s) => s.paletteOpen)
  const close = useApp((s) => s.closeCommandPalette)
  const repoPath = useApp((s) => s.repoPath)
  const view = useApp((s) => s.view)

  const fetch_ = useApp((s) => s.fetch)
  const pull = useApp((s) => s.pull)
  const push = useApp((s) => s.push)
  const refreshAll = useApp((s) => s.refreshAll)
  const undo = useApp((s) => s.undo)
  const redo = useApp((s) => s.redo)
  const openRepo = useApp((s) => s.openRepo)
  const closeRepo = useApp((s) => s.closeRepo)
  const openSettings = useApp((s) => s.openSettings)
  const openSearch = useApp((s) => s.openSearch)
  const toggleTerminal = useApp((s) => s.toggleTerminal)
  const togglePrPanel = useApp((s) => s.togglePrPanel)
  const openCreatePr = useApp((s) => s.openCreatePr)
  const openWorkspaceModal = useApp((s) => s.openWorkspaceModal)
  const openShortcutsModal = useApp((s) => s.openShortcutsModal)
  const openPatchModal = useApp((s) => s.openPatchModal)
  const exportPatch = useApp((s) => s.exportPatch)
  const updateSettings = useApp((s) => s.updateSettings)
  const stashPush = useApp((s) => s.stashPush)
  const stashApply = useApp((s) => s.stashApply)
  const setPrompt = useApp((s) => s.setPrompt)
  const tagCreate = useApp((s) => s.tagCreate)
  const checkout = useApp((s) => s.checkout)

  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const modKey = isMac ? '⌘' : 'Ctrl+'

  const commands = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = []

    // 1. Repo commands
    list.push({
      id: 'repo:open',
      title: t('start.open'),
      category: 'repo',
      shortcut: `${modKey}O`,
      action: async () => {
        const d = await window.api.pickDirectory()
        if (d) await openRepo(d)
      }
    })

    if (view === 'repo' && repoPath) {
      list.push({
        id: 'repo:close',
        title: t('toolbar.close'),
        category: 'repo',
        action: () => void closeRepo()
      })
    }

    list.push({
      id: 'repo:workspaces',
      title: t('workspace.manage'),
      category: 'repo',
      action: () => openWorkspaceModal()
    })

    // 2. Git operations (in-repo only)
    if (view === 'repo' && repoPath) {
      list.push(
        {
          id: 'git:fetch',
          title: t('toolbar.fetch'),
          category: 'git',
          shortcut: `⇧${modKey}F`,
          action: () => void fetch_()
        },
        {
          id: 'git:pull',
          title: t('toolbar.pull'),
          category: 'git',
          action: () => void pull(false)
        },
        {
          id: 'git:pull-rebase',
          title: t('sync.pullRebase'),
          category: 'git',
          action: () => void pull(true)
        },
        {
          id: 'git:push',
          title: t('toolbar.push'),
          category: 'git',
          action: () => void push(false)
        },
        {
          id: 'git:push-force',
          title: t('sync.forcePush'),
          category: 'git',
          action: () => void push(true)
        },
        {
          id: 'git:refresh',
          title: t('toolbar.refresh'),
          category: 'git',
          shortcut: `${modKey}R`,
          action: () => void refreshAll()
        },
        {
          id: 'git:undo',
          title: t('undo.undo'),
          category: 'git',
          shortcut: `${modKey}Z`,
          action: () => void undo()
        },
        {
          id: 'git:redo',
          title: t('undo.redo'),
          category: 'git',
          shortcut: `⇧${modKey}Z`,
          action: () => void redo()
        },
        {
          id: 'git:checkout',
          title: `${t('menu.checkout')} (${t('prompt.branchName')})`,
          category: 'git',
          action: () => {
            setPrompt({
              title: t('pr.checkout'),
              label: t('prompt.branchName'),
              onSubmit: (name) => {
                if (name.trim()) void checkout(name.trim())
              }
            })
          }
        },
        {
          id: 'git:tag-new',
          title: t('prompt.tagTitle'),
          category: 'git',
          action: () => {
            setPrompt({
              title: t('prompt.tagTitle'),
              label: t('prompt.tagName'),
              onSubmit: (name) => {
                if (name.trim()) void tagCreate(name.trim())
              }
            })
          }
        },
        {
          id: 'git:stash-push',
          title: t('prompt.stashTitle'),
          category: 'git',
          action: () => void stashPush()
        },
        {
          id: 'git:stash-pop',
          title: t('menu.popStash'),
          category: 'git',
          action: () => void stashApply(undefined, true)
        },
        {
          id: 'git:pr-new',
          title: t('pr.new'),
          category: 'git',
          action: () => openCreatePr()
        },
        {
          id: 'git:patch-export',
          title: t('patch.exportWip'),
          category: 'git',
          action: () => void exportPatch()
        },
        {
          id: 'git:patch-apply',
          title: t('patch.apply'),
          category: 'git',
          action: () => openPatchModal()
        }
      )
    }

    // 3. Views & Panels
    list.push(
      {
        id: 'view:terminal',
        title: t('terminal.toggle'),
        category: 'view',
        shortcut: '⌃`',
        action: () => toggleTerminal()
      },
      {
        id: 'view:pr',
        title: t('pr.toggle'),
        category: 'view',
        action: () => togglePrPanel()
      },
      {
        id: 'view:search',
        title: t('search.title'),
        category: 'view',
        shortcut: `${modKey}F`,
        action: () => openSearch()
      },
      {
        id: 'view:shortcuts',
        title: t('shortcuts.title'),
        category: 'view',
        shortcut: `${modKey}/`,
        action: () => openShortcutsModal()
      },
      {
        id: 'view:settings',
        title: t('settings.title'),
        category: 'view',
        shortcut: `${modKey},`,
        action: () => openSettings()
      }
    )

    // 4. Themes & Languages
    list.push(
      {
        id: 'theme:dark',
        title: `${t('settings.theme')}: ${t('settings.themeDark')}`,
        category: 'settings',
        action: () => void updateSettings({ theme: 'dark' })
      },
      {
        id: 'theme:light',
        title: `${t('settings.theme')}: ${t('settings.themeLight')}`,
        category: 'settings',
        action: () => void updateSettings({ theme: 'light' })
      },
      {
        id: 'theme:system',
        title: `${t('settings.theme')}: ${t('settings.themeSystem')}`,
        category: 'settings',
        action: () => void updateSettings({ theme: 'system' })
      },
      {
        id: 'lang:zh',
        title: '中文 (Chinese)',
        category: 'settings',
        action: () => void updateSettings({ language: 'zh' })
      },
      {
        id: 'lang:en',
        title: 'English',
        category: 'settings',
        action: () => void updateSettings({ language: 'en' })
      }
    )

    return list
  }, [
    modKey,
    view,
    repoPath,
    openRepo,
    closeRepo,
    openWorkspaceModal,
    fetch_,
    pull,
    push,
    refreshAll,
    undo,
    redo,
    setPrompt,
    checkout,
    tagCreate,
    stashPush,
    stashApply,
    openCreatePr,
    openPatchModal,
    exportPatch,
    toggleTerminal,
    togglePrPanel,
    openSearch,
    openShortcutsModal,
    openSettings,
    updateSettings
  ])

  const filtered = useMemo(() => {
    if (!query.trim()) return commands
    const q = query.toLowerCase()
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
    )
  }, [commands, query])

  const activeIndex = Math.min(selectedIndex, Math.max(0, filtered.length - 1))

  if (!open) return null

  const runItem = (item: CommandItem): void => {
    close()
    void item.action()
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((idx) => (idx + 1) % (filtered.length || 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((idx) => (idx - 1 + filtered.length) % (filtered.length || 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item) runItem(item)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  const categoryLabel = (cat: CommandItem['category']): string => {
    switch (cat) {
      case 'git':
        return t('palette.category.git')
      case 'repo':
        return t('palette.category.repo')
      case 'view':
        return t('palette.category.view')
      case 'settings':
        return t('palette.category.settings')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-20"
      onClick={close}
      role="presentation"
    >
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={t('palette.title')}
        data-testid="command-palette"
      >
        {/* Search header */}
        <div className="flex items-center border-b border-zinc-800 px-3 py-2.5">
          <span className="text-zinc-500 mr-2 text-sm">⌘</span>
          <input
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
            placeholder={t('palette.placeholder')}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={onKeyDown}
            autoFocus
            data-testid="palette-input"
          />
          <button
            className="text-xs text-zinc-500 hover:text-zinc-300 px-1"
            onClick={close}
          >
            ESC
          </button>
        </div>

        {/* Results list */}
        <div
          ref={listRef}
          className="max-h-80 overflow-y-auto p-1 text-xs divide-y divide-zinc-800/40"
        >
          {filtered.map((item, idx) => (
            <button
              key={item.id}
              className={`flex w-full items-center justify-between rounded px-3 py-2 text-left transition ${
                activeIndex === idx
                  ? 'bg-sky-600/20 text-sky-200'
                  : 'text-zinc-300 hover:bg-zinc-800/60'
              }`}
              onClick={() => runItem(item)}
              data-testid={`palette-item-${item.id}`}
            >
              <div className="flex items-center gap-2 truncate">
                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400 font-mono shrink-0">
                  {categoryLabel(item.category)}
                </span>
                <span className="truncate">{item.title}</span>
              </div>
              {item.shortcut && (
                <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 shrink-0 ml-2">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="py-8 text-center text-zinc-500 text-xs">{t('palette.empty')}</div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-[10px] text-zinc-500 flex justify-between">
          <span>{t('palette.hint')}</span>
          <span>{tf('palette.itemCount', { n: filtered.length })}</span>
        </div>
      </div>
    </div>
  )
}
