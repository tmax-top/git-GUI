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
        { label: '命令面板 (Command Palette)', keys: [`${mod}K`, `${mod}P`] },
        { label: '查看快捷键表 (Keyboard Shortcuts)', keys: [`${mod}/`] },
        { label: '偏好设置 (Settings)', keys: [`${mod},`] }
      ]
    },
    {
      title: t('shortcuts.category.navigation'),
      rows: [
        { label: '全局搜索 (Global Search)', keys: [`${mod}F`] },
        { label: '切换内嵌终端 (Toggle Terminal)', keys: ['⌃`'] },
        { label: '刷新仓库状态 (Refresh)', keys: [`${mod}R`] },
        { label: '打开仓库 (Open Repository)', keys: [`${mod}O`] }
      ]
    },
    {
      title: t('shortcuts.category.git'),
      rows: [
        { label: '撤销最近操作 (Undo)', keys: [`${mod}Z`] },
        { label: '重做操作 (Redo)', keys: [`⇧${mod}Z`] },
        { label: '获取远端更新 (Fetch All)', keys: [`⇧${mod}F`] },
        { label: '提交变更 (Commit)', keys: [`${mod}Enter`] }
      ]
    },
    {
      title: t('shortcuts.category.rebase'),
      rows: [
        { label: '保留此提交 (Pick)', keys: ['P'] },
        { label: '修改提交信息 (Reword)', keys: ['R'] },
        { label: '压缩并入上一提交 (Squash)', keys: ['S'] },
        { label: '丢弃此提交 (Drop)', keys: ['D'] }
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
