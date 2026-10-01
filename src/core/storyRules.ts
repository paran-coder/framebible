export interface StoryBeatDraft {
  id: string
  label: string
  purpose: string
  prompt: string
}

export function buildRuleBasedStoryDraft(idea: string): StoryBeatDraft[] {
  const cleanIdea = idea.trim() || '주인공이 익숙한 공간에서 예상하지 못한 단서를 발견한다.'
  return [
    {
      id: 'hook',
      label: 'HOOK',
      purpose: '상황과 시각적 질문을 즉시 제시',
      prompt: `${cleanIdea} 첫 20~25%에서는 장소·주인공·이상 징후 하나만 명확하게 보여줍니다.`
    },
    {
      id: 'pressure',
      label: 'PRESSURE',
      purpose: '첫 단서가 행동을 바꾸도록 압력 증가',
      prompt: '주인공이 방금 본 단서를 확인하려 움직이면서 위험 또는 욕망이 더 구체적으로 드러납니다.'
    },
    {
      id: 'turn',
      label: 'TURN',
      purpose: '이전 해석을 뒤집는 정보 제공',
      prompt: '새로운 시각 정보 하나가 등장해 주인공과 관객이 상황을 다시 해석하게 만듭니다.'
    },
    {
      id: 'payoff',
      label: 'PAYOFF',
      purpose: '마지막 이미지로 질문을 회수하거나 더 강하게 남김',
      prompt: '설명 대사보다 행동·소품·프레이밍으로 결말을 전달하고 마지막 프레임에 하나의 강한 정보만 남깁니다.'
    }
  ]
}
