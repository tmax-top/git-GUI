import { appendFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { ActivityEntryDto } from '../../shared/ipc'

/** Ring buffer cap — the on-disk file keeps the full history. */
const MAX_ENTRIES = 500

let entries: ActivityEntryDto[] = []
let file: string | null = null
let loaded = false
let listener: ((entry: ActivityEntryDto) => void) | null = null

export type ActivityInput = Omit<ActivityEntryDto, 'id' | 'ts'>

function logFile(logsDir: string): string {
  return join(logsDir, 'activity.log')
}

/** Point the log at `<userData>/logs/activity.log` and load recent entries. */
export async function initActivityLog(logsDir: string): Promise<void> {
  file = logFile(logsDir)
  try {
    await mkdir(logsDir, { recursive: true })
    const raw = await readFile(file, 'utf8')
    const parsed: ActivityEntryDto[] = []
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue
      try {
        parsed.push(JSON.parse(line) as ActivityEntryDto)
      } catch {
        /* tolerate a torn last line */
      }
    }
    entries = parsed.slice(-MAX_ENTRIES)
  } catch {
    entries = []
  }
  loaded = true
}

/** Append an entry (memory ring + JSONL file) and notify the subscriber. */
export async function logActivity(input: ActivityInput): Promise<ActivityEntryDto> {
  const entry: ActivityEntryDto = { id: randomUUID(), ts: Date.now(), ...input }
  entries.push(entry)
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES)
  if (file) {
    try {
      await appendFile(file, JSON.stringify(entry) + '\n', 'utf8')
    } catch {
      /* logging must never break the caller */
    }
  }
  listener?.(entry)
  return entry
}

/** Recent entries, newest first. Uninitialized log → empty list. */
export function listActivity(limit = 100): ActivityEntryDto[] {
  if (!loaded) return []
  return entries.slice(-limit).reverse()
}

/** Subscribe to new entries (used to push `activity:new` to windows). */
export function setActivityListener(cb: ((entry: ActivityEntryDto) => void) | null): void {
  listener = cb
}

/** Test helper: forget in-memory state and the file pointer. */
export function resetActivityForTests(): void {
  entries = []
  file = null
  loaded = false
  listener = null
}
