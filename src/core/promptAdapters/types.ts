import type { PromptModel, ScenePromptIR } from '../promptIR'

export interface PromptAdapter {
  id: PromptModel
  label: string
  renderScene: (ir: ScenePromptIR) => string
}
