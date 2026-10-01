import type { Asset, AssetType, CharacterVariant, Scene, Shot } from './types'
import { ensureSceneGeography } from './geography'

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`

export function createCharacterVariant(name = 'New Variant'): CharacterVariant {
  return {
    id: id('variant'),
    name,
    description: '',
    wardrobe: '',
    physicalState: '',
    wetState: 'unspecified',
    injuryState: '',
    hairMakeup: '',
    ageAppearance: '',
    references: []
  }
}

export function createAsset(type: AssetType, name?: string): Asset {
  const base = {
    id: id(type === 'character' ? 'char' : type === 'location' ? 'loc' : 'prop'),
    type,
    name: name?.trim() || (type === 'character' ? 'New Character' : type === 'location' ? 'New Location' : 'New Prop'),
    description: '',
    tags: [] as string[],
    lockedFields: [] as string[],
    references: []
  }

  if (type === 'character') {
    return {
      ...base,
      type: 'character',
      identityDNA: { apparentAge: '', face: '', hair: '', build: '', distinguishingFeatures: '' },
      defaultWardrobe: '',
      variants: []
    }
  }
  if (type === 'location') {
    return { ...base, type: 'location', timeOfDay: '', lighting: '', architecture: '' }
  }
  return { ...base, type: 'prop', appearance: '' }
}

export function createShot(order = 1): Shot {
  return {
    id: id('shot'),
    order,
    title: `Shot ${order}`,
    durationSec: 4,
    framing: 'medium wide',
    focalLength: '35mm',
    cameraHeight: 'eye level',
    cameraMovement: 'static',
    blocking: '',
    action: '',
    lighting: 'inherit location lighting',
    audio: '',
    screenDirection: 'neutral',
    entrySide: 'none',
    exitSide: 'none'
  }
}

export function duplicateShot(source: Shot, order: number): Shot {
  return { ...source, id: id('shot'), order, title: `${source.title} copy` }
}

export function createScene(order = 1, stageAspectRatio = '16:9'): Scene {
  const scene: Scene = {
    id: id('scene'),
    order,
    title: `Scene ${order}`,
    purpose: '',
    emotionalBeat: '',
    durationSec: 4,
    timeOfDay: '',
    weather: '',
    characterBindings: [],
    propIds: [],
    propStates: [],
    transitionEvents: [],
    spatialTransitions: [],
    shots: [createShot(1)]
  }
  return { ...scene, geography: ensureSceneGeography(scene, stageAspectRatio) }
}
