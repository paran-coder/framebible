export type AIProviderId = 'openai' | 'gemini' | 'anthropic'

export interface AIProviderConfig {
  id: AIProviderId
  label: string
  defaultModel: string
  apiKeyLabel: string
  securityNote: string
}

export interface GenerateTextInput {
  apiKey: string
  model: string
  system: string
  prompt: string
  signal?: AbortSignal
}

export interface AIProvider {
  config: AIProviderConfig
  generateText(input: GenerateTextInput): Promise<string>
}
