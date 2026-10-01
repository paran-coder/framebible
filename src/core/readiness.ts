import { resolveGenerationSettings, validateGenerationSettings } from './capabilities'
import { lintProject } from './continuity'
import { referenceFileInfo } from './generationManifest'
import { collectSceneReferences } from './sceneReferences'
import type { GenerationTarget, Project, Scene } from './types'

export type ReadinessStatus = 'ready' | 'needs-review' | 'blocked'
export type ReadinessCategory = 'capability' | 'continuity' | 'package' | 'shot' | 'scene'

export interface ReadinessItem {
  id: string
  status: Exclude<ReadinessStatus, 'ready'>
  category: ReadinessCategory
  message: string
  sceneId: string
  shotId?: string
}

export interface SceneReadiness {
  sceneId: string
  sceneOrder: number
  title: string
  status: ReadinessStatus
  blockers: ReadinessItem[]
  reviews: ReadinessItem[]
}

export interface ProjectReadiness {
  model: GenerationTarget
  status: ReadinessStatus
  scenes: SceneReadiness[]
  counts: { ready: number; needsReview: number; blocked: number }
}

const rank: Record<ReadinessStatus, number> = { ready: 0, 'needs-review': 1, blocked: 2 }

function statusFrom(blockers: ReadinessItem[], reviews: ReadinessItem[]): ReadinessStatus {
  return blockers.length ? 'blocked' : reviews.length ? 'needs-review' : 'ready'
}

function sceneReadiness(project: Project, scene: Scene, model: GenerationTarget): SceneReadiness {
  const blockers: ReadinessItem[] = []
  const reviews: ReadinessItem[] = []
  const push = (status: 'blocked' | 'needs-review', category: ReadinessCategory, id: string, message: string, shotId?: string) => {
    const target = status === 'blocked' ? blockers : reviews
    target.push({ id: `${scene.id}-${id}`, status, category, message, sceneId: scene.id, shotId })
  }

  const settings = resolveGenerationSettings(project, scene, model)
  for (const issue of validateGenerationSettings(project, scene, model, settings)) {
    if (issue.severity === 'error') push('blocked', 'capability', issue.id, issue.message)
    else if (issue.severity === 'warning') push('needs-review', 'capability', issue.id, issue.message)
  }

  for (const issue of lintProject(project).filter((item) => item.sceneId === scene.id)) {
    if (issue.severity === 'error') push('blocked', 'continuity', issue.id, issue.detail, issue.shotId)
    else if (issue.severity === 'warning') push('needs-review', 'continuity', issue.id, issue.detail, issue.shotId)
  }

  const references = new Map(collectSceneReferences(project, scene).map((item) => [item.id, item]))
  const requiredReferenceIds = new Set([...settings.referenceImageIds, settings.firstFrameReferenceId, settings.lastFrameReferenceId].filter(Boolean) as string[])
  for (const referenceId of requiredReferenceIds) {
    const item = references.get(referenceId)
    if (!item || !referenceFileInfo(item.reference)) push('blocked', 'package', `missing-reference-${referenceId}`, 'Generation에 선택된 레퍼런스 파일을 Scene Package에 포함할 수 없습니다.')
  }

  if (!scene.title.trim()) push('needs-review', 'scene', 'scene-title', 'Scene 제목이 비어 있습니다.')
  if (!scene.purpose.trim()) push('needs-review', 'scene', 'scene-purpose', 'Scene 목적이 비어 있습니다.')
  if (!scene.locationId) push('needs-review', 'scene', 'scene-location', 'Scene Location이 지정되지 않았습니다.')

  for (const shot of scene.shots) {
    if (!shot.title.trim()) push('needs-review', 'shot', `shot-title-${shot.id}`, `Shot ${shot.order} 제목이 비어 있습니다.`, shot.id)
    if (!shot.framing.trim() || !shot.focalLength.trim()) push('needs-review', 'shot', `shot-camera-${shot.id}`, `Shot ${shot.order}의 framing/focal length를 확인하세요.`, shot.id)
    if (!shot.action.trim()) push('needs-review', 'shot', `shot-action-${shot.id}`, `Shot ${shot.order} Action이 비어 있습니다.`, shot.id)
  }

  return { sceneId: scene.id, sceneOrder: scene.order, title: scene.title, status: statusFrom(blockers, reviews), blockers, reviews }
}

export function buildProjectReadiness(project: Project, model: GenerationTarget): ProjectReadiness {
  const scenes = [...project.scenes].sort((a, b) => a.order - b.order).map((scene) => sceneReadiness(project, scene, model))
  const status = scenes.reduce<ReadinessStatus>((worst, item) => rank[item.status] > rank[worst] ? item.status : worst, 'ready')
  return {
    model,
    status,
    scenes,
    counts: {
      ready: scenes.filter((item) => item.status === 'ready').length,
      needsReview: scenes.filter((item) => item.status === 'needs-review').length,
      blocked: scenes.filter((item) => item.status === 'blocked').length
    }
  }
}
