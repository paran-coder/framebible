import { describe, expect, it } from 'vitest'
import { sampleProject } from '../data/sampleProject'
import { countProjectReferences, formatBytes, projectReferenceBytes, projectStorageEstimateBytes, referenceBytes } from './referenceImages'

describe('reference media accounting', () => {
  it('counts asset and variant references together', () => {
    const project = structuredClone(sampleProject)
    const ref = { id: 'ref-test', name: 'test.png', dataUrl: `data:image/png;base64,${'A'.repeat(1368)}` }
    project.assets[0].references = [ref]
    const character = project.assets[0]
    if (character.type !== 'character') throw new Error('fixture character missing')
    character.variants[0].references = [{ ...ref, id: 'ref-variant' }]
    expect(countProjectReferences(project)).toBe(2)
    expect(projectReferenceBytes(project)).toBeGreaterThan(1900)
    expect(projectStorageEstimateBytes(project)).toBeGreaterThan(projectReferenceBytes(project))
  })

  it('formats bytes without fake precision', () => {
    expect(referenceBytes({ id: 'a', name: 'a', bytes: 1024 })).toBe(1024)
    expect(formatBytes(1024)).toBe('1.0 KB')
  })
})
