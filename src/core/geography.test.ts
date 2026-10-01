import { describe, expect, it } from 'vitest'
import { angularDistance, compileCameraPath, compileSceneGeography, compileSpatialTransitions, createSpatialZone, ensureSceneGeography, findSnapZone, horizontalFovDeg, parseFocalLengthMm, spatialZone, zoneAtPoint } from './geography'
import { sampleProject } from '../data/sampleProject'

describe('geography', () => {
  it('parses focal length and computes a plausible FOV', () => {
    expect(parseFocalLengthMm('35 mm')).toBe(35)
    expect(Math.round(horizontalFovDeg(35))).toBe(54)
  })

  it('hydrates all bound characters, props and shots', () => {
    const scene = sampleProject.scenes[0]
    const geography = ensureSceneGeography({ ...scene, geography: undefined }, sampleProject.styleDNA.aspectRatio)
    expect(geography.characterPlacements).toHaveLength(scene.characterBindings.length)
    expect(geography.propPlacements).toHaveLength(scene.propIds.length)
    expect(geography.shotCameras).toHaveLength(scene.shots.length)
  })

  it('serializes deterministic geography lines', () => {
    const lines = compileSceneGeography(sampleProject, sampleProject.scenes[0])
    expect(lines.some((line) => line.includes('@Mira stands'))).toBe(true)
    expect(lines.some((line) => line.includes('Shot 01 camera'))).toBe(true)
  })


  it('preserves background transforms while hydrating scene geography', () => {
    const scene = structuredClone(sampleProject.scenes[0])
    scene.geography = {
      ...ensureSceneGeography(scene, sampleProject.styleDNA.aspectRatio),
      background: {
        reference: { id: 'bg-1', name: 'floorplan.png', dataUrl: 'data:image/png;base64,AAAA' },
        opacity: 1.8,
        x: -0.2,
        y: 1.2,
        scale: 9,
        rotationDeg: 725,
        fit: 'contain'
      }
    }
    const hydrated = ensureSceneGeography(scene, sampleProject.styleDNA.aspectRatio)
    expect(hydrated.background?.opacity).toBe(1)
    expect(hydrated.background?.x).toBe(0)
    expect(hydrated.background?.y).toBe(1)
    expect(hydrated.background?.scale).toBe(4)
    expect(hydrated.background?.rotationDeg).toBe(5)
  })

  it('compiles ordered camera path and spatial transitions', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    scene.spatialTransitions = [{
      id: 'spatial-1', subjectType: 'camera', fromShotId: scene.shots[0].id, toShotId: scene.shots[1]?.id,
      from: 'left foreground', to: 'center foreground', motion: 'slow dolly forward', note: 'Preserve eyeline.'
    }]
    expect(compileCameraPath(project, scene)[0]).toContain('Shot 01')
    expect(compileSpatialTransitions(project, scene)[0]).toContain('slow dolly forward')
  })


  it('resolves structured spatial zones in geography and transitions', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
    const doorway = createSpatialZone('doorway', 0)
    doorway.name = 'Lobby Door'
    doorway.x = geography.characterPlacements[0]?.x ?? 0.5
    doorway.y = geography.characterPlacements[0]?.y ?? 0.5
    doorway.width = 0.3
    doorway.height = 0.3
    scene.geography = { ...geography, zones: [doorway] }
    scene.spatialTransitions = [{ id: 'zone-transition', subjectType: 'camera', fromZoneId: doorway.id, toZoneId: doorway.id, from: 'fallback', to: 'fallback', motion: 'slow dolly', note: '' }]
    expect(zoneAtPoint(scene.geography, doorway.x, doorway.y)?.id).toBe(doorway.id)
    expect(compileSceneGeography(project, scene).join('\n')).toContain('Lobby Door')
    expect(compileSpatialTransitions(project, scene)[0]).toContain('Lobby Door')
    expect(compileSpatialTransitions(project, scene)[0]).not.toContain('fallback')
  })


  it('finds conservative snap candidates and preserves explicit zone bindings in prompt geography', () => {
    const project = structuredClone(sampleProject)
    const scene = project.scenes[0]
    const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
    const doorway = createSpatialZone('doorway', 0)
    doorway.name = 'Doorway A'
    doorway.x = 0.25
    doorway.y = 0.5
    doorway.width = 0.12
    doorway.height = 0.24
    scene.geography = { ...geography, zones: [doorway], characterPlacements: geography.characterPlacements.map((item, index) => index === 0 ? { ...item, x: 0.25, y: 0.5, zoneId: doorway.id } : item) }
    const hydrated = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
    expect(findSnapZone(hydrated, 0.18, 0.5)?.zone.id).toBe(doorway.id)
    expect(findSnapZone(hydrated, 0.8, 0.8)).toBeUndefined()
    expect(compileSceneGeography(project, scene).join('\n')).toContain('at spatial zone "Doorway A"')
  })

  it('quantizes spatial zones and angular distance', () => {
    expect(spatialZone(0.1, 0.9)).toBe('left foreground')
    expect(angularDistance(350, 10)).toBe(20)
  })
})
