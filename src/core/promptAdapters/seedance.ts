import type { PromptShotIR, ScenePromptIR } from '../promptIR'
import type { PromptAdapter } from './types'

function characterLine(character: ScenePromptIR['characters'][number]): string {
  const variantDetails = [
    `Variant: ${character.variantName}.`,
    `Wardrobe: ${character.wardrobe}.`,
    character.physicalState ? `Physical state: ${character.physicalState}.` : '',
    character.wetState ? `Wetness: ${character.wetState}.` : '',
    character.injuryState ? `Injury state: ${character.injuryState}.` : '',
    character.hairMakeup ? `Hair / makeup: ${character.hairMakeup}.` : '',
    character.ageAppearance ? `Age appearance: ${character.ageAppearance}.` : ''
  ].filter(Boolean).join(' ')
  const lockSummary = character.lockedFields.length ? `Locked: ${character.lockedFields.join(', ')}` : 'No explicit field locks'
  return `@${character.name}: ${character.description} Identity: ${character.identity.join('; ')}. ${variantDetails} ${lockSummary}.`
}

function shotBlock(shot: PromptShotIR): string {
  return [
    `SHOT ${String(shot.order).padStart(2, '0')} — ${shot.title}`,
    `Duration: ${shot.durationSec}s`,
    `Framing / optics: ${shot.framing}, ${shot.focalLength}, ${shot.cameraHeight}`,
    `Camera: ${shot.cameraMovement}`,
    `Blocking: ${shot.blocking}`,
    `Action: ${shot.action}`,
    `Lighting: ${shot.lighting}`,
    `Audio: ${shot.audio}`,
    shot.screenDirection ? `Screen direction: ${shot.screenDirection}` : '',
    shot.entrySide && shot.entrySide !== 'none' ? `Entry side: ${shot.entrySide}` : '',
    shot.exitSide && shot.exitSide !== 'none' ? `Exit side: ${shot.exitSide}` : ''
  ].filter(Boolean).join('\n')
}

export const seedanceAdapter: PromptAdapter = {
  id: 'seedance',
  label: 'Seedance',
  renderScene: (ir) => [
    '[GLOBAL STYLE]',
    `${ir.style.genre}. ${ir.style.aspectRatio}. ${ir.style.capture}.`,
    `Camera language: ${ir.style.cameraLanguage}.`,
    `Lighting language: ${ir.style.lightingLanguage}.`,
    `Palette: ${ir.style.palette}. Texture: ${ir.style.texture}.`,
    '',
    '[SCENE]',
    `${ir.scene.title}. Purpose: ${ir.scene.purpose}. Emotional beat: ${ir.scene.emotionalBeat}. Time: ${ir.scene.timeOfDay}.${ir.scene.weather ? ` Weather: ${ir.scene.weather}.` : ''}`,
    '',
    '[CHARACTERS]',
    ir.characters.length ? ir.characters.map(characterLine).join('\n') : 'No named character binding.',
    '',
    '[LOCATION]',
    ir.location ? `@${ir.location.name}: ${ir.location.description} Architecture: ${ir.location.architecture}. Locked lighting: ${ir.location.lighting}.` : 'No named location binding.',
    '',
    '[PROPS]',
    ir.props.length ? ir.props.map((prop) => `@${prop.name}: ${prop.description}${prop.owner ? ` Owner: @${prop.owner}.` : ''}${prop.condition ? ` Condition: ${prop.condition}.` : ''}`).join('\n') : 'No story-critical props.',
    '',
    '[SCENE GEOGRAPHY]',
    ir.geographyLines.join('\n') || 'No explicit scene geography.',
    '',
    '[CAMERA PATH]',
    ir.cameraPathLines.join('\n') || 'No multi-shot camera path.',
    '',
    '[SPATIAL TRANSITIONS]',
    ir.spatialTransitionLines.join('\n') || 'No explicit spatial transitions.',
    '',
    '[FIRST FRAME / BLOCKING]',
    ir.firstFrameBlocking,
    '',
    '[SHOTS]',
    ir.shots.map(shotBlock).join('\n\n'),
    '',
    '[CONTINUITY LOCKS]',
    ir.continuityLocks.join('\n') || 'Respect bound asset identity.',
    ir.intentionalTransitions.length ? `Intentional transitions into this scene:\n${ir.intentionalTransitions.map((item) => `- ${item}`).join('\n')}` : '',
    '',
    '[NEGATIVE RULES]',
    ir.style.negativeRules.map((rule) => `- ${rule}`).join('\n')
  ].filter((line) => line !== undefined).join('\n').trim()
}
