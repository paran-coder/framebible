import type { Asset, CharacterPlacement, Project, PropPlacement, Scene, SceneGeography, ShotCameraPlacement, SpatialTransitionEvent, SpatialZone, SpatialZoneKind } from './types'

const FULL_FRAME_SENSOR_WIDTH_MM = 36

export const clamp01 = (value: number) => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.5))
export const normalizeDeg = (value: number) => ((Number.isFinite(value) ? value : 0) % 360 + 360) % 360

export function parseFocalLengthMm(value?: string | number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  const match = /([0-9]+(?:\.[0-9]+)?)/.exec(String(value ?? ''))
  const parsed = match ? Number(match[1]) : 50
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 50
}

export function horizontalFovDeg(focalLengthMm: number): number {
  const focal = Math.max(8, Math.min(400, parseFocalLengthMm(focalLengthMm)))
  return (2 * Math.atan(FULL_FRAME_SENSOR_WIDTH_MM / (2 * focal)) * 180) / Math.PI
}

export function parseAspectRatio(value?: string): number {
  const match = /^\s*([0-9]+(?:\.[0-9]+)?)\s*[:/]\s*([0-9]+(?:\.[0-9]+)?)\s*$/.exec(value ?? '')
  if (!match) return 16 / 9
  const ratio = Number(match[1]) / Number(match[2])
  return Number.isFinite(ratio) && ratio > 0.6 && ratio < 4 ? ratio : 16 / 9
}


export function createSpatialZone(kind: SpatialZoneKind = 'custom', index = 0): SpatialZone {
  const labels: Record<SpatialZoneKind, string> = { doorway: 'Doorway', window: 'Window', table: 'Table', custom: 'Zone' }
  return {
    id: `zone-${crypto.randomUUID()}`,
    name: `${labels[kind]}${kind === 'custom' ? ` ${index + 1}` : ''}`.trim(),
    kind,
    x: clamp01(0.22 + (index % 4) * 0.18),
    y: clamp01(0.22 + (index % 3) * 0.18),
    width: kind === 'doorway' ? 0.14 : kind === 'window' ? 0.22 : kind === 'table' ? 0.28 : 0.2,
    height: kind === 'doorway' ? 0.32 : kind === 'window' ? 0.16 : kind === 'table' ? 0.18 : 0.18,
    rotationDeg: 0
  }
}

export function normalizeSpatialZone(zone: SpatialZone): SpatialZone {
  return {
    ...zone,
    name: zone.name?.trim() || 'Zone',
    kind: ['doorway', 'window', 'table', 'custom'].includes(zone.kind) ? zone.kind : 'custom',
    x: clamp01(zone.x),
    y: clamp01(zone.y),
    width: Math.min(1, Math.max(0.04, Number.isFinite(zone.width) ? zone.width : 0.2)),
    height: Math.min(1, Math.max(0.04, Number.isFinite(zone.height) ? zone.height : 0.18)),
    rotationDeg: normalizeDeg(zone.rotationDeg)
  }
}


export interface ZoneSnapResult {
  zone: SpatialZone
  x: number
  y: number
  distance: number
}

function pointToZoneEdgeDistance(zone: SpatialZone, x: number, y: number): number {
  const normalized = normalizeSpatialZone(zone)
  const rad = -normalized.rotationDeg * Math.PI / 180
  const dx = clamp01(x) - normalized.x
  const dy = clamp01(y) - normalized.y
  const localX = dx * Math.cos(rad) - dy * Math.sin(rad)
  const localY = dx * Math.sin(rad) + dy * Math.cos(rad)
  const edgeX = Math.max(Math.abs(localX) - normalized.width / 2, 0)
  const edgeY = Math.max(Math.abs(localY) - normalized.height / 2, 0)
  return Math.hypot(edgeX, edgeY)
}

export function findSnapZone(geography: SceneGeography, x: number, y: number, threshold = 0.055): ZoneSnapResult | undefined {
  const candidates = (geography.zones ?? []).map((zone) => ({
    zone: normalizeSpatialZone(zone),
    distance: pointToZoneEdgeDistance(zone, x, y)
  })).filter((item) => item.distance <= threshold)
    .sort((a, b) => a.distance - b.distance || a.zone.width * a.zone.height - b.zone.width * b.zone.height)
  const candidate = candidates[0]
  return candidate ? { zone: candidate.zone, x: candidate.zone.x, y: candidate.zone.y, distance: candidate.distance } : undefined
}

export function resolveBoundZone(geography: SceneGeography, zoneId: string | undefined, x: number, y: number): SpatialZone | undefined {
  const explicit = zoneId ? geography.zones?.find((zone) => zone.id === zoneId) : undefined
  return explicit ?? zoneAtPoint(geography, x, y)
}

export function zoneName(geography: SceneGeography, zoneId?: string): string | undefined {
  return zoneId ? geography.zones?.find((zone) => zone.id === zoneId)?.name : undefined
}

function defaultCharacterPlacement(characterId: string, index: number, count: number): CharacterPlacement {
  const spread = count <= 1 ? 0 : index / Math.max(1, count - 1)
  return { characterId, x: clamp01(0.32 + spread * 0.36), y: 0.55, facingDeg: index % 2 === 0 ? 0 : 180 }
}

function defaultPropPlacement(propId: string, index: number, count: number): PropPlacement {
  const spread = count <= 1 ? 0 : index / Math.max(1, count - 1)
  return { propId, x: clamp01(0.42 + spread * 0.24), y: 0.72, rotationDeg: 0 }
}

function defaultCameraPlacement(shotId: string, focalLength: string, index: number): ShotCameraPlacement {
  return {
    shotId,
    x: clamp01(0.16 + Math.min(index, 4) * 0.025),
    y: clamp01(0.84 - Math.min(index, 4) * 0.02),
    directionDeg: normalizeDeg(-28 + Math.min(index, 4) * 8),
    focalLengthMm: parseFocalLengthMm(focalLength)
  }
}

export function ensureSceneGeography(scene: Scene, stageAspectRatio = '16:9'): SceneGeography {
  const source = scene.geography
  const characterIds = scene.characterBindings.map((binding) => binding.characterId)
  const propIds = scene.propIds
  const shotIds = scene.shots.map((shot) => shot.id)
  const characterExisting = new Map((source?.characterPlacements ?? []).map((item) => [item.characterId, item]))
  const propExisting = new Map((source?.propPlacements ?? []).map((item) => [item.propId, item]))
  const cameraExisting = new Map((source?.shotCameras ?? []).map((item) => [item.shotId, item]))

  const background = source?.background ? {
    ...source.background,
    opacity: clamp01(source.background.opacity),
    x: clamp01(source.background.x),
    y: clamp01(source.background.y),
    scale: Math.min(4, Math.max(0.25, Number.isFinite(source.background.scale) ? source.background.scale : 1)),
    rotationDeg: normalizeDeg(source.background.rotationDeg),
    fit: source.background.fit === 'cover' ? 'cover' as const : 'contain' as const
  } : undefined

  return {
    stageAspectRatio: source?.stageAspectRatio?.trim() || stageAspectRatio,
    background,
    zones: (source?.zones ?? []).map(normalizeSpatialZone),
    characterPlacements: characterIds.map((characterId, index) => {
      const item = characterExisting.get(characterId) ?? defaultCharacterPlacement(characterId, index, characterIds.length)
      const x = clamp01(item.x)
      const y = clamp01(item.y)
      const zoneId = source?.zones?.some((zone) => zone.id === item.zoneId) ? item.zoneId : zoneAtPoint({ stageAspectRatio: source?.stageAspectRatio ?? stageAspectRatio, zones: (source?.zones ?? []).map(normalizeSpatialZone), characterPlacements: [], propPlacements: [], shotCameras: [] }, x, y)?.id
      return { ...item, characterId, x, y, facingDeg: normalizeDeg(item.facingDeg), ...(zoneId ? { zoneId } : { zoneId: undefined }) }
    }),
    propPlacements: propIds.map((propId, index) => {
      const item = propExisting.get(propId) ?? defaultPropPlacement(propId, index, propIds.length)
      const x = clamp01(item.x)
      const y = clamp01(item.y)
      const zoneId = source?.zones?.some((zone) => zone.id === item.zoneId) ? item.zoneId : zoneAtPoint({ stageAspectRatio: source?.stageAspectRatio ?? stageAspectRatio, zones: (source?.zones ?? []).map(normalizeSpatialZone), characterPlacements: [], propPlacements: [], shotCameras: [] }, x, y)?.id
      return { ...item, propId, x, y, rotationDeg: normalizeDeg(item.rotationDeg), ...(zoneId ? { zoneId } : { zoneId: undefined }) }
    }),
    shotCameras: scene.shots.map((shot, index) => {
      const item = cameraExisting.get(shot.id) ?? defaultCameraPlacement(shot.id, shot.focalLength, index)
      return {
        ...item,
        shotId: shot.id,
        x: clamp01(item.x),
        y: clamp01(item.y),
        directionDeg: normalizeDeg(item.directionDeg),
        focalLengthMm: parseFocalLengthMm(item.focalLengthMm || shot.focalLength),
        zoneId: source?.zones?.some((zone) => zone.id === item.zoneId) ? item.zoneId : zoneAtPoint({ stageAspectRatio: source?.stageAspectRatio ?? stageAspectRatio, zones: (source?.zones ?? []).map(normalizeSpatialZone), characterPlacements: [], propPlacements: [], shotCameras: [] }, clamp01(item.x), clamp01(item.y))?.id
      }
    }).filter((item) => shotIds.includes(item.shotId))
  }
}

export function spatialZone(x: number, y: number): string {
  const horizontal = clamp01(x) < 1 / 3 ? 'left' : clamp01(x) > 2 / 3 ? 'right' : 'center'
  const depth = clamp01(y) < 1 / 3 ? 'background' : clamp01(y) > 2 / 3 ? 'foreground' : 'midground'
  return `${horizontal} ${depth}`
}


export function zoneAtPoint(geography: SceneGeography, x: number, y: number): SpatialZone | undefined {
  const px = clamp01(x)
  const py = clamp01(y)
  const matches = (geography.zones ?? []).filter((zone) => {
    const normalized = normalizeSpatialZone(zone)
    const rad = -normalized.rotationDeg * Math.PI / 180
    const dx = px - normalized.x
    const dy = py - normalized.y
    const localX = dx * Math.cos(rad) - dy * Math.sin(rad)
    const localY = dx * Math.sin(rad) + dy * Math.cos(rad)
    return Math.abs(localX) <= normalized.width / 2 && Math.abs(localY) <= normalized.height / 2
  })
  return matches.sort((a, b) => a.width * a.height - b.width * b.height)[0]
}

function placementPhrase(geography: SceneGeography, x: number, y: number, zoneId?: string): string {
  const zone = resolveBoundZone(geography, zoneId, x, y)
  return zone ? `at spatial zone "${zone.name}" (${spatialZone(x, y)})` : spatialZone(x, y)
}

export function compassDirection(degrees: number): string {
  const labels = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast']
  return labels[Math.round(normalizeDeg(degrees) / 45) % 8]
}

function assetName(project: Project, id: string) {
  return project.assets.find((asset) => asset.id === id)?.name ?? id
}

export function compileSceneGeography(project: Project, scene: Scene): string[] {
  const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
  const zoneLines = (geography.zones ?? []).map((zone) => `Spatial zone "${zone.name}" (${zone.kind}) occupies ${spatialZone(zone.x, zone.y)}.`)
  const characterLines = geography.characterPlacements.map((placement) =>
    `@${assetName(project, placement.characterId)} stands ${placementPhrase(geography, placement.x, placement.y, placement.zoneId)}, facing ${compassDirection(placement.facingDeg)} (${Math.round(normalizeDeg(placement.facingDeg))}°).`
  )
  const propLines = geography.propPlacements.map((placement) =>
    `@${assetName(project, placement.propId)} is positioned ${placementPhrase(geography, placement.x, placement.y, placement.zoneId)}, rotated ${Math.round(normalizeDeg(placement.rotationDeg))}°.`
  )
  const shotById = new Map(scene.shots.map((shot) => [shot.id, shot]))
  const cameraLines = geography.shotCameras
    .map((camera) => ({ camera, shot: shotById.get(camera.shotId) }))
    .filter((item): item is { camera: ShotCameraPlacement; shot: Scene['shots'][number] } => Boolean(item.shot))
    .sort((a, b) => a.shot.order - b.shot.order)
    .map(({ camera, shot }) =>
      `Shot ${String(shot.order).padStart(2, '0')} camera is ${placementPhrase(geography, camera.x, camera.y, camera.zoneId)}, aimed ${compassDirection(camera.directionDeg)} (${Math.round(normalizeDeg(camera.directionDeg))}°), ${Math.round(camera.focalLengthMm)}mm lens, ${Math.round(horizontalFovDeg(camera.focalLengthMm))}° horizontal field of view.`
    )
  return [...zoneLines, ...characterLines, ...propLines, ...cameraLines]
}


export function compileCameraPath(project: Project, scene: Scene): string[] {
  const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
  const shotById = new Map(scene.shots.map((shot) => [shot.id, shot]))
  const ordered = geography.shotCameras
    .map((camera) => ({ camera, shot: shotById.get(camera.shotId) }))
    .filter((item): item is { camera: ShotCameraPlacement; shot: Scene['shots'][number] } => Boolean(item.shot))
    .sort((a, b) => a.shot.order - b.shot.order)

  if (ordered.length < 2) return []
  const lines: string[] = []
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1]
    const current = ordered[index]
    const distance = placementDistance(previous.camera, current.camera)
    lines.push(
      `Shot ${String(previous.shot.order).padStart(2, '0')} → Shot ${String(current.shot.order).padStart(2, '0')}: camera setup changes ${spatialZone(previous.camera.x, previous.camera.y)} → ${spatialZone(current.camera.x, current.camera.y)} (${Math.round(distance * 100)}% stage diagonal between setups), with the next setup aimed ${compassDirection(current.camera.directionDeg)} at ${Number(current.camera.focalLengthMm.toFixed(1))}mm. This is a shot-to-shot setup change, not continuous camera motion unless explicitly stated in Spatial Transitions.`
    )
  }
  return lines
}

function transitionSubjectName(project: Project, event: SpatialTransitionEvent): string {
  if (event.subjectType === 'camera') return 'Camera'
  return event.subjectId ? `@${assetName(project, event.subjectId)}` : event.subjectType === 'character' ? 'Character' : 'Prop'
}

export function compileSpatialTransitions(project: Project, scene: Scene): string[] {
  const shotById = new Map(scene.shots.map((shot) => [shot.id, shot]))
  const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
  return (scene.spatialTransitions ?? []).map((event) => {
    const fromShot = event.fromShotId ? shotById.get(event.fromShotId) : undefined
    const toShot = event.toShotId ? shotById.get(event.toShotId) : undefined
    const range = fromShot || toShot
      ? ` (${fromShot ? `Shot ${String(fromShot.order).padStart(2, '0')}` : 'scene start'} → ${toShot ? `Shot ${String(toShot.order).padStart(2, '0')}` : 'scene end'})`
      : ''
    const resolvedFrom = zoneName(geography, event.fromZoneId) ?? event.from
    const resolvedTo = zoneName(geography, event.toZoneId) ?? event.to
    const fromTo = resolvedFrom || resolvedTo ? ` ${resolvedFrom || 'current position'} → ${resolvedTo || 'destination'}.` : ''
    const motion = event.motion ? ` Motion: ${event.motion}.` : ''
    const note = event.note ? ` ${event.note}` : ''
    return `${transitionSubjectName(project, event)}${range}:${fromTo}${motion}${note}`.replace(/\s+/g, ' ').trim()
  })
}

export function placementDistance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(clamp01(a.x) - clamp01(b.x), clamp01(a.y) - clamp01(b.y))
}

export function angularDistance(a: number, b: number): number {
  const raw = Math.abs(normalizeDeg(a) - normalizeDeg(b))
  return Math.min(raw, 360 - raw)
}

export function isPlaceableAsset(asset: Asset): asset is Extract<Asset, { type: 'character' | 'prop' }> {
  return asset.type === 'character' || asset.type === 'prop'
}
