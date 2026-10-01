import JSZip from 'jszip'
import { compileProjectForModel } from './promptCompiler'
import type { PromptModel } from './promptIR'
import type { Project, ReferenceImage } from './types'

export function projectJson(project: Project): string {
  return JSON.stringify(project, null, 2)
}

export async function projectZip(project: Project, model: PromptModel = 'seedance'): Promise<Blob> {
  const zip = new JSZip()
  zip.file('project.json', projectJson(project))
  zip.file('README.txt', `FrameBible local project export. Prompt target: ${model}. API keys and AI session state are never included.`)

  const promptFolder = zip.folder(`prompts/${model}`)
  const prompts = compileProjectForModel(project, model)
  for (const [filename, content] of Object.entries(prompts)) promptFolder?.file(filename, content)

  const references = zip.folder('references')
  for (const asset of project.assets) {
    exportReferences(references, `${asset.type}-${asset.name}`, asset.references)
    if (asset.type === 'character') {
      for (const variant of asset.variants) exportReferences(references, `${asset.type}-${asset.name}/variants/${variant.name}`, variant.references)
    }
  }
  for (const scene of project.scenes) {
    const background = scene.geography?.background?.reference
    if (background) exportReferences(references, `scenes/${String(scene.order).padStart(2, '0')}-${scene.title}/background`, [background])
  }

  return zip.generateAsync({ type: 'blob' })
}

function exportReferences(root: JSZip | null, folderName: string, items: ReferenceImage[]): void {
  for (const reference of items) {
    const file = dataUrlFile(reference)
    if (!file) continue
    root?.folder(folderName.split('/').map(safeName).join('/'))?.file(safeName(file.name), file.base64, { base64: true })
  }
}

function dataUrlFile(reference: ReferenceImage): { name: string; base64: string } | null {
  if (!reference.dataUrl) return null
  const match = /^data:([^;,]+);base64,(.+)$/i.exec(reference.dataUrl)
  if (!match) return null
  const extension = mimeExtension(reference.mimeType ?? match[1])
  const base = reference.name.replace(/\.[a-z0-9]+$/i, '') || 'reference'
  return { name: `${base}.${extension}`, base64: match[2] }
}

function mimeExtension(mime: string): string {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  if (mime === 'image/avif') return 'avif'
  return 'jpg'
}

function safeName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').slice(0, 90) || 'untitled'
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  const revoke = () => URL.revokeObjectURL(url)
  if (typeof window !== 'undefined') window.setTimeout(revoke, 0)
  else revoke()
}
