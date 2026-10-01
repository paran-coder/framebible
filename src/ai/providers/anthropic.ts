import type { AIProvider } from '../types'

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const content = (payload as { content?: unknown }).content
  if (!Array.isArray(content)) return ''
  return content.flatMap((block) => block && typeof block === 'object' && (block as { type?: unknown }).type === 'text' && typeof (block as { text?: unknown }).text === 'string' ? [(block as { text: string }).text] : []).join('\n').trim()
}

export const anthropicProvider: AIProvider = {
  config: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: 'claude-sonnet-5',
    apiKeyLabel: 'Anthropic API key',
    securityNote: '브라우저에서 장기 비밀키를 쓰는 방식은 권장되지 않습니다. 키는 저장·내보내지 않고 현재 탭 메모리에서만 사용합니다.'
  },
  async generateText({ apiKey, model, system, prompt, signal }) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model, max_tokens: 2400, system, messages: [{ role: 'user', content: prompt }] })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Anthropic ${response.status}: ${readError(payload)}`)
    const text = extractText(payload)
    if (!text) throw new Error('Anthropic 응답에서 텍스트를 찾지 못했습니다.')
    return text
  }
}

function readError(payload: unknown): string {
  if (payload && typeof payload === 'object') {
    const error = (payload as { error?: unknown }).error
    if (error && typeof error === 'object' && typeof (error as { message?: unknown }).message === 'string') return (error as { message: string }).message
  }
  return '요청에 실패했습니다.'
}
