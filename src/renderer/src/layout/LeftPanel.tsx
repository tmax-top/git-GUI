import { useState } from 'react'
import { useApp } from '../store'
import { t, tf } from '../i18n'

function Section(props: {
  title: string
  count: number
  children: React.ReactNode
  defaultOpen?: boolean
}): React.JSX.Element {
  const [open, setOpen] = useState(props.defaultOpen ?? true)
  if (props.count === 0) return <></>
  return (
    <div className="border-b border-zinc-900">
      <button
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 hover:bg-zinc-900"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{open ? '▾' : '▸'}</span>
        <span className="flex-1 text-left">{props.title}</span>
        <span className="text-zinc-500">{props.count}</span>
      </button>
      {open && <div className="pb-1">{props.children}</div>}
    </div>
  )
}

function Row(props: {
  label: string
  active?: boolean
  badge?: string
  badgeColor?: string
  onClick?: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  title?: string
}): React.JSX.Element {
  return (
    <button
      className={`flex w-full items-center gap-1.5 px-3 py-1 text-left text-xs hover:bg-zinc-800/70 ${
        props.active ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-300'
      }`}
      onClick={props.onClick}
      onContextMenu={props.onContextMenu}
      title={props.title ?? props.label}
    >
      {props.active && <span className="text-emerald-500">●</span>}
      <span className="min-w-0 flex-1 truncate">{props.label}</span>
      {props.badge && (
        <span
          className="shrink-0 rounded px-1 text-[10px]"
          style={{ backgroundColor: `${props.badgeColor ?? '#0369a1'}22`, color: props.badgeColor ?? '#0369a1' }}
        >
          {props.badge}
        </span>
      )}
    </button>
  )
}

export function LeftPanel(props: { width: number }): React.JSX.Element {
  const refs = useApp((s) => s.refs)
  const checkout = useApp((s) => s.checkout)
  const repoPath = useApp((s) => s.repoPath)
  const openMenu = useApp((s) => s.openMenu)
  const merge = useApp((s) => s.merge)
  const rebase = useApp((s) => s.rebase)
  const branchDelete = useApp((s) => s.branchDelete)
  const branchRename = useApp((s) => s.branchRename)
  const tagDelete = useApp((s) => s.tagDelete)
  const stashApply = useApp((s) => s.stashApply)
  const stashDrop = useApp((s) => s.stashDrop)
  const setConfirm = useApp((s) => s.setConfirm)
  const setPrompt = useApp((s) => s.setPrompt)
  const [error, setError] = useState<string | null>(null)

  const local = (refs?.branches ?? []).filter((b) => !b.isRemote)
  const remote = (refs?.branches ?? []).filter((b) => b.isRemote)
  const tags = refs?.tags ?? []
  const stashes = refs?.stashes ?? []
  const submodules = refs?.submodules ?? []
  const current = refs?.current

  const doCheckout = (target: string): void => {
    setError(null)
    void checkout(target).then(() => {
      const err = useApp.getState().error
      if (err) setError(err)
    })
  }

  const onBranchContextMenu = (e: React.MouseEvent, name: string): void => {
    e.preventDefault()
    e.stopPropagation()
    const isCurrent = current === name
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: t('menu.checkout'),
          disabled: isCurrent,
          onClick: () => doCheckout(name)
        },
        {
          label: t('menu.mergeInto'),
          disabled: isCurrent,
          onClick: () => void merge(name)
        },
        {
          label: t('menu.rebaseOnto'),
          disabled: isCurrent,
          onClick: () => void rebase(name)
        },
        { separator: true },
        {
          label: t('menu.rename'),
          onClick: () =>
            setPrompt({
              title: t('prompt.renameTitle'),
              label: t('prompt.renameName'),
              defaultValue: name,
              onSubmit: (to) => void branchRename(name, to.trim())
            })
        },
        {
          label: t('menu.delete'),
          danger: true,
          disabled: isCurrent,
          onClick: () =>
            setConfirm({
              title: t('menu.delete'),
              body: tf('menu.deleteConfirm', { name }),
              confirmLabel: t('menu.delete'),
              danger: true,
              onConfirm: () => void branchDelete(name)
            })
        },
        {
          label: t('menu.deleteForce'),
          danger: true,
          disabled: isCurrent,
          onClick: () =>
            setConfirm({
              title: t('menu.deleteForce'),
              body: tf('menu.deleteConfirm', { name }),
              confirmLabel: t('menu.deleteForce'),
              danger: true,
              onConfirm: () => void branchDelete(name, true)
            })
        }
      ]
    })
  }

  const onTagContextMenu = (e: React.MouseEvent, name: string): void => {
    e.preventDefault()
    e.stopPropagation()
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: t('menu.delete'),
          danger: true,
          onClick: () =>
            setConfirm({
              title: t('menu.delete'),
              body: tf('menu.deleteTagConfirm', { name }),
              confirmLabel: t('menu.delete'),
              danger: true,
              onConfirm: () => void tagDelete([name])
            })
        }
      ]
    })
  }

  const onStashContextMenu = (e: React.MouseEvent, ref: string, label: string): void => {
    e.preventDefault()
    e.stopPropagation()
    openMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          label: t('menu.applyStash'),
          onClick: () => void stashApply(ref, false)
        },
        {
          label: t('menu.popStash'),
          onClick: () => void stashApply(ref, true)
        },
        { separator: true },
        {
          label: t('menu.dropStash'),
          danger: true,
          onClick: () =>
            setConfirm({
              title: t('menu.dropStash'),
              body: tf('menu.dropStashConfirm', { name: label }),
              confirmLabel: t('menu.dropStash'),
              danger: true,
              onConfirm: () => void stashDrop(ref)
            })
        }
      ]
    })
  }

  return (
    <aside
      className="theme-cream shrink-0 overflow-y-auto border-r border-zinc-800 bg-zinc-950 pb-4"
      style={{ width: props.width }}
    >
      <Section title={t('left.branchesLocal')} count={local.length} defaultOpen>
        {local.map((b) => (
          <Row
            key={b.fullName}
            label={b.name}
            active={refs?.current === b.name}
            badge={refs?.current === b.name ? t('left.current') : undefined}
            badgeColor="#15803d"
            onClick={() => doCheckout(b.name)}
            onContextMenu={(e) => onBranchContextMenu(e, b.name)}
          />
        ))}
      </Section>

      <Section title={t('left.branchesRemote')} count={remote.length}>
        {remote.map((b) => (
          <Row
            key={b.fullName}
            label={b.name}
            badge={b.upstream ? '↑' : undefined}
            onClick={() => {
              // DWIM: checkout <name> without the remote prefix when possible
              const parts = b.name.split('/')
              const candidate = parts.length > 1 ? parts.slice(1).join('/') : b.name
              doCheckout(candidate)
            }}
            onContextMenu={(e) => onBranchContextMenu(e, b.name)}
          />
        ))}
      </Section>

      <Section title={t('left.tags')} count={tags.length} defaultOpen={false}>
        {tags.map((tag) => (
          <Row
            key={tag.fullName}
            label={tag.name}
            badgeColor="#b45309"
            onContextMenu={(e) => onTagContextMenu(e, tag.name)}
          />
        ))}
      </Section>

      <Section title={t('left.stash')} count={stashes.length}>
        {stashes.map((s) => (
          <Row
            key={s.oid}
            label={`${s.ref} ${s.subject}`}
            badgeColor="#6d28d9"
            onContextMenu={(e) => onStashContextMenu(e, s.ref, `${s.ref} ${s.subject}`)}
          />
        ))}
      </Section>

      <Section title={t('left.submodules')} count={submodules.length}>
        {submodules.map((s) => (
          <Row key={s.path} label={s.path} badge={s.status.trim() || '='} badgeColor="#0f766e" />
        ))}
      </Section>

      {error && <div className="px-3 py-2 text-[11px] text-rose-400">{error}</div>}
      {!repoPath && null}
    </aside>
  )
}
