import { describe, expect, it } from 'vitest'
import { buildRuleBasedStoryDraft } from './storyRules'

describe('story draft rules', () => {
  it('builds a four-beat scaffold from natural language', () => {
    const beats = buildRuleBasedStoryDraft('A courier enters a hotel and sees a key waiting for her.')
    expect(beats.map((beat) => beat.label)).toEqual(['HOOK', 'PRESSURE', 'TURN', 'PAYOFF'])
  })
})
