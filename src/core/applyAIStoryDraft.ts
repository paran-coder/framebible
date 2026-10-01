import type { AIStoryDraft } from '../ai/story'
import type { AssetType, Project, Scene } from './types'
import { ensureSceneGeography } from './geography'

export function materializeAIStoryDraft(project: Project, draft: AIStoryDraft): Scene[] {
  const findAsset = (type: AssetType, name: string | null) => name
    ? project.assets.find((asset) => asset.type === type && asset.name.toLocaleLowerCase() === name.toLocaleLowerCase())
    : undefined

  return draft.scenes.map((item, sceneIndex) => {
    const scene: Scene = {
      id: `scene-${crypto.randomUUID()}`,
      order: sceneIndex + 1,
      title: item.title,
      purpose: item.purpose,
      emotionalBeat: item.emotionalBeat,
      durationSec: item.durationSec,
      timeOfDay: item.timeOfDay,
      weather: '',
      locationId: findAsset('location', item.locationName)?.id,
      characterBindings: item.characterNames.flatMap((name) => {
        const asset = findAsset('character', name)
        return asset ? [{ characterId: asset.id }] : []
      }),
      propIds: item.propNames.flatMap((name) => {
        const asset = findAsset('prop', name)
        return asset ? [asset.id] : []
      }),
      propStates: item.propNames.flatMap((name) => {
        const asset = findAsset('prop', name)
        return asset ? [{ propId: asset.id, presence: 'present' as const, condition: '' }] : []
      }),
      transitionEvents: [],
      shots: item.shots.map((shot, shotIndex) => ({
        id: `shot-${crypto.randomUUID()}`,
        order: shotIndex + 1,
        title: shot.title,
        durationSec: shot.durationSec,
        framing: shot.framing,
        focalLength: shot.focalLength,
        cameraHeight: 'eye level',
        cameraMovement: shot.cameraMovement,
        blocking: '',
        action: shot.action,
        lighting: 'inherit location lighting',
        audio: '',
        screenDirection: 'neutral' as const,
        entrySide: 'none' as const,
        exitSide: 'none' as const
      }))
    }
    return { ...scene, geography: ensureSceneGeography(scene, project.styleDNA.aspectRatio) }
  })
}
