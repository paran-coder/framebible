import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { lintProject } from './continuity'

it('detects the intentionally conflicting locked lighting in the sample project', () => {
  const issues = lintProject(sampleProject)
  expect(issues.some((issue) => issue.rule === 'locked-location-lighting')).toBe(true)
})

describe('continuity linter', () => {
  it('does not invent an aggregate confidence score', () => {
    const serialized = JSON.stringify(lintProject(sampleProject))
    expect(serialized.toLowerCase()).not.toContain('score')
  })

  it('flags a missing character variant reference', () => {
    const project = structuredClone(sampleProject)
    project.scenes[0].characterBindings[0].variantId = 'deleted-variant'
    expect(lintProject(project).some((issue) => issue.rule === 'missing-character-variant')).toBe(true)
  })

  it('tracks character state transitions and suppresses an approved transition', () => {
    const project = structuredClone(sampleProject)
    const character = project.assets.find((asset) => asset.id === 'char-mira')
    if (!character || character.type !== 'character') throw new Error('fixture character missing')
    character.variants.push({ id: 'variant-injured', name: 'Injured', description: '', wardrobe: 'dry coat', physicalState: 'limping', wetState: 'dry', injuryState: 'bandaged hand', hairMakeup: 'messy', ageAppearance: '', references: [] })
    project.scenes[1].characterBindings[0].variantId = 'variant-injured'
    const issues = lintProject(project)
    expect(issues.some((issue) => issue.rule === 'character-variant-transition')).toBe(true)
    expect(issues.some((issue) => issue.rule === 'character-wetness-transition')).toBe(true)
    expect(issues.some((issue) => issue.rule === 'character-injury-transition')).toBe(true)

    project.scenes[1].transitionEvents ??= []
    project.scenes[1].transitionEvents.push({ id: 'approved-character-change', type: 'character-variant', subjectId: character.id, note: 'Mira changes clothes and treats the injury between scenes.' })
    const approved = lintProject(project)
    expect(approved.some((issue) => issue.rule === 'character-variant-transition')).toBe(false)
    expect(approved.some((issue) => issue.rule === 'character-wetness-transition')).toBe(false)
    expect(approved.some((issue) => issue.rule === 'character-injury-transition')).toBe(false)
  })

  it('tracks prop owner and condition transitions', () => {
    const project = structuredClone(sampleProject)
    project.scenes[1].transitionEvents = []
    project.scenes[1].propStates = [{ propId: 'prop-key', presence: 'present', ownerCharacterId: 'char-mira', condition: 'bent' }]
    const issues = lintProject(project)
    expect(issues.some((issue) => issue.rule === 'prop-owner-transfer')).toBe(true)
    expect(issues.some((issue) => issue.rule === 'prop-condition-transition')).toBe(true)
  })



  it('does not flag small time progression or equivalent rain wording', () => {
    const issues = lintProject(structuredClone(sampleProject))
    expect(issues.some((issue) => issue.rule === 'time-of-day-transition')).toBe(false)
    expect(issues.some((issue) => issue.rule === 'weather-transition')).toBe(false)
  })

  it('does not treat an unspecified prop condition as a confirmed condition change', () => {
    const project = structuredClone(sampleProject)
    project.scenes[0].propStates = [{ propId: 'prop-key', presence: 'present', condition: '' }]
    project.scenes[1].propStates = [{ propId: 'prop-key', presence: 'present', ownerCharacterId: 'char-mira', condition: 'intact' }]
    const issues = lintProject(project)
    expect(issues.some((issue) => issue.rule === 'prop-condition-transition')).toBe(false)
  })

  it('offers a transition suggestion that can suppress the matching issue', () => {
    const project = structuredClone(sampleProject)
    project.scenes[1].transitionEvents = []
    const issue = lintProject(project).find((item) => item.rule === 'prop-owner-transfer')
    expect(issue?.suggestedTransition).toBeTruthy()
    if (!issue?.suggestedTransition) throw new Error('suggestion missing')
    project.scenes[1].transitionEvents = [{ id: 'quick-add', ...issue.suggestedTransition }]
    expect(lintProject(project).some((item) => item.id === issue.id)).toBe(false)
  })
  it('flags same-side exit and entry across adjacent shots', () => {
    const project = structuredClone(sampleProject)
    project.scenes[0].shots[0].exitSide = 'right'
    project.scenes[0].shots[1].entrySide = 'right'
    expect(lintProject(project).some((issue) => issue.rule === 'entry-exit-side-continuity')).toBe(true)
    project.scenes[0].shots[1].entrySide = 'left'
    expect(lintProject(project).some((issue) => issue.rule === 'entry-exit-side-continuity')).toBe(false)
  })

  it('flags a large camera axis change from Blocking Board geography', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    if (!scene.geography) throw new Error('geography missing')
    if (!scene.geography) throw new Error('geography missing')
    scene.geography.shotCameras[0].directionDeg = 0
    scene.geography.shotCameras[1].directionDeg = 180
    expect(lintProject(project).some((issue) => issue.rule === 'camera-axis-review')).toBe(true)
  })

  it('reviews large geography jumps only when the location is unchanged', () => {
    const project = structuredClone(sampleProject)
    project.scenes[1].locationId = project.scenes[0].locationId
    project.scenes[1].geography = structuredClone(project.scenes[0].geography)
    if (!project.scenes[1].geography) throw new Error('geography missing')
    project.scenes[1].geography.characterPlacements[0].x = 0.95
    project.scenes[1].geography.characterPlacements[0].y = 0.95
    expect(lintProject(project).some((issue) => issue.rule === 'character-geography-jump')).toBe(true)
    project.scenes[1].locationId = 'loc-corridor'
    expect(lintProject(project).some((issue) => issue.rule === 'character-geography-jump')).toBe(false)
  })


  it('uses matching spatial transitions to explain geography and camera-axis changes without hiding unrelated issues', () => {
    const project = structuredClone(sampleProject)
    project.scenes[1].locationId = project.scenes[0].locationId
    project.scenes[1].geography = structuredClone(project.scenes[0].geography)
    if (!project.scenes[1].geography || !project.scenes[0].geography) throw new Error('geography missing')
    project.scenes[1].geography.characterPlacements[0].x = 0.95
    project.scenes[1].geography.characterPlacements[0].y = 0.95
    project.scenes[1].spatialTransitions = [{ id: 'move-mira', subjectType: 'character', subjectId: 'char-mira', from: 'left midground', to: 'right foreground', motion: 'crosses the room', note: '' }]
    expect(lintProject(project).some((issue) => issue.rule === 'character-geography-jump')).toBe(false)

    const scene = project.scenes[0]
    if (!scene.geography) throw new Error('geography missing')
    scene.geography.shotCameras[0].directionDeg = 0
    scene.geography.shotCameras[1].directionDeg = 180
    scene.spatialTransitions = [{ id: 'camera-reset', subjectType: 'camera', fromShotId: scene.shots[0].id, toShotId: scene.shots[1].id, from: 'left foreground', to: 'center foreground', motion: 'motivated axis reset', note: '' }]
    expect(lintProject(project).some((issue) => issue.rule === 'camera-axis-review')).toBe(false)
    expect(lintProject(project).some((issue) => issue.rule === 'locked-location-lighting')).toBe(true)
  })

})
