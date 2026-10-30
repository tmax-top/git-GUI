// Launch electron-vite with a clean environment.
//
// If ELECTRON_RUN_AS_NODE is inherited from the parent shell (agent / IDE
// terminals often set it), Electron degrades to plain Node: `require('electron')`
// returns the binary path instead of the API object, so `app` is undefined and
// the main process dies with
//   TypeError: Cannot read properties of undefined (reading 'requestSingleInstanceLock')
// Meanwhile the Vite dev server keeps running, so the terminal just sits there
// and no window ever appears — which reads as a hang.
//
// Strip the variable here so `pnpm dev` / `pnpm preview` work regardless of the
// shell they are started from.
const { spawn } = require('node:child_process')

const env = { ...process.env }
delete env.ELECTRON_RUN_AS_NODE

const args = process.argv.slice(2)
if (args.length === 0) args.push('dev')

const child = spawn('electron-vite', args, {
  stdio: 'inherit',
  env,
  // Windows resolves the `electron-vite.cmd` shim through the shell.
  shell: process.platform === 'win32'
})

child.on('error', (err) => {
  console.error('[dev] failed to start electron-vite:', err.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})
