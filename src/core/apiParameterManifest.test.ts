import { describe, expect, it } from 'vitest'
import { buildApiParameterManifest } from './apiParameterManifest'
import { sampleProject } from '../data/sampleProject'

describe('API parameter manifests', () => {
  it('builds credential-free request templates for all targets', () => {
    for (const model of ['seedance', 'veo', 'kling'] as const) {
      const manifest = buildApiParameterManifest(structuredClone(sampleProject), sampleProject.scenes[0], model)
      expect(manifest.security.credentialsIncluded).toBe(false)
      expect(JSON.stringify(manifest.request)).not.toMatch(/authorization|api.?key|credential|secret/i)
    }
  })

  it('maps a Seedance first-frame workflow to image-to-video', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    const character = project.assets.find((asset) => asset.type === 'character')!
    character.references.push({ id: 'ref-first', name: 'first.png', mimeType: 'image/png', dataUrl: 'data:image/png;base64,AA==' })
    scene.generation = { seedance: { durationSec: 8, aspectRatio: '16:9', resolution: '720p', audio: 'on', frameMode: 'first-image', firstFrameReferenceId: 'ref-first', referenceImageIds: [] } }
    const manifest = buildApiParameterManifest(project, scene, 'seedance')
    expect(manifest.transport.endpoint).toContain('image-to-video')
    expect(manifest.request.image_url).toContain('package://references/character/')
  })

  it('uses the official Veo 3.1 model template', () => {
    const manifest = buildApiParameterManifest(structuredClone(sampleProject), sampleProject.scenes[0], 'veo')
    expect(manifest.transport.sdk).toBe('@google/genai')
    expect(manifest.request.model).toBe('veo-3.1-generate-preview')
  })
})
