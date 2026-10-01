import type { GenerationTarget, Project, Scene, SceneGenerationSettings } from './types'
import { parseAspectRatio } from './geography'
import { collectSceneReferences } from './sceneReferences'

export type CapabilitySeverity = 'error' | 'warning' | 'info'

export interface CapabilityIssue {
  id: string
  severity: CapabilitySeverity
  code: string
  message: string
}

export interface ModelCapabilityProfile {
  model: GenerationTarget
  label: string
  baseline: string
  durations: { min: number; max: number; allowed?: number[]; integer: boolean }
  aspectRatios: string[]
  resolutions: string[]
  defaultResolution: string
  defaultAspectRatio: string
  audio: 'optional' | 'always-on'
  supportsFirstFrame: boolean
  supportsLastFrame: boolean
  referenceLimit?: { max: number; severity: Exclude<CapabilitySeverity, 'info'> }
  sourceUrl: string
  notes: string[]
}

export const CAPABILITY_PROFILES: Record<GenerationTarget, ModelCapabilityProfile> = {
  seedance: {
    model: 'seedance',
    label: 'Seedance 2.5',
    baseline: 'Higgsfield Seedance 2.5',
    durations: { min: 4, max: 30, integer: true },
    aspectRatios: ['16:9', '4:3', '1:1', '3:4', '9:16', '21:9'],
    resolutions: ['480p', '720p'],
    defaultResolution: '720p',
    defaultAspectRatio: '16:9',
    audio: 'optional',
    supportsFirstFrame: true,
    supportsLastFrame: true,
    referenceLimit: { max: 30, severity: 'error' },
    sourceUrl: 'https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference',
    notes: ['Reference-to-video uses a separate endpoint from text-to-video.', 'First/last image guidance maps to image-to-video style workflows rather than plain text-to-video.']
  },
  veo: {
    model: 'veo',
    label: 'Veo 3.1',
    baseline: 'Google Veo 3.1',
    durations: { min: 4, max: 8, allowed: [4, 6, 8], integer: true },
    aspectRatios: ['16:9', '9:16'],
    resolutions: ['720p', '1080p', '4k'],
    defaultResolution: '720p',
    defaultAspectRatio: '16:9',
    audio: 'always-on',
    supportsFirstFrame: true,
    supportsLastFrame: true,
    referenceLimit: { max: 3, severity: 'error' },
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/veo',
    notes: ['Reference images, 1080p, and 4K require an 8-second generation.', 'Reference images are supported by Veo 3.1 models; model variants can differ.']
  },
  kling: {
    model: 'kling',
    label: 'Kling',
    baseline: 'Kling 2.6 / current Open Platform baseline',
    durations: { min: 3, max: 15, integer: true },
    aspectRatios: ['16:9', '9:16', '1:1'],
    resolutions: ['auto'],
    defaultResolution: 'auto',
    defaultAspectRatio: '16:9',
    audio: 'optional',
    supportsFirstFrame: true,
    supportsLastFrame: true,
    referenceLimit: { max: 7, severity: 'warning' },
    sourceUrl: 'https://kling.ai/document-api/api/video/2-6/text-to-video/legacy',
    notes: ['Resolution and reference limits vary by Kling model/endpoint; FrameBible keeps those checks advisory unless verified for the selected baseline.', 'Text-to-video baseline supports 3–15 seconds and 16:9 / 9:16 / 1:1.']
  }
}

function nearestAspectRatio(source: string, supported: string[], fallback: string): string {
  const sourceRatio = parseAspectRatio(source)
  if (!Number.isFinite(sourceRatio)) return fallback
  return supported.reduce((best, candidate) => Math.abs(parseAspectRatio(candidate) - sourceRatio) < Math.abs(parseAspectRatio(best) - sourceRatio) ? candidate : best, fallback)
}

function defaultDuration(sceneDuration: number, profile: ModelCapabilityProfile): number {
  if (profile.durations.allowed?.length) return profile.durations.allowed.reduce((best, value) => Math.abs(value - sceneDuration) < Math.abs(best - sceneDuration) ? value : best, profile.durations.allowed[0])
  const clamped = Math.min(profile.durations.max, Math.max(profile.durations.min, sceneDuration || profile.durations.min))
  return profile.durations.integer ? Math.round(clamped) : clamped
}

export function resolveGenerationSettings(project: Project, scene: Scene, model: GenerationTarget): SceneGenerationSettings {
  const profile = CAPABILITY_PROFILES[model]
  const saved = scene.generation?.[model]
  return {
    durationSec: saved?.durationSec ?? defaultDuration(scene.durationSec, profile),
    aspectRatio: saved?.aspectRatio ?? nearestAspectRatio(project.styleDNA.aspectRatio, profile.aspectRatios, profile.defaultAspectRatio),
    resolution: saved?.resolution ?? profile.defaultResolution,
    audio: saved?.audio ?? 'auto',
    frameMode: saved?.frameMode ?? 'prompt-only',
    firstFrameReferenceId: saved?.firstFrameReferenceId,
    lastFrameReferenceId: saved?.lastFrameReferenceId,
    referenceImageIds: saved?.referenceImageIds ?? []
  }
}

export function validateGenerationSettings(project: Project, scene: Scene, model: GenerationTarget, settings = resolveGenerationSettings(project, scene, model)): CapabilityIssue[] {
  const profile = CAPABILITY_PROFILES[model]
  const issues: CapabilityIssue[] = []
  const add = (severity: CapabilitySeverity, code: string, message: string) => issues.push({ id: `${model}-${code}`, severity, code, message })
  const duration = settings.durationSec

  if (!Number.isFinite(duration) || duration <= 0) add('error', 'duration-invalid', 'Generation duration must be a positive number.')
  else if (profile.durations.allowed && !profile.durations.allowed.includes(duration)) add('error', 'duration-unsupported', `${profile.label} supports ${profile.durations.allowed.join(', ')} second generations in this profile.`)
  else if (duration < profile.durations.min || duration > profile.durations.max) add('error', 'duration-range', `${profile.label} duration must be ${profile.durations.min}–${profile.durations.max} seconds.`)
  else if (profile.durations.integer && !Number.isInteger(duration)) add('error', 'duration-integer', `${profile.label} duration must be a whole number of seconds.`)

  if (!profile.aspectRatios.includes(settings.aspectRatio)) add('error', 'aspect-ratio', `${profile.label} does not support ${settings.aspectRatio} in this baseline profile.`)
  if (!profile.resolutions.includes(settings.resolution)) add(model === 'kling' ? 'warning' : 'error', 'resolution', `${settings.resolution} is not part of the verified ${profile.label} baseline options in FrameBible.`)
  if (profile.audio === 'always-on' && settings.audio === 'off') add('error', 'audio-always-on', `${profile.label} generates native audio in this profile; audio cannot be disabled.`)

  const references = collectSceneReferences(project, scene)
  const available = new Set(references.map((item) => item.id))
  const selected = [...new Set(settings.referenceImageIds)].filter((id) => available.has(id))
  const missing = settings.referenceImageIds.filter((id) => !available.has(id))
  if (missing.length) add('warning', 'reference-missing', `${missing.length} selected reference(s) are no longer available in this Scene.`)
  if (profile.referenceLimit && selected.length > profile.referenceLimit.max) add(profile.referenceLimit.severity, 'reference-limit', `${profile.label} profile allows up to ${profile.referenceLimit.max} generation reference image(s); ${selected.length} are selected.`)

  if (settings.frameMode !== 'prompt-only' && !profile.supportsFirstFrame) add('error', 'first-frame-unsupported', `${profile.label} profile does not support first-frame image guidance.`)
  if (settings.frameMode === 'first-last-images' && !profile.supportsLastFrame) add('error', 'last-frame-unsupported', `${profile.label} profile does not support last-frame image guidance.`)
  if (settings.frameMode !== 'prompt-only' && !settings.firstFrameReferenceId) add('error', 'first-frame-missing', 'First-frame image mode is enabled but no first-frame reference is selected.')
  if (settings.frameMode === 'first-last-images' && !settings.lastFrameReferenceId) add('error', 'last-frame-missing', 'First + last frame mode is enabled but no last-frame reference is selected.')
  if (settings.lastFrameReferenceId && !settings.firstFrameReferenceId) add('error', 'last-without-first', 'A last-frame image requires a first-frame image.')
  if (settings.firstFrameReferenceId && !available.has(settings.firstFrameReferenceId)) add('warning', 'first-frame-stale', 'The selected first-frame reference is no longer available in this Scene.')
  if (settings.lastFrameReferenceId && !available.has(settings.lastFrameReferenceId)) add('warning', 'last-frame-stale', 'The selected last-frame reference is no longer available in this Scene.')

  if (model === 'veo') {
    if ((selected.length > 0 || settings.resolution === '1080p' || settings.resolution === '4k') && duration !== 8) add('error', 'veo-eight-second-coupling', 'Veo 3.1 requires 8 seconds when using reference images, 1080p, or 4K.')
    if (settings.frameMode !== 'prompt-only' && selected.length > 0) add('warning', 'veo-frame-reference-combination', 'Veo image/frame guidance and content reference images are distinct inputs; confirm the chosen API workflow supports the exact combination you intend.')
  }

  if (model === 'seedance' && selected.length > 0) add('info', 'seedance-reference-endpoint', 'Selected references imply a Seedance reference-to-video style workflow rather than plain text-to-video.')
  if (model === 'kling' && (selected.length > 0 || settings.frameMode !== 'prompt-only')) add('warning', 'kling-endpoint-dependent', 'Kling reference/frame capabilities vary by model and endpoint. Confirm the target endpoint before generation.')
  if (project.styleDNA.aspectRatio !== settings.aspectRatio) add('info', 'style-aspect-adaptation', `Project Style DNA is ${project.styleDNA.aspectRatio}; generation is adapted to ${settings.aspectRatio}. Review framing/crop.`)

  return issues
}

export function generationHasErrors(issues: CapabilityIssue[]): boolean {
  return issues.some((issue) => issue.severity === 'error')
}
