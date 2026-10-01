import type { AIProvider } from '../types'

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const response = payload as { output_text?: unknown; output?: unknown }
  if (typeof response.output_text === 'string') return response.output_text
  if (!Array.isArray(response.output)) return ''
  const parts: string[] = []
  for (const item of response.output) {
    if (!item || typeof item !== 'object') continue
    const content = (item as { content?: unknown }).content
    if (!Array.isArray(content)) continue
    for (const block of content) {
      if (block && typeof block === 'object' && typeof (block as { text?: unknown }).text === 'string') parts.push((block as { text: string }).text)
    }
  }
  return parts.join('\n').trim()
}

export const openAIProvider: AIProvider = {
  config: {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-6-astra',
    apiKeyLabel: 'OpenAI API key',
    securityNote: '브라우저 직결은 OpenAI의 권장 키 보관 방식이 아닙니다. 키는 이 탭의 메모리에만 유지됩니다.'
  },
  async generateText({ apiKey, model, system, prompt, signal }) {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, instructions: system, input: prompt })
    })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(`OpenAI ${response.status}: ${readError(payload)}`)
    const text = extractText(payload)
    if (!text) throw new Error('OpenAI 응답에서 텍스트를 찾지 못했습니다.')
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
