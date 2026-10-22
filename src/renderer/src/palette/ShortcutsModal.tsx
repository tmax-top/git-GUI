import { Modal, btnPrimary } from '../components/Modal'
import { t } from '../i18n'
import { useApp } from '../store'

interface ShortcutRow {
  label: string
  keys: string[]
}

interface ShortcutSection {
  title: string
  rows: ShortcutRow[]
}

export function ShortcutsModal(): React.JSX.Element | null {
  const open = useApp((s) => s.shortcutsOpen)
  const close = useApp((s) => s.closeShortcutsModal)

  if (!open) return null

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  const mod = isMac ? '⌘' : 'Ctrl+'

  const sections: ShortcutSection[] = [
    {
      title: t('shortcuts.category.general'),
      rows: [
        { label: t('palette.title'), keys: [`${mod}K`, `${mod}P`] },
        { label: t('shortcuts.title'), keys: [`${mod}/`] },
        { label: t('settings.title'), keys: [`${mod},`] }
      ]
    },
    {
      title: t('shortcuts.category.navigation'),
      rows: [
        { label: t('search.title'), keys: [`${mod}F`] },
        { label: t('terminal.title'), keys: ['⌃`'] },
        { label: t('toolbar.refresh'), keys: [`${mod}R`] },
        { label: t('start.open'), keys: [`${mod}O`] }
      ]
    },
    {
      title: t('shortcuts.category.git'),
      rows: [
        { label: t('undo.undo'), keys: [`${mod}Z`] },
        { label: t('undo.redo'), keys: [`⇧${mod}Z`] },
        { label: t('toolbar.fetch'), keys: [`⇧${mod}F`] },
        { label: t('panel.commit'), keys: [`${mod}Enter`] }
      ]
    },
    {
      title: t('shortcuts.category.rebase'),
      rows: [
        { label: 'Pick', keys: ['P'] },
        { label: 'Reword', keys: ['R'] },
        { label: 'Squash', keys: ['S'] },
        { label: 'Drop', keys: ['D'] }
      ]
    }
  ]

  return (
    <Modal title={t('shortcuts.title')} onClose={close}>
      <div className="flex flex-col gap-4 text-xs" data-testid="shortcuts-modal">
        {sections.map((sec) => (
          <div key={sec.title} className="flex flex-col gap-1.5">
            <span className="font-semibold text-zinc-300 border-b border-zinc-800 pb-1">
              {sec.title}
            </span>
            <div className="space-y-1">
              {sec.rows.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between py-1 px-1.5 rounded hover:bg-zinc-800/40 text-zinc-300"
                >
                  <span>{r.label}</span>
                  <div className="flex gap-1">
                    {r.keys.map((k) => (
                      <kbd
                        key={k}
                        className="rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[11px] text-zinc-200 shadow-sm"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end pt-2 border-t border-zinc-800">
          <button className={btnPrimary()} onClick={close}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
