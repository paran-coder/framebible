import { APP_VERSION, type Asset, type CharacterAsset, type CharacterVariant, type ContinuityTransitionEvent, type Project, type PropContinuityState, type ReferenceImage, type Scene, type SceneGenerationSettings, type SceneGeography, type Shot, type SpatialTransitionEvent, type ThemePreference } from './types'
import { ensureSceneGeography } from './geography'

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null
const isString = (value: unknown): value is string => typeof value === 'string'
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every(isString)

function dataUrlMeta(dataUrl?: string): Pick<ReferenceImage, 'mimeType' | 'bytes'> {
  if (!dataUrl) return {}
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(dataUrl)
  if (!match) return {}
  return { mimeType: match[1], bytes: Math.floor(match[2].length * 0.75) }
}

const isReferenceImage = (value: unknown): value is ReferenceImage => {
  if (!isRecord(value) || !isString(value.id) || !isString(value.name)) return false
  if (value.dataUrl !== undefined && !isString(value.dataUrl)) return false
  for (const key of ['width', 'height', 'bytes', 'originalBytes'] as const) if (value[key] !== undefined && !isNumber(value[key])) return false
  if (value.mimeType !== undefined && !isString(value.mimeType)) return false
  if (value.optimized !== undefined && typeof value.optimized !== 'boolean') return false
  return true
}

const isCharacterVariant = (value: unknown): value is CharacterVariant => isRecord(value)
  && isString(value.id)
  && isString(value.name)
  && isString(value.description)
  && isString(value.wardrobe)
  && isString(value.physicalState)
  && (value.wetState === undefined || ['unspecified', 'dry', 'damp', 'wet', 'soaked'].includes(String(value.wetState)))
  && (value.injuryState === undefined || isString(value.injuryState))
  && isString(value.hairMakeup)
  && isString(value.ageAppearance)
  && Array.isArray(value.references)
  && value.references.every(isReferenceImage)

const hasBaseAsset = (value: unknown): value is Asset => {
  if (!isRecord(value)) return false
  if (!isString(value.id) || !isString(value.name) || !isString(value.description)) return false
  if (!['character', 'location', 'prop'].includes(String(value.type))) return false
  if (!isStringArray(value.tags) || !isStringArray(value.lockedFields) || !Array.isArray(value.references) || !value.references.every(isReferenceImage)) return false

  if (value.type === 'character') {
    return isRecord(value.identityDNA)
      && isString(value.identityDNA.apparentAge)
      && isString(value.identityDNA.face)
      && isString(value.identityDNA.hair)
      && isString(value.identityDNA.build)
      && isString(value.identityDNA.distinguishingFeatures)
      && isString(value.defaultWardrobe)
      && Array.isArray(value.variants)
      && value.variants.every(isCharacterVariant)
  }
  if (value.type === 'location') return isString(value.timeOfDay) && isString(value.lighting) && isString(value.architecture)
  return isString(value.appearance)
}

const isShot = (value: unknown): value is Shot => {
  if (!isRecord(value)) return false
  if (!isString(value.id) || !isNumber(value.order) || !isString(value.title) || !isNumber(value.durationSec)) return false
  if (![value.framing, value.focalLength, value.cameraHeight, value.cameraMovement, value.blocking, value.action, value.lighting, value.audio].every(isString)) return false
  if (value.screenDirection !== undefined && !['left-to-right', 'right-to-left', 'neutral'].includes(String(value.screenDirection))) return false
  if (value.entrySide !== undefined && !['left', 'right', 'center', 'none'].includes(String(value.entrySide))) return false
  if (value.exitSide !== undefined && !['left', 'right', 'center', 'none'].includes(String(value.exitSide))) return false
  return value.locationOverrideId === undefined || isString(value.locationOverrideId)
}


const spatialSubjectTypes = ['character', 'prop', 'camera'] as const

const isSpatialTransition = (value: unknown): value is SpatialTransitionEvent => isRecord(value)
  && isString(value.id)
  && spatialSubjectTypes.includes(value.subjectType as (typeof spatialSubjectTypes)[number])
  && (value.subjectId === undefined || isString(value.subjectId))
  && (value.fromShotId === undefined || isString(value.fromShotId))
  && (value.toShotId === undefined || isString(value.toShotId))
  && (value.fromZoneId === undefined || isString(value.fromZoneId))
  && (value.toZoneId === undefined || isString(value.toZoneId))
  && isString(value.from)
  && isString(value.to)
  && isString(value.motion)
  && isString(value.note)

const isBoardBackground = (value: unknown): boolean => isRecord(value)
  && isReferenceImage(value.reference)
  && isNumber(value.opacity)
  && isNumber(value.x)
  && isNumber(value.y)
  && isNumber(value.scale)
  && isNumber(value.rotationDeg)
  && (value.fit === 'contain' || value.fit === 'cover')

const isSceneGeography = (value: unknown): value is SceneGeography => {
  if (!isRecord(value) || !isString(value.stageAspectRatio)) return false
  if (value.background !== undefined && !isBoardBackground(value.background)) return false
  if (value.zones !== undefined && (!Array.isArray(value.zones) || !value.zones.every((zone) => isRecord(zone)
    && isString(zone.id)
    && isString(zone.name)
    && ['doorway', 'window', 'table', 'custom'].includes(String(zone.kind))
    && isNumber(zone.x) && isNumber(zone.y) && isNumber(zone.width) && isNumber(zone.height) && isNumber(zone.rotationDeg)))) return false
  if (!Array.isArray(value.characterPlacements) || !Array.isArray(value.propPlacements) || !Array.isArray(value.shotCameras)) return false
  const point = (item: unknown) => isRecord(item) && isNumber(item.x) && isNumber(item.y)
  const optionalZoneId = (item: unknown) => isRecord(item) && (item.zoneId === undefined || isString(item.zoneId))
  return value.characterPlacements.every((item) => point(item) && optionalZoneId(item) && isString((item as Record<string, unknown>).characterId) && isNumber((item as Record<string, unknown>).facingDeg))
    && value.propPlacements.every((item) => point(item) && optionalZoneId(item) && isString((item as Record<string, unknown>).propId) && isNumber((item as Record<string, unknown>).rotationDeg))
    && value.shotCameras.every((item) => point(item) && optionalZoneId(item) && isString((item as Record<string, unknown>).shotId) && isNumber((item as Record<string, unknown>).directionDeg) && isNumber((item as Record<string, unknown>).focalLengthMm))
}

const isPropContinuityState = (value: unknown): value is PropContinuityState => isRecord(value)
  && isString(value.propId)
  && (value.presence === 'present' || value.presence === 'absent')
  && (value.ownerCharacterId === undefined || isString(value.ownerCharacterId))
  && isString(value.condition)

const transitionTypes = ['character-variant', 'character-state', 'wetness', 'injury', 'prop-presence', 'prop-transfer', 'prop-condition', 'location', 'time', 'weather', 'custom'] as const

const isTransitionEvent = (value: unknown): value is ContinuityTransitionEvent => isRecord(value)
  && isString(value.id)
  && transitionTypes.includes(value.type as (typeof transitionTypes)[number])
  && (value.subjectId === undefined || isString(value.subjectId))
  && (value.from === undefined || isString(value.from))
  && (value.to === undefined || isString(value.to))
  && isString(value.note)

const isGenerationSettings = (value: unknown): value is SceneGenerationSettings => isRecord(value)
  && isNumber(value.durationSec)
  && isString(value.aspectRatio)
  && isString(value.resolution)
  && ['auto', 'on', 'off'].includes(String(value.audio))
  && ['prompt-only', 'first-image', 'first-last-images'].includes(String(value.frameMode))
  && (value.firstFrameReferenceId === undefined || isString(value.firstFrameReferenceId))
  && (value.lastFrameReferenceId === undefined || isString(value.lastFrameReferenceId))
  && isStringArray(value.referenceImageIds)

const isGenerationMap = (value: unknown): boolean => {
  if (!isRecord(value)) return false
  return ['seedance', 'veo', 'kling'].every((model) => value[model] === undefined || isGenerationSettings(value[model]))
}

const isScene = (value: unknown): value is Scene => {
  if (!isRecord(value)) return false
  if (!isString(value.id) || !isNumber(value.order) || !isString(value.title) || !isString(value.purpose) || !isString(value.emotionalBeat) || !isNumber(value.durationSec) || !isString(value.timeOfDay)) return false
  if (value.locationId !== undefined && !isString(value.locationId)) return false
  if (value.weather !== undefined && !isString(value.weather)) return false
  if (value.propStates !== undefined && (!Array.isArray(value.propStates) || !value.propStates.every(isPropContinuityState))) return false
  if (value.transitionEvents !== undefined && (!Array.isArray(value.transitionEvents) || !value.transitionEvents.every(isTransitionEvent))) return false
  if (value.spatialTransitions !== undefined && (!Array.isArray(value.spatialTransitions) || !value.spatialTransitions.every(isSpatialTransition))) return false
  if (value.geography !== undefined && !isSceneGeography(value.geography)) return false
  if (value.generation !== undefined && !isGenerationMap(value.generation)) return false
  if (!Array.isArray(value.characterBindings) || !value.characterBindings.every((binding) => isRecord(binding) && isString(binding.characterId) && (binding.variantId === undefined || isString(binding.variantId)))) return false
  return Array.isArray(value.propIds) && value.propIds.every(isString) && Array.isArray(value.shots) && value.shots.length > 0 && value.shots.every(isShot)
}

const isTheme = (value: unknown): value is ThemePreference => value === 'system' || value === 'light' || value === 'dark'

export function isFrameBibleProject(value: unknown): value is Project {
  if (!isRecord(value)) return false
  if (value.schemaVersion !== 2 || !isString(value.appVersion) || !isString(value.id) || !isString(value.title) || !isString(value.logline)) return false
  if (!isRecord(value.settings) || !isTheme(value.settings.theme) || !isRecord(value.styleDNA)) return false
  const style = value.styleDNA
  if (![style.genre, style.aspectRatio, style.capture, style.cameraLanguage, style.lightingLanguage, style.palette, style.texture].every(isString) || !isStringArray(style.negativeRules)) return false
  if (!Array.isArray(value.assets) || value.assets.length === 0 || !value.assets.every(hasBaseAsset)) return false
  if (!Array.isArray(value.scenes) || value.scenes.length === 0 || !value.scenes.every(isScene)) return false
  return isString(value.updatedAt)
}

export function parseFrameBibleProject(value: unknown): Project | null {
  if (isFrameBibleProject(value)) return normalizeOrders(value)
  const migrated = migrateV1(value)
  return migrated && isFrameBibleProject(migrated) ? normalizeOrders(migrated) : null
}

function normalizeOrders(project: Project): Project {
  return {
    ...project,
    appVersion: APP_VERSION,
    assets: project.assets.map((asset) => hydrateReferences(asset)),
    scenes: [...project.scenes]
      .sort((a, b) => a.order - b.order)
      .map((scene, sceneIndex) => {
        const normalized: Scene = {
          ...scene,
          order: sceneIndex + 1,
          weather: scene.weather ?? '',
          propStates: scene.propStates ?? scene.propIds.map((propId) => ({ propId, presence: 'present' as const, condition: '' })),
          transitionEvents: scene.transitionEvents ?? [],
          spatialTransitions: scene.spatialTransitions ?? [],
          shots: [...scene.shots].sort((a, b) => a.order - b.order).map((shot, shotIndex) => ({ ...shot, order: shotIndex + 1, entrySide: shot.entrySide ?? 'none', exitSide: shot.exitSide ?? 'none' }))
        }
        const geography = ensureSceneGeography(normalized, project.styleDNA.aspectRatio)
        const hydratedGeography = geography.background
          ? { ...geography, background: { ...geography.background, reference: hydrateReference(geography.background.reference) } }
          : geography
        return { ...normalized, geography: hydratedGeography }
      })
  }
}

function hydrateReference(reference: ReferenceImage): ReferenceImage {
  const meta = dataUrlMeta(reference.dataUrl)
  return { ...reference, mimeType: reference.mimeType ?? meta.mimeType, bytes: reference.bytes ?? meta.bytes }
}

function hydrateReferences(asset: Asset): Asset {
  if (asset.type !== 'character') return { ...asset, references: asset.references.map(hydrateReference) }
  return { ...asset, references: asset.references.map(hydrateReference), variants: asset.variants.map((variant) => ({ ...variant, wetState: variant.wetState ?? 'unspecified', injuryState: variant.injuryState ?? '', references: variant.references.map(hydrateReference) })) }
}

function migrateV1(value: unknown): Project | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !Array.isArray(value.assets) || !Array.isArray(value.scenes)) return null
  try {
    const rawAssets = value.assets
    const migratedAssets = rawAssets.map((raw) => migrateAssetV1(raw)).filter((asset): asset is Asset => Boolean(asset))
    if (!migratedAssets.length || migratedAssets.length !== rawAssets.length) return null

    const characterMap = new Map(migratedAssets.filter((asset): asset is CharacterAsset => asset.type === 'character').map((asset) => [asset.id, asset]))
    const migratedScenes = value.scenes.map((raw, index) => migrateSceneV1(raw, index + 1, characterMap)).filter((scene): scene is Scene => Boolean(scene))
    if (!migratedScenes.length || migratedScenes.length !== value.scenes.length) return null

    const candidate: Project = {
      id: isString(value.id) ? value.id : `project-${crypto.randomUUID()}`,
      schemaVersion: 2,
      appVersion: APP_VERSION,
      title: isString(value.title) ? value.title : 'Imported Project',
      logline: isString(value.logline) ? value.logline : '',
      styleDNA: isRecord(value.styleDNA) ? {
        genre: isString(value.styleDNA.genre) ? value.styleDNA.genre : '',
        aspectRatio: isString(value.styleDNA.aspectRatio) ? value.styleDNA.aspectRatio : '16:9',
        capture: isString(value.styleDNA.capture) ? value.styleDNA.capture : '',
        cameraLanguage: isString(value.styleDNA.cameraLanguage) ? value.styleDNA.cameraLanguage : '',
        lightingLanguage: isString(value.styleDNA.lightingLanguage) ? value.styleDNA.lightingLanguage : '',
        palette: isString(value.styleDNA.palette) ? value.styleDNA.palette : '',
        texture: isString(value.styleDNA.texture) ? value.styleDNA.texture : '',
        negativeRules: isStringArray(value.styleDNA.negativeRules) ? value.styleDNA.negativeRules : []
      } : { genre: '', aspectRatio: '16:9', capture: '', cameraLanguage: '', lightingLanguage: '', palette: '', texture: '', negativeRules: [] },
      assets: migratedAssets,
      scenes: migratedScenes,
      settings: isRecord(value.settings) && isTheme(value.settings.theme) ? { theme: value.settings.theme } : { theme: 'system' },
      updatedAt: isString(value.updatedAt) ? value.updatedAt : new Date().toISOString()
    }
    return candidate
  } catch {
    return null
  }
}

function migrateReferences(raw: unknown): ReferenceImage[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item) => isRecord(item) && isString(item.id) && isString(item.name)).map((item) => ({
    id: String(item.id),
    name: String(item.name),
    dataUrl: isString(item.dataUrl) ? item.dataUrl : undefined,
    ...dataUrlMeta(isString(item.dataUrl) ? item.dataUrl : undefined)
  }))
}

function migrateAssetV1(raw: unknown): Asset | null {
  if (!isRecord(raw) || !isString(raw.id) || !isString(raw.name) || !isString(raw.type) || !['character', 'location', 'prop'].includes(raw.type)) return null
  const base = {
    id: raw.id,
    type: raw.type as Asset['type'],
    name: raw.name,
    description: isString(raw.description) ? raw.description : '',
    tags: isStringArray(raw.tags) ? raw.tags : [],
    lockedFields: isStringArray(raw.lockedFields) ? raw.lockedFields : [],
    references: migrateReferences(raw.references)
  }
  if (raw.type === 'location') return { ...base, type: 'location', timeOfDay: isString(raw.timeOfDay) ? raw.timeOfDay : '', lighting: isString(raw.lighting) ? raw.lighting : '', architecture: isString(raw.architecture) ? raw.architecture : '' }
  if (raw.type === 'prop') return { ...base, type: 'prop', appearance: isString(raw.appearance) ? raw.appearance : '' }

  const identity = isRecord(raw.identityDNA) ? raw.identityDNA : {}
  const variants: CharacterVariant[] = []
  const wardrobes = Array.isArray(raw.wardrobeVariants) ? raw.wardrobeVariants : []
  const states = Array.isArray(raw.stateVariants) ? raw.stateVariants : []
  for (const item of wardrobes) if (isRecord(item) && isString(item.id) && isString(item.name)) variants.push({ id: item.id, name: item.name, description: isString(item.description) ? item.description : '', wardrobe: isString(item.description) ? item.description : '', physicalState: '', hairMakeup: '', ageAppearance: '', references: [] })
  for (const item of states) if (isRecord(item) && isString(item.id) && isString(item.name)) variants.push({ id: item.id, name: item.name, description: isString(item.description) ? item.description : '', wardrobe: '', physicalState: isString(item.description) ? item.description : '', hairMakeup: '', ageAppearance: '', references: [] })

  return {
    ...base,
    type: 'character',
    identityDNA: {
      apparentAge: isString(identity.apparentAge) ? identity.apparentAge : '',
      face: isString(identity.face) ? identity.face : '',
      hair: isString(identity.hair) ? identity.hair : '',
      build: isString(identity.build) ? identity.build : '',
      distinguishingFeatures: isString(identity.distinguishingFeatures) ? identity.distinguishingFeatures : ''
    },
    defaultWardrobe: isString(raw.defaultWardrobe) ? raw.defaultWardrobe : '',
    variants
  }
}

function migrateSceneV1(raw: unknown, order: number, characterMap: Map<string, CharacterAsset>): Scene | null {
  if (!isRecord(raw) || !isString(raw.id) || !Array.isArray(raw.shots) || raw.shots.length === 0) return null
  const bindings = Array.isArray(raw.characterBindings) ? raw.characterBindings : []
  const characterBindings = bindings.filter(isRecord).filter((item) => isString(item.characterId)).map((item) => {
    const characterId = String(item.characterId)
    const character = characterMap.get(characterId)
    const wardrobeId = isString(item.wardrobeVariantId) ? item.wardrobeVariantId : undefined
    const stateId = isString(item.stateVariantId) ? item.stateVariantId : undefined
    let variantId = wardrobeId ?? stateId
    if (character && wardrobeId && stateId && wardrobeId !== stateId) {
      const wardrobe = character.variants.find((variant) => variant.id === wardrobeId)
      const state = character.variants.find((variant) => variant.id === stateId)
      const combinedId = `variant-migrated-${wardrobeId}-${stateId}`
      if (!character.variants.some((variant) => variant.id === combinedId)) character.variants.push({
        id: combinedId,
        name: [wardrobe?.name, state?.name].filter(Boolean).join(' + ') || 'Migrated Variant',
        description: [wardrobe?.description, state?.description].filter(Boolean).join(' '),
        wardrobe: wardrobe?.wardrobe ?? '',
        physicalState: state?.physicalState ?? '',
        wetState: 'unspecified',
        injuryState: '',
        hairMakeup: '',
        ageAppearance: '',
        references: []
      })
      variantId = combinedId
    }
    return { characterId, ...(variantId ? { variantId } : {}) }
  })

  const shots = raw.shots.map((shot, index) => migrateShotV1(shot, index + 1)).filter((shot): shot is Shot => Boolean(shot))
  if (!shots.length) return null
  return {
    id: raw.id,
    order: isNumber(raw.order) ? raw.order : order,
    title: isString(raw.title) ? raw.title : `Scene ${order}`,
    purpose: isString(raw.purpose) ? raw.purpose : '',
    emotionalBeat: isString(raw.emotionalBeat) ? raw.emotionalBeat : '',
    durationSec: isNumber(raw.durationSec) ? raw.durationSec : shots.reduce((sum, shot) => sum + shot.durationSec, 0),
    timeOfDay: isString(raw.timeOfDay) ? raw.timeOfDay : '',
    weather: '',
    locationId: isString(raw.locationId) ? raw.locationId : undefined,
    characterBindings,
    propIds: isStringArray(raw.propIds) ? raw.propIds : [],
    propStates: isStringArray(raw.propIds) ? raw.propIds.map((propId) => ({ propId, presence: 'present', condition: '' })) : [],
    transitionEvents: [],
    shots
  }
}

function migrateShotV1(raw: unknown, order: number): Shot | null {
  if (!isRecord(raw) || !isString(raw.id)) return null
  return {
    id: raw.id,
    order: isNumber(raw.order) ? raw.order : order,
    title: isString(raw.title) ? raw.title : `Shot ${order}`,
    durationSec: isNumber(raw.durationSec) ? raw.durationSec : 4,
    framing: isString(raw.framing) ? raw.framing : 'medium wide',
    focalLength: isString(raw.focalLength) ? raw.focalLength : '35mm',
    cameraHeight: isString(raw.cameraHeight) ? raw.cameraHeight : 'eye level',
    cameraMovement: isString(raw.cameraMovement) ? raw.cameraMovement : 'static',
    blocking: isString(raw.blocking) ? raw.blocking : '',
    action: isString(raw.action) ? raw.action : '',
    lighting: isString(raw.lighting) ? raw.lighting : 'inherit location lighting',
    audio: isString(raw.audio) ? raw.audio : '',
    screenDirection: ['left-to-right', 'right-to-left', 'neutral'].includes(String(raw.screenDirection)) ? raw.screenDirection as Shot['screenDirection'] : 'neutral',
    entrySide: ['left', 'right', 'center', 'none'].includes(String(raw.entrySide)) ? raw.entrySide as Shot['entrySide'] : 'none',
    exitSide: ['left', 'right', 'center', 'none'].includes(String(raw.exitSide)) ? raw.exitSide as Shot['exitSide'] : 'none',
    locationOverrideId: isString(raw.locationOverrideId) ? raw.locationOverrideId : undefined
  }
}
