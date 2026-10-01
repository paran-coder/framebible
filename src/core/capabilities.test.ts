import { describe, expect, it } from 'vitest'
import { resolveGenerationSettings, validateGenerationSettings } from './capabilities'
import { sampleProject } from '../data/sampleProject'

const project = structuredClone(sampleProject)
const scene = project.scenes[0]

describe('model capability profiles', () => {
  it('adapts project aspect ratio to a supported Seedance ratio by default', () => {
    const settings = resolveGenerationSettings(project, scene, 'seedance')
    expect(settings.aspectRatio).toBe('21:9')
    expect(settings.durationSec).toBe(9)
  })

  it('rejects unsupported Seedance duration', () => {
    const settings = { ...resolveGenerationSettings(project, scene, 'seedance'), durationSec: 31 }
    expect(validateGenerationSettings(project, scene, 'seedance', settings).some((issue) => issue.code === 'duration-range' && issue.severity === 'error')).toBe(true)
  })

  it('enforces Veo 8 second coupling for 4k', () => {
    const settings = { ...resolveGenerationSettings(project, scene, 'veo'), durationSec: 6, resolution: '4k' }
    const issues = validateGenerationSettings(project, scene, 'veo', settings)
    expect(issues.some((issue) => issue.code === 'veo-eight-second-coupling' && issue.severity === 'error')).toBe(true)
  })

  it('accepts Kling baseline duration and aspect ratio', () => {
    const settings = { ...resolveGenerationSettings(project, scene, 'kling'), durationSec: 15, aspectRatio: '1:1' }
    const issues = validateGenerationSettings(project, scene, 'kling', settings)
    expect(issues.some((issue) => issue.code === 'duration-range' || issue.code === 'aspect-ratio')).toBe(false)
  })
})
