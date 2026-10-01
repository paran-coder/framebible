import { horizontalFovDeg } from './geography'
import { collectSceneReferences } from './sceneReferences'
import type { CharacterAsset, Project, Scene } from './types'

export interface ContactSheetShot {
  id: string
  order: number
  title: string
  durationSec: number
  framing: string
  focalLength: string
  cameraMovement: string
  cameraHeight: string
  blocking: string
  action: string
  lighting: string
  audio: string
  cameraSetup?: string
}

export interface ContactSheetModel {
  projectTitle: string
  sceneTitle: string
  sceneOrder: number
  purpose: string
  emotionalBeat: string
  timeOfDay: string
  weather: string
  location: string
  characters: { name: string; variant: string; wardrobe: string }[]
  props: string[]
  references: ReturnType<typeof collectSceneReferences>
  shots: ContactSheetShot[]
}

export function buildContactSheetModel(project: Project, scene: Scene): ContactSheetModel {
  const location = project.assets.find((asset) => asset.id === scene.locationId && asset.type === 'location')
  const characters = scene.characterBindings.flatMap((binding) => {
    const character = project.assets.find((asset): asset is CharacterAsset => asset.id === binding.characterId && asset.type === 'character')
    if (!character) return []
    const variant = character.variants.find((item) => item.id === binding.variantId)
    return [{ name: character.name, variant: variant?.name ?? 'Base', wardrobe: variant?.wardrobe || character.defaultWardrobe }]
  })
  const props = scene.propIds.flatMap((id) => {
    const prop = project.assets.find((asset) => asset.id === id && asset.type === 'prop')
    return prop ? [prop.name] : []
  })
  const cameraByShot = new Map((scene.geography?.shotCameras ?? []).map((camera) => [camera.shotId, camera]))
  const shots = [...scene.shots].sort((a, b) => a.order - b.order).map((shot) => {
    const camera = cameraByShot.get(shot.id)
    return {
      id: shot.id,
      order: shot.order,
      title: shot.title,
      durationSec: shot.durationSec,
      framing: shot.framing,
      focalLength: shot.focalLength,
      cameraMovement: shot.cameraMovement,
      cameraHeight: shot.cameraHeight,
      blocking: shot.blocking,
      action: shot.action,
      lighting: shot.lighting,
      audio: shot.audio,
      cameraSetup: camera ? `x ${camera.x.toFixed(2)} · y ${camera.y.toFixed(2)} · ${Math.round(camera.directionDeg)}° · ${Number(camera.focalLengthMm.toFixed(1))}mm · ${Math.round(horizontalFovDeg(camera.focalLengthMm))}° FOV` : undefined
    }
  })

  return {
    projectTitle: project.title,
    sceneTitle: scene.title,
    sceneOrder: scene.order,
    purpose: scene.purpose,
    emotionalBeat: scene.emotionalBeat,
    timeOfDay: scene.timeOfDay,
    weather: scene.weather ?? '',
    location: location?.name ?? 'Unassigned location',
    characters,
    props,
    references: collectSceneReferences(project, scene),
    shots
  }
}

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] ?? char))

export function contactSheetHtml(project: Project, scene: Scene): string {
  const model = buildContactSheetModel(project, scene)
  const references = model.references.map((item) => `<figure><div class="thumb">${item.reference.dataUrl ? `<img src="${esc(item.reference.dataUrl)}" alt="${esc(item.assetName)} reference">` : '<span>No preview</span>'}</div><figcaption><strong>${esc(item.assetName)}</strong><small>${esc(item.variantName ? `${item.role} · ${item.variantName}` : item.role)}</small></figcaption></figure>`).join('') || '<p class="muted">No reference images attached.</p>'
  const shots = model.shots.map((shot) => `<article class="shot"><header><span>SHOT ${String(shot.order).padStart(2, '0')}</span><strong>${esc(shot.title)}</strong><b>${esc(shot.durationSec)}s</b></header><dl><div><dt>Frame</dt><dd>${esc(shot.framing)} · ${esc(shot.focalLength)}</dd></div><div><dt>Camera</dt><dd>${esc(shot.cameraHeight)} · ${esc(shot.cameraMovement)}</dd></div>${shot.cameraSetup ? `<div><dt>Board</dt><dd>${esc(shot.cameraSetup)}</dd></div>` : ''}<div><dt>Blocking</dt><dd>${esc(shot.blocking)}</dd></div><div><dt>Action</dt><dd>${esc(shot.action)}</dd></div><div><dt>Light</dt><dd>${esc(shot.lighting)}</dd></div><div><dt>Audio</dt><dd>${esc(shot.audio)}</dd></div></dl></article>`).join('')
  const characters = model.characters.map((item) => `<li><strong>${esc(item.name)}</strong> · ${esc(item.variant)}<span>${esc(item.wardrobe)}</span></li>`).join('') || '<li>None</li>'

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(model.projectTitle)} — S${model.sceneOrder} ${esc(model.sceneTitle)}</title><style>
:root{font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif;color:#171918;background:#f4f3ef}*{box-sizing:border-box}body{margin:0;padding:32px}.page{max-width:1180px;margin:auto}.kicker{font-size:11px;font-weight:800;letter-spacing:.14em;color:#687069}.hero{display:grid;grid-template-columns:1.4fr .6fr;gap:20px;padding:24px;border:1px solid #d8d8d1;border-radius:18px;background:#fff}.hero h1{margin:6px 0 8px;font-size:28px}.hero p{margin:0;color:#5d625f;line-height:1.6}.meta{display:grid;gap:10px;font-size:13px}.meta b{display:block;font-size:10px;letter-spacing:.08em;color:#808681;text-transform:uppercase}.section{margin-top:22px}.section h2{font-size:14px}.cast{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;padding:0;list-style:none}.cast li{padding:12px;background:#fff;border:1px solid #dddcd7;border-radius:12px}.cast span{display:block;margin-top:5px;color:#666;font-size:12px}.refs{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}.refs figure{margin:0;background:#fff;border:1px solid #dddcd7;border-radius:12px;overflow:hidden}.thumb{aspect-ratio:4/3;background:#e9e8e2;display:grid;place-items:center;color:#777;font-size:11px}.thumb img{width:100%;height:100%;object-fit:cover}.refs figcaption{padding:9px}.refs small{display:block;color:#777;margin-top:3px}.shots{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}.shot{background:#fff;border:1px solid #d8d8d1;border-radius:14px;overflow:hidden}.shot header{display:grid;grid-template-columns:auto 1fr auto;gap:10px;padding:12px 14px;border-bottom:1px solid #e6e5df;align-items:center}.shot header span{font-size:9px;font-weight:900;letter-spacing:.1em;color:#777}.shot header strong{font-size:13px}.shot header b{font-size:11px}.shot dl{margin:0;padding:12px 14px}.shot dl div{display:grid;grid-template-columns:72px 1fr;gap:10px;padding:6px 0}.shot dt{font-size:9px;font-weight:800;color:#7b817c;text-transform:uppercase;letter-spacing:.08em}.shot dd{margin:0;font-size:12px;line-height:1.45}.muted{color:#777}@media(max-width:700px){body{padding:14px}.hero{grid-template-columns:1fr}.shots{grid-template-columns:1fr}}@media print{body{padding:0;background:#fff}.hero,.shot,.refs figure{break-inside:avoid;box-shadow:none}}
</style></head><body><main class="page"><section class="hero"><div><span class="kicker">${esc(model.projectTitle)} · SCENE ${model.sceneOrder}</span><h1>${esc(model.sceneTitle)}</h1><p>${esc(model.purpose)}</p></div><div class="meta"><div><b>Beat</b>${esc(model.emotionalBeat)}</div><div><b>Location</b>${esc(model.location)}</div><div><b>Time / Weather</b>${esc(model.timeOfDay)}${model.weather ? ` · ${esc(model.weather)}` : ''}</div><div><b>Props</b>${esc(model.props.join(', ') || 'None')}</div></div></section><section class="section"><h2>Characters</h2><ul class="cast">${characters}</ul></section><section class="section"><h2>References</h2><div class="refs">${references}</div></section><section class="section"><h2>Shot Contact Sheet</h2><div class="shots">${shots}</div></section></main></body></html>`
}
