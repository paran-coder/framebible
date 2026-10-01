import { useState } from 'react'
import { Aperture, ArrowRight, Camera, ChevronDown, ChevronUp, Copy, GripVertical, Lightbulb, Move3D, Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { buildShotTreatments } from '../../core/composition'
import { StatusPill } from '../../components/StatusPill'
import { useProjectStore } from '../../store/projectStore'
import { BlockingBoard } from './BlockingBoard'

export function ShotsView() {
  const project = useProjectStore((state) => state.project)
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId)
  const selectedShotId = useProjectStore((state) => state.selectedShotId)
  const selectShot = useProjectStore((state) => state.selectShot)
  const updateShot = useProjectStore((state) => state.updateShot)
  const addShot = useProjectStore((state) => state.addShot)
  const duplicateShot = useProjectStore((state) => state.duplicateShot)
  const deleteShot = useProjectStore((state) => state.deleteShot)
  const reorderShots = useProjectStore((state) => state.reorderShots)
  const moveShot = useProjectStore((state) => state.moveShot)
  const [draggedShotId, setDraggedShotId] = useState('')
  const [dragTargetId, setDragTargetId] = useState('')

  const scene = project.scenes.find((item) => item.id === selectedSceneId) ?? project.scenes[0]
  if (!scene) {
    return <section className="page shots-page"><PageHeader eyebrow="SHOT DIRECTOR" title="먼저 Scene을 만들어 주세요." description="Shot Director를 사용하려면 최소 한 개의 Scene이 필요합니다." /></section>
  }
  const orderedShots = [...scene.shots].sort((a, b) => a.order - b.order)
  const shot = orderedShots.find((item) => item.id === selectedShotId) ?? orderedShots[0]
  if (!shot) {
    return <section className="page shots-page"><PageHeader eyebrow="SHOT DIRECTOR" title="이 Scene에는 Shot이 없습니다." description="새 Shot을 추가해 촬영 설계를 시작하세요." action={<button className="primary-button" onClick={() => addShot(scene.id)}><Plus size={15} /> 새 Shot</button>} /></section>
  }
  const treatments = buildShotTreatments(scene, shot)
  const shotIndex = orderedShots.findIndex((item) => item.id === shot.id)

  const onDeleteShot = () => {
    if (scene.shots.length <= 1) return
    if (window.confirm(`“${shot.title}” 샷을 삭제할까요?`)) deleteShot(scene.id, shot.id)
  }

  const onDrop = (targetId: string) => {
    if (draggedShotId) reorderShots(scene.id, draggedShotId, targetId)
    setDraggedShotId('')
    setDragTargetId('')
  }

  return (
    <section className="page shots-page">
      <PageHeader eyebrow="SHOT DIRECTOR" title="문장을 촬영 가능한 결정으로 바꿉니다." description="샷을 추가·복제·삭제하고 드래그앤드롭으로 재배열합니다. 순서가 바뀌면 Continuity 검사와 Seedance 컴파일 순서도 같이 바뀝니다." action={<span className="composition-ready"><Lightbulb size={15} /> 규칙 기반 대안 3개 준비됨</span>} />

      <div className="shot-workspace">
        <aside className="panel shot-browser">
          <div className="panel-heading compact"><div><span className="eyebrow">SHOT LIST</span><h2>{scene.title}</h2></div><button className="icon-button" aria-label="샷 추가" title="샷 추가" onClick={() => addShot(scene.id)}><Plus size={16} /></button></div>
          <div className="shot-browser-list">
            {orderedShots.map((item, index) => (
              <div
                key={item.id}
                className={`shot-browser-row-wrap ${dragTargetId === item.id && draggedShotId !== item.id ? 'drag-target' : ''}`}
                draggable
                onDragStart={(event) => { setDraggedShotId(item.id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', item.id) }}
                onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragTargetId((current) => current === item.id ? current : item.id) }}
                onDrop={(event) => { event.preventDefault(); onDrop(item.id) }}
                onDragEnd={() => { setDraggedShotId(''); setDragTargetId('') }}
              >
                <span className="drag-handle" aria-hidden="true" title="드래그해서 순서 변경"><GripVertical size={15} /></span>
                <button className={`shot-browser-row ${shot.id === item.id ? 'selected' : ''}`} onClick={() => selectShot(scene.id, item.id)}>
                  <span className="shot-number">{String(item.order).padStart(2, '0')}</span>
                  <span><strong>{item.title}</strong><small>{item.framing} · {item.durationSec}s</small></span>
                  <ArrowRight size={15} />
                </button>
                <div className="shot-reorder-fallback" aria-label={`${item.title} 순서 이동`}>
                  <button aria-label="위로 이동" disabled={index === 0} onClick={() => moveShot(scene.id, item.id, -1)}><ChevronUp size={13} /></button>
                  <button aria-label="아래로 이동" disabled={index === orderedShots.length - 1} onClick={() => moveShot(scene.id, item.id, 1)}><ChevronDown size={13} /></button>
                </div>
              </div>
            ))}
          </div>
          <button className="shot-add-button" onClick={() => addShot(scene.id)}><Plus size={15} /> 새 Shot</button>
        </aside>

        <div className="panel shot-stage">
          <BlockingBoard sceneId={scene.id} shotId={shot.id} />
          <div className="stage-note"><Camera size={16} /> Scene Geography는 프로젝트 데이터로 저장되며 Undo/Redo와 Seedance 컴파일에 연결됩니다.</div>
        </div>

        <aside className="panel inspector">
          <div className="panel-heading compact">
            <div><span className="eyebrow">INSPECTOR · {String(shot.order).padStart(2, '0')}</span><h2>{shot.title}</h2></div>
            <StatusPill>{shot.durationSec}s</StatusPill>
          </div>
          <div className="shot-inspector-actions">
            <button className="secondary-button" onClick={() => duplicateShot(scene.id, shot.id)}><Copy size={14} /> 복제</button>
            <button className="danger-button" disabled={scene.shots.length <= 1} onClick={onDeleteShot}><Trash2 size={14} /> 삭제</button>
          </div>
          <Field label="Title" value={shot.title} onChange={(value) => updateShot(scene.id, shot.id, { title: value })} />
          <NumberField label="Duration (sec)" value={shot.durationSec} onChange={(durationSec) => updateShot(scene.id, shot.id, { durationSec })} />
          <Field icon={<Aperture size={15} />} label="Framing" value={shot.framing} onChange={(value) => updateShot(scene.id, shot.id, { framing: value })} />
          <Field icon={<Camera size={15} />} label="Focal length" value={shot.focalLength} onChange={(value) => updateShot(scene.id, shot.id, { focalLength: value })} />
          <Field label="Camera height" value={shot.cameraHeight} onChange={(value) => updateShot(scene.id, shot.id, { cameraHeight: value })} />
          <Field icon={<Move3D size={15} />} label="Camera movement" value={shot.cameraMovement} onChange={(value) => updateShot(scene.id, shot.id, { cameraMovement: value })} multiline />
          <Field label="Blocking" value={shot.blocking} onChange={(value) => updateShot(scene.id, shot.id, { blocking: value })} multiline />
          <Field label="Action" value={shot.action} onChange={(value) => updateShot(scene.id, shot.id, { action: value })} multiline />
          <Field label="Lighting" value={shot.lighting} onChange={(value) => updateShot(scene.id, shot.id, { lighting: value })} multiline />
          <Field label="Audio" value={shot.audio} onChange={(value) => updateShot(scene.id, shot.id, { audio: value })} multiline />
          <label className="inspector-field"><span>Screen direction</span><select value={shot.screenDirection ?? 'neutral'} onChange={(event) => updateShot(scene.id, shot.id, { screenDirection: event.target.value as 'left-to-right' | 'right-to-left' | 'neutral' })}><option value="neutral">Neutral</option><option value="left-to-right">Left → Right</option><option value="right-to-left">Right → Left</option></select></label>
          <div className="frame-side-grid"><label className="inspector-field"><span>Entry side</span><select value={shot.entrySide ?? 'none'} onChange={(event) => updateShot(scene.id, shot.id, { entrySide: event.target.value as 'left' | 'right' | 'center' | 'none' })}><option value="none">None</option><option value="left">Left</option><option value="right">Right</option><option value="center">Center</option></select></label><label className="inspector-field"><span>Exit side</span><select value={shot.exitSide ?? 'none'} onChange={(event) => updateShot(scene.id, shot.id, { exitSide: event.target.value as 'left' | 'right' | 'center' | 'none' })}><option value="none">None</option><option value="left">Left</option><option value="right">Right</option><option value="center">Center</option></select></label></div>
          <div className="shot-position-control"><button disabled={shotIndex === 0} onClick={() => moveShot(scene.id, shot.id, -1)}><ChevronUp size={14} /> 앞 샷으로</button><button disabled={shotIndex === orderedShots.length - 1} onClick={() => moveShot(scene.id, shot.id, 1)}><ChevronDown size={14} /> 뒤 샷으로</button></div>
        </aside>
      </div>

      <div className="treatment-grid">
        {treatments.map((treatment) => (
          <article key={treatment.id} className="treatment-card">
            <span className="eyebrow">{treatment.name}</span>
            <h3>{treatment.intent}</h3>
            <ul>{treatment.changes.map((change) => <li key={change}>{change}</li>)}</ul>
            <button className="secondary-button" onClick={() => updateShot(scene.id, shot.id, treatment.patch)}>이 구도 적용</button>
          </article>
        ))}
      </div>
    </section>
  )
}

function Field({ icon, label, value, multiline = false, onChange }: { icon?: React.ReactNode; label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="inspector-field"><span>{icon}{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="inspector-field"><span>{label}</span><input type="number" min="1" max="120" value={value} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} /></label>
}
