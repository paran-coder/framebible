import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { buildShotTreatments } from './composition'

describe('composition rules', () => {
  it('returns three editable treatments without changing story facts', () => {
    const scene = sampleProject.scenes[0]
    const shot = scene.shots[0]
    const treatments = buildShotTreatments(scene, shot)
    expect(treatments).toHaveLength(3)
    expect(treatments.every((item) => item.patch.action === undefined)).toBe(true)
  })
})
