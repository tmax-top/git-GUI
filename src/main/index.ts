import * as electron from 'electron'
import { join } from 'path'
import { disposeWatchers, registerIpcHandlers } from './ipc'

const { app, BrowserWindow } = electron

// ELECTRON_RUN_AS_NODE makes Electron behave like plain Node, in which case
// `require('electron')` yields the binary path and none of the APIs exist.
// Fail loudly instead of dying on `app.requestSingleInstanceLock()`.
if (!app) {
  console.error(
    '[git-gui] Electron APIs are unavailable: this process was started with ' +
      'ELECTRON_RUN_AS_NODE set, so Electron is running as plain Node. ' +
      'Unset ELECTRON_RUN_AS_NODE and start again (pnpm dev already strips it).'
  )
  process.exit(1)
}

// Dev-only: expose the DevTools protocol so a spinning renderer can be profiled
// from outside the app (electron-vite does not forward --remote-debugging-port).
// `scripts/cdp-probe.js` talks to this port.
if (!app.isPackaged) {
  app.commandLine.appendSwitch('remote-debugging-port', '9222')
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0]
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
    }
  })

  function createWindow(): void {
    const win = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 900,
      minHeight: 600,
      show: false,
      title: 'Git GUI',
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        spellcheck: false
      }
    })

    win.on('ready-to-show', () => win.show())

    if (process.env['ELECTRON_RENDERER_URL']) {
      win.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      win.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }

  app.whenReady().then(() => {
    registerIpcHandlers()
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => {
    disposeWatchers()
  })
}
