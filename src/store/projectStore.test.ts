import { beforeEach, describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import type { AIStoryDraft } from '../ai/story'
import { useProjectStore } from './projectStore'

const clone = () => structuredClone(sampleProject)
const comparableProject = () => {
  const project = structuredClone(useProjectStore.getState().project) as unknown as Record<string, unknown>
  delete project.updatedAt
  return project
}

beforeEach(() => {
  useProjectStore.getState().setProject(clone())
})

describe('project CRUD store', () => {
  it('adds an asset and removes scene references when deleting it', () => {
    const store = useProjectStore.getState()
    const before = store.project.assets.length
    store.addAsset('prop')
    expect(useProjectStore.getState().project.assets).toHaveLength(before + 1)
    store.deleteAsset('prop-key')
    const state = useProjectStore.getState()
    expect(state.project.assets.some((asset) => asset.id === 'prop-key')).toBe(false)
    expect(state.project.scenes.every((scene) => !scene.propIds.includes('prop-key'))).toBe(true)
  })

  it('keeps at least one scene', () => {
    const store = useProjectStore.getState()
    for (const scene of [...store.project.scenes].slice(1)) useProjectStore.getState().deleteScene(scene.id)
    const lastId = useProjectStore.getState().project.scenes[0].id
    useProjectStore.getState().deleteScene(lastId)
    expect(useProjectStore.getState().project.scenes).toHaveLength(1)
  })

  it('creates, duplicates, reorders and deletes shots while normalizing order', () => {
    const sceneId = useProjectStore.getState().project.scenes[0].id
    const originalIds = useProjectStore.getState().project.scenes[0].shots.map((shot) => shot.id)
    const addedId = useProjectStore.getState().addShot(sceneId)
    expect(useProjectStore.getState().project.scenes[0].shots.at(-1)?.id).toBe(addedId)
    const copyId = useProjectStore.getState().duplicateShot(sceneId, originalIds[0])
    expect(useProjectStore.getState().selectedShotId).toBe(copyId)
    useProjectStore.getState().reorderShots(sceneId, addedId, originalIds[0])
    let shots = useProjectStore.getState().project.scenes[0].shots
    expect(shots[0].id).toBe(addedId)
    expect(shots.map((shot) => shot.order)).toEqual(shots.map((_, index) => index + 1))
    useProjectStore.getState().deleteShot(sceneId, copyId)
    shots = useProjectStore.getState().project.scenes[0].shots
    expect(shots.some((shot) => shot.id === copyId)).toBe(false)
  })


  it('updates Blocking Board geography and keeps camera focal length in sync with the shot', () => {
    const scene = useProjectStore.getState().project.scenes[0]
    const shot = scene.shots[0]
    useProjectStore.getState().updateCharacterPlacement(scene.id, 'char-mira', { x: 0.91, y: 0.12 })
    useProjectStore.getState().updateShotCamera(scene.id, shot.id, { directionDeg: 725, focalLengthMm: 40 })
    const updated = useProjectStore.getState().project.scenes[0]
    expect(updated.geography?.characterPlacements.find((item) => item.characterId === 'char-mira')?.x).toBe(0.91)
    expect(updated.geography?.shotCameras.find((item) => item.shotId === shot.id)?.directionDeg).toBe(5)
    expect(updated.shots[0].focalLength).toBe('40mm')
  })

  it('merges a continuous Blocking Board drag into one history entry', () => {
    const scene = useProjectStore.getState().project.scenes[0]
    for (let index = 0; index < 12; index += 1) useProjectStore.getState().updateCharacterPlacement(scene.id, 'char-mira', { x: 0.2 + index * 0.01, y: 0.5 })
    expect(useProjectStore.getState().historyPast).toHaveLength(1)
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().project.scenes[0].geography?.characterPlacements.find((item) => item.characterId === 'char-mira')?.x).toBe(sampleProject.scenes[0].geography?.characterPlacements[0].x)
  })


  it('stores and removes a Blocking Board background with undo support', () => {
    const sceneId = useProjectStore.getState().project.scenes[0].id
    const reference = { id: 'bg-test', name: 'floorplan.png', dataUrl: 'data:image/png;base64,AAAA', mimeType: 'image/png' }
    useProjectStore.getState().setSceneBackground(sceneId, reference)
    useProjectStore.getState().updateSceneBackground(sceneId, { opacity: 0.3, scale: 1.5, x: 0.6 })
    let background = useProjectStore.getState().project.scenes[0].geography?.background
    expect(background?.opacity).toBe(0.3)
    expect(background?.scale).toBe(1.5)
    useProjectStore.getState().removeSceneBackground(sceneId)
    expect(useProjectStore.getState().project.scenes[0].geography?.background).toBeUndefined()
    useProjectStore.getState().undo()
    background = useProjectStore.getState().project.scenes[0].geography?.background
    expect(background?.reference.id).toBe('bg-test')
  })

  it('deduplicates spatial transitions and removes shot-bound events with a deleted shot', () => {
    const scene = useProjectStore.getState().project.scenes[0]
    const fromShotId = scene.shots[0].id
    const toShotId = scene.shots[1].id
    const event = { subjectType: 'camera' as const, fromShotId, toShotId, from: 'left', to: 'right', motion: 'dolly', note: '' }
    const first = useProjectStore.getState().addSpatialTransition(scene.id, event)
    const second = useProjectStore.getState().addSpatialTransition(scene.id, event)
    expect(second).toBe(first)
    expect(useProjectStore.getState().project.scenes[0].spatialTransitions).toHaveLength(1)
    useProjectStore.getState().deleteShot(scene.id, toShotId)
    expect(useProjectStore.getState().project.scenes[0].spatialTransitions).toHaveLength(0)
  })


  it('creates structured spatial zones and clears transition zone bindings when deleting them', () => {
    const sceneId = useProjectStore.getState().project.scenes[0].id
    const zoneId = useProjectStore.getState().addSpatialZone(sceneId, 'doorway')
    useProjectStore.getState().updateSpatialZone(sceneId, zoneId, { name: 'Lobby Door', x: 0.9, y: 0.1 })
    const eventId = useProjectStore.getState().addSpatialTransition(sceneId, { subjectType: 'camera', fromZoneId: zoneId, toZoneId: zoneId, from: 'fallback', to: 'fallback', motion: 'dolly', note: '' })
    let scene = useProjectStore.getState().project.scenes[0]
    expect(scene.geography?.zones?.find((zone) => zone.id === zoneId)?.name).toBe('Lobby Door')
    useProjectStore.getState().removeSpatialZone(sceneId, zoneId)
    scene = useProjectStore.getState().project.scenes[0]
    const event = scene.spatialTransitions?.find((item) => item.id === eventId)
    expect(event?.fromZoneId).toBeUndefined()
    expect(event?.toZoneId).toBeUndefined()
  })


  it('snaps a character to a nearby zone and clears the binding when the zone is removed', () => {
    const sceneId = useProjectStore.getState().project.scenes[0].id
    const zoneId = useProjectStore.getState().addSpatialZone(sceneId, 'doorway')
    useProjectStore.getState().updateSpatialZone(sceneId, zoneId, { name: 'Snap Door', x: 0.25, y: 0.5, width: 0.12, height: 0.25 })
    useProjectStore.getState().snapCharacterPlacement(sceneId, 'char-mira', 0.18, 0.5)
    let placement = useProjectStore.getState().project.scenes[0].geography?.characterPlacements.find((item) => item.characterId === 'char-mira')
    expect(placement?.zoneId).toBe(zoneId)
    expect(placement?.x).toBe(0.25)
    useProjectStore.getState().updateSpatialZone(sceneId, zoneId, { x: 0.4, y: 0.6 })
    placement = useProjectStore.getState().project.scenes[0].geography?.characterPlacements.find((item) => item.characterId === 'char-mira')
    expect(placement?.x).toBe(0.4)
    expect(placement?.y).toBe(0.6)
    useProjectStore.getState().removeSpatialZone(sceneId, zoneId)
    placement = useProjectStore.getState().project.scenes[0].geography?.characterPlacements.find((item) => item.characterId === 'char-mira')
    expect(placement?.zoneId).toBeUndefined()
  })

  it('records one background transform commit as one undo step', () => {
    const sceneId = useProjectStore.getState().project.scenes[0].id
    useProjectStore.getState().setSceneBackground(sceneId, { id: 'bg-direct', name: 'plan.png', dataUrl: 'data:image/png;base64,AAAA' })
    const historyBefore = useProjectStore.getState().historyPast.length
    useProjectStore.getState().updateSceneBackground(sceneId, { x: 0.8, y: 0.2, scale: 1.7, rotationDeg: 45 })
    expect(useProjectStore.getState().historyPast).toHaveLength(historyBefore + 1)
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().project.scenes[0].geography?.background?.x).toBe(0.5)
  })

  it('clears scene variant binding when a character variant is deleted', () => {
    const character = useProjectStore.getState().project.assets.find((asset) => asset.id === 'char-mira')
    if (!character || character.type !== 'character') throw new Error('fixture character missing')
    const variantId = character.variants[0].id
    expect(useProjectStore.getState().project.scenes[0].characterBindings[0].variantId).toBe(variantId)
    useProjectStore.getState().deleteVariant(character.id, variantId)
    expect(useProjectStore.getState().project.scenes.every((scene) => scene.characterBindings.every((binding) => binding.variantId !== variantId))).toBe(true)
  })



  it('deduplicates identical transition events', () => {
    const sceneId = useProjectStore.getState().project.scenes[1].id
    const before = useProjectStore.getState().project.scenes[1].transitionEvents?.length ?? 0
    const event = { type: 'weather' as const, from: 'rain', to: 'snow', note: 'Weather changes.' }
    const firstId = useProjectStore.getState().addTransitionEvent(sceneId, event)
    const secondId = useProjectStore.getState().addTransitionEvent(sceneId, event)
    const after = useProjectStore.getState().project.scenes[1].transitionEvents ?? []
    expect(secondId).toBe(firstId)
    expect(after).toHaveLength(before + 1)
  })


  it('keeps distinct custom transition notes', () => {
    const sceneId = useProjectStore.getState().project.scenes[0].id
    const before = useProjectStore.getState().project.scenes[0].transitionEvents?.length ?? 0
    useProjectStore.getState().addTransitionEvent(sceneId, { type: 'custom', note: 'Elevator doors close.' })
    useProjectStore.getState().addTransitionEvent(sceneId, { type: 'custom', note: 'A phone starts ringing.' })
    expect(useProjectStore.getState().project.scenes[0].transitionEvents).toHaveLength(before + 2)
  })

  it('applies an AI draft and binds assets by exact names', () => {
    const draft: AIStoryDraft = {
      logline: 'Mira follows a clue through the hotel.',
      scenes: [{
        title: 'Lobby clue', purpose: 'Find the first clue.', emotionalBeat: 'unease', durationSec: 6, timeOfDay: 'pre-dawn',
        locationName: 'Hotel Lobby', characterNames: ['Mira'], propNames: ['Silver Room Key'],
        shots: [{ title: 'Key reveal', durationSec: 6, framing: 'medium close-up', focalLength: '50mm', cameraMovement: 'slow push-in', action: 'Mira notices the key.' }]
      }]
    }
    useProjectStore.getState().applyAIStoryDraft(draft)
    const state = useProjectStore.getState().project
    expect(state.logline).toBe(draft.logline)
    expect(state.scenes[0].locationId).toBe('loc-lobby')
    expect(state.scenes[0].characterBindings[0].characterId).toBe('char-mira')
    expect(state.scenes[0].propIds).toContain('prop-key')
    expect(state.scenes[0].propStates?.[0].propId).toBe('prop-key')
  })
})

describe('project history', () => {
  it('merges continuous typing into one undo step', () => {
    useProjectStore.getState().updateProjectMeta({ title: 'M' })
    useProjectStore.getState().updateProjectMeta({ title: 'Mi' })
    useProjectStore.getState().updateProjectMeta({ title: 'Mid' })
    expect(useProjectStore.getState().historyPast).toHaveLength(1)
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().project.title).toBe(sampleProject.title)
  })

  it('round-trips thirty changes through undo and redo', () => {
    for (let index = 0; index < 30; index += 1) useProjectStore.getState().toggleAssetLock('char-mira', `test-${index}`)
    const afterChanges = comparableProject()
    for (let index = 0; index < 30; index += 1) useProjectStore.getState().undo()
    for (let index = 0; index < 30; index += 1) useProjectStore.getState().redo()
    expect(comparableProject()).toEqual(afterChanges)
  })

  it('caps history at fifty and clears redo after a new mutation', () => {
    for (let index = 0; index < 60; index += 1) useProjectStore.getState().toggleAssetLock('char-mira', `cap-${index}`)
    expect(useProjectStore.getState().historyPast).toHaveLength(50)
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().historyFuture).toHaveLength(1)
    useProjectStore.getState().addAsset('prop')
    expect(useProjectStore.getState().historyFuture).toHaveLength(0)
  })

  it('keeps theme outside project undo and resets history on project load', () => {
    useProjectStore.getState().updateProjectMeta({ title: 'Changed' })
    useProjectStore.getState().setTheme('dark')
    useProjectStore.getState().undo()
    expect(useProjectStore.getState().project.title).toBe(sampleProject.title)
    expect(useProjectStore.getState().project.settings.theme).toBe('dark')
    useProjectStore.getState().setProject(clone())
    expect(useProjectStore.getState().historyPast).toHaveLength(0)
    expect(useProjectStore.getState().historyFuture).toHaveLength(0)
  })
})
