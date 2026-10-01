import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { compileCharacterSheetPrompt, compileIdentityReferencePrompt } from './characterCompiler'

const character = sampleProject.assets.find((asset) => asset.type === 'character')
if (!character || character.type !== 'character') throw new Error('sample character missing')

describe('character prompt compiler', () => {
  it('separates master sheet and identity reference goals', () => {
    expect(compileCharacterSheetPrompt(character)).toContain('full-body front view')
    expect(compileIdentityReferencePrompt(character)).toContain('one dominant face only')
  })
})
