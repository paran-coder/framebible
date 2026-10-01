import type { ScenePromptIR } from '../promptIR'
import type { PromptAdapter } from './types'

export const klingAdapter: PromptAdapter = {
  id: 'kling',
  label: 'Kling',
  renderScene: (ir: ScenePromptIR) => {
    const subjectLines = ir.characters.map((character) => `@${character.name} — ${character.description}; identity ${character.identity.join(', ')}; ${character.variantName} variant; wardrobe ${character.wardrobe}${character.physicalState ? `; state ${character.physicalState}` : ''}${character.wetState ? `; ${character.wetState}` : ''}${character.injuryState ? `; injury ${character.injuryState}` : ''}.`)
    const propLines = ir.props.map((prop) => `@${prop.name} — ${prop.description}${prop.owner ? `; owner @${prop.owner}` : ''}${prop.condition ? `; condition ${prop.condition}` : ''}.`)
    const shotLines = ir.shots.map((shot) => `SHOT ${String(shot.order).padStart(2, '0')} · ${shot.durationSec}s · ${shot.framing} · ${shot.focalLength} · ${shot.cameraMovement} · ${shot.blocking} · ${shot.action} · lighting ${shot.lighting}${shot.audio ? ` · audio ${shot.audio}` : ''}`)
    return [
      '[SUBJECT]',
      [...subjectLines, ...propLines].join('\n') || 'No named subject.',
      '',
      '[ENVIRONMENT]',
      ir.location ? `@${ir.location.name}: ${ir.location.description}; ${ir.location.architecture}.` : 'No named location.',
      `${ir.scene.timeOfDay}${ir.scene.weather ? `; ${ir.scene.weather}` : ''}.`,
      '',
      '[ACTION + BLOCKING]',
      ir.spatialTransitionLines.join('\n') || ir.firstFrameBlocking,
      '',
      '[CAMERA + COMPOSITION]',
      ir.geographyLines.join('\n'),
      ir.cameraPathLines.join('\n'),
      '',
      '[SHOT SEQUENCE]',
      shotLines.join('\n'),
      '',
      '[STYLE]',
      `${ir.style.genre}; ${ir.style.capture}; ${ir.style.cameraLanguage}; ${ir.style.lightingLanguage}; ${ir.style.palette}; ${ir.style.texture}; ${ir.style.aspectRatio}.`,
      '',
      '[CONTINUITY]',
      ir.continuityLocks.join('\n') || 'Maintain identity and scene continuity.',
      ir.intentionalTransitions.length ? `Intentional changes: ${ir.intentionalTransitions.join('; ')}.` : '',
      '',
      '[NEGATIVE]',
      ir.style.negativeRules.join('; ')
    ].join('\n').trim()
  }
}
