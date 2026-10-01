import type { CharacterAsset, Project, ReferenceImage, Scene } from './types'

export type SceneReferenceRole = 'character' | 'variant' | 'location' | 'prop' | 'background'

export interface SceneReferenceItem {
  id: string
  role: SceneReferenceRole
  assetId?: string
  assetName: string
  variantId?: string
  variantName?: string
  reference: ReferenceImage
}

export function collectSceneReferences(project: Project, scene: Scene): SceneReferenceItem[] {
  const items: SceneReferenceItem[] = []
  const push = (item: SceneReferenceItem) => {
    if (!items.some((existing) => existing.id === item.id)) items.push(item)
  }

  for (const binding of scene.characterBindings) {
    const asset = project.assets.find((candidate): candidate is CharacterAsset => candidate.id === binding.characterId && candidate.type === 'character')
    if (!asset) continue
    for (const reference of asset.references) push({ id: reference.id, role: 'character', assetId: asset.id, assetName: asset.name, reference })
    const variant = asset.variants.find((candidate) => candidate.id === binding.variantId)
    if (variant) for (const reference of variant.references) push({ id: reference.id, role: 'variant', assetId: asset.id, assetName: asset.name, variantId: variant.id, variantName: variant.name, reference })
  }

  const location = project.assets.find((asset) => asset.id === scene.locationId && asset.type === 'location')
  if (location) for (const reference of location.references) push({ id: reference.id, role: 'location', assetId: location.id, assetName: location.name, reference })

  for (const propId of scene.propIds) {
    const prop = project.assets.find((asset) => asset.id === propId && asset.type === 'prop')
    if (prop) for (const reference of prop.references) push({ id: reference.id, role: 'prop', assetId: prop.id, assetName: prop.name, reference })
  }

  const background = scene.geography?.background?.reference
  if (background) push({ id: background.id, role: 'background', assetName: 'Blocking Board Background', reference: background })

  return items
}

export function sceneReferenceMap(project: Project, scene: Scene): Map<string, SceneReferenceItem> {
  return new Map(collectSceneReferences(project, scene).map((item) => [item.id, item]))
}
