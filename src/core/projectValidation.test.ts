import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { isFrameBibleProject, parseFrameBibleProject } from './projectValidation'

describe('project import validation', () => {
  it('accepts the v2 sample project', () => {
    expect(isFrameBibleProject(sampleProject)).toBe(true)
    expect(parseFrameBibleProject(sampleProject)?.schemaVersion).toBe(2)
  })

  it('migrates a v1 wardrobe/state pair into one scene-bound variant', () => {
    type MutableRecord = Record<string, unknown>
    const legacy = structuredClone(sampleProject) as unknown as MutableRecord
    legacy.schemaVersion = 1
    legacy.appVersion = '1.1.0'
    const assets = legacy.assets as MutableRecord[]
    const character = assets.find((asset) => asset.type === 'character')
    if (!character) throw new Error('legacy character fixture missing')
    delete character.variants
    character.wardrobeVariants = [{ id: 'wardrobe-rain', name: 'Rain', description: 'wet jacket' }]
    character.stateVariants = [{ id: 'state-alert', name: 'Alert', description: 'tense shoulders' }]
    const characterId = String(character.id)
    const scenes = legacy.scenes as MutableRecord[]
    scenes.forEach((scene) => { scene.characterBindings = [{ characterId, wardrobeVariantId: 'wardrobe-rain', stateVariantId: 'state-alert' }] })

    const migrated = parseFrameBibleProject(legacy)
    expect(migrated?.schemaVersion).toBe(2)
    const migratedCharacter = migrated?.assets.find((asset) => asset.id === characterId)
    expect(migratedCharacter?.type).toBe('character')
    if (migratedCharacter?.type !== 'character') throw new Error('character missing')
    const binding = migrated?.scenes[0].characterBindings[0]
    expect(binding?.variantId).toContain('variant-migrated')
    expect(migratedCharacter.variants.find((variant) => variant.id === binding?.variantId)?.wardrobe).toBe('wet jacket')
    expect(migratedCharacter.variants.find((variant) => variant.id === binding?.variantId)?.physicalState).toBe('tense shoulders')
  })


  it('hydrates v1.2 projects that do not contain v1.3 additive continuity fields', () => {
    const legacy = structuredClone(sampleProject)
    legacy.appVersion = '1.2.0'
    for (const scene of legacy.scenes) {
      delete scene.weather
      delete scene.propStates
      delete scene.transitionEvents
    }
    for (const asset of legacy.assets) if (asset.type === 'character') for (const variant of asset.variants) {
      delete variant.wetState
      delete variant.injuryState
    }
    const parsed = parseFrameBibleProject(legacy)
    expect(parsed?.schemaVersion).toBe(2)
    expect(parsed?.scenes.every((scene) => Array.isArray(scene.propStates) && Array.isArray(scene.transitionEvents))).toBe(true)
    const character = parsed?.assets.find((asset) => asset.type === 'character')
    if (!character || character.type !== 'character') throw new Error('character missing')
    expect(character.variants.every((variant) => variant.wetState === 'unspecified' && variant.injuryState === '')).toBe(true)
  })

  it('hydrates v1.3 projects that do not contain scene geography', () => {
    const legacy = structuredClone(sampleProject)
    legacy.appVersion = '1.3.0'
    for (const scene of legacy.scenes) delete scene.geography
    const parsed = parseFrameBibleProject(legacy)
    expect(parsed?.scenes.every((scene) => scene.geography?.shotCameras.length === scene.shots.length)).toBe(true)
    expect(parsed?.scenes[0].geography?.characterPlacements[0].characterId).toBe('char-mira')
  })

  it('hydrates v1.4 projects without background or spatial transitions', () => {
    const legacy = structuredClone(sampleProject)
    legacy.appVersion = '1.4.0'
    for (const scene of legacy.scenes) {
      delete scene.spatialTransitions
      if (scene.geography) delete scene.geography.background
    }
    const parsed = parseFrameBibleProject(legacy)
    expect(parsed?.appVersion).toBe('2.0.1')
    expect(parsed?.scenes.every((scene) => Array.isArray(scene.spatialTransitions))).toBe(true)
    expect(parsed?.scenes.every((scene) => scene.geography?.background === undefined)).toBe(true)
  })


  it('hydrates v1.6 projects and preserves optional zone bindings', () => {
    const legacy = structuredClone(sampleProject)
    legacy.appVersion = '1.6.0'
    const scene = legacy.scenes[0]
    if (!scene.geography) throw new Error('geography fixture missing')
    const zone = { id: 'zone-validation', name: 'Validation Door', kind: 'doorway' as const, x: 0.25, y: 0.5, width: 0.2, height: 0.3, rotationDeg: 0 }
    scene.geography.zones = [zone]
    scene.geography.characterPlacements[0] = { ...scene.geography.characterPlacements[0], x: zone.x, y: zone.y, zoneId: zone.id }
    const parsed = parseFrameBibleProject(legacy)
    expect(parsed?.appVersion).toBe('2.0.1')
    expect(parsed?.scenes[0].geography?.characterPlacements[0].zoneId).toBe(zone.id)
  })

  it('rejects structurally incomplete imports', () => {
    expect(parseFrameBibleProject({ schemaVersion: 2, title: 'broken' })).toBeNull()
  })
})
