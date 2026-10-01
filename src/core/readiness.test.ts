import { describe, expect, it } from 'vitest'
import { buildProjectReadiness } from './readiness'
import { sampleProject } from '../data/sampleProject'

describe('production readiness', () => {
  it('blocks the sample corridor scene because it contains a continuity error', () => {
    const readiness = buildProjectReadiness(structuredClone(sampleProject), 'seedance')
    expect(readiness.scenes[1].status).toBe('blocked')
    expect(readiness.scenes[1].blockers.length).toBeGreaterThan(0)
  })

  it('downgrades incomplete production metadata to needs review rather than blocked', () => {
    const project = structuredClone(sampleProject)
    project.scenes = [project.scenes[0]]
    project.scenes[0].purpose = ''
    const readiness = buildProjectReadiness(project, 'seedance')
    expect(readiness.status).toBe('needs-review')
    expect(readiness.scenes[0].reviews.some((item) => item.category === 'scene')).toBe(true)
  })
})
