/* eslint-disable */
import fs from 'node:fs'

const WebSocket = globalThis.WebSocket

async function run() {
  const listRes = await fetch('http://127.0.0.1:9223/json/list')
  const targets = await listRes.json()
  const page = targets.find((t) => t.type === 'page')
  if (!page) throw new Error('No page found')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve) => ws.addEventListener('open', resolve))

  let idCounter = 1
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++
      const handler = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.id === id) {
          ws.removeEventListener('message', handler)
          if (msg.error) reject(msg.error)
          else resolve(msg.result)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id, method, params }))
    })
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails))
    }
    return res.result?.value
  }

  async function screenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' })
    fs.writeFileSync(filename, Buffer.from(res.data, 'base64'))
    console.log(`Saved screenshot: ${filename}`)
  }

  console.log('Reloading page...')
  await send('Page.reload')
  await new Promise((r) => setTimeout(r, 1200))

  // 1. Verify Commit Panel has AI button
  const aiBtnExists = await evaluate(`
    Boolean(document.querySelector('[data-testid="ai-generate-commit-btn"]'))
  `)
  console.log('AI button exists in Commit Panel:', aiBtnExists)

  // 2. Open Settings Dialog
  await evaluate(`
    document.querySelector('[data-testid="toolbar-settings"]')?.click()
  `)
  await new Promise((r) => setTimeout(r, 600))

  // 3. Inspect tabs
  const tabs = await evaluate(`
    Array.from(document.querySelectorAll('[data-testid^="settings-tab-"]')).map(el => ({
      testId: el.getAttribute('data-testid'),
      text: el.innerText.trim()
    }))
  `)
  console.log('Settings Tabs found:', tabs)

  // Capture screenshot of General tab
  await screenshot('/tmp/settings_tab_general.png')

  // Click AI tab
  await evaluate(`
    document.querySelector('[data-testid="settings-tab-ai"]')?.click()
  `)
  await new Promise((r) => setTimeout(r, 500))

  const aiFields = await evaluate(`({
    hasApiUrl: Boolean(document.querySelector('input[placeholder="https://api.openai.com/v1"]')),
    hasModel: Boolean(document.querySelector('input[placeholder="gpt-4o-mini"]')),
    hasTestBtn: Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('测试连接') || b.innerText.includes('Test Connection')),
    presets: Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('OpenAI') || b.innerText.includes('DeepSeek') || b.innerText.includes('Ollama')).map(b => b.innerText.trim())
  })`)
  console.log('AI tab fields:', aiFields)

  // Capture screenshot of AI tab
  await screenshot('/tmp/settings_tab_ai.png')

  // Click Terminal tab
  await evaluate(`
    document.querySelector('[data-testid="settings-tab-terminal"]')?.click()
  `)
  await new Promise((r) => setTimeout(r, 500))
  await screenshot('/tmp/settings_tab_terminal.png')

  // Close settings dialog
  await evaluate(`
    document.querySelector('button[aria-label="关闭"], button[aria-label="Close"]')?.click()
  `)
  await new Promise((r) => setTimeout(r, 400))

  // Click AI button in CommitPanel
  await evaluate(`
    document.querySelector('[data-testid="ai-generate-commit-btn"]')?.click()
  `)
  await new Promise((r) => setTimeout(r, 500))

  // Should have triggered error and opened settings!
  const openedSettings = await evaluate(`
    Boolean(document.querySelector('[data-testid="settings-tab-ai"]'))
  `)
  console.log('AI button correctly opened settings when key not configured:', openedSettings)

  // Capture screenshot of CommitPanel / Alert
  await screenshot('/tmp/commit_panel_ai_alert.png')

  ws.close()
  console.log('Verification completed successfully!')
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
