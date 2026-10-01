import { anthropicProvider } from './anthropic'
import { geminiProvider } from './gemini'
import { openAIProvider } from './openai'
import type { AIProvider, AIProviderId } from '../types'

export const providers: Record<AIProviderId, AIProvider> = {
  openai: openAIProvider,
  gemini: geminiProvider,
  anthropic: anthropicProvider
}
