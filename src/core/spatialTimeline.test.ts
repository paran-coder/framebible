import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { createSpatialZone, ensureSceneGeography } from './geography'
import { sampleSpatialTimeline, timelineShotProgress } from './spatialTimeline'

describe('spatial timeline', () => {
  it('keeps shot camera setup changes discrete without an explicit camera transition', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    const p1 = timelineShotProgress(scene, scene.shots[0].id)
    const p2 = timelineShotProgress(scene, scene.shots[1].id)
    const a = sampleSpatialTimeline(project, scene, p1)
    const b = sampleSpatialTimeline(project, scene, p2)
    expect(a.camera?.shotId).toBe(scene.shots[0].id)
    expect(b.camera?.shotId).toBe(scene.shots[1].id)
  })

  it('interpolates an explicit character transition between spatial zones', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
    const from = createSpatialZone('doorway', 0)
    const to = createSpatialZone('table', 1)
    from.x = 0.15; from.y = 0.5
    to.x = 0.85; to.y = 0.5
    scene.geography = { ...geography, zones: [from, to] }
    scene.spatialTransitions = [{ id: 'move-mira', subjectType: 'character', subjectId: 'char-mira', fromShotId: scene.shots[0].id, toShotId: scene.shots[1].id, fromZoneId: from.id, toZoneId: to.id, from: '', to: '', motion: 'walk', note: '' }]
    const middle = sampleSpatialTimeline(project, scene, (timelineShotProgress(scene, scene.shots[0].id) + timelineShotProgress(scene, scene.shots[1].id)) / 2)
    const mira = middle.nodes.find((node) => node.id === 'char-mira')
    expect(mira?.x).toBeGreaterThan(0.15)
    expect(mira?.x).toBeLessThan(0.85)
  })
})
