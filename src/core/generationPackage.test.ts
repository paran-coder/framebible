import { describe, expect, it } from 'vitest'
import { buildSceneManifest, frameInstructions } from './generationManifest'
import { sampleProject } from '../data/sampleProject'

describe('scene generation package', () => {
  it('builds a model-specific manifest without secrets', () => {
    const project = structuredClone(sampleProject)
    const manifest = buildSceneManifest(project, project.scenes[0], 'veo')
    expect(manifest.target.model).toBe('veo')
    expect(manifest.files.prompt).toBe('prompt/veo.txt')
    expect(manifest.files.apiRequest).toBe('api-request.json')
    expect(manifest.files.readinessReport).toBe('readiness-report.json')
    expect(JSON.stringify(manifest)).not.toContain('apiKey')
  })

  it('builds first and last frame instructions from ordered shots', () => {
    const project = structuredClone(sampleProject)
    const frames = frameInstructions(project.scenes[0])
    expect(frames.first).toContain('Shot 01')
    expect(frames.last).toContain('Shot 02')
  })
})
