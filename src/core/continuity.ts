import type {
  Asset,
  CharacterAsset,
  CharacterBinding,
  ContinuityIssue,
  ContinuityTransitionEvent,
  Project,
  PropContinuityState,
  Scene,
  Shot,
  SpatialTransitionEvent,
  TransitionEventType
} from './types'
import { angularDistance, ensureSceneGeography, placementDistance } from './geography'

const normalize = (value?: string) => (value ?? '').trim().toLowerCase()
const BASE_VARIANT = 'base'

const getAsset = (project: Project, id?: string): Asset | undefined => id ? project.assets.find((asset) => asset.id === id) : undefined
const assetName = (project: Project, id?: string) => getAsset(project, id)?.name ?? (id || 'None')


function weatherFamily(value?: string): string {
  const text = normalize(value)
  if (!text) return ''
  const families: Array<[string, string[]]> = [
    ['rain', ['rain', 'drizzle', 'shower', 'downpour']],
    ['snow', ['snow', 'sleet', 'blizzard']],
    ['storm', ['storm', 'thunder', 'lightning']],
    ['fog', ['fog', 'mist', 'haze']],
    ['cloud', ['cloud', 'overcast']],
    ['clear', ['clear', 'sunny', 'fair']]
  ]
  return families.find(([, terms]) => terms.some((term) => text.includes(term)))?.[0] ?? text
}

function timeContext(value?: string): { label: string; minutes?: number } {
  const text = normalize(value)
  const labels = ['pre-dawn', 'predawn', 'dawn', 'sunrise', 'morning', 'noon', 'afternoon', 'sunset', 'dusk', 'evening', 'night', 'midnight']
  const label = labels.find((item) => text.includes(item)) ?? ''
  const match = /(?:^|\s)([01]?\d|2[0-3]):([0-5]\d)(?:\s|$)/.exec(text)
  return { label, minutes: match ? Number(match[1]) * 60 + Number(match[2]) : undefined }
}

function materiallyDifferentTime(previous?: string, current?: string): boolean {
  if (normalize(previous) === normalize(current)) return false
  const from = timeContext(previous)
  const to = timeContext(current)
  if (from.label && to.label && from.label === to.label) return false
  if (!from.label && !to.label && from.minutes !== undefined && to.minutes !== undefined) {
    const raw = Math.abs(to.minutes - from.minutes)
    const distance = Math.min(raw, 1440 - raw)
    if (distance <= 90) return false
  }
  return true
}

function materiallyDifferentWeather(previous?: string, current?: string): boolean {
  const from = weatherFamily(previous)
  const to = weatherFamily(current)
  if (!from && !to) return false
  return from !== to
}

function eventExplains(
  scene: Scene,
  types: TransitionEventType[],
  subjectId?: string,
  from?: string,
  to?: string
): boolean {
  return (scene.transitionEvents ?? []).some((event) => {
    if (!types.includes(event.type)) return false
    if (subjectId !== undefined && event.subjectId !== subjectId) return false
    if (from !== undefined && event.from !== undefined && normalize(event.from) !== normalize(from)) return false
    if (to !== undefined && event.to !== undefined && normalize(event.to) !== normalize(to)) return false
    return true
  })
}


function spatialEventExplains(
  scene: Scene,
  subjectType: SpatialTransitionEvent['subjectType'],
  subjectId?: string,
  fromShotId?: string,
  toShotId?: string
): boolean {
  return (scene.spatialTransitions ?? []).some((event) => {
    if (event.subjectType !== subjectType) return false
    if (subjectId !== undefined && event.subjectId !== subjectId) return false
    if (fromShotId !== undefined && event.fromShotId !== undefined && event.fromShotId !== fromShotId) return false
    if (toShotId !== undefined && event.toShotId !== undefined && event.toShotId !== toShotId) return false
    return true
  })
}

function validateSpatialTransition(project: Project, scene: Scene, event: SpatialTransitionEvent): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  if (event.subjectType === 'camera') {
    if (event.subjectId) issues.push({ id: `spatial-camera-subject-${event.id}`, severity: 'info', rule: 'spatial-camera-subject-unused', sceneId: scene.id, title: 'Camera transition does not need an asset subject', detail: 'Camera Spatial Transition ignores subjectId.' })
  } else {
    const asset = getAsset(project, event.subjectId)
    if (!asset || asset.type !== event.subjectType) issues.push({ id: `spatial-subject-${event.id}`, severity: 'error', rule: 'spatial-transition-missing-subject', sceneId: scene.id, title: 'Spatial Transition subject is missing', detail: `The ${event.subjectType} transition references an asset that does not exist or has the wrong type.` })
  }
  const shotIds = new Set(scene.shots.map((shot) => shot.id))
  if (event.fromShotId && !shotIds.has(event.fromShotId)) issues.push({ id: `spatial-from-shot-${event.id}`, severity: 'error', rule: 'spatial-transition-missing-shot', sceneId: scene.id, title: 'Spatial Transition start shot is missing', detail: 'The from-shot no longer exists in this scene.' })
  if (event.toShotId && !shotIds.has(event.toShotId)) issues.push({ id: `spatial-to-shot-${event.id}`, severity: 'error', rule: 'spatial-transition-missing-shot', sceneId: scene.id, title: 'Spatial Transition end shot is missing', detail: 'The to-shot no longer exists in this scene.' })
  const zoneIds = new Set(ensureSceneGeography(scene, project.styleDNA.aspectRatio).zones?.map((zone) => zone.id) ?? [])
  if (event.fromZoneId && !zoneIds.has(event.fromZoneId)) issues.push({ id: `spatial-from-zone-${event.id}`, severity: 'error', rule: 'spatial-transition-missing-zone', sceneId: scene.id, title: 'Spatial Transition start zone is missing', detail: 'The from-zone no longer exists on this Blocking Board.' })
  if (event.toZoneId && !zoneIds.has(event.toZoneId)) issues.push({ id: `spatial-to-zone-${event.id}`, severity: 'error', rule: 'spatial-transition-missing-zone', sceneId: scene.id, title: 'Spatial Transition end zone is missing', detail: 'The to-zone no longer exists on this Blocking Board.' })
  return issues
}

function locationLightingConflict(shot: Shot, scene: Scene, project: Project): ContinuityIssue | null {
  if (!scene.locationId || normalize(shot.lighting).startsWith('inherit')) return null
  const location = getAsset(project, scene.locationId)
  if (!location || location.type !== 'location' || !location.lockedFields.includes('lighting')) return null

  const expected = normalize(location.lighting)
  const actual = normalize(shot.lighting)
  const daylightTerms = ['midday', 'daylight', 'sunlight', 'noon']
  const expectedNight = ['night', 'pre-dawn', 'tungsten', 'cyan'].some((term) => expected.includes(term))
  const actualDay = daylightTerms.some((term) => actual.includes(term))

  if (!expectedNight || !actualDay) return null
  return {
    id: `lighting-${shot.id}`,
    severity: 'error',
    rule: 'locked-location-lighting',
    sceneId: scene.id,
    shotId: shot.id,
    title: 'Locked lighting conflict',
    detail: `${location.name} has locked lighting, but “${shot.title}” specifies daylight language.`
  }
}

function variantName(character: CharacterAsset, variantId?: string): string {
  if (!variantId) return 'Base'
  return character.variants.find((variant) => variant.id === variantId)?.name ?? 'Missing Variant'
}

function characterState(character: CharacterAsset, binding: CharacterBinding) {
  const variant = binding.variantId ? character.variants.find((item) => item.id === binding.variantId) : undefined
  return {
    variantId: binding.variantId ?? BASE_VARIANT,
    wardrobe: variant?.wardrobe || character.defaultWardrobe,
    physicalState: variant?.physicalState || '',
    wetState: variant?.wetState ?? 'unspecified',
    injuryState: variant?.injuryState || '',
    hairMakeup: variant?.hairMakeup || '',
    ageAppearance: variant?.ageAppearance || ''
  }
}

function propState(scene: Scene, propId: string): Required<Pick<PropContinuityState, 'propId' | 'presence' | 'condition'>> & Pick<PropContinuityState, 'ownerCharacterId'> {
  const metadata = (scene.propStates ?? []).find((state) => state.propId === propId)
  return {
    propId,
    presence: metadata?.presence ?? (scene.propIds.includes(propId) ? 'present' : 'absent'),
    ownerCharacterId: metadata?.ownerCharacterId,
    condition: metadata?.condition ?? ''
  }
}

function validateTransitionEvent(project: Project, scene: Scene, event: ContinuityTransitionEvent): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const characterTypes: TransitionEventType[] = ['character-variant', 'character-state', 'wetness', 'injury']
  const propTypes: TransitionEventType[] = ['prop-presence', 'prop-transfer', 'prop-condition']

  if (characterTypes.includes(event.type)) {
    const asset = getAsset(project, event.subjectId)
    if (!asset || asset.type !== 'character') issues.push({
      id: `transition-character-${scene.id}-${event.id}`,
      severity: 'error',
      rule: 'transition-missing-character',
      sceneId: scene.id,
      title: 'Transition event has no valid character',
      detail: `“${event.note || event.type}” references a missing character.`
    })
  }

  if (propTypes.includes(event.type)) {
    const asset = getAsset(project, event.subjectId)
    if (!asset || asset.type !== 'prop') issues.push({
      id: `transition-prop-${scene.id}-${event.id}`,
      severity: 'error',
      rule: 'transition-missing-prop',
      sceneId: scene.id,
      title: 'Transition event has no valid prop',
      detail: `“${event.note || event.type}” references a missing prop.`
    })
  }

  if (event.type === 'location' && event.subjectId) {
    const asset = getAsset(project, event.subjectId)
    if (!asset || asset.type !== 'location') issues.push({
      id: `transition-location-${scene.id}-${event.id}`,
      severity: 'error',
      rule: 'transition-missing-location',
      sceneId: scene.id,
      title: 'Transition event has no valid location',
      detail: `“${event.note || event.type}” references a missing location.`
    })
  }

  return issues
}

export function lintProject(project: Project): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const orderedScenes = [...project.scenes].sort((a, b) => a.order - b.order)

  for (const scene of orderedScenes) {
    if (!scene.locationId) issues.push({ id: `missing-location-${scene.id}`, severity: 'warning', rule: 'missing-location-binding', sceneId: scene.id, title: 'Scene location is not bound', detail: `“${scene.title}” has no named location asset.` })

    for (const binding of scene.characterBindings) {
      const character = getAsset(project, binding.characterId)
      if (!character || character.type !== 'character') {
        issues.push({ id: `missing-character-${scene.id}-${binding.characterId}`, severity: 'error', rule: 'missing-character-binding', sceneId: scene.id, title: 'Character reference is missing', detail: `“${scene.title}” references a character that no longer exists.` })
        continue
      }
      if (binding.variantId && !character.variants.some((variant) => variant.id === binding.variantId)) {
        issues.push({ id: `missing-variant-${scene.id}-${binding.characterId}-${binding.variantId}`, severity: 'error', rule: 'missing-character-variant', sceneId: scene.id, title: 'Character Variant is missing', detail: `“${scene.title}” references a deleted or unknown Variant for ${character.name}.` })
      }
    }

    for (const state of scene.propStates ?? []) {
      const prop = getAsset(project, state.propId)
      if (!prop || prop.type !== 'prop') {
        issues.push({ id: `missing-prop-state-${scene.id}-${state.propId}`, severity: 'error', rule: 'missing-prop-state-asset', sceneId: scene.id, title: 'Prop state references a missing asset', detail: `“${scene.title}” contains continuity state for a prop that no longer exists.` })
        continue
      }
      const bound = scene.propIds.includes(state.propId)
      if ((state.presence === 'present') !== bound) issues.push({
        id: `prop-presence-binding-${scene.id}-${state.propId}`,
        severity: 'error',
        rule: 'prop-presence-binding-mismatch',
        sceneId: scene.id,
        title: 'Prop presence conflicts with scene binding',
        detail: `${prop.name} is marked ${state.presence}, but the scene binding says ${bound ? 'present' : 'absent'}.`
      })
      if (state.ownerCharacterId) {
        const owner = getAsset(project, state.ownerCharacterId)
        if (!owner || owner.type !== 'character') issues.push({ id: `prop-owner-missing-${scene.id}-${state.propId}`, severity: 'error', rule: 'prop-owner-missing-character', sceneId: scene.id, title: 'Prop owner is missing', detail: `${prop.name} references a character owner that no longer exists.` })
        else if (!scene.characterBindings.some((binding) => binding.characterId === state.ownerCharacterId)) issues.push({ id: `prop-owner-offscene-${scene.id}-${state.propId}`, severity: 'info', rule: 'prop-owner-not-in-scene', sceneId: scene.id, title: 'Prop owner is not bound to this scene', detail: `${prop.name} is assigned to ${owner.name}, but that character is not present in “${scene.title}”.` })
      }
    }

    for (const event of scene.transitionEvents ?? []) issues.push(...validateTransitionEvent(project, scene, event))
    for (const event of scene.spatialTransitions ?? []) issues.push(...validateSpatialTransition(project, scene, event))

    for (const shot of scene.shots) {
      if (shot.locationOverrideId && shot.locationOverrideId !== scene.locationId) issues.push({ id: `location-override-${shot.id}`, severity: 'warning', rule: 'shot-location-override', sceneId: scene.id, shotId: shot.id, title: 'Shot overrides scene location', detail: `“${shot.title}” uses a different location from its parent scene.` })
      const lightingIssue = locationLightingConflict(shot, scene, project)
      if (lightingIssue) issues.push(lightingIssue)
    }

    const orderedShots = [...scene.shots].sort((a, b) => a.order - b.order)
    for (let index = 1; index < orderedShots.length; index += 1) {
      const previous = orderedShots[index - 1]
      const current = orderedShots[index]
      if (previous.screenDirection && current.screenDirection && previous.screenDirection !== 'neutral' && current.screenDirection !== 'neutral' && previous.screenDirection !== current.screenDirection) {
        issues.push({ id: `screen-direction-${previous.id}-${current.id}`, severity: 'info', rule: 'screen-direction-change', sceneId: scene.id, shotId: current.id, title: 'Screen direction changes', detail: `Direction changes from ${previous.screenDirection} to ${current.screenDirection}. Confirm this is intentional or motivated by an axis change.` })
      }
      if (previous.exitSide && current.entrySide && ['left', 'right'].includes(previous.exitSide) && ['left', 'right'].includes(current.entrySide) && previous.exitSide === current.entrySide) {
        const expected = previous.exitSide === 'left' ? 'right' : 'left'
        issues.push({ id: `entry-exit-${previous.id}-${current.id}`, severity: 'warning', rule: 'entry-exit-side-continuity', sceneId: scene.id, shotId: current.id, title: 'Entry / exit side may break movement continuity', detail: `“${previous.title}” exits frame ${previous.exitSide}, but “${current.title}” enters from the same side. For continuous screen movement, review an entry from ${expected} or motivate an axis reset.` })
      }
    }

    issues.push(...cameraGeographyIssues(project, scene))
  }

  for (let index = 1; index < orderedScenes.length; index += 1) {
    const previous = orderedScenes[index - 1]
    const current = orderedScenes[index]
    issues.push(...characterTransitionIssues(project, previous, current))
    issues.push(...propTransitionIssues(project, previous, current))
    issues.push(...environmentTransitionIssues(project, previous, current))
    issues.push(...geographyTransitionIssues(project, previous, current))
  }

  return issues
}

function cameraGeographyIssues(project: Project, scene: Scene): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
  const cameraByShot = new Map(geography.shotCameras.map((camera) => [camera.shotId, camera]))
  const shots = [...scene.shots].sort((a, b) => a.order - b.order)
  for (let index = 1; index < shots.length; index += 1) {
    const previous = shots[index - 1]
    const current = shots[index]
    const from = cameraByShot.get(previous.id)
    const to = cameraByShot.get(current.id)
    if (!from || !to) continue
    const delta = angularDistance(from.directionDeg, to.directionDeg)
    if (delta >= 150 && !spatialEventExplains(scene, 'camera', undefined, previous.id, current.id)) issues.push({
      id: `camera-axis-${scene.id}-${previous.id}-${current.id}`,
      severity: 'info',
      rule: 'camera-axis-review',
      sceneId: scene.id,
      shotId: current.id,
      title: 'Large camera axis change',
      detail: `Camera direction changes by ${Math.round(delta)}° from “${previous.title}” to “${current.title}”. Review screen direction and motivate an axis reset when needed.`
    })
  }
  return issues
}

function geographyTransitionIssues(project: Project, previous: Scene, current: Scene): ContinuityIssue[] {
  if (!previous.locationId || previous.locationId !== current.locationId) return []
  const issues: ContinuityIssue[] = []
  const from = ensureSceneGeography(previous, project.styleDNA.aspectRatio)
  const to = ensureSceneGeography(current, project.styleDNA.aspectRatio)
  const fromCharacters = new Map(from.characterPlacements.map((item) => [item.characterId, item]))
  const fromProps = new Map(from.propPlacements.map((item) => [item.propId, item]))

  for (const placement of to.characterPlacements) {
    const before = fromCharacters.get(placement.characterId)
    if (!before) continue
    const distance = placementDistance(before, placement)
    if (distance > 0.52 && !spatialEventExplains(current, 'character', placement.characterId, current.shots[0]?.id)) issues.push({
      id: `geography-character-${previous.id}-${current.id}-${placement.characterId}`,
      severity: 'info',
      rule: 'character-geography-jump',
      sceneId: current.id,
      shotId: current.shots[0]?.id,
      title: 'Character position changes substantially',
      detail: `${assetName(project, placement.characterId)} moves across the same location by ${Math.round(distance * 100)}% of the normalized stage diagonal. Confirm the movement is motivated between scenes.`
    })
  }

  for (const placement of to.propPlacements) {
    const before = fromProps.get(placement.propId)
    if (!before) continue
    const distance = placementDistance(before, placement)
    if (distance > 0.45 && !spatialEventExplains(current, 'prop', placement.propId, current.shots[0]?.id)) issues.push({
      id: `geography-prop-${previous.id}-${current.id}-${placement.propId}`,
      severity: 'info',
      rule: 'prop-geography-jump',
      sceneId: current.id,
      shotId: current.shots[0]?.id,
      title: 'Prop position changes substantially',
      detail: `${assetName(project, placement.propId)} changes position significantly within the same location. Confirm somebody moved it or update the Blocking Board.`
    })
  }
  return issues
}

function characterTransitionIssues(project: Project, previous: Scene, current: Scene): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const previousBindings = new Map(previous.characterBindings.map((binding) => [binding.characterId, binding]))

  for (const binding of current.characterBindings) {
    const before = previousBindings.get(binding.characterId)
    if (!before) continue
    const character = getAsset(project, binding.characterId)
    if (!character || character.type !== 'character') continue
    const from = characterState(character, before)
    const to = characterState(character, binding)
    const broadExplained = eventExplains(current, ['character-variant'], character.id, from.variantId, to.variantId)

    if (from.variantId !== to.variantId && !broadExplained) issues.push({
      id: `variant-transition-${previous.id}-${current.id}-${character.id}`,
      severity: 'info',
      rule: 'character-variant-transition',
      sceneId: current.id,
      title: 'Character Variant changes between scenes',
      detail: `${character.name}: ${variantName(character, before.variantId)} → ${variantName(character, binding.variantId)}. Add a transition event if the story explains this change.`,
      suggestedTransition: { type: 'character-variant', subjectId: character.id, from: from.variantId, to: to.variantId, note: `${character.name} changes from ${variantName(character, before.variantId)} to ${variantName(character, binding.variantId)}.` }
    })

    const stateExplained = broadExplained || eventExplains(current, ['character-state'], character.id)
    if (normalize(from.wardrobe) !== normalize(to.wardrobe) && !stateExplained) issues.push(characterFieldIssue(current, character, 'character-wardrobe-transition', 'Wardrobe changes without an event', from.wardrobe || 'Base wardrobe', to.wardrobe || 'Base wardrobe'))
    if (normalize(from.physicalState) !== normalize(to.physicalState) && !stateExplained) issues.push(characterFieldIssue(current, character, 'character-physical-state-transition', 'Physical state changes without an event', from.physicalState || 'Unspecified', to.physicalState || 'Unspecified'))
    if (from.wetState !== to.wetState && !broadExplained && !eventExplains(current, ['wetness'], character.id, from.wetState, to.wetState)) issues.push({
      ...characterFieldIssue(current, character, 'character-wetness-transition', 'Wet/dry state changes without an event', from.wetState, to.wetState),
      suggestedTransition: { type: 'wetness', subjectId: character.id, from: from.wetState, to: to.wetState, note: `${character.name} changes from ${from.wetState} to ${to.wetState}.` }
    })
    if (normalize(from.injuryState) !== normalize(to.injuryState) && !broadExplained && !eventExplains(current, ['injury'], character.id, from.injuryState, to.injuryState)) issues.push({
      ...characterFieldIssue(current, character, 'character-injury-transition', 'Injury state changes without an event', from.injuryState || 'None', to.injuryState || 'None'),
      suggestedTransition: { type: 'injury', subjectId: character.id, from: from.injuryState, to: to.injuryState, note: `${character.name} injury state changes from ${from.injuryState || 'none'} to ${to.injuryState || 'none'}.` }
    })
    if (normalize(from.hairMakeup) !== normalize(to.hairMakeup) && !stateExplained) issues.push({ ...characterFieldIssue(current, character, 'character-hair-makeup-transition', 'Hair / makeup changes between scenes', from.hairMakeup || 'Unspecified', to.hairMakeup || 'Unspecified'), severity: 'info' })
    if (normalize(from.ageAppearance) !== normalize(to.ageAppearance) && !stateExplained) issues.push({ ...characterFieldIssue(current, character, 'character-age-appearance-transition', 'Age appearance changes between scenes', from.ageAppearance || 'Unspecified', to.ageAppearance || 'Unspecified'), severity: 'info' })
  }

  return issues
}

function characterFieldIssue(current: Scene, character: CharacterAsset, rule: string, title: string, from: string, to: string): ContinuityIssue {
  return {
    id: `${rule}-${current.id}-${character.id}`,
    severity: 'warning',
    rule,
    sceneId: current.id,
    title,
    detail: `${character.name}: ${from} → ${to}.`,
    suggestedTransition: { type: 'character-state', subjectId: character.id, from, to, note: `${character.name}: ${from} → ${to}.` }
  }
}

function propTransitionIssues(project: Project, previous: Scene, current: Scene): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const propIds = new Set([...previous.propIds, ...current.propIds, ...(previous.propStates ?? []).map((state) => state.propId), ...(current.propStates ?? []).map((state) => state.propId)])

  for (const propId of propIds) {
    const prop = getAsset(project, propId)
    if (!prop || prop.type !== 'prop') continue
    const from = propState(previous, propId)
    const to = propState(current, propId)

    if (from.presence !== to.presence && !eventExplains(current, ['prop-presence'], propId, from.presence, to.presence)) issues.push({
      id: `prop-presence-${previous.id}-${current.id}-${propId}`,
      severity: 'warning',
      rule: 'prop-presence-transition',
      sceneId: current.id,
      title: 'Prop presence changes without an event',
      detail: `${prop.name}: ${from.presence} → ${to.presence}.`,
      suggestedTransition: { type: 'prop-presence', subjectId: propId, from: from.presence, to: to.presence, note: `${prop.name} becomes ${to.presence}.` }
    })

    if (from.presence === 'present' && to.presence === 'present') {
      const fromOwner = from.ownerCharacterId ?? ''
      const toOwner = to.ownerCharacterId ?? ''
      if (fromOwner !== toOwner && !eventExplains(current, ['prop-transfer'], propId, fromOwner, toOwner)) issues.push({
        id: `prop-owner-${previous.id}-${current.id}-${propId}`,
        severity: 'warning',
        rule: 'prop-owner-transfer',
        sceneId: current.id,
        title: 'Prop owner changes without a transfer event',
        detail: `${prop.name}: ${fromOwner ? assetName(project, fromOwner) : 'Unassigned'} → ${toOwner ? assetName(project, toOwner) : 'Unassigned'}.`,
        suggestedTransition: { type: 'prop-transfer', subjectId: propId, from: fromOwner, to: toOwner, note: `${prop.name} transfers from ${fromOwner ? assetName(project, fromOwner) : 'unassigned'} to ${toOwner ? assetName(project, toOwner) : 'unassigned'}.` }
      })

      if (normalize(from.condition) && normalize(to.condition) && normalize(from.condition) !== normalize(to.condition) && !eventExplains(current, ['prop-condition'], propId, from.condition, to.condition)) issues.push({
        id: `prop-condition-${previous.id}-${current.id}-${propId}`,
        severity: 'warning',
        rule: 'prop-condition-transition',
        sceneId: current.id,
        title: 'Prop condition changes without an event',
        detail: `${prop.name}: ${from.condition || 'Unspecified'} → ${to.condition || 'Unspecified'}.`,
        suggestedTransition: { type: 'prop-condition', subjectId: propId, from: from.condition, to: to.condition, note: `${prop.name} condition changes from ${from.condition || 'unspecified'} to ${to.condition || 'unspecified'}.` }
      })
    }
  }

  return issues
}

function environmentTransitionIssues(project: Project, previous: Scene, current: Scene): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const fromLocation = previous.locationId ?? ''
  const toLocation = current.locationId ?? ''
  if (fromLocation !== toLocation && !eventExplains(current, ['location'], toLocation || undefined, fromLocation, toLocation)) issues.push({
    id: `location-transition-${previous.id}-${current.id}`,
    severity: 'info',
    rule: 'location-transition',
    sceneId: current.id,
    title: 'Location changes between scenes',
    detail: `${assetName(project, fromLocation)} → ${assetName(project, toLocation)}. Add an event when the movement matters to continuity.`,
    suggestedTransition: { type: 'location', subjectId: toLocation || undefined, from: fromLocation, to: toLocation, note: `Move from ${assetName(project, fromLocation)} to ${assetName(project, toLocation)}.` }
  })

  if (materiallyDifferentTime(previous.timeOfDay, current.timeOfDay) && !eventExplains(current, ['time'], undefined, previous.timeOfDay, current.timeOfDay)) issues.push({
    id: `time-transition-${previous.id}-${current.id}`,
    severity: 'info',
    rule: 'time-of-day-transition',
    sceneId: current.id,
    title: 'Time changes between scenes',
    detail: `${previous.timeOfDay || 'Unspecified'} → ${current.timeOfDay || 'Unspecified'}.`,
    suggestedTransition: { type: 'time', from: previous.timeOfDay, to: current.timeOfDay, note: `Time changes from ${previous.timeOfDay || 'unspecified'} to ${current.timeOfDay || 'unspecified'}.` }
  })

  const fromWeather = previous.weather ?? ''
  const toWeather = current.weather ?? ''
  if (materiallyDifferentWeather(fromWeather, toWeather) && !eventExplains(current, ['weather'], undefined, fromWeather, toWeather)) issues.push({
    id: `weather-transition-${previous.id}-${current.id}`,
    severity: 'info',
    rule: 'weather-transition',
    sceneId: current.id,
    title: 'Weather changes between scenes',
    detail: `${fromWeather || 'Unspecified'} → ${toWeather || 'Unspecified'}.`,
    suggestedTransition: { type: 'weather', from: fromWeather, to: toWeather, note: `Weather changes from ${fromWeather || 'unspecified'} to ${toWeather || 'unspecified'}.` }
  })

  return issues
}
