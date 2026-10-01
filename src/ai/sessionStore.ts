import { create } from 'zustand'
import { providers } from './providers'
import type { AIProviderId } from './types'

interface AIState {
  providerId: AIProviderId
  apiKey: string
  model: string
  acknowledgedRisk: boolean
  setProvider: (providerId: AIProviderId) => void
  setApiKey: (apiKey: string) => void
  setModel: (model: string) => void
  setAcknowledgedRisk: (value: boolean) => void
  clearKey: () => void
}

export const useAIStore = create<AIState>((set) => ({
  providerId: 'gemini',
  apiKey: '',
  model: providers.gemini.config.defaultModel,
  acknowledgedRisk: false,
  setProvider: (providerId) => set({ providerId, model: providers[providerId].config.defaultModel, apiKey: '', acknowledgedRisk: false }),
  setApiKey: (apiKey) => set({ apiKey }),
  setModel: (model) => set({ model }),
  setAcknowledgedRisk: (acknowledgedRisk) => set({ acknowledgedRisk }),
  clearKey: () => set({ apiKey: '' })
}))
