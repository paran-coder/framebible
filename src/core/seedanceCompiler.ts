import { compileProjectForModel, compileSceneForModel } from './promptCompiler'
import type { Project, Scene } from './types'

export function compileScenePrompt(project: Project, scene: Scene): string {
  return compileSceneForModel(project, scene, 'seedance')
}

export function compileProjectPrompts(project: Project): Record<string, string> {
  return compileProjectForModel(project, 'seedance')
}
