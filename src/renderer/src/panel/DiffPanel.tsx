import { memo } from 'react'
import { isImagePath } from './imagePath'
import { DiffView, ImageView, EmptyDiff } from '../diff/DiffView'
import { ConflictEditor } from './ConflictEditor'
import { currentCommit, useApp } from '../store'
import { t } from '../i18n'
import { fullDate } from '../utils/format'
import type { DiffFile } from '@shared/diff'

function isImageFile(f: DiffFile): boolean {
  return isImagePath(f.path)
}

export const DiffPanel = memo(function DiffPanel(): React.JSX.Element {
  const repoPath = useApp((s) => s.repoPath)
  const selection = useApp((s) => s.selection)
  const diffFiles = useApp((s) => s.diffFiles)
  const diffLoading = useApp((s) => s.diffLoading)
  const commitDiffFile = useApp((s) => s.commitDiffFile)
  const commits = useApp((s) => s.commits)
  const stageHunk = useApp((s) => s.stageHunk)
  const conflict = useApp((s) => s.conflict)

  if (!repoPath) return <div className="p-4 text-sm text-zinc-600">{t('diff.empty')}</div>

  if (selection.kind === 'commit') {
    const commit = currentCommit(commits, selection.oid)
    // One file at a time: the changed-file list lives in the right panel.
    const activePath = commitDiffFile ?? diffFiles[0]?.path
    const activeFile = diffFiles.find((f) => f.path === activePath)
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs">
          <span className="font-medium text-zinc-200">{commit?.subject ?? selection.oid}</span>
          <span className="ml-2 text-zinc-500">
            {commit ? `${commit.authorName} · ${fullDate(commit.committerTime)}` : ''}
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {activeFile && isImageFile(activeFile) ? (
            <ImageView
              repoPath={repoPath}
              path={activeFile.path}
              source="commit"
              oid={selection.oid}
            />
          ) : (
            <DiffView files={activeFile ? [activeFile] : []} loading={diffLoading} />
          )}
        </div>
      </div>
    )
  }

  if (selection.kind === 'file') {
    const imageFile = diffFiles.some(isImageFile) || isImagePath(selection.path)
    const source: 'index' | 'worktree' =
      selection.cached && !selection.untracked ? 'index' : 'worktree'
    const isConflict = conflict !== null && conflict.path === selection.path
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="shrink-0 border-b border-zinc-800 bg-zinc-900/60 px-3 py-1.5 font-mono text-xs text-zinc-300">
          {selection.path}
          <span className="ml-2 text-zinc-600">
            {selection.cached ? t('panel.staged') : t('panel.changes')}
          </span>
          {isConflict && (
            <span className="ml-2 rounded bg-amber-700/70 px-1.5 py-0.5 text-[10px] text-amber-100">
              {t('conflict.title')}
            </span>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          {imageFile && (diffFiles.length === 0 || diffFiles.every((f) => f.binary)) ? (
            <ImageView repoPath={repoPath} path={selection.path} source={source} />
          ) : (
            <DiffView
              files={diffFiles}
              loading={diffLoading}
              hunkAction={selection.cached ? 'unstage' : 'stage'}
              onHunk={(file, index) => void stageHunk(file, index)}
            />
          )}
        </div>
        {isConflict && <ConflictEditor />}
      </div>
    )
  }

  return <EmptyDiff />
})
