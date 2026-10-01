import type { Project, ReferenceImage } from './types'

const MAX_INPUT_BYTES = 20 * 1024 * 1024
const TARGET_MAX_DIMENSION = 1600
const RECOMPRESS_THRESHOLD_BYTES = 900 * 1024
const WEBP_QUALITY = 0.82
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'])

export async function referencesFromFiles(files: File[], concurrency = 2): Promise<ReferenceImage[]> {
  const results = new Array<ReferenceImage>(files.length)
  let cursor = 0
  const worker = async () => {
    while (cursor < files.length) {
      const index = cursor
      cursor += 1
      results[index] = await referenceFromFile(files[index])
    }
  }
  const workerCount = Math.max(1, Math.min(concurrency, files.length))
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export async function referenceFromFile(file: File): Promise<ReferenceImage> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) throw new Error('JPEG, PNG, WebP, GIF, AVIF 이미지만 추가할 수 있습니다.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('레퍼런스 원본은 파일당 20MB 이하만 지원합니다.')

  if (file.type === 'image/gif') {
    const dataUrl = await blobToDataUrl(file)
    const dimensions = await readImageDimensions(file).catch(() => ({}))
    return {
      id: `ref-${crypto.randomUUID()}`,
      name: file.name,
      dataUrl,
      mimeType: file.type,
      bytes: file.size,
      originalBytes: file.size,
      optimized: false,
      ...dimensions
    }
  }

  try {
    const bitmap = await createBitmap(file)
    const originalWidth = bitmap.width
    const originalHeight = bitmap.height
    const scale = Math.min(1, TARGET_MAX_DIMENSION / Math.max(originalWidth, originalHeight))
    const width = Math.max(1, Math.round(originalWidth * scale))
    const height = Math.max(1, Math.round(originalHeight * scale))
    const shouldOptimize = scale < 1 || file.size > RECOMPRESS_THRESHOLD_BYTES

    if (!shouldOptimize) {
      bitmap.close?.()
      return {
        id: `ref-${crypto.randomUUID()}`,
        name: file.name,
        dataUrl: await blobToDataUrl(file),
        mimeType: file.type,
        width: originalWidth,
        height: originalHeight,
        bytes: file.size,
        originalBytes: file.size,
        optimized: false
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { alpha: true })
    if (!context) throw new Error('Canvas context unavailable')
    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()

    const optimizedBlob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)
    const useOptimized = optimizedBlob.size < file.size
    const chosen = useOptimized ? optimizedBlob : file
    const mimeType = useOptimized ? 'image/webp' : file.type
    return {
      id: `ref-${crypto.randomUUID()}`,
      name: file.name,
      dataUrl: await blobToDataUrl(chosen),
      mimeType,
      width: useOptimized ? width : originalWidth,
      height: useOptimized ? height : originalHeight,
      bytes: chosen.size,
      originalBytes: file.size,
      optimized: useOptimized
    }
  } catch {
    const dataUrl = await blobToDataUrl(file)
    const dimensions = await readImageDimensions(file).catch(() => ({}))
    return {
      id: `ref-${crypto.randomUUID()}`,
      name: file.name,
      dataUrl,
      mimeType: file.type,
      bytes: file.size,
      originalBytes: file.size,
      optimized: false,
      ...dimensions
    }
  }
}

export function referenceBytes(reference: ReferenceImage): number {
  if (typeof reference.bytes === 'number') return reference.bytes
  if (!reference.dataUrl) return 0
  const comma = reference.dataUrl.indexOf(',')
  if (comma < 0) return new Blob([reference.dataUrl]).size
  const payload = reference.dataUrl.slice(comma + 1)
  return Math.floor(payload.length * 0.75)
}

export interface ProjectReferenceStats {
  count: number
  payloadBytes: number
  estimatedProjectBytes: number
}

export function projectReferenceStats(project: Project): ProjectReferenceStats {
  let count = 0
  let payloadBytes = 0
  let serializedDataUrlBytes = 0
  const visit = (reference: ReferenceImage) => {
    count += 1
    payloadBytes += referenceBytes(reference)
    serializedDataUrlBytes += reference.dataUrl?.length ?? 0
  }
  for (const asset of project.assets) {
    asset.references.forEach(visit)
    if (asset.type === 'character') for (const variant of asset.variants) variant.references.forEach(visit)
  }
  for (const scene of project.scenes) {
    const background = scene.geography?.background?.reference
    if (background) visit(background)
  }
  const skeleton = JSON.stringify(project, (key, value) => key === 'dataUrl' && typeof value === 'string' ? '' : value)
  const skeletonBytes = new TextEncoder().encode(skeleton).byteLength
  return { count, payloadBytes, estimatedProjectBytes: skeletonBytes + serializedDataUrlBytes }
}

export function projectReferenceBytes(project: Project): number {
  return projectReferenceStats(project).payloadBytes
}

export function projectStorageEstimateBytes(project: Project): number {
  return projectReferenceStats(project).estimatedProjectBytes
}

export function countProjectReferences(project: Project): number {
  return projectReferenceStats(project).count
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`
  const mb = kb / 1024
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`
}

async function createBitmap(file: Blob): Promise<ImageBitmap> {
  if (typeof createImageBitmap !== 'function') throw new Error('createImageBitmap unavailable')
  return createImageBitmap(file)
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('이미지를 최적화하지 못했습니다.')), type, quality))
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('이미지를 읽지 못했습니다.'))
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다.'))
    reader.readAsDataURL(blob)
  })
}

async function readImageDimensions(blob: Blob): Promise<{ width?: number; height?: number }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    const result = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return result
  }
  return {}
}
