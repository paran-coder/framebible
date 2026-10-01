import { describe, expect, it } from 'vitest'
import { contactSheetHtml } from './contactSheet'
import { sampleProject } from '../data/sampleProject'

describe('contact sheet', () => {
  it('renders all shots and escapes user text', () => {
    const project = structuredClone(sampleProject)
    project.scenes[0].shots[0].title = '<script>alert(1)</script>'
    const html = contactSheetHtml(project, project.scenes[0])
    expect(html).toContain('SHOT 01')
    expect(html).toContain('SHOT 02')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
