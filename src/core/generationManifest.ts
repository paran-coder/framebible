import { APP_VERSION, type GenerationTarget, type Project, type ReferenceImage, type Scene } from './types'
import { CAPABILITY_PROFILES, resolveGenerationSettings, validateGenerationSettings } from './capabilities'
import { collectSceneReferences, type SceneReferenceItem } from './sceneReferences'

export const safePackageName = (value: string) => value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 90) || 'untitled'

export function referenceFileInfo(reference: ReferenceImage): { name: string; base64: string } | null {
  if (!reference.dataUrl) return null
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(reference.dataUrl)
  if (!match) return null
  const mime = reference.mimeType ?? match[1]
  const extension = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : mime === 'image/gif' ? 'gif' : mime === 'image/avif' ? 'avif' : 'jpg'
  const base = reference.name.replace(/\.[a-z0-9]+$/i, '') || 'reference'
  return { name: `${safePackageName(base)}.${extension}`, base64: match[2] }
}

export function sceneReferencePackagePath(item: SceneReferenceItem): string | null {
  const file = referenceFileInfo(item.reference)
  return file ? `references/${item.role}/${safePackageName(item.assetName)}/${file.name}` : null
}

export function frameInstructions(scene: Scene): { first: string; last: string } {
  const ordered = [...scene.shots].sort((a, b) => a.order - b.order)
  const first = ordered[0]
  const last = ordered.at(-1)
  return {
    first: first ? `FIRST FRAME — Shot ${String(first.order).padStart(2, '0')} ${first.title}\nFraming: ${first.framing}, ${first.focalLength}, ${first.cameraHeight}.\nBlocking: ${first.blocking}\nAction at frame start: ${first.action}` : 'FIRST FRAME — Define the initial composition and blocking.',
    last: last ? `LAST FRAME — Shot ${String(last.order).padStart(2, '0')} ${last.title}\nFraming: ${last.framing}, ${last.focalLength}, ${last.cameraHeight}.\nEnd blocking/action: ${last.blocking} ${last.action}` : 'LAST FRAME — Define the final composition and end state.'
  }
}

export function buildSceneManifest(project: Project, scene: Scene, model: GenerationTarget) {
  const settings = resolveGenerationSettings(project, scene, model)
  const issues = validateGenerationSettings(project, scene, model, settings)
  const references = collectSceneReferences(project, scene)
  const selected = new Set(settings.referenceImageIds)
  return {
    format: 'framebible-scene-package',
    formatVersion: 1,
    appVersion: APP_VERSION,
    createdAt: new Date().toISOString(),
    project: { id: project.id, title: project.title },
    scene: { id: scene.id, order: scene.order, title: scene.title },
    target: { model, profile: CAPABILITY_PROFILES[model].baseline, sourceUrl: CAPABILITY_PROFILES[model].sourceUrl },
    generation: settings,
    capabilityReport: issues,
    references: references.map((item) => ({
      id: item.id,
      role: item.role,
      assetId: item.assetId,
      assetName: item.assetName,
      variantId: item.variantId,
      variantName: item.variantName,
      selectedForGeneration: selected.has(item.id),
      firstFrame: settings.firstFrameReferenceId === item.id,
      lastFrame: settings.lastFrameReferenceId === item.id,
      file: sceneReferencePackagePath(item)
    })),
    files: {
      prompt: `prompt/${model}.txt`,
      capabilityReport: 'capability-report.txt',
      firstFrameInstructions: 'frames/first-frame.txt',
      lastFrameInstructions: 'frames/last-frame.txt',
      contactSheet: 'contact-sheet.html',
      apiRequest: 'api-request.json',
      readinessReport: 'readiness-report.json'
    }
  }
}

export function capabilityReportText(project: Project, scene: Scene, model: GenerationTarget): string {
  const profile = CAPABILITY_PROFILES[model]
  const settings = resolveGenerationSettings(project, scene, model)
  const issues = validateGenerationSettings(project, scene, model, settings)
  const rows = issues.length ? issues.map((issue) => `[${issue.severity.toUpperCase()}] ${issue.message}`).join('\n') : 'PASS — no capability issues detected by this profile.'
  return `${profile.label}\nBaseline: ${profile.baseline}\nSource: ${profile.sourceUrl}\n\nSettings\n${JSON.stringify(settings, null, 2)}\n\nCapability report\n${rows}\n\nNotes\n${profile.notes.map((note) => `- ${note}`).join('\n')}`
}
