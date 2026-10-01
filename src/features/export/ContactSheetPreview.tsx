import { Download, Film } from 'lucide-react'
import { buildContactSheetModel, contactSheetHtml } from '../../core/contactSheet'
import { downloadBlob } from '../../core/exportProject'
import type { Project, Scene } from '../../core/types'

interface Props {
  project: Project
  scene: Scene
}

export function ContactSheetPreview({ project, scene }: Props) {
  const sheet = buildContactSheetModel(project, scene)
  const downloadHtml = () => {
    const slug = `${String(scene.order).padStart(2, '0')}-${scene.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadBlob(new Blob([contactSheetHtml(project, scene)], { type: 'text/html;charset=utf-8' }), `${slug || 'scene'}-contact-sheet.html`)
  }

  return (
    <div className="panel contact-sheet-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">STORYBOARD / CONTACT SHEET</span><h2>Scene {sheet.sceneOrder} · {sheet.sceneTitle}</h2></div>
        <button className="secondary-button" onClick={downloadHtml}><Download size={15} /> HTML 내보내기</button>
      </div>
      <div className="contact-sheet-meta">
        <div><small>BEAT</small><strong>{sheet.emotionalBeat || '—'}</strong></div>
        <div><small>LOCATION</small><strong>{sheet.location}</strong></div>
        <div><small>TIME / WEATHER</small><strong>{sheet.timeOfDay}{sheet.weather ? ` · ${sheet.weather}` : ''}</strong></div>
        <div><small>CAST</small><strong>{sheet.characters.map((item) => `${item.name} (${item.variant})`).join(', ') || '—'}</strong></div>
      </div>
      {sheet.references.length ? <div className="contact-reference-strip" aria-label="Scene references">{sheet.references.map((item) => <figure key={item.id}><div>{item.reference.dataUrl ? <img src={item.reference.dataUrl} alt={`${item.assetName} reference`} /> : <Film size={18} />}</div><figcaption><strong>{item.assetName}</strong><small>{item.variantName ? `${item.role} · ${item.variantName}` : item.role}</small></figcaption></figure>)}</div> : null}
      <div className="contact-shot-grid">
        {sheet.shots.map((shot) => <article key={shot.id} className="contact-shot-card">
          <header><span>SHOT {String(shot.order).padStart(2, '0')}</span><strong>{shot.title}</strong><b>{shot.durationSec}s</b></header>
          <dl>
            <div><dt>Frame</dt><dd>{shot.framing} · {shot.focalLength}</dd></div>
            <div><dt>Camera</dt><dd>{shot.cameraHeight} · {shot.cameraMovement}</dd></div>
            {shot.cameraSetup ? <div><dt>Board</dt><dd>{shot.cameraSetup}</dd></div> : null}
            <div><dt>Blocking</dt><dd>{shot.blocking}</dd></div>
            <div><dt>Action</dt><dd>{shot.action}</dd></div>
            <div><dt>Light</dt><dd>{shot.lighting}</dd></div>
            <div><dt>Audio</dt><dd>{shot.audio}</dd></div>
          </dl>
        </article>)}
      </div>
    </div>
  )
}
