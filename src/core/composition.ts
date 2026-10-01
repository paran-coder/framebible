import type { Scene, Shot } from './types'

export interface ShotTreatment {
  id: string
  name: string
  intent: string
  patch: Partial<Shot>
  changes: string[]
}

export function buildShotTreatments(scene: Scene, shot: Shot): ShotTreatment[] {
  const beat = scene.emotionalBeat.toLowerCase()
  const suspense = beat.includes('fear') || beat.includes('unease') || beat.includes('suspense')

  return [
    {
      id: 'clarity',
      name: 'Spatial clarity',
      intent: '공간과 행동 관계를 먼저 읽히게 하는 안전한 구성',
      patch: {
        framing: 'medium-wide with layered foreground',
        focalLength: '35mm',
        cameraHeight: 'eye level',
        cameraMovement: 'slow, restrained dolly aligned with subject movement'
      },
      changes: ['35mm로 공간 정보 확보', '전경 레이어 추가', '피사체 동선과 같은 축으로 이동']
    },
    {
      id: 'intimate',
      name: 'Intimate pressure',
      intent: '표정과 미세 행동을 우선해 감정 압력을 높이는 구성',
      patch: {
        framing: 'tight medium close-up with negative space',
        focalLength: '50mm',
        cameraHeight: 'slightly below eye level',
        cameraMovement: 'very slow 5–8% push-in; no lateral drift'
      },
      changes: ['50mm로 배경 분리', '네거티브 스페이스 확보', '미세한 push-in으로 압박 강화']
    },
    {
      id: 'suspense',
      name: suspense ? 'Threat compression' : 'Graphic tension',
      intent: suspense ? '공간을 압축하고 가려진 정보를 남겨 위협을 키우는 구성' : '전경 차폐와 비대칭 균형으로 긴장을 추가하는 구성',
      patch: {
        framing: 'compressed medium-long shot through foreground obstruction',
        focalLength: '85mm',
        cameraHeight: 'shoulder height',
        cameraMovement: 'locked-off; let subject cross depth inside the frame'
      },
      changes: ['85mm로 거리 압축', '전경 차폐', '카메라 대신 피사체가 프레임 깊이를 이동']
    }
  ].map((treatment) => ({ ...treatment, patch: { ...treatment.patch, lighting: shot.lighting } }))
}
