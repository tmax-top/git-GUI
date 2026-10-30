import { execGit } from './git/exec'
import { loadSettings } from './settings'
import type { AiGenerateCommitMsgInputDto, AiTestConnectionInputDto } from '../shared/ipc'

/**
 * Providers that rejected `thinking: {type: "disabled"}` (400/422). Cached per
 * endpoint+model so we only pay for the probe once per session.
 */
const thinklessUnsupported = new Set<string>()

/**
 * Normalize a user-entered OpenAI-compatible base URL:
 * strip an HTTP method prefix (e.g. "POST https://…"), surrounding whitespace,
 * a trailing slash, and a pasted `/chat/completions` path.
 * Throws a readable error when the result is not a valid http(s) URL.
 */
export function resolveAiBaseUrl(raw: string | undefined, fallback: string): string {
  const url = (raw?.trim() || fallback)
    .replace(/^(POST|GET|PUT|PATCH|DELETE)\s+/i, '')
    .trim()
    .replace(/\/+$/, '')
    .replace(/\/chat\/completions\/?$/i, '')

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error(`AI 接口地址无效：「${raw?.trim() || url}」，请填写形如 https://api.openai.com/v1 的地址`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`AI 接口地址必须是 http(s) 地址：「${url}」`)
  }
  return url
}

export async function generateAiCommitMessage(input: AiGenerateCommitMsgInputDto): Promise<string> {
  const settings = await loadSettings()
  const apiUrl = resolveAiBaseUrl(settings.aiApiUrl, 'https://api.openai.com/v1')
  const apiKey = settings.aiApiKey?.trim() || ''
  const model = settings.aiModel?.trim() || 'gpt-4o-mini'

  const isLocal = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')
  if (!apiKey && !isLocal) {
    throw new Error('未配置 AI API Key，请在「设置 -> AI 助手」中配置 API 密钥或本地大模型服务')
  }

  // 1. Get git diff: staged first, then unstaged if staged is empty
  let diffRes = await execGit({ cwd: input.repoPath, args: ['diff', '--cached'] })
  let diff = diffRes.stdout.trim()
  let isStaged = true
  if (!diff) {
    diffRes = await execGit({ cwd: input.repoPath, args: ['diff'] })
    diff = diffRes.stdout.trim()
    isStaged = false
  }

  if (!diff && !input.draft?.trim()) {
    throw new Error('没有检测到暂存区或工作区的代码变更，无法生成 commit 消息')
  }

  // Cap diff to ~12000 characters to stay within token & speed limits
  const maxChars = 12000
  let truncatedDiff = diff
  if (diff.length > maxChars) {
    truncatedDiff = diff.slice(0, maxChars) + '\n\n... (diff truncated for length)'
  }

  const defaultSystemPrompt = `You are an expert Git commit assistant.
Your task is to generate a concise, meaningful, and professional Git commit message based on the provided diff.
Follow the Conventional Commits specification:
- Format: <type>(<optional scope>): <subject>
- Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
- The summary line should be under 72 characters, lowercase imperative mood without trailing period.
- If there are multiple noteworthy changes, provide a concise bulleted description in the message body.
- If the user provides draft notes, incorporate and polish them.
- Output ONLY the plain text commit message with NO markdown code blocks (do NOT use \`\`\` or quotes).`

  const systemPrompt = settings.aiPrompt?.trim() || defaultSystemPrompt

  const userContent = [
    input.draft?.trim() ? `User draft notes:\n${input.draft.trim()}\n` : '',
    diff
      ? `Git diff (${isStaged ? 'staged changes' : 'unstaged working tree'}):\n${truncatedDiff}`
      : 'No diff available, please format and refine the user draft notes.'
  ]
    .filter(Boolean)
    .join('\n\n')

  const endpoint = `${apiUrl}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  // Reasoning models spend most of the wall clock on hidden thinking: on
  // SenseNova a one-line commit message burned 585 of 599 completion tokens
  // (~16s) versus 15 tokens (~2s) with thinking off. Ask for it off and fall
  // back silently when the provider does not know the field.
  const modelKey = `${endpoint}|${model}`
  const wantThinkless = !thinklessUnsupported.has(modelKey)

  /** One chat-completions round-trip; owns its own timeout. */
  const requestOnce = async (
    maxTokens: number,
    thinkless: boolean
  ): Promise<{ text: string; finishReason?: string; apiError?: string } | null> => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
          ],
          temperature: 0.3,
          max_tokens: maxTokens,
          ...(thinkless ? { thinking: { type: 'disabled' } } : {})
        })
      })

      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        // Unknown body fields come back as 400/422 — remember it and retry
        // without the flag instead of failing the whole request.
        if (thinkless && (res.status === 400 || res.status === 422)) {
          thinklessUnsupported.add(modelKey)
          return null
        }
        throw new Error(`AI 服务请求失败 (${res.status}): ${errBody || res.statusText}`)
      }

      const json = (await res.json()) as {
        choices?: Array<{
          message?: { content?: string | Array<{ text?: string }> }
          /** Legacy completions shape. */
          text?: string
          finish_reason?: string
        }>
        error?: { message?: string }
      }
      const choice = json.choices?.[0]
      const rawContent = choice?.message?.content ?? choice?.text
      const text = Array.isArray(rawContent)
        ? rawContent.map((part) => part?.text ?? '').join('')
        : (rawContent ?? '')
      return {
        text: text.trim(),
        finishReason: choice?.finish_reason,
        apiError: json.error?.message
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  try {
    // Reasoning models bill their hidden "thinking" against max_tokens, so a
    // tight cap can be exhausted before any content is emitted — the provider
    // then answers with an empty message and finish_reason=length. Start with
    // headroom and retry once with a larger budget when that happens.
    let result = await requestOnce(2000, wantThinkless)
    if (!result) result = await requestOnce(2000, false)
    if (result && !result.text && result.finishReason === 'length') {
      result = await requestOnce(4000, false)
    }
    if (!result?.text) {
      const reason = result?.finishReason ?? result?.apiError ?? 'empty response'
      throw new Error(`AI 服务未返回有效的 commit 消息内容（finish_reason: ${reason}）`)
    }

    // Strip any markdown code fence wrapping if model added it
    return result.text
      .replace(/^```[a-zA-Z]*\n?/, '')
      .replace(/\n?```$/, '')
      .trim()
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('AI 服务请求超时 (45s)', { cause: err })
    }
    throw err
  }
}

export async function testAiConnection(
  input: AiTestConnectionInputDto
): Promise<{ success: boolean; message: string }> {
  const apiUrl = resolveAiBaseUrl(input.apiUrl, 'https://api.openai.com/v1')
  const apiKey = input.apiKey?.trim() || ''
  const model = input.model?.trim() || 'gpt-4o-mini'

  const endpoint = `${apiUrl}/chat/completions`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Ping. Reply with "pong".' }],
        max_tokens: 10
      })
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${errBody || res.statusText}`)
    }

    return { success: true, message: '连接成功，服务正常响应！' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('请求超时 (15s)', { cause: err })
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}
