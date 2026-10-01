import { describe, expect, it } from 'vitest'
import { aiStoryDraftSchema } from './story'

describe('AI story schema', () => {
  it('accepts a compact filmable story draft', () => {
    const parsed = aiStoryDraftSchema.parse({
      logline: 'A courier finds evidence in a hotel.',
      scenes: [{
        title: 'Arrival', purpose: 'Establish suspicion', emotionalBeat: 'unease', durationSec: 8, timeOfDay: 'pre-dawn',
        locationName: 'Hotel Lobby', characterNames: ['Mira'], propNames: [],
        shots: [{ title: 'Entrance', durationSec: 4, framing: 'wide', focalLength: '32mm', cameraMovement: 'slow dolly', action: 'Mira enters.' }]
      }]
    })
    expect(parsed.scenes[0].shots[0].focalLength).toBe('32mm')
  })

  it('rejects a draft without shots', () => {
    expect(() => aiStoryDraftSchema.parse({ logline: 'x', scenes: [{ title: 'x', purpose: 'x', emotionalBeat: 'x', durationSec: 4, timeOfDay: '', locationName: null, characterNames: [], propNames: [], shots: [] }] })).toThrow()
  })
})
