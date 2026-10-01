import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { compileScenePrompt } from './seedanceCompiler'

describe('Seedance compiler', () => {
  it('includes structured blocks, locks and the bound character variant', () => {
    const prompt = compileScenePrompt(sampleProject, sampleProject.scenes[0])
    expect(prompt).toContain('[GLOBAL STYLE]')
    expect(prompt).toContain('[CONTINUITY LOCKS]')
    expect(prompt).toContain('[SCENE GEOGRAPHY]')
    expect(prompt).toContain('[CAMERA PATH]')
    expect(prompt).toContain('[SPATIAL TRANSITIONS]')
    expect(prompt).toContain('shot-to-shot setup change')
    expect(prompt).toContain('Shot 01 camera')
    expect(prompt).toContain('@Mira')
    expect(prompt).toContain('defaultWardrobe')
    expect(prompt).toContain('Variant: Rain-soaked alert')
    expect(prompt).toContain('only intentional state override')
    expect(prompt).toContain('Wetness: wet')
    expect(prompt).toContain('Weather: heavy rain outside')
  })
})
