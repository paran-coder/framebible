import type { Project } from '../core/types'

export const sampleProject: Project = {
  id: 'project-midnight-hotel',
  schemaVersion: 2,
  appVersion: '1.9.0',
  title: 'Midnight Hotel',
  logline: 'A courier enters a nearly empty hotel before dawn and realizes the person following her has already checked in.',
  styleDNA: {
    genre: 'Neo-noir suspense',
    aspectRatio: '2.39:1',
    capture: '35mm photochemical texture',
    cameraLanguage: 'Mostly static frames, slow push-ins, restrained handheld only at moments of threat',
    lightingLanguage: 'Motivated practicals, wet reflections, deep falloff, no beauty light',
    palette: 'Dirty amber practicals against desaturated cyan shadows',
    texture: 'Fine grain, slightly halated highlights, realistic skin texture',
    negativeRules: ['No glossy CGI look', 'No beauty retouching', 'No random wardrobe changes', 'No unmotivated daylight']
  },
  assets: [
    {
      id: 'char-mira',
      type: 'character',
      name: 'Mira',
      description: 'A tired but alert night courier in her late twenties.',
      tags: ['lead', 'courier'],
      lockedFields: ['identityDNA.face', 'identityDNA.hair', 'defaultWardrobe'],
      references: [],
      identityDNA: {
        apparentAge: 'late 20s',
        face: 'long oval face, straight brows, narrow dark eyes, natural skin texture',
        hair: 'black shoulder-length wavy hair, slightly damp',
        build: 'lean, 168 cm, narrow shoulders',
        distinguishingFeatures: 'small scar under left eyebrow'
      },
      defaultWardrobe: 'black leather jacket, charcoal knit, dark straight-leg trousers, worn black boots',
      variants: [
        {
          id: 'variant-rain-alert',
          name: 'Rain-soaked alert',
          description: 'Arrives from the rain and is already scanning for danger.',
          wardrobe: 'Same locked outfit, visibly wet at shoulders and sleeves',
          physicalState: 'Controlled breathing, shoulders tense, scanning with eyes before moving head',
          wetState: 'wet',
          injuryState: '',
          hairMakeup: 'Hair slightly wetter and clinging at the temples; makeup remains natural',
          ageAppearance: '',
          references: []
        }
      ]
    },
    {
      id: 'loc-lobby',
      type: 'location',
      name: 'Hotel Lobby',
      description: 'A narrow 1970s hotel lobby with aged brass, dark wood and a long reception desk.',
      tags: ['interior', 'hotel'],
      lockedFields: ['timeOfDay', 'lighting', 'architecture'],
      references: [],
      timeOfDay: '04:40 pre-dawn',
      lighting: 'warm tungsten practicals with cool cyan street spill through glass doors',
      architecture: 'long lobby, reception desk camera-right, elevator deep background, glass entrance camera-left'
    },
    {
      id: 'loc-corridor',
      type: 'location',
      name: 'Fourth-floor Corridor',
      description: 'A compressed hotel corridor with faded carpet and repeating warm wall sconces.',
      tags: ['interior', 'corridor'],
      lockedFields: ['timeOfDay', 'lighting'],
      references: [],
      timeOfDay: '04:45 pre-dawn',
      lighting: 'dim tungsten wall sconces, faint cyan spill at corridor end',
      architecture: 'narrow corridor, low ceiling, room doors on both sides'
    },
    {
      id: 'prop-key',
      type: 'prop',
      name: 'Silver Room Key',
      description: 'Old rectangular hotel key tag with engraved room number 407.',
      tags: ['story-critical'],
      lockedFields: ['appearance'],
      references: [],
      appearance: 'brushed silver tag, black engraved 407, short brass key'
    }
  ],
  scenes: [
    {
      id: 'scene-arrival',
      order: 1,
      title: 'Arrival',
      purpose: 'Establish Mira, the hotel geography, and the feeling that someone arrived before her.',
      emotionalBeat: 'contained unease',
      durationSec: 9,
      timeOfDay: '04:40 pre-dawn',
      weather: 'heavy rain outside',
      locationId: 'loc-lobby',
      characterBindings: [
        { characterId: 'char-mira', variantId: 'variant-rain-alert' }
      ],
      propIds: ['prop-key'],
      propStates: [{ propId: 'prop-key', presence: 'present', condition: 'intact' }],
      transitionEvents: [],
      geography: {
        stageAspectRatio: '2.39:1',
        characterPlacements: [{ characterId: 'char-mira', x: 0.28, y: 0.56, facingDeg: 8 }],
        propPlacements: [{ propId: 'prop-key', x: 0.7, y: 0.69, rotationDeg: 0 }],
        shotCameras: [
          { shotId: 'shot-01', x: 0.13, y: 0.82, directionDeg: 338, focalLengthMm: 32 },
          { shotId: 'shot-02', x: 0.22, y: 0.78, directionDeg: 350, focalLengthMm: 50 }
        ]
      },
      shots: [
        {
          id: 'shot-01',
          order: 1,
          title: 'Lobby reveal',
          durationSec: 4,
          framing: 'wide establishing',
          focalLength: '32mm',
          cameraHeight: 'eye level',
          cameraMovement: 'slow dolly backward',
          blocking: 'Mira enters frame-left through glass doors and crosses toward the desk.',
          action: 'She closes a wet umbrella, notices nobody is at reception, and slows before the desk.',
          lighting: 'inherit location lighting',
          audio: 'rain outside, fluorescent hum, distant elevator bell',
          screenDirection: 'left-to-right'
        },
        {
          id: 'shot-02',
          order: 2,
          title: 'The key',
          durationSec: 5,
          framing: 'medium close-up with foreground desk edge',
          focalLength: '50mm',
          cameraHeight: 'chest height',
          cameraMovement: 'static with a subtle 5% push-in',
          blocking: 'Mira stops frame-left; room key 407 sits foreground-right.',
          action: 'Her eyes find the key before her head turns. She reaches but stops just short of touching it.',
          lighting: 'inherit location lighting',
          audio: 'rain muffles as automatic doors close; room tone narrows',
          screenDirection: 'left-to-right'
        }
      ]
    },
    {
      id: 'scene-corridor',
      order: 2,
      title: 'Fourth floor',
      purpose: 'Convert suspicion into a concrete threat.',
      emotionalBeat: 'controlled fear',
      durationSec: 7,
      timeOfDay: '04:45 pre-dawn',
      weather: 'rain continuing outside',
      locationId: 'loc-corridor',
      characterBindings: [
        { characterId: 'char-mira', variantId: 'variant-rain-alert' }
      ],
      propIds: ['prop-key'],
      propStates: [{ propId: 'prop-key', presence: 'present', ownerCharacterId: 'char-mira', condition: 'intact' }],
      transitionEvents: [
        { id: 'transition-key-transfer', type: 'prop-transfer', subjectId: 'prop-key', from: '', to: 'char-mira', note: 'Mira picks up the room key before going upstairs.' },
        { id: 'transition-location-corridor', type: 'location', subjectId: 'loc-corridor', from: 'loc-lobby', to: 'loc-corridor', note: 'Mira takes the elevator to the fourth floor.' }
      ],
      geography: {
        stageAspectRatio: '2.39:1',
        characterPlacements: [{ characterId: 'char-mira', x: 0.76, y: 0.66, facingDeg: 205 }],
        propPlacements: [{ propId: 'prop-key', x: 0.72, y: 0.63, rotationDeg: 0 }],
        shotCameras: [{ shotId: 'shot-03', x: 0.18, y: 0.7, directionDeg: 15, focalLengthMm: 85 }]
      },
      shots: [
        {
          id: 'shot-03',
          order: 1,
          title: 'Door 407',
          durationSec: 7,
          framing: 'compressed medium-long shot',
          focalLength: '85mm',
          cameraHeight: 'shoulder height',
          cameraMovement: 'locked-off',
          blocking: 'Mira enters foreground-right and advances deeper into corridor.',
          action: 'She sees room 407 already slightly open and closes her fist around the silver key.',
          lighting: 'bright midday sunlight through large windows',
          audio: 'carpeted footsteps, low HVAC rumble, one room television behind a wall',
          screenDirection: 'right-to-left'
        }
      ]
    }
  ],
  settings: { theme: 'system' },
  updatedAt: new Date().toISOString()
}
