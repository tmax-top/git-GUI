/* global WebSocket */
// Attach to a running dev renderer over the DevTools protocol and find out what
// is burning CPU. Requires `pnpm dev` (main process enables port 9222 when not
// packaged).
//
//   node scripts/cdp-probe.js
//
// Prints the hottest functions from a 2s CPU profile plus one paused stack.
const http = require('node:http')

function getJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (c) => (body += c))
        res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error('bad JSON from ' + url + ': ' + body.slice(0, 200)))
        }
        })
      })
      .on('error', reject)
  })
}

function connect(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl)
    const pending = new Map()
    let seq = 0
    const events = []
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data)
      if (msg.id && pending.has(msg.id)) {
        const { resolve: res, reject: rej } = pending.get(msg.id)
        pending.delete(msg.id)
        if (msg.error) rej(new Error(JSON.stringify(msg.error)))
        else res(msg.result)
      } else if (msg.method) {
        events.push(msg)
      }
    }
    ws.onerror = () => reject(new Error('websocket error connecting to ' + wsUrl))
    ws.onopen = () =>
      resolve({
        send(method, params) {
          const id = ++seq
          return new Promise((res, rej) => {
            pending.set(id, { resolve: res, reject: rej })
            ws.send(JSON.stringify({ id, method, params: params ?? {} }))
          })
        },
        events,
        close: () => ws.close()
      })
  })
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function frameLabel(node) {
  const f = node.callFrame
  const file = (f.url || '').split('/').pop() || '(native)'
  return `${f.functionName || '(anonymous)'}  ${file}:${f.lineNumber + 1}`
}

async function main() {
  const targets = await getJson('http://127.0.0.1:9222/json')
  const page = targets.find((t) => t.type === 'page')
  if (!page) {
    console.error('no page target; targets:', targets.map((t) => t.type).join(','))
    process.exit(1)
  }
  console.log('attached to:', page.url)

  const cdp = await connect(page.webSocketDebuggerUrl)
  await cdp.send('Runtime.enable')
  await cdp.send('Profiler.enable')
  await cdp.send('Profiler.start')
  await sleep(2000)
  const { profile } = await cdp.send('Profiler.stop')

  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  const self = new Map()
  for (const n of profile.nodes) {
    if (!n.hitCount) continue
    const key = frameLabel(n)
    self.set(key, (self.get(key) ?? 0) + n.hitCount)
  }
  const total = [...self.values()].reduce((a, b) => a + b, 0) || 1
  console.log('\n=== hottest functions (self time, 2s profile) ===')
  ;[...self.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([k, v]) => console.log(`${((v / total) * 100).toFixed(1).padStart(5)}%  ${k}`))

  // Parent chain of the hottest node tells us who drives the loop.
  const hottest = profile.nodes.filter((n) => n.hitCount).sort((a, b) => b.hitCount - a.hitCount)[0]
  if (hottest && hottest.parent != null) {
    console.log('\n=== caller of hottest ===')
    let cur = byId.get(hottest.parent)
    for (let i = 0; i < 4 && cur; i++) {
      console.log('  <-', frameLabel(cur))
      cur = cur.parent != null ? byId.get(cur.parent) : null
    }
  }

  await cdp.send('Debugger.enable')
  await cdp.send('Debugger.pause')
  await sleep(800)
  const paused = cdp.events.filter((e) => e.method === 'Debugger.paused').pop()
  console.log('\n=== paused stack ===')
  if (paused) {
    paused.params.callFrames.slice(0, 12).forEach((f, i) => {
      const file = (f.url || '').split('/').pop() || '(native)'
      console.log(`  #${i} ${f.functionName || '(anonymous)'}  ${file}:${f.location.lineNumber + 1}`)
    })
  } else {
    console.log('  (no pause event — main thread likely blocked in native code)')
  }

  cdp.close()
}

main().catch((e) => {
  console.error('probe failed:', e.message)
  process.exit(1)
})
