// node-pty ships a native `spawn-helper` binary that must be executable.
// pnpm's content-addressable store can drop the exec bit on extract, which
// surfaces at runtime as `posix_spawnp` failures. Restore it here so a fresh
// `pnpm install` works out of the box.
const { readdirSync, statSync, chmodSync } = require('node:fs')
const { join } = require('node:path')

function walk(dir, cb) {
  let entries
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const name of entries) {
    const p = join(dir, name)
    let st
    try {
      st = statSync(p)
    } catch {
      continue
    }
    if (st.isDirectory()) walk(p, cb)
    else cb(p, st)
  }
}

walk(join(__dirname, '..', 'node_modules'), (p, st) => {
  if (p.endsWith('spawn-helper') && st.isFile()) {
    try {
      chmodSync(p, st.mode | 0o111)
    } catch {
      /* best effort */
    }
  }
})
