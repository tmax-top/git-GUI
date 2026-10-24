/* eslint-disable */
import fs from 'node:fs'

const PORT = 9223
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r) => ws.addEventListener('open', r))

  let id = 1
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const cur = id++
      const handler = (evt) => {
        const msg = JSON.parse(evt.data)
        if (msg.id === cur) {
          ws.removeEventListener('message', handler)
          msg.error ? reject(msg.error) : resolve(msg.result)
        }
      }
      ws.addEventListener('message', handler)
      ws.send(JSON.stringify({ id: cur, method, params }))
    })

  const evaluate = async (expression) => {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    })
    if (res.exceptionDetails) throw new Error(JSON.stringify(res.exceptionDetails))
    return res.result?.value
  }

  await send('Page.reload')
  await sleep(1500)

  // 1. Configure AI via Settings dialog (updates store + persists)
  await evaluate(`document.querySelector('[data-testid="toolbar-settings"]')?.click()`)
  await sleep(500)
  await evaluate(`document.querySelector('[data-testid="settings-tab-ai"]')?.click()`)
  await sleep(400)
  const configured = await evaluate(`(() => {
    const urlInput = document.querySelector('input[placeholder="https://api.openai.com/v1"]')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
    setter.call(urlInput, 'http://localhost:8787/v1')
    urlInput.dispatchEvent(new Event('input', { bubbles: true }))
    const keyInput = urlInput.closest('label').nextElementSibling.querySelector('input')
    setter.call(keyInput, '')
    keyInput.dispatchEvent(new Event('input', { bubbles: true }))
    const modelInput = document.querySelector('input[placeholder="gpt-4o-mini"]')
    setter.call(modelInput, 'mock-model')
    modelInput.dispatchEvent(new Event('input', { bubbles: true }))
    const saveBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === '保存')
    saveBtn?.click()
    return Boolean(saveBtn)
  })()`)
  console.log('AI settings filled & saved:', configured)
  await sleep(600)

  // 2. Test connection button
  const testRes = await evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /测试连接|Test Connection/.test(b.innerText))
    btn?.click()
    return Boolean(btn)
  })()`)
  await sleep(800)
  const testMsg = await evaluate(`(() => {
    const el = Array.from(document.querySelectorAll('span')).find(s => /成功|失败|success|failed/i.test(s.innerText) && s.className.includes('text-emerald'))
    return el ? el.innerText : null
  })()`)
  console.log('Test connection clicked:', testRes, '-> result:', testMsg)

  // 3. Close settings
  await evaluate(`document.querySelector('button[aria-label="关闭"], button[aria-label="Close"]')?.click()`)
  await sleep(400)

  // 4. Type draft into commit message and click AI button
  await evaluate(`(() => {
    const ta = document.querySelector('aside textarea')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, 'draft: fix something quick')
    ta.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`)
  await sleep(300)
  await evaluate(`document.querySelector('[data-testid="ai-generate-commit-btn"]')?.click()`)
  await sleep(1500)

  const finalMsg = await evaluate(`document.querySelector('aside textarea')?.value`)
  console.log('Generated commit message:', JSON.stringify(finalMsg))

  const pass = finalMsg && finalMsg.includes('one-click commit message generation')
  console.log(pass ? 'PASS: AI commit generation works' : 'FAIL')
  const res = await send('Page.captureScreenshot', { format: 'png' })
  fs.writeFileSync('/tmp/ai_generate_result.png', Buffer.from(res.data, 'base64'))
  ws.close()
  process.exit(pass ? 0 : 1)
}
run().catch((e) => { console.error(e); process.exit(1) })
