import { compileCameraPath, compileSceneGeography, compileSpatialTransitions } from './geography'
import type { Asset, CharacterAsset, GenerationTarget, Project, Scene, Shot } from './types'

export type PromptModel = GenerationTarget

export interface PromptCharacterIR {
  name: string
  description: string
  identity: string[]
  variantName: string
  wardrobe: string
  physicalState?: string
  wetState?: string
  injuryState?: string
  hairMakeup?: string
  ageAppearance?: string
  lockedFields: string[]
}

export interface PromptLocationIR {
  name: string
  description: string
  architecture: string
  lighting: string
}

export interface PromptPropIR {
  name: string
  description: string
  owner?: string
  condition?: string
}

export interface PromptShotIR extends Pick<Shot,
  'id' | 'order' | 'title' | 'durationSec' | 'framing' | 'focalLength' | 'cameraHeight' |
  'cameraMovement' | 'blocking' | 'action' | 'lighting' | 'audio' | 'screenDirection' | 'entrySide' | 'exitSide'> {}

export interface ScenePromptIR {
  modelNeutralVersion: 1
  projectTitle: string
  style: {
    genre: string
    aspectRatio: string
    capture: string
    cameraLanguage: string
    lightingLanguage: string
    palette: string
    texture: string
    negativeRules: string[]
  }
  scene: {
    order: number
    title: string
    purpose: string
    emotionalBeat: string
    timeOfDay: string
    weather?: string
  }
  characters: PromptCharacterIR[]
  location?: PromptLocationIR
  props: PromptPropIR[]
  geographyLines: string[]
  cameraPathLines: string[]
  spatialTransitionLines: string[]
  firstFrameBlocking: string
  shots: PromptShotIR[]
  continuityLocks: string[]
  intentionalTransitions: string[]
}

const assetById = (project: Project, id?: string): Asset | undefined => id ? project.assets.find((asset) => asset.id === id) : undefined

function characterIR(project: Project, scene: Scene, character: CharacterAsset): PromptCharacterIR {
  const binding = scene.characterBindings.find((item) => item.characterId === character.id)
  const variant = character.variants.find((item) => item.id === binding?.variantId)
  return {
    name: character.name,
    description: character.description,
    identity: [character.identityDNA.face, character.identityDNA.hair, character.identityDNA.build, character.identityDNA.distinguishingFeatures].filter(Boolean),
    variantName: variant?.name ?? 'base',
    wardrobe: variant?.wardrobe || character.defaultWardrobe,
    physicalState: variant?.physicalState,
    wetState: variant?.wetState && variant.wetState !== 'unspecified' ? variant.wetState : undefined,
    injuryState: variant?.injuryState,
    hairMakeup: variant?.hairMakeup,
    ageAppearance: variant?.ageAppearance,
    lockedFields: [...character.lockedFields]
  }
}

export function buildScenePromptIR(project: Project, scene: Scene): ScenePromptIR {
  const locationAsset = assetById(project, scene.locationId)
  const characters = scene.characterBindings
    .map((binding) => assetById(project, binding.characterId))
    .filter((asset): asset is CharacterAsset => asset?.type === 'character')
    .map((character) => characterIR(project, scene, character))
  const propStateById = new Map((scene.propStates ?? []).map((state) => [state.propId, state]))
  const props = scene.propIds.flatMap((id) => {
    const prop = assetById(project, id)
    if (!prop || prop.type !== 'prop') return []
    const state = propStateById.get(prop.id)
    const owner = state?.ownerCharacterId ? assetById(project, state.ownerCharacterId)?.name : undefined
    return [{ name: prop.name, description: prop.description, owner, condition: state?.condition }]
  })

  const continuityLocks = characters.flatMap((character) => [
    ...character.lockedFields.map((field) => `Keep @${character.name} ${field} unchanged except for explicitly described Variant state.`),
    ...(character.variantName !== 'base' ? [`Apply @${character.name} Variant "${character.variantName}" as the only intentional state override; do not invent additional changes.`] : [])
  ])
  if (locationAsset?.type === 'location') continuityLocks.push(`Keep @${locationAsset.name} architecture, time-of-day, and locked lighting coherent.`)

  return {
    modelNeutralVersion: 1,
    projectTitle: project.title,
    style: {
      genre: project.styleDNA.genre,
      aspectRatio: project.styleDNA.aspectRatio,
      capture: project.styleDNA.capture,
      cameraLanguage: project.styleDNA.cameraLanguage,
      lightingLanguage: project.styleDNA.lightingLanguage,
      palette: project.styleDNA.palette,
      texture: project.styleDNA.texture,
      negativeRules: [...project.styleDNA.negativeRules]
    },
    scene: {
      order: scene.order,
      title: scene.title,
      purpose: scene.purpose,
      emotionalBeat: scene.emotionalBeat,
      timeOfDay: scene.timeOfDay,
      weather: scene.weather
    },
    characters,
    location: locationAsset?.type === 'location' ? {
      name: locationAsset.name,
      description: locationAsset.description,
      architecture: locationAsset.architecture,
      lighting: locationAsset.lighting
    } : undefined,
    props,
    geographyLines: compileSceneGeography(project, scene),
    cameraPathLines: compileCameraPath(project, scene),
    spatialTransitionLines: compileSpatialTransitions(project, scene),
    firstFrameBlocking: scene.shots[0]?.blocking ?? 'Define first-frame blocking.',
    shots: [...scene.shots].sort((a, b) => a.order - b.order).map((shot) => ({ ...shot })),
    continuityLocks,
    intentionalTransitions: (scene.transitionEvents ?? []).map((event) => event.note || event.type)
  }
}
