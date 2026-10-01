import { ensureSceneGeography, normalizeDeg, parseAspectRatio, zoneName } from './geography'
import type { Project, Scene, SceneGeography, SpatialTransitionEvent } from './types'

export type TimelineNodeType = 'character' | 'prop'

export interface TimelineNodeState {
  id: string
  type: TimelineNodeType
  label: string
  x: number
  y: number
}

export interface TimelineCameraState {
  shotId: string
  label: string
  x: number
  y: number
  directionDeg: number
  focalLengthMm: number
}

export interface SpatialTimelineSample {
  progress: number
  elapsedSec: number
  totalSec: number
  activeShotId?: string
  activeShotOrder?: number
  activeShotTitle?: string
  nodes: TimelineNodeState[]
  camera?: TimelineCameraState
}

interface ShotWindow {
  id: string
  order: number
  title: string
  start: number
  end: number
  center: number
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t)

function assetName(project: Project, id: string): string {
  return project.assets.find((asset) => asset.id === id)?.name ?? id
}

function shotWindows(scene: Scene): ShotWindow[] {
  let cursor = 0
  return [...scene.shots].sort((a, b) => a.order - b.order).map((shot) => {
    const duration = Math.max(0.25, Number.isFinite(shot.durationSec) ? shot.durationSec : 1)
    const item = { id: shot.id, order: shot.order, title: shot.title, start: cursor, end: cursor + duration, center: cursor + duration / 2 }
    cursor += duration
    return item
  })
}

function pointForZone(geography: SceneGeography, zoneId?: string): { x: number; y: number } | undefined {
  const zone = zoneId ? geography.zones?.find((item) => item.id === zoneId) : undefined
  return zone ? { x: zone.x, y: zone.y } : undefined
}

function eventTime(event: SpatialTransitionEvent, windows: Map<string, ShotWindow>, totalSec: number): { start: number; end: number } {
  const from = event.fromShotId ? windows.get(event.fromShotId) : undefined
  const to = event.toShotId ? windows.get(event.toShotId) : undefined
  let start = from?.center ?? 0
  let end = to?.center ?? totalSec
  if (end < start) [start, end] = [end, start]
  if (Math.abs(end - start) < 0.05) end = Math.min(totalSec, start + 0.05)
  return { start, end }
}

function applyPositionTransitions(
  base: { x: number; y: number },
  events: SpatialTransitionEvent[],
  geography: SceneGeography,
  windows: Map<string, ShotWindow>,
  elapsedSec: number,
  totalSec: number
): { x: number; y: number } {
  let current = base
  const ordered = [...events].sort((a, b) => eventTime(a, windows, totalSec).start - eventTime(b, windows, totalSec).start)
  for (const event of ordered) {
    const { start, end } = eventTime(event, windows, totalSec)
    const from = pointForZone(geography, event.fromZoneId) ?? current
    const to = pointForZone(geography, event.toZoneId) ?? current
    if (elapsedSec < start) continue
    if (elapsedSec >= end) {
      current = to
      continue
    }
    const t = clamp((elapsedSec - start) / Math.max(0.05, end - start))
    return { x: lerp(from.x, to.x, t), y: lerp(from.y, to.y, t) }
  }
  return current
}

function interpolateAngle(a: number, b: number, t: number): number {
  const delta = ((normalizeDeg(b) - normalizeDeg(a) + 540) % 360) - 180
  return normalizeDeg(a + delta * clamp(t))
}

function cameraForTime(scene: Scene, geography: SceneGeography, windows: ShotWindow[], elapsedSec: number): TimelineCameraState | undefined {
  if (!windows.length) return undefined
  const active = windows.find((window) => elapsedSec >= window.start && elapsedSec < window.end) ?? windows.at(-1)!
  const camera = geography.shotCameras.find((item) => item.shotId === active.id) ?? geography.shotCameras[0]
  if (!camera) return undefined
  return { shotId: camera.shotId, label: active.title, x: camera.x, y: camera.y, directionDeg: camera.directionDeg, focalLengthMm: camera.focalLengthMm }
}

function applyCameraTransition(
  base: TimelineCameraState | undefined,
  events: SpatialTransitionEvent[],
  geography: SceneGeography,
  windows: Map<string, ShotWindow>,
  elapsedSec: number,
  totalSec: number
): TimelineCameraState | undefined {
  if (!base) return undefined
  for (const event of events) {
    const { start, end } = eventTime(event, windows, totalSec)
    if (elapsedSec < start || elapsedSec > end) continue
    const fromCamera = event.fromShotId ? geography.shotCameras.find((item) => item.shotId === event.fromShotId) : undefined
    const toCamera = event.toShotId ? geography.shotCameras.find((item) => item.shotId === event.toShotId) : undefined
    const fromPoint = pointForZone(geography, event.fromZoneId) ?? fromCamera ?? base
    const toPoint = pointForZone(geography, event.toZoneId) ?? toCamera ?? base
    const t = clamp((elapsedSec - start) / Math.max(0.05, end - start))
    return {
      ...base,
      x: lerp(fromPoint.x, toPoint.x, t),
      y: lerp(fromPoint.y, toPoint.y, t),
      directionDeg: fromCamera && toCamera ? interpolateAngle(fromCamera.directionDeg, toCamera.directionDeg, t) : base.directionDeg,
      focalLengthMm: fromCamera && toCamera ? lerp(fromCamera.focalLengthMm, toCamera.focalLengthMm, t) : base.focalLengthMm
    }
  }
  return base
}

export function sampleSpatialTimeline(project: Project, scene: Scene, progress: number): SpatialTimelineSample {
  const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
  const windows = shotWindows(scene)
  const totalSec = windows.at(-1)?.end ?? 0
  const safeProgress = clamp(progress)
  const elapsedSec = totalSec * safeProgress
  const windowMap = new Map(windows.map((item) => [item.id, item]))
  const active = windows.find((window) => elapsedSec >= window.start && elapsedSec < window.end) ?? windows.at(-1)

  const nodes: TimelineNodeState[] = [
    ...geography.characterPlacements.map((placement) => ({
      id: placement.characterId,
      type: 'character' as const,
      label: assetName(project, placement.characterId),
      ...applyPositionTransitions(
        { x: placement.x, y: placement.y },
        (scene.spatialTransitions ?? []).filter((event) => event.subjectType === 'character' && event.subjectId === placement.characterId),
        geography,
        windowMap,
        elapsedSec,
        totalSec
      )
    })),
    ...geography.propPlacements.map((placement) => ({
      id: placement.propId,
      type: 'prop' as const,
      label: assetName(project, placement.propId),
      ...applyPositionTransitions(
        { x: placement.x, y: placement.y },
        (scene.spatialTransitions ?? []).filter((event) => event.subjectType === 'prop' && event.subjectId === placement.propId),
        geography,
        windowMap,
        elapsedSec,
        totalSec
      )
    }))
  ]

  const cameraBase = cameraForTime(scene, geography, windows, elapsedSec)
  const camera = applyCameraTransition(
    cameraBase,
    (scene.spatialTransitions ?? []).filter((event) => event.subjectType === 'camera'),
    geography,
    windowMap,
    elapsedSec,
    totalSec
  )

  return {
    progress: safeProgress,
    elapsedSec,
    totalSec,
    activeShotId: active?.id,
    activeShotOrder: active?.order,
    activeShotTitle: active?.title,
    nodes,
    camera
  }
}

export function timelineShotProgress(scene: Scene, shotId: string): number {
  const windows = shotWindows(scene)
  const total = windows.at(-1)?.end ?? 0
  const target = windows.find((item) => item.id === shotId)
  return target && total > 0 ? clamp(target.center / total) : 0
}

export function timelineZoneLabel(scene: Scene, project: Project, zoneId?: string): string | undefined {
  const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
  return zoneName(geography, zoneId)
}

export function timelineAspectRatio(project: Project, scene: Scene): number {
  return parseAspectRatio(ensureSceneGeography(scene, project.styleDNA.aspectRatio).stageAspectRatio)
}
