import { create } from 'zustand'
import { createAsset, createCharacterVariant, createScene, createShot, duplicateShot as cloneShot } from '../core/factories'
import { materializeAIStoryDraft } from '../core/applyAIStoryDraft'
import { clamp01, createSpatialZone, ensureSceneGeography, findSnapZone, normalizeDeg, normalizeSpatialZone, parseFocalLengthMm, zoneAtPoint } from '../core/geography'
import type { AIStoryDraft } from '../ai/story'
import { sampleProject } from '../data/sampleProject'
import {
  APP_VERSION,
  type Asset,
  type AssetType,
  type BoardBackgroundReference,
  type CharacterPlacement,
  type CharacterVariant,
  type ContinuityTransitionEvent,
  type Project,
  type PropPlacement,
  type ReferenceImage,
  type Scene,
  type ShotCameraPlacement,
  type SpatialTransitionEvent,
  type SpatialZone,
  type SpatialZoneKind,
  type StyleDNA,
  type ThemePreference,
  type ViewKey
} from '../core/types'

const HISTORY_LIMIT = 50
const MERGE_WINDOW_MS = 900

export interface HistoryDisplayItem {
  id: string
  label: string
  timestamp: number
}

interface HistorySnapshot extends HistoryDisplayItem {
  project: Project
  mergeKey?: string
}

interface ProjectState {
  project: Project
  activeView: ViewKey
  selectedSceneId: string
  selectedShotId: string
  selectedAssetId: string
  historyPast: HistorySnapshot[]
  historyFuture: HistorySnapshot[]
  setActiveView: (view: ViewKey) => void
  setTheme: (theme: ThemePreference) => void
  setProject: (project: Project) => void
  undo: () => void
  redo: () => void
  updateProjectMeta: (patch: Partial<Pick<Project, 'title' | 'logline'>>) => void
  updateStyleDNA: (patch: Partial<StyleDNA>) => void
  selectScene: (sceneId: string) => void
  selectShot: (sceneId: string, shotId: string) => void
  selectAsset: (assetId: string) => void
  addAsset: (type: AssetType) => string
  updateAsset: (assetId: string, patch: Partial<Asset>) => void
  deleteAsset: (assetId: string) => void
  addReference: (assetId: string, reference: ReferenceImage) => void
  removeReference: (assetId: string, referenceId: string) => void
  addVariant: (characterId: string) => string
  duplicateVariant: (characterId: string, variantId: string) => string
  updateVariant: (characterId: string, variantId: string, patch: Partial<CharacterVariant>) => void
  deleteVariant: (characterId: string, variantId: string) => void
  addVariantReference: (characterId: string, variantId: string, reference: ReferenceImage) => void
  removeVariantReference: (characterId: string, variantId: string, referenceId: string) => void
  addScene: () => string
  updateScene: (sceneId: string, patch: Partial<Scene>) => void
  deleteScene: (sceneId: string) => void
  moveScene: (sceneId: string, delta: -1 | 1) => void
  addTransitionEvent: (sceneId: string, event: Omit<ContinuityTransitionEvent, 'id'>) => string
  removeTransitionEvent: (sceneId: string, eventId: string) => void
  applyAIStoryDraft: (draft: AIStoryDraft) => void
  addShot: (sceneId: string) => string
  duplicateShot: (sceneId: string, shotId: string) => string
  deleteShot: (sceneId: string, shotId: string) => void
  reorderShots: (sceneId: string, draggedShotId: string, targetShotId: string) => void
  moveShot: (sceneId: string, shotId: string, delta: -1 | 1) => void
  updateShot: (sceneId: string, shotId: string, patch: Partial<Project['scenes'][number]['shots'][number]>) => void
  updateCharacterPlacement: (sceneId: string, characterId: string, patch: Partial<CharacterPlacement>) => void
  snapCharacterPlacement: (sceneId: string, characterId: string, x: number, y: number) => void
  updatePropPlacement: (sceneId: string, propId: string, patch: Partial<PropPlacement>) => void
  snapPropPlacement: (sceneId: string, propId: string, x: number, y: number) => void
  updateShotCamera: (sceneId: string, shotId: string, patch: Partial<ShotCameraPlacement>) => void
  snapShotCamera: (sceneId: string, shotId: string, x: number, y: number) => void
  setSceneBackground: (sceneId: string, reference: ReferenceImage) => void
  updateSceneBackground: (sceneId: string, patch: Partial<Omit<BoardBackgroundReference, 'reference'>>) => void
  removeSceneBackground: (sceneId: string) => void
  addSpatialZone: (sceneId: string, kind: SpatialZoneKind) => string
  updateSpatialZone: (sceneId: string, zoneId: string, patch: Partial<Omit<SpatialZone, 'id'>>) => void
  removeSpatialZone: (sceneId: string, zoneId: string) => void
  addSpatialTransition: (sceneId: string, event: Omit<SpatialTransitionEvent, 'id'>) => string
  updateSpatialTransition: (sceneId: string, eventId: string, patch: Partial<Omit<SpatialTransitionEvent, 'id'>>) => void
  removeSpatialTransition: (sceneId: string, eventId: string) => void
  resetSceneGeography: (sceneId: string) => void
  toggleAssetLock: (assetId: string, field: string) => void
}

function touch(project: Project): Project {
  return { ...project, appVersion: APP_VERSION, schemaVersion: 2, updatedAt: new Date().toISOString() }
}

function normalizeShots(shots: Scene['shots']): Scene['shots'] {
  return shots.map((shot, index) => ({ ...shot, order: index + 1 }))
}

function normalizeScenes(scenes: Scene[]): Scene[] {
  return scenes.map((scene, index) => ({ ...scene, order: index + 1 }))
}

function historyId() {
  return `history-${crypto.randomUUID()}`
}

function trimHistory(entries: HistorySnapshot[]): HistorySnapshot[] {
  return entries.length > HISTORY_LIMIT ? entries.slice(entries.length - HISTORY_LIMIT) : entries
}

function mergeKeyFor(prefix: string, patch: object): string | undefined {
  const keys = Object.keys(patch).sort()
  return keys.length === 1 ? `${prefix}:${keys[0]}` : undefined
}

function withHistory(
  state: ProjectState,
  patch: Partial<ProjectState> & { project: Project },
  label: string,
  mergeKey?: string
): Partial<ProjectState> {
  if (patch.project === state.project) return patch
  const timestamp = Date.now()
  const last = state.historyPast.at(-1)
  const canMerge = Boolean(
    mergeKey
    && state.historyFuture.length === 0
    && last?.mergeKey === mergeKey
    && timestamp - last.timestamp <= MERGE_WINDOW_MS
  )

  const historyPast = canMerge && last
    ? [...state.historyPast.slice(0, -1), { ...last, label, timestamp }]
    : trimHistory([...state.historyPast, { id: historyId(), label, timestamp, project: state.project, mergeKey }])

  return { ...patch, historyPast, historyFuture: [] }
}

function restoreSnapshot(snapshot: Project, currentTheme: ThemePreference): Project {
  return {
    ...snapshot,
    appVersion: APP_VERSION,
    schemaVersion: 2,
    settings: { ...snapshot.settings, theme: currentTheme },
    updatedAt: new Date().toISOString()
  }
}

function selectionPatch(project: Project, state: Pick<ProjectState, 'selectedAssetId' | 'selectedSceneId' | 'selectedShotId'>) {
  const selectedAssetId = project.assets.some((asset) => asset.id === state.selectedAssetId) ? state.selectedAssetId : project.assets[0]?.id ?? ''
  const selectedScene = project.scenes.find((scene) => scene.id === state.selectedSceneId) ?? project.scenes[0]
  const selectedSceneId = selectedScene?.id ?? ''
  const selectedShotId = selectedScene?.shots.some((shot) => shot.id === state.selectedShotId)
    ? state.selectedShotId
    : selectedScene?.shots[0]?.id ?? ''
  return { selectedAssetId, selectedSceneId, selectedShotId }
}

function assetName(state: ProjectState, assetId: string) {
  return state.project.assets.find((asset) => asset.id === assetId)?.name ?? '자산'
}

function sceneName(state: ProjectState, sceneId: string) {
  return state.project.scenes.find((scene) => scene.id === sceneId)?.title ?? 'Scene'
}

function generationReferenceIdsForAsset(asset: Asset | undefined): Set<string> {
  const ids = new Set<string>()
  if (!asset) return ids
  for (const reference of asset.references) ids.add(reference.id)
  if (asset.type === 'character') for (const variant of asset.variants) for (const reference of variant.references) ids.add(reference.id)
  return ids
}

function cleanGenerationReferences(scene: Scene, removedIds: Set<string>): Scene {
  if (!scene.generation || removedIds.size === 0) return scene
  let changed = false
  const generation = { ...scene.generation }
  for (const model of ['seedance', 'veo', 'kling'] as const) {
    const current = generation[model]
    if (!current) continue
    const referenceImageIds = current.referenceImageIds.filter((id) => !removedIds.has(id))
    let firstFrameReferenceId = current.firstFrameReferenceId
    let lastFrameReferenceId = current.lastFrameReferenceId
    let frameMode = current.frameMode
    if (firstFrameReferenceId && removedIds.has(firstFrameReferenceId)) {
      firstFrameReferenceId = undefined
      lastFrameReferenceId = undefined
      frameMode = 'prompt-only'
    } else if (lastFrameReferenceId && removedIds.has(lastFrameReferenceId)) {
      lastFrameReferenceId = undefined
      frameMode = firstFrameReferenceId ? 'first-image' : 'prompt-only'
    }
    if (referenceImageIds.length !== current.referenceImageIds.length || firstFrameReferenceId !== current.firstFrameReferenceId || lastFrameReferenceId !== current.lastFrameReferenceId || frameMode !== current.frameMode) {
      changed = true
      generation[model] = { ...current, referenceImageIds, firstFrameReferenceId, lastFrameReferenceId, frameMode }
    }
  }
  return changed ? { ...scene, generation } : scene
}

export const useProjectStore = create<ProjectState>((set) => ({
  project: sampleProject,
  activeView: 'assets',
  selectedSceneId: sampleProject.scenes[0].id,
  selectedShotId: sampleProject.scenes[0].shots[0].id,
  selectedAssetId: sampleProject.assets[0].id,
  historyPast: [],
  historyFuture: [],

  setActiveView: (activeView) => set({ activeView }),
  setTheme: (theme) => set((state) => ({ project: touch({ ...state.project, settings: { ...state.project.settings, theme } }) })),
  setProject: (project) => set({
    project: { ...project, appVersion: APP_VERSION },
    selectedAssetId: project.assets[0]?.id ?? '',
    selectedSceneId: project.scenes[0]?.id ?? '',
    selectedShotId: project.scenes[0]?.shots[0]?.id ?? '',
    historyPast: [],
    historyFuture: []
  }),

  undo: () => set((state) => {
    const entry = state.historyPast.at(-1)
    if (!entry) return state
    const project = restoreSnapshot(entry.project, state.project.settings.theme)
    const future = trimHistory([...state.historyFuture, {
      id: historyId(),
      label: entry.label,
      timestamp: Date.now(),
      project: state.project,
      mergeKey: entry.mergeKey
    }])
    return {
      project,
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: future,
      ...selectionPatch(project, state)
    }
  }),

  redo: () => set((state) => {
    const entry = state.historyFuture.at(-1)
    if (!entry) return state
    const project = restoreSnapshot(entry.project, state.project.settings.theme)
    const past = trimHistory([...state.historyPast, {
      id: historyId(),
      label: entry.label,
      timestamp: Date.now(),
      project: state.project,
      mergeKey: entry.mergeKey
    }])
    return {
      project,
      historyPast: past,
      historyFuture: state.historyFuture.slice(0, -1),
      ...selectionPatch(project, state)
    }
  }),

  updateProjectMeta: (patch) => set((state) => withHistory(
    state,
    { project: touch({ ...state.project, ...patch }) },
    Object.prototype.hasOwnProperty.call(patch, 'title') ? '프로젝트 제목 수정' : '로그라인 수정',
    mergeKeyFor('project', patch)
  )),

  updateStyleDNA: (patch) => set((state) => {
    const styleDNA = { ...state.project.styleDNA, ...patch }
    const scenes = patch.aspectRatio
      ? state.project.scenes.map((scene) => {
        const geography = ensureSceneGeography(scene, patch.aspectRatio)
        return { ...scene, geography: { ...geography, stageAspectRatio: patch.aspectRatio! } }
      })
      : state.project.scenes
    return withHistory(
      state,
      { project: touch({ ...state.project, styleDNA, scenes }) },
      'Style DNA 수정',
      mergeKeyFor('style', patch)
    )
  }),

  selectScene: (selectedSceneId) => set((state) => ({
    selectedSceneId,
    selectedShotId: state.project.scenes.find((scene) => scene.id === selectedSceneId)?.shots[0]?.id ?? ''
  })),
  selectShot: (selectedSceneId, selectedShotId) => set({ selectedSceneId, selectedShotId }),
  selectAsset: (selectedAssetId) => set({ selectedAssetId }),

  addAsset: (type) => {
    const asset = createAsset(type)
    set((state) => withHistory(
      state,
      { project: touch({ ...state.project, assets: [...state.project.assets, asset] }), selectedAssetId: asset.id },
      `${asset.name} 추가`
    ))
    return asset.id
  },

  updateAsset: (assetId, patch) => set((state) => withHistory(
    state,
    { project: touch({ ...state.project, assets: state.project.assets.map((asset) => asset.id === assetId ? ({ ...asset, ...patch } as Asset) : asset) }) },
    `${assetName(state, assetId)} 수정`,
    mergeKeyFor(`asset:${assetId}`, patch)
  )),

  deleteAsset: (assetId) => set((state) => {
    if (state.project.assets.length <= 1) return state
    const deletedName = assetName(state, assetId)
    const removedReferenceIds = generationReferenceIdsForAsset(state.project.assets.find((asset) => asset.id === assetId))
    const assets = state.project.assets.filter((asset) => asset.id !== assetId)
    const scenes = state.project.scenes.map((scene) => {
      const generationCleaned = cleanGenerationReferences(scene, removedReferenceIds)
      const cleaned: Scene = {
        ...generationCleaned,
        locationId: scene.locationId === assetId ? undefined : scene.locationId,
        characterBindings: scene.characterBindings.filter((binding) => binding.characterId !== assetId),
        propIds: scene.propIds.filter((id) => id !== assetId),
        propStates: (scene.propStates ?? []).filter((propState) => propState.propId !== assetId).map((propState) => propState.ownerCharacterId === assetId ? { ...propState, ownerCharacterId: undefined } : propState),
        transitionEvents: (scene.transitionEvents ?? []).filter((event) => event.subjectId !== assetId).map((event) => ({
          ...event,
          from: event.from === assetId ? undefined : event.from,
          to: event.to === assetId ? undefined : event.to
        })),
        spatialTransitions: (scene.spatialTransitions ?? []).filter((event) => event.subjectId !== assetId)
      }
      return { ...cleaned, geography: ensureSceneGeography(cleaned, state.project.styleDNA.aspectRatio) }
    })
    const project = touch({ ...state.project, assets, scenes })
    return withHistory(state, {
      project,
      selectedAssetId: state.selectedAssetId === assetId ? assets[0]?.id ?? '' : state.selectedAssetId
    }, `${deletedName} 삭제`)
  }),

  addReference: (assetId, reference) => set((state) => withHistory(
    state,
    { project: touch({ ...state.project, assets: state.project.assets.map((asset) => asset.id === assetId ? { ...asset, references: [...asset.references, reference] } : asset) }) },
    `${assetName(state, assetId)} 레퍼런스 추가`
  )),

  removeReference: (assetId, referenceId) => set((state) => withHistory(
    state,
    { project: touch({
      ...state.project,
      assets: state.project.assets.map((asset) => asset.id === assetId ? { ...asset, references: asset.references.filter((ref) => ref.id !== referenceId) } : asset),
      scenes: state.project.scenes.map((scene) => cleanGenerationReferences(scene, new Set([referenceId])))
    }) },
    `${assetName(state, assetId)} 레퍼런스 삭제`
  )),

  addVariant: (characterId) => {
    const variant = createCharacterVariant()
    set((state) => withHistory(state, {
      project: touch({ ...state.project, assets: state.project.assets.map((asset) => asset.id === characterId && asset.type === 'character' ? { ...asset, variants: [...asset.variants, variant] } : asset) })
    }, `${assetName(state, characterId)} Variant 추가`))
    return variant.id
  },

  duplicateVariant: (characterId, variantId) => {
    let newId = ''
    set((state) => {
      const assets = state.project.assets.map((asset) => {
        if (asset.id !== characterId || asset.type !== 'character') return asset
        const source = asset.variants.find((variant) => variant.id === variantId)
        if (!source) return asset
        const copy = createCharacterVariant(`${source.name} copy`)
        newId = copy.id
        return { ...asset, variants: [...asset.variants, { ...copy, description: source.description, wardrobe: source.wardrobe, physicalState: source.physicalState, wetState: source.wetState ?? 'unspecified', injuryState: source.injuryState ?? '', hairMakeup: source.hairMakeup, ageAppearance: source.ageAppearance, references: [...source.references] }] }
      })
      if (!newId) return state
      return withHistory(state, { project: touch({ ...state.project, assets }) }, `${assetName(state, characterId)} Variant 복제`)
    })
    return newId
  },

  updateVariant: (characterId, variantId, patch) => set((state) => withHistory(
    state,
    { project: touch({ ...state.project, assets: state.project.assets.map((asset) => asset.id === characterId && asset.type === 'character' ? { ...asset, variants: asset.variants.map((variant) => variant.id === variantId ? { ...variant, ...patch } : variant) } : asset) }) },
    `${assetName(state, characterId)} Variant 수정`,
    mergeKeyFor(`variant:${characterId}:${variantId}`, patch)
  )),

  deleteVariant: (characterId, variantId) => set((state) => {
    const character = state.project.assets.find((asset) => asset.id === characterId && asset.type === 'character')
    const variant = character?.type === 'character' ? character.variants.find((item) => item.id === variantId) : undefined
    const removedReferenceIds = new Set((variant?.references ?? []).map((reference) => reference.id))
    return withHistory(state, {
      project: touch({
        ...state.project,
        assets: state.project.assets.map((asset) => asset.id === characterId && asset.type === 'character' ? { ...asset, variants: asset.variants.filter((item) => item.id !== variantId) } : asset),
        scenes: state.project.scenes.map((scene) => {
          const cleaned = cleanGenerationReferences(scene, removedReferenceIds)
          return {
            ...cleaned,
            characterBindings: cleaned.characterBindings.map((binding) => binding.characterId === characterId && binding.variantId === variantId ? { characterId: binding.characterId } : binding),
            transitionEvents: (cleaned.transitionEvents ?? []).filter((event) => !(event.subjectId === characterId && (event.from === variantId || event.to === variantId)))
          }
        })
      })
    }, `${assetName(state, characterId)} Variant 삭제`)
  }),

  addVariantReference: (characterId, variantId, reference) => set((state) => withHistory(state, {
    project: touch({ ...state.project, assets: state.project.assets.map((asset) => asset.id === characterId && asset.type === 'character' ? { ...asset, variants: asset.variants.map((variant) => variant.id === variantId ? { ...variant, references: [...variant.references, reference] } : variant) } : asset) })
  }, `${assetName(state, characterId)} Variant 레퍼런스 추가`)),

  removeVariantReference: (characterId, variantId, referenceId) => set((state) => withHistory(state, {
    project: touch({
      ...state.project,
      assets: state.project.assets.map((asset) => asset.id === characterId && asset.type === 'character' ? { ...asset, variants: asset.variants.map((variant) => variant.id === variantId ? { ...variant, references: variant.references.filter((reference) => reference.id !== referenceId) } : variant) } : asset),
      scenes: state.project.scenes.map((scene) => cleanGenerationReferences(scene, new Set([referenceId])))
    })
  }, `${assetName(state, characterId)} Variant 레퍼런스 삭제`)),

  addScene: () => {
    let sceneId = ''
    set((state) => {
      const scene = createScene(state.project.scenes.length + 1, state.project.styleDNA.aspectRatio)
      sceneId = scene.id
      return withHistory(state, { project: touch({ ...state.project, scenes: [...state.project.scenes, scene] }), selectedSceneId: scene.id, selectedShotId: scene.shots[0].id }, `${scene.title} 추가`)
    })
    return sceneId
  },

  updateScene: (sceneId, patch) => set((state) => {
    const current = state.project.scenes.find((scene) => scene.id === sceneId)
    if (!current) return state
    let normalizedPatch = patch
    if (patch.propIds) {
      const allowed = new Set(patch.propIds)
      const existing = new Map((current.propStates ?? []).map((propState) => [propState.propId, propState]))
      normalizedPatch = {
        ...patch,
        propStates: patch.propIds.map((propId) => existing.get(propId) ?? { propId, presence: 'present' as const, condition: '' }).filter((propState) => allowed.has(propState.propId))
      }
    }
    return withHistory(
      state,
      { project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene
        const updated = { ...scene, ...normalizedPatch }
        return { ...updated, geography: ensureSceneGeography(updated, state.project.styleDNA.aspectRatio) }
      }) }) },
      `${sceneName(state, sceneId)} 수정`,
      mergeKeyFor(`scene:${sceneId}`, patch)
    )
  }),

  deleteScene: (sceneId) => set((state) => {
    if (state.project.scenes.length <= 1) return state
    const deletedName = sceneName(state, sceneId)
    const scenes = normalizeScenes(state.project.scenes.filter((scene) => scene.id !== sceneId))
    const next = scenes[0]
    return withHistory(state, {
      project: touch({ ...state.project, scenes }),
      selectedSceneId: state.selectedSceneId === sceneId ? next.id : state.selectedSceneId,
      selectedShotId: state.selectedSceneId === sceneId ? next.shots[0]?.id ?? '' : state.selectedShotId
    }, `${deletedName} 삭제`)
  }),

  moveScene: (sceneId, delta) => set((state) => {
    const scenes = [...state.project.scenes].sort((a, b) => a.order - b.order)
    const index = scenes.findIndex((scene) => scene.id === sceneId)
    const nextIndex = index + delta
    if (index < 0 || nextIndex < 0 || nextIndex >= scenes.length) return state
    const [moved] = scenes.splice(index, 1)
    scenes.splice(nextIndex, 0, moved)
    return withHistory(state, { project: touch({ ...state.project, scenes: normalizeScenes(scenes) }) }, `${moved.title} 순서 변경`)
  }),

  addTransitionEvent: (sceneId, event) => {
    let id = ''
    set((state) => {
      const scene = state.project.scenes.find((item) => item.id === sceneId)
      if (!scene) return state
      const existing = (scene.transitionEvents ?? []).find((item) =>
        item.type === event.type
        && item.subjectId === event.subjectId
        && item.from === event.from
        && item.to === event.to
        && item.note.trim() === event.note.trim()
      )
      if (existing) {
        id = existing.id
        return state
      }
      id = `transition-${crypto.randomUUID()}`
      return withHistory(state, {
        project: touch({ ...state.project, scenes: state.project.scenes.map((item) => item.id === sceneId ? { ...item, transitionEvents: [...(item.transitionEvents ?? []), { ...event, id }] } : item) })
      }, `${sceneName(state, sceneId)} 전환 이벤트 추가`)
    })
    return id
  },

  removeTransitionEvent: (sceneId, eventId) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => scene.id === sceneId ? { ...scene, transitionEvents: (scene.transitionEvents ?? []).filter((event) => event.id !== eventId) } : scene) })
  }, `${sceneName(state, sceneId)} 전환 이벤트 삭제`)),

  applyAIStoryDraft: (draft) => set((state) => {
    const scenes = materializeAIStoryDraft(state.project, draft)
    const first = scenes[0]
    return withHistory(state, { project: touch({ ...state.project, logline: draft.logline, scenes }), selectedSceneId: first.id, selectedShotId: first.shots[0]?.id ?? '' }, 'AI 스토리 초안 적용')
  }),

  addShot: (sceneId) => {
    let shotId = ''
    set((state) => {
      const scenes = state.project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene
        const shot = createShot(scene.shots.length + 1)
        shotId = shot.id
        const updated = { ...scene, shots: [...scene.shots, shot] }
        return { ...updated, geography: ensureSceneGeography(updated, state.project.styleDNA.aspectRatio) }
      })
      if (!shotId) return state
      return withHistory(state, { project: touch({ ...state.project, scenes }), selectedSceneId: sceneId, selectedShotId: shotId }, `${sceneName(state, sceneId)} Shot 추가`)
    })
    return shotId
  },

  duplicateShot: (sceneId, shotId) => {
    let newId = ''
    set((state) => {
      const scenes = state.project.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene
        const index = scene.shots.findIndex((shot) => shot.id === shotId)
        if (index < 0) return scene
        const copy = cloneShot(scene.shots[index], index + 2)
        newId = copy.id
        const shots = [...scene.shots]
        shots.splice(index + 1, 0, copy)
        const updated = { ...scene, shots: normalizeShots(shots) }
        const geography = ensureSceneGeography(updated, state.project.styleDNA.aspectRatio)
        const sourceCamera = geography.shotCameras.find((camera) => camera.shotId === shotId)
        return {
          ...updated,
          geography: {
            ...geography,
            shotCameras: geography.shotCameras.map((camera) => camera.shotId === copy.id && sourceCamera
              ? { ...camera, x: Math.min(1, sourceCamera.x + 0.035), y: Math.min(1, sourceCamera.y + 0.025), directionDeg: sourceCamera.directionDeg, focalLengthMm: sourceCamera.focalLengthMm }
              : camera)
          }
        }
      })
      if (!newId) return state
      return withHistory(state, { project: touch({ ...state.project, scenes }), selectedSceneId: sceneId, selectedShotId: newId }, `${sceneName(state, sceneId)} Shot 복제`)
    })
    return newId
  },

  deleteShot: (sceneId, shotId) => set((state) => {
    const scene = state.project.scenes.find((item) => item.id === sceneId)
    if (!scene || scene.shots.length <= 1) return state
    const index = scene.shots.findIndex((shot) => shot.id === shotId)
    const shots = normalizeShots(scene.shots.filter((shot) => shot.id !== shotId))
    const fallback = shots[Math.min(Math.max(index, 0), shots.length - 1)]
    return withHistory(state, {
      project: touch({ ...state.project, scenes: state.project.scenes.map((item) => {
        if (item.id !== sceneId) return item
        const updated = {
          ...item,
          shots,
          spatialTransitions: (item.spatialTransitions ?? []).filter((event) => event.fromShotId !== shotId && event.toShotId !== shotId)
        }
        return { ...updated, geography: ensureSceneGeography(updated, state.project.styleDNA.aspectRatio) }
      }) }),
      selectedShotId: state.selectedShotId === shotId ? fallback.id : state.selectedShotId
    }, `${scene.title} Shot 삭제`)
  }),

  reorderShots: (sceneId, draggedShotId, targetShotId) => set((state) => {
    if (draggedShotId === targetShotId) return state
    let changed = false
    const scenes = state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const from = scene.shots.findIndex((shot) => shot.id === draggedShotId)
      const to = scene.shots.findIndex((shot) => shot.id === targetShotId)
      if (from < 0 || to < 0) return scene
      const shots = [...scene.shots]
      const [moved] = shots.splice(from, 1)
      shots.splice(to, 0, moved)
      changed = true
      return { ...scene, shots: normalizeShots(shots) }
    })
    return changed ? withHistory(state, { project: touch({ ...state.project, scenes }) }, `${sceneName(state, sceneId)} Shot 순서 변경`) : state
  }),

  moveShot: (sceneId, shotId, delta) => set((state) => {
    let changed = false
    const scenes = state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const index = scene.shots.findIndex((shot) => shot.id === shotId)
      const nextIndex = index + delta
      if (index < 0 || nextIndex < 0 || nextIndex >= scene.shots.length) return scene
      const shots = [...scene.shots]
      const [moved] = shots.splice(index, 1)
      shots.splice(nextIndex, 0, moved)
      changed = true
      return { ...scene, shots: normalizeShots(shots) }
    })
    return changed ? withHistory(state, { project: touch({ ...state.project, scenes }) }, `${sceneName(state, sceneId)} Shot 순서 변경`) : state
  }),

  toggleAssetLock: (assetId, field) => set((state) => withHistory(state, {
    project: touch({
      ...state.project,
      assets: state.project.assets.map((asset) => {
        if (asset.id !== assetId) return asset
        const hasLock = asset.lockedFields.includes(field)
        return { ...asset, lockedFields: hasLock ? asset.lockedFields.filter((item) => item !== field) : [...asset.lockedFields, field] }
      })
    })
  }, `${assetName(state, assetId)} Lock 변경`)),

  updateShot: (sceneId, shotId, patch) => set((state) => withHistory(
    state,
    { project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const updated = { ...scene, shots: scene.shots.map((shot) => shot.id === shotId ? { ...shot, ...patch } : shot) }
      const geography = ensureSceneGeography(updated, state.project.styleDNA.aspectRatio)
      const focalLengthMm = patch.focalLength ? parseFocalLengthMm(patch.focalLength) : undefined
      return { ...updated, geography: focalLengthMm ? { ...geography, shotCameras: geography.shotCameras.map((camera) => camera.shotId === shotId ? { ...camera, focalLengthMm } : camera) } : geography }
    }) }) },
    `${sceneName(state, sceneId)} Shot 수정`,
    mergeKeyFor(`shot:${sceneId}:${shotId}`, patch)
  )),

  updateCharacterPlacement: (sceneId, characterId, patch) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      return { ...scene, geography: { ...geography, characterPlacements: geography.characterPlacements.map((item) => {
        if (item.characterId !== characterId) return item
        const x = clamp01(patch.x ?? item.x)
        const y = clamp01(patch.y ?? item.y)
        const zoneId = (patch.x !== undefined || patch.y !== undefined) ? zoneAtPoint(geography, x, y)?.id : (patch.zoneId ?? item.zoneId)
        return { ...item, ...patch, characterId, x, y, facingDeg: normalizeDeg(patch.facingDeg ?? item.facingDeg), zoneId }
      }) } }
    }) })
  }, `${sceneName(state, sceneId)} 캐릭터 블로킹 변경`, `geo:character:${sceneId}:${characterId}:${Object.keys(patch).sort().join('+')}`)),

  snapCharacterPlacement: (sceneId, characterId, x, y) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const snap = findSnapZone(geography, x, y)
      const nextX = snap?.x ?? clamp01(x)
      const nextY = snap?.y ?? clamp01(y)
      const zoneId = snap?.zone.id ?? zoneAtPoint(geography, nextX, nextY)?.id
      return { ...scene, geography: { ...geography, characterPlacements: geography.characterPlacements.map((item) => item.characterId === characterId ? { ...item, x: nextX, y: nextY, zoneId } : item) } }
    }) })
  }, `${sceneName(state, sceneId)} 캐릭터 위치 스냅`, `geo:snap:character:${sceneId}:${characterId}`)),

  updatePropPlacement: (sceneId, propId, patch) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      return { ...scene, geography: { ...geography, propPlacements: geography.propPlacements.map((item) => {
        if (item.propId !== propId) return item
        const x = clamp01(patch.x ?? item.x)
        const y = clamp01(patch.y ?? item.y)
        const zoneId = (patch.x !== undefined || patch.y !== undefined) ? zoneAtPoint(geography, x, y)?.id : (patch.zoneId ?? item.zoneId)
        return { ...item, ...patch, propId, x, y, rotationDeg: normalizeDeg(patch.rotationDeg ?? item.rotationDeg), zoneId }
      }) } }
    }) })
  }, `${sceneName(state, sceneId)} 소품 블로킹 변경`, `geo:prop:${sceneId}:${propId}:${Object.keys(patch).sort().join('+')}`)),

  snapPropPlacement: (sceneId, propId, x, y) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const snap = findSnapZone(geography, x, y)
      const nextX = snap?.x ?? clamp01(x)
      const nextY = snap?.y ?? clamp01(y)
      const zoneId = snap?.zone.id ?? zoneAtPoint(geography, nextX, nextY)?.id
      return { ...scene, geography: { ...geography, propPlacements: geography.propPlacements.map((item) => item.propId === propId ? { ...item, x: nextX, y: nextY, zoneId } : item) } }
    }) })
  }, `${sceneName(state, sceneId)} 소품 위치 스냅`, `geo:snap:prop:${sceneId}:${propId}`)),

  updateShotCamera: (sceneId, shotId, patch) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const focalLengthMm = patch.focalLengthMm === undefined ? undefined : Math.min(400, Math.max(8, parseFocalLengthMm(patch.focalLengthMm)))
      const currentCamera = geography.shotCameras.find((item) => item.shotId === shotId)
      const x = clamp01(patch.x ?? currentCamera?.x ?? 0.5)
      const y = clamp01(patch.y ?? currentCamera?.y ?? 0.5)
      const zoneId = (patch.x !== undefined || patch.y !== undefined) ? zoneAtPoint(geography, x, y)?.id : (patch.zoneId ?? currentCamera?.zoneId)
      return {
        ...scene,
        shots: focalLengthMm ? scene.shots.map((shot) => shot.id === shotId ? { ...shot, focalLength: `${Number(focalLengthMm.toFixed(1))}mm` } : shot) : scene.shots,
        geography: { ...geography, shotCameras: geography.shotCameras.map((item) => {
          if (item.shotId !== shotId) return item
          return {
            ...item,
            ...patch,
            shotId,
            x,
            y,
            zoneId,
            directionDeg: normalizeDeg(patch.directionDeg ?? item.directionDeg),
            focalLengthMm: focalLengthMm ?? item.focalLengthMm
          }
        }) }
      }
    }) })
  }, `${sceneName(state, sceneId)} 카메라 블로킹 변경`, `geo:camera:${sceneId}:${shotId}:${Object.keys(patch).sort().join('+')}`)),

  snapShotCamera: (sceneId, shotId, x, y) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const snap = findSnapZone(geography, x, y)
      const nextX = snap?.x ?? clamp01(x)
      const nextY = snap?.y ?? clamp01(y)
      const zoneId = snap?.zone.id ?? zoneAtPoint(geography, nextX, nextY)?.id
      return { ...scene, geography: { ...geography, shotCameras: geography.shotCameras.map((item) => item.shotId === shotId ? { ...item, x: nextX, y: nextY, zoneId } : item) } }
    }) })
  }, `${sceneName(state, sceneId)} 카메라 위치 스냅`, `geo:snap:camera:${sceneId}:${shotId}`)),

  setSceneBackground: (sceneId, reference) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      return { ...scene, geography: { ...geography, background: { reference, opacity: 0.55, x: 0.5, y: 0.5, scale: 1, rotationDeg: 0, fit: 'contain' } } }
    }) })
  }, `${sceneName(state, sceneId)} 배경 레퍼런스 추가`)),

  updateSceneBackground: (sceneId, patch) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      if (!geography.background) return scene
      const background = {
        ...geography.background,
        ...patch,
        opacity: clamp01(patch.opacity ?? geography.background.opacity),
        x: clamp01(patch.x ?? geography.background.x),
        y: clamp01(patch.y ?? geography.background.y),
        scale: Math.min(4, Math.max(0.25, patch.scale ?? geography.background.scale)),
        rotationDeg: normalizeDeg(patch.rotationDeg ?? geography.background.rotationDeg),
        fit: patch.fit === 'cover' ? 'cover' as const : patch.fit === 'contain' ? 'contain' as const : geography.background.fit
      }
      return { ...scene, geography: { ...geography, background } }
    }) })
  }, `${sceneName(state, sceneId)} 배경 레퍼런스 조정`, `geo:background:${sceneId}:${Object.keys(patch).sort().join('+')}`)),

  removeSceneBackground: (sceneId) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const backgroundReferenceId = geography.background?.reference.id
      const cleaned = backgroundReferenceId ? cleanGenerationReferences(scene, new Set([backgroundReferenceId])) : scene
      const { background: _background, ...rest } = geography
      return { ...cleaned, geography: rest }
    }) })
  }, `${sceneName(state, sceneId)} 배경 레퍼런스 제거`)),


  addSpatialZone: (sceneId, kind) => {
    let zoneId = ''
    set((state) => {
      const scene = state.project.scenes.find((item) => item.id === sceneId)
      if (!scene) return state
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const zone = createSpatialZone(kind, geography.zones?.length ?? 0)
      zoneId = zone.id
      return withHistory(state, {
        project: touch({ ...state.project, scenes: state.project.scenes.map((item) => item.id === sceneId ? { ...item, geography: { ...geography, zones: [...(geography.zones ?? []), zone] } } : item) })
      }, `${sceneName(state, sceneId)} ${zone.name} 영역 추가`)
    })
    return zoneId
  },

  updateSpatialZone: (sceneId, zoneId, patch) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      const currentZone = (geography.zones ?? []).find((zone) => zone.id === zoneId)
      if (!currentZone) return scene
      const nextZone = normalizeSpatialZone({ ...currentZone, ...patch, id: currentZone.id })
      const moved = patch.x !== undefined || patch.y !== undefined
      return { ...scene, geography: {
        ...geography,
        zones: (geography.zones ?? []).map((zone) => zone.id === zoneId ? nextZone : zone),
        characterPlacements: moved ? geography.characterPlacements.map((item) => item.zoneId === zoneId ? { ...item, x: nextZone.x, y: nextZone.y } : item) : geography.characterPlacements,
        propPlacements: moved ? geography.propPlacements.map((item) => item.zoneId === zoneId ? { ...item, x: nextZone.x, y: nextZone.y } : item) : geography.propPlacements,
        shotCameras: moved ? geography.shotCameras.map((item) => item.zoneId === zoneId ? { ...item, x: nextZone.x, y: nextZone.y } : item) : geography.shotCameras
      } }
    }) })
  }, `${sceneName(state, sceneId)} 공간 영역 수정`, mergeKeyFor(`zone:${sceneId}:${zoneId}`, patch))),

  removeSpatialZone: (sceneId, zoneId) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const geography = ensureSceneGeography(scene, state.project.styleDNA.aspectRatio)
      return {
        ...scene,
        geography: { ...geography, zones: (geography.zones ?? []).filter((zone) => zone.id !== zoneId), characterPlacements: geography.characterPlacements.map((item) => item.zoneId === zoneId ? { ...item, zoneId: undefined } : item), propPlacements: geography.propPlacements.map((item) => item.zoneId === zoneId ? { ...item, zoneId: undefined } : item), shotCameras: geography.shotCameras.map((item) => item.zoneId === zoneId ? { ...item, zoneId: undefined } : item) },
        spatialTransitions: (scene.spatialTransitions ?? []).map((event) => ({
          ...event,
          fromZoneId: event.fromZoneId === zoneId ? undefined : event.fromZoneId,
          toZoneId: event.toZoneId === zoneId ? undefined : event.toZoneId
        }))
      }
    }) })
  }, `${sceneName(state, sceneId)} 공간 영역 삭제`)),

  addSpatialTransition: (sceneId, event) => {
    let id = ''
    set((state) => {
      const scene = state.project.scenes.find((item) => item.id === sceneId)
      if (!scene) return state
      const existing = (scene.spatialTransitions ?? []).find((item) =>
        item.subjectType === event.subjectType
        && item.subjectId === event.subjectId
        && item.fromShotId === event.fromShotId
        && item.toShotId === event.toShotId
        && item.fromZoneId === event.fromZoneId
        && item.toZoneId === event.toZoneId
        && item.from.trim() === event.from.trim()
        && item.to.trim() === event.to.trim()
        && item.motion.trim() === event.motion.trim()
        && item.note.trim() === event.note.trim()
      )
      if (existing) { id = existing.id; return state }
      id = `spatial-${crypto.randomUUID()}`
      const next = { ...event, id }
      return withHistory(state, {
        project: touch({ ...state.project, scenes: state.project.scenes.map((item) => item.id === sceneId ? { ...item, spatialTransitions: [...(item.spatialTransitions ?? []), next] } : item) })
      }, `${sceneName(state, sceneId)} 공간 전환 추가`)
    })
    return id
  },

  updateSpatialTransition: (sceneId, eventId, patch) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => scene.id === sceneId ? {
      ...scene,
      spatialTransitions: (scene.spatialTransitions ?? []).map((event) => event.id === eventId ? { ...event, ...patch } : event)
    } : scene) })
  }, `${sceneName(state, sceneId)} 공간 전환 수정`, mergeKeyFor(`spatial:${sceneId}:${eventId}`, patch))),

  removeSpatialTransition: (sceneId, eventId) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => scene.id === sceneId ? { ...scene, spatialTransitions: (scene.spatialTransitions ?? []).filter((event) => event.id !== eventId) } : scene) })
  }, `${sceneName(state, sceneId)} 공간 전환 삭제`)),

  resetSceneGeography: (sceneId) => set((state) => withHistory(state, {
    project: touch({ ...state.project, scenes: state.project.scenes.map((scene) => {
      if (scene.id !== sceneId) return scene
      const background = scene.geography?.background
      const zones = scene.geography?.zones ?? []
      const geography = ensureSceneGeography({ ...scene, geography: undefined }, state.project.styleDNA.aspectRatio)
      return { ...scene, geography: { ...geography, ...(background ? { background } : {}), zones } }
    }) })
  }, `${sceneName(state, sceneId)} Blocking Board 초기화`))
}))
