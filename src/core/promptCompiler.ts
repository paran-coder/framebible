import { buildScenePromptIR, type PromptModel } from './promptIR'
import { getPromptAdapter } from './promptAdapters'
import type { Project, Scene } from './types'

function safeSceneFilename(scene: Scene, model: PromptModel): string {
  const slug = scene.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'scene'
  return `${String(scene.order).padStart(2, '0')}-${slug}.${model}.txt`
}

export function compileSceneForModel(project: Project, scene: Scene, model: PromptModel): string {
  return getPromptAdapter(model).renderScene(buildScenePromptIR(project, scene))
}

export function compileProjectForModel(project: Project, model: PromptModel): Record<string, string> {
  return Object.fromEntries([...project.scenes].sort((a, b) => a.order - b.order).map((scene) => [safeSceneFilename(scene, model), compileSceneForModel(project, scene, model)]))
}
