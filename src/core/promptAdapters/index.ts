import type { PromptModel } from '../promptIR'
import { klingAdapter } from './kling'
import { seedanceAdapter } from './seedance'
import type { PromptAdapter } from './types'
import { veoAdapter } from './veo'

export const promptAdapters: Record<PromptModel, PromptAdapter> = {
  seedance: seedanceAdapter,
  veo: veoAdapter,
  kling: klingAdapter
}

export function getPromptAdapter(model: PromptModel): PromptAdapter {
  return promptAdapters[model]
}
