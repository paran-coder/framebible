import { resolveGenerationSettings } from './capabilities'
import { sceneReferenceMap } from './sceneReferences'
import { sceneReferencePackagePath } from './generationManifest'
import { compileSceneForModel } from './promptCompiler'
import type { GenerationTarget, Project, Scene } from './types'

export type ApiManifestTransport = 'http-json' | 'sdk-template'

export interface ApiParameterManifest {
  format: 'framebible-api-parameter-manifest'
  formatVersion: 1
  provider: 'higgsfield' | 'google' | 'kling'
  model: GenerationTarget
  generatedFrom: { projectId: string; sceneId: string }
  transport: {
    kind: ApiManifestTransport
    endpoint?: string
    method?: string
    sdk?: string
  }
  request: Record<string, unknown>
  packageInputs: Array<{ referenceId: string; packageUri?: string; usage: 'first-frame' | 'last-frame' | 'reference' }>
  unresolvedInputs: Array<{ referenceId: string; packageUri?: string; reason: string }>
  security: {
    credentialsIncluded: false
    note: string
  }
  sourceUrl: string
}

function packageUri(project: Project, scene: Scene, referenceId?: string): string | undefined {
  if (!referenceId) return undefined
  const item = sceneReferenceMap(project, scene).get(referenceId)
  if (!item) return undefined
  const path = sceneReferencePackagePath(item)
  return path ? `package://${path}` : undefined
}

function selectedUris(project: Project, scene: Scene, ids: string[]) {
  return ids.map((id) => ({ id, uri: packageUri(project, scene, id) }))
}


function packageInputs(project: Project, scene: Scene, settings: ReturnType<typeof resolveGenerationSettings>): ApiParameterManifest['packageInputs'] {
  const rows: ApiParameterManifest['packageInputs'] = []
  const push = (referenceId: string | undefined, usage: 'first-frame' | 'last-frame' | 'reference') => {
    if (!referenceId || rows.some((item) => item.referenceId === referenceId && item.usage === usage)) return
    rows.push({ referenceId, packageUri: packageUri(project, scene, referenceId), usage })
  }
  push(settings.firstFrameReferenceId, 'first-frame')
  push(settings.lastFrameReferenceId, 'last-frame')
  for (const id of settings.referenceImageIds) push(id, 'reference')
  return rows
}

function audioEnabled(value: 'auto' | 'on' | 'off'): boolean {
  return value !== 'off'
}

function seedanceManifest(project: Project, scene: Scene): ApiParameterManifest {
  const settings = resolveGenerationSettings(project, scene, 'seedance')
  const prompt = compileSceneForModel(project, scene, 'seedance')
  const first = packageUri(project, scene, settings.firstFrameReferenceId)
  const last = packageUri(project, scene, settings.lastFrameReferenceId)
  const selected = selectedUris(project, scene, settings.referenceImageIds)
  const unresolvedInputs: ApiParameterManifest['unresolvedInputs'] = []
  selected.filter((item) => !item.uri).forEach((item) => unresolvedInputs.push({ referenceId: item.id, reason: 'Reference has no package file payload.' }))

  let endpoint = 'https://api.higgsfield.ai/bytedance/seedance-2.5/text-to-video'
  let request: Record<string, unknown> = {
    prompt,
    duration: settings.durationSec,
    resolution: settings.resolution,
    aspect_ratio: settings.aspectRatio,
    output_format: 'mp4',
    generate_audio: audioEnabled(settings.audio)
  }

  if (settings.frameMode !== 'prompt-only') {
    endpoint = 'https://api.higgsfield.ai/bytedance/seedance-2.5/image-to-video'
    request = {
      prompt,
      duration: settings.durationSec,
      image_url: first ?? 'package://MISSING_FIRST_FRAME',
      resolution: settings.resolution,
      ...(last ? { end_image_url: last } : {}),
      output_format: 'mp4',
      generate_audio: audioEnabled(settings.audio)
    }
    if (!first && settings.firstFrameReferenceId) unresolvedInputs.push({ referenceId: settings.firstFrameReferenceId, reason: 'First-frame reference has no package file payload.' })
    if (settings.lastFrameReferenceId && !last) unresolvedInputs.push({ referenceId: settings.lastFrameReferenceId, reason: 'Last-frame reference has no package file payload.' })
    for (const item of selected) {
      if (item.id !== settings.firstFrameReferenceId && item.id !== settings.lastFrameReferenceId) unresolvedInputs.push({ referenceId: item.id, packageUri: item.uri, reason: 'Seedance image-to-video does not map additional generation references into this request body. Choose the reference-to-video workflow or upload manually.' })
    }
  } else if (selected.length) {
    endpoint = 'https://api.higgsfield.ai/bytedance/seedance-2.5/reference-to-video'
    request = {
      prompt,
      duration: settings.durationSec,
      image_urls: selected.map((item) => item.uri ?? `package://MISSING_REFERENCE/${item.id}`),
      resolution: settings.resolution,
      aspect_ratio: settings.aspectRatio,
      output_format: 'mp4',
      generate_audio: audioEnabled(settings.audio)
    }
  }

  return {
    format: 'framebible-api-parameter-manifest', formatVersion: 1, provider: 'higgsfield', model: 'seedance',
    generatedFrom: { projectId: project.id, sceneId: scene.id },
    transport: { kind: 'http-json', endpoint, method: 'POST' }, request, packageInputs: packageInputs(project, scene, settings), unresolvedInputs,
    security: { credentialsIncluded: false, note: 'Add Higgsfield credentials only in a secure server-side execution layer.' },
    sourceUrl: 'https://open.higgsfield.ai/models/bytedance/seedance-2.5/text-to-video/api-reference'
  }
}

function veoManifest(project: Project, scene: Scene): ApiParameterManifest {
  const settings = resolveGenerationSettings(project, scene, 'veo')
  const prompt = compileSceneForModel(project, scene, 'veo')
  const first = packageUri(project, scene, settings.firstFrameReferenceId)
  const last = packageUri(project, scene, settings.lastFrameReferenceId)
  const selected = selectedUris(project, scene, settings.referenceImageIds)
  const unresolvedInputs: ApiParameterManifest['unresolvedInputs'] = []
  const imageTemplate = (uri: string) => ({ source: uri, note: 'Resolve package:// source to an Image object or inline bytes before calling @google/genai.' })
  const config: Record<string, unknown> = {
    aspectRatio: settings.aspectRatio,
    durationSeconds: settings.durationSec,
    resolution: settings.resolution,
    numberOfVideos: 1
  }
  if (last) config.lastFrame = imageTemplate(last)
  if (selected.length) config.referenceImages = selected.map((item) => ({ image: imageTemplate(item.uri ?? `package://MISSING_REFERENCE/${item.id}`), referenceType: 'asset' }))
  selected.filter((item) => !item.uri).forEach((item) => unresolvedInputs.push({ referenceId: item.id, reason: 'Reference has no package file payload.' }))
  if (settings.firstFrameReferenceId && !first) unresolvedInputs.push({ referenceId: settings.firstFrameReferenceId, reason: 'First-frame reference has no package file payload.' })
  if (settings.lastFrameReferenceId && !last) unresolvedInputs.push({ referenceId: settings.lastFrameReferenceId, reason: 'Last-frame reference has no package file payload.' })

  return {
    format: 'framebible-api-parameter-manifest', formatVersion: 1, provider: 'google', model: 'veo',
    generatedFrom: { projectId: project.id, sceneId: scene.id },
    transport: { kind: 'sdk-template', sdk: '@google/genai', method: 'ai.models.generateVideos' },
    request: {
      model: 'veo-3.1-generate-preview',
      prompt,
      ...(first ? { image: imageTemplate(first) } : {}),
      config
    },
    packageInputs: packageInputs(project, scene, settings),
    unresolvedInputs,
    security: { credentialsIncluded: false, note: 'Instantiate GoogleGenAI with credentials only in an appropriate secure execution environment.' },
    sourceUrl: 'https://ai.google.dev/gemini-api/docs/veo'
  }
}

function klingManifest(project: Project, scene: Scene): ApiParameterManifest {
  const settings = resolveGenerationSettings(project, scene, 'kling')
  const prompt = compileSceneForModel(project, scene, 'kling')
  const selected = selectedUris(project, scene, settings.referenceImageIds)
  const unresolvedInputs: ApiParameterManifest['unresolvedInputs'] = selected.map((item) => ({
    referenceId: item.id,
    packageUri: item.uri,
    reason: 'The verified Kling text-to-video baseline does not accept these image references. Choose a matching Kling image/reference endpoint before execution.'
  }))
  if (settings.frameMode !== 'prompt-only') {
    for (const id of [settings.firstFrameReferenceId, settings.lastFrameReferenceId].filter(Boolean) as string[]) unresolvedInputs.push({ referenceId: id, packageUri: packageUri(project, scene, id), reason: 'First/last-frame guidance is endpoint-dependent in Kling and is not mapped to the verified text-to-video request.' })
  }

  return {
    format: 'framebible-api-parameter-manifest', formatVersion: 1, provider: 'kling', model: 'kling',
    generatedFrom: { projectId: project.id, sceneId: scene.id },
    transport: { kind: 'http-json', endpoint: 'https://api-singapore.klingai.com/v1/videos/text2video', method: 'POST' },
    request: {
      model_name: 'kling-v2-6',
      prompt,
      negative_prompt: project.styleDNA.negativeRules.join(', '),
      duration: String(settings.durationSec),
      mode: 'pro',
      sound: settings.audio === 'off' ? 'off' : 'on',
      aspect_ratio: settings.aspectRatio,
      multi_shot: false
    },
    packageInputs: packageInputs(project, scene, settings),
    unresolvedInputs,
    security: { credentialsIncluded: false, note: 'Add the Kling Bearer token only in a secure execution layer. callback_url/external_task_id are intentionally omitted.' },
    sourceUrl: 'https://kling.ai/document-api/api/video/2-6/text-to-video/legacy'
  }
}

export function buildApiParameterManifest(project: Project, scene: Scene, model: GenerationTarget): ApiParameterManifest {
  if (model === 'seedance') return seedanceManifest(project, scene)
  if (model === 'veo') return veoManifest(project, scene)
  return klingManifest(project, scene)
}

export function apiParameterManifestJson(project: Project, scene: Scene, model: GenerationTarget): string {
  return JSON.stringify(buildApiParameterManifest(project, scene, model), null, 2)
}
