import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { compileSceneForModel } from './promptCompiler'
import { buildScenePromptIR } from './promptIR'

describe('prompt IR and adapters', () => {
  it('builds one model-neutral IR and renders all adapters', () => {
    const scene = sampleProject.scenes[0]
    const ir = buildScenePromptIR(sampleProject, scene)
    expect(ir.modelNeutralVersion).toBe(1)
    expect(ir.characters[0]?.name).toBe('Mira')
    expect(compileSceneForModel(sampleProject, scene, 'seedance')).toContain('[GLOBAL STYLE]')
    expect(compileSceneForModel(sampleProject, scene, 'veo')).toContain('[CINEMATOGRAPHY]')
    expect(compileSceneForModel(sampleProject, scene, 'kling')).toContain('[CAMERA + COMPOSITION]')
  })
})
