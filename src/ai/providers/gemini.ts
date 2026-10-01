import type { AIProvider } from '../types'

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const steps = (payload as { steps?: unknown }).steps
  if (!Array.isArray(steps)) return ''
  const parts: string[] = []
  for (const step of steps) {
    if (!step || typeof step !== 'object' || (step as { type?: unknown }).type !== 'model_output') continue
    const content = (step as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (block && typeof block === 'object' && (block as { type?: unknown }).type === 'text' && typeof (block as { text?: unknown }).text === 'string') parts.push((block as { text: string }).text)
    }
  }
  return parts.join('\n').trim()
}

export const geminiProvider: AIProvider = {
  config: {
    id: 'gemini',
    label: 'Gemini',
    defaultModel: 'gemini-3.8-flash',
    apiKeyLabel: 'Gemini API key',
    securityNote: '브라우저 직결은 Google의 프로덕션 권장 방식이 아닙니다. 키는 이 탭의 메모리에만 유지됩니다.'
  },
  async generateText({ apiKey, model, system, prompt, signal }) {
    const response = await fetch('https://generativelanguage.googleapis.com/v1/interactions', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ model, input: prompt, system_instruction: system, store: false })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`Gemini ${response.status}: ${readError(payload)}`)
    const text = extractText(payload)
    if (!text) throw new Error('Gemini 응답에서 텍스트를 찾지 못했습니다.')
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
