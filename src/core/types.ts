export const APP_VERSION = '2.0.1' as const

export type ThemePreference = 'system' | 'light' | 'dark'
export type ViewKey = 'dashboard' | 'assets' | 'story' | 'shots' | 'export'
export type AssetType = 'character' | 'location' | 'prop'
export type WetState = 'unspecified' | 'dry' | 'damp' | 'wet' | 'soaked'
export type FrameSide = 'left' | 'right' | 'center' | 'none'
export type GenerationTarget = 'seedance' | 'veo' | 'kling'
export type GenerationAudioPreference = 'auto' | 'on' | 'off'
export type GenerationFrameMode = 'prompt-only' | 'first-image' | 'first-last-images'

export interface SceneGenerationSettings {
  durationSec: number
  aspectRatio: string
  resolution: string
  audio: GenerationAudioPreference
  frameMode: GenerationFrameMode
  firstFrameReferenceId?: string
  lastFrameReferenceId?: string
  referenceImageIds: string[]
}

export type SceneGenerationSettingsByModel = Partial<Record<GenerationTarget, SceneGenerationSettings>>

export interface StyleDNA {
  genre: string
  aspectRatio: string
  capture: string
  cameraLanguage: string
  lightingLanguage: string
  palette: string
  texture: string
  negativeRules: string[]
}

export interface ReferenceImage {
  id: string
  name: string
  dataUrl?: string
  mimeType?: string
  width?: number
  height?: number
  bytes?: number
  originalBytes?: number
  optimized?: boolean
}

export interface BaseAsset {
  id: string
  type: AssetType
  name: string
  description: string
  tags: string[]
  lockedFields: string[]
  references: ReferenceImage[]
}

export interface CharacterVariant {
  id: string
  name: string
  description: string
  wardrobe: string
  physicalState: string
  wetState?: WetState
  injuryState?: string
  hairMakeup: string
  ageAppearance: string
  references: ReferenceImage[]
}

export interface CharacterAsset extends BaseAsset {
  type: 'character'
  identityDNA: {
    apparentAge: string
    face: string
    hair: string
    build: string
    distinguishingFeatures: string
  }
  defaultWardrobe: string
  variants: CharacterVariant[]
}

export interface LocationAsset extends BaseAsset {
  type: 'location'
  timeOfDay: string
  lighting: string
  architecture: string
}

export interface PropAsset extends BaseAsset {
  type: 'prop'
  appearance: string
}

export type Asset = CharacterAsset | LocationAsset | PropAsset

export interface CharacterBinding {
  characterId: string
  variantId?: string
}

export type PropPresence = 'present' | 'absent'

export interface PropContinuityState {
  propId: string
  presence: PropPresence
  ownerCharacterId?: string
  condition: string
}

export type TransitionEventType =
  | 'character-variant'
  | 'character-state'
  | 'wetness'
  | 'injury'
  | 'prop-presence'
  | 'prop-transfer'
  | 'prop-condition'
  | 'location'
  | 'time'
  | 'weather'
  | 'custom'

export interface ContinuityTransitionEvent {
  id: string
  type: TransitionEventType
  subjectId?: string
  from?: string
  to?: string
  note: string
}


export interface ScenePoint {
  x: number
  y: number
}

export interface CharacterPlacement extends ScenePoint {
  characterId: string
  facingDeg: number
  zoneId?: string
}

export interface PropPlacement extends ScenePoint {
  propId: string
  rotationDeg: number
  zoneId?: string
}

export interface ShotCameraPlacement extends ScenePoint {
  shotId: string
  directionDeg: number
  focalLengthMm: number
  zoneId?: string
}

export interface BoardBackgroundReference {
  reference: ReferenceImage
  opacity: number
  x: number
  y: number
  scale: number
  rotationDeg: number
  fit: 'contain' | 'cover'
}

export type SpatialTransitionSubjectType = 'character' | 'prop' | 'camera'
export type SpatialZoneKind = 'doorway' | 'window' | 'table' | 'custom'

export interface SpatialZone {
  id: string
  name: string
  kind: SpatialZoneKind
  x: number
  y: number
  width: number
  height: number
  rotationDeg: number
}

export interface SpatialTransitionEvent {
  id: string
  subjectType: SpatialTransitionSubjectType
  subjectId?: string
  fromShotId?: string
  toShotId?: string
  fromZoneId?: string
  toZoneId?: string
  from: string
  to: string
  motion: string
  note: string
}

export interface SceneGeography {
  stageAspectRatio: string
  background?: BoardBackgroundReference
  zones?: SpatialZone[]
  characterPlacements: CharacterPlacement[]
  propPlacements: PropPlacement[]
  shotCameras: ShotCameraPlacement[]
}

export interface Shot {
  id: string
  order: number
  title: string
  durationSec: number
  framing: string
  focalLength: string
  cameraHeight: string
  cameraMovement: string
  blocking: string
  action: string
  lighting: string
  audio: string
  screenDirection?: 'left-to-right' | 'right-to-left' | 'neutral'
  entrySide?: FrameSide
  exitSide?: FrameSide
  locationOverrideId?: string
}

export interface Scene {
  id: string
  order: number
  title: string
  purpose: string
  emotionalBeat: string
  durationSec: number
  timeOfDay: string
  weather?: string
  locationId?: string
  characterBindings: CharacterBinding[]
  propIds: string[]
  propStates?: PropContinuityState[]
  transitionEvents?: ContinuityTransitionEvent[]
  spatialTransitions?: SpatialTransitionEvent[]
  geography?: SceneGeography
  generation?: SceneGenerationSettingsByModel
  shots: Shot[]
}

export interface ProjectSettings {
  theme: ThemePreference
}

export interface Project {
  id: string
  schemaVersion: 2
  appVersion: string
  title: string
  logline: string
  styleDNA: StyleDNA
  assets: Asset[]
  scenes: Scene[]
  settings: ProjectSettings
  updatedAt: string
}

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface TransitionSuggestion {
  type: TransitionEventType
  subjectId?: string
  from?: string
  to?: string
  note: string
}

export interface ContinuityIssue {
  id: string
  severity: IssueSeverity
  rule: string
  sceneId?: string
  shotId?: string
  title: string
  detail: string
  suggestedTransition?: TransitionSuggestion
}
