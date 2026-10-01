import type { CharacterAsset } from './types'

export function compileCharacterSheetPrompt(character: CharacterAsset): string {
  const identity = character.identityDNA
  return [
    `Create a professional character reference sheet for one single person named ${character.name}.`,
    `Identity: ${identity.apparentAge}; ${identity.face}; ${identity.hair}; ${identity.build}; ${identity.distinguishingFeatures}.`,
    `Wardrobe: ${character.defaultWardrobe}.`,
    'Show exactly the same person and the same outfit in every panel.',
    'Layout: full-body front view, full-body back view, and one clean facial close-up.',
    'Neutral mid-gray studio background, soft nearly shadowless lighting, clear eye catchlights, realistic skin texture.',
    'Keep facial geometry, body proportions, hairstyle, wardrobe construction, colors, and accessories unchanged between views.',
    'No extra people, no alternate outfit, no duplicated face, no stylized beauty retouching, no dramatic environment.'
  ].join(' ')
}

export function compileIdentityReferencePrompt(character: CharacterAsset): string {
  const identity = character.identityDNA
  return [
    `Create a clean generation-ready identity reference for ${character.name}.`,
    `Show one dominant face only. Identity: ${identity.face}; ${identity.hair}; ${identity.distinguishingFeatures}.`,
    `Include a simple upper-body or full-body secondary view where the face is not competing with the primary portrait.`,
    `Body: ${identity.build}. Wardrobe: ${character.defaultWardrobe}.`,
    'Neutral background, even soft lighting, realistic texture, no expression sheet, no multiple visible faces, no alternate wardrobe.'
  ].join(' ')
}
