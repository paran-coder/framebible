import type { ScenePromptIR } from '../promptIR'
import type { PromptAdapter } from './types'

function sentenceList(values: string[]): string {
  return values.filter(Boolean).join(' ')
}

export const veoAdapter: PromptAdapter = {
  id: 'veo',
  label: 'Veo',
  renderScene: (ir: ScenePromptIR) => {
    const cast = ir.characters.map((character) => sentenceList([
      `@${character.name}: ${character.description}.`,
      character.identity.length ? `Identity: ${character.identity.join(', ')}.` : '',
      `Wardrobe/state: ${character.wardrobe}; variant ${character.variantName}.`,
      character.physicalState ? `Physical state: ${character.physicalState}.` : '',
      character.wetState ? `Wetness: ${character.wetState}.` : '',
      character.injuryState ? `Injury: ${character.injuryState}.` : ''
    ])).join('\n')
    const props = ir.props.map((prop) => `@${prop.name}: ${prop.description}${prop.owner ? `; owner @${prop.owner}` : ''}${prop.condition ? `; condition ${prop.condition}` : ''}.`).join('\n')
    const shots = ir.shots.map((shot) => sentenceList([
      `Shot ${String(shot.order).padStart(2, '0')} (${shot.durationSec}s):`,
      `${shot.framing}, ${shot.focalLength}, ${shot.cameraHeight}.`,
      `Camera ${shot.cameraMovement}.`,
      `Blocking: ${shot.blocking}.`,
      `Action: ${shot.action}.`,
      `Lighting: ${shot.lighting}.`,
      shot.audio ? `Audio: ${shot.audio}.` : ''
    ])).join('\n\n')
    return [
      '[CINEMATOGRAPHY]',
      `${ir.style.cameraLanguage}. Aspect ratio ${ir.style.aspectRatio}. Capture: ${ir.style.capture}.`,
      ir.geographyLines.join(' '),
      ir.cameraPathLines.join(' '),
      '',
      '[SUBJECTS]',
      cast || 'No named character binding.',
      props ? `Key props:\n${props}` : '',
      '',
      '[ACTION]',
      `Scene: ${ir.scene.title}. Intent: ${ir.scene.purpose}. Emotional beat: ${ir.scene.emotionalBeat}.`,
      ir.spatialTransitionLines.length ? `Explicit movement: ${ir.spatialTransitionLines.join(' ')}` : `First frame blocking: ${ir.firstFrameBlocking}.`,
      'Shot plan:',
      shots,
      '',
      '[CONTEXT]',
      ir.location ? `@${ir.location.name}. ${ir.location.description}. Architecture: ${ir.location.architecture}. Lighting continuity: ${ir.location.lighting}.` : 'No named location binding.',
      `Time: ${ir.scene.timeOfDay}.${ir.scene.weather ? ` Weather: ${ir.scene.weather}.` : ''}`,
      '',
      '[STYLE + AMBIANCE]',
      `${ir.style.genre}; ${ir.style.palette}; ${ir.style.texture}. Lighting language: ${ir.style.lightingLanguage}.`,
      '',
      '[CONTINUITY]',
      ir.continuityLocks.join(' ') || 'Respect bound asset identity and scene continuity.',
      ir.intentionalTransitions.length ? `Intentional changes: ${ir.intentionalTransitions.join('; ')}.` : '',
      ir.style.negativeRules.length ? `Avoid: ${ir.style.negativeRules.join('; ')}.` : ''
    ].filter(Boolean).join('\n').trim()
  }
}
