import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Pause, Play, SkipForward } from 'lucide-react'
import { ensureSceneGeography } from '../../core/geography'
import { sampleSpatialTimeline, timelineAspectRatio, timelineShotProgress } from '../../core/spatialTimeline'
import { useProjectStore } from '../../store/projectStore'

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`

export function SpatialTimeline({ sceneId }: { sceneId: string }) {
  const project = useProjectStore((state) => state.project)
  const selectShot = useProjectStore((state) => state.selectShot)
  const scene = project.scenes.find((item) => item.id === sceneId) ?? project.scenes[0]
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<{ timestamp: number; progress: number } | null>(null)

  const sample = useMemo(() => sampleSpatialTimeline(project, scene, progress), [project, scene, progress])
  const geography = useMemo(() => ensureSceneGeography(scene, project.styleDNA.aspectRatio), [scene, project.styleDNA.aspectRatio])
  const ratio = timelineAspectRatio(project, scene)
  const orderedShots = useMemo(() => [...scene.shots].sort((a, b) => a.order - b.order), [scene.shots])

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setReducedMotion(query.matches)
    update()
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    if (!playing || reducedMotion || sample.totalSec <= 0) return
    const tick = (timestamp: number) => {
      if (!startRef.current) startRef.current = { timestamp, progress }
      const elapsed = (timestamp - startRef.current.timestamp) / 1000
      const next = startRef.current.progress + elapsed / sample.totalSec
      if (next >= 1) {
        setProgress(1)
        setPlaying(false)
        startRef.current = null
        return
      }
      setProgress(next)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [playing, reducedMotion, sample.totalSec])

  const togglePlay = () => {
    if (reducedMotion) return
    if (progress >= 1) setProgress(0)
    startRef.current = null
    setPlaying((value) => !value)
  }

  const setTimelineProgress = (next: number) => {
    setPlaying(false)
    startRef.current = null
    setProgress(next)
  }

  const stepShot = () => {
    const activeIndex = orderedShots.findIndex((shot) => shot.id === sample.activeShotId)
    const next = orderedShots[Math.min(orderedShots.length - 1, Math.max(0, activeIndex + 1))]
    if (!next) return
    const nextProgress = timelineShotProgress(scene, next.id)
    setTimelineProgress(nextProgress)
    selectShot(scene.id, next.id)
  }

  return <section className="spatial-timeline" aria-label="Spatial Timeline preview">
    <div className="spatial-timeline-heading">
      <div><span className="eyebrow">SPATIAL TIMELINE</span><strong>명시된 이동만 애니메이션으로 미리 봅니다.</strong></div>
      <div className="spatial-timeline-controls">
        <button className="secondary-button compact-button" onClick={togglePlay} disabled={reducedMotion || sample.totalSec <= 0} aria-label={playing ? 'Spatial Timeline 일시정지' : 'Spatial Timeline 재생'}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? ' Pause' : ' Play'}</button>
        <button className="secondary-button compact-button" onClick={stepShot}><SkipForward size={13} /> Next shot</button>
      </div>
    </div>
    {reducedMotion ? <p className="timeline-reduced-note">시스템의 reduced-motion 설정을 따라 자동 재생을 비활성화했습니다. 슬라이더와 Shot 버튼으로 확인할 수 있습니다.</p> : null}
    <div className="spatial-timeline-stage" style={{ aspectRatio: String(ratio) }}>
      {geography.background?.reference.dataUrl ? <img className="timeline-background" src={geography.background.reference.dataUrl} alt="" aria-hidden="true" style={{ left: pct(geography.background.x), top: pct(geography.background.y), opacity: Math.min(.45, geography.background.opacity), objectFit: geography.background.fit, transform: `translate(-50%, -50%) scale(${geography.background.scale}) rotate(${geography.background.rotationDeg}deg)` }} /> : null}
      {(geography.zones ?? []).map((zone) => <div key={zone.id} className="timeline-zone" style={{ left: pct(zone.x), top: pct(zone.y), width: pct(zone.width), height: pct(zone.height), transform: `translate(-50%, -50%) rotate(${zone.rotationDeg}deg)` }}><span>{zone.name}</span></div>)}
      {sample.nodes.map((node) => <div key={`${node.type}-${node.id}`} className={`timeline-node ${node.type}`} style={{ left: pct(node.x), top: pct(node.y) }} title={node.label}><span>{node.label.slice(0, 2)}</span></div>)}
      {sample.camera ? <div className="timeline-camera" style={{ left: pct(sample.camera.x), top: pct(sample.camera.y), transform: `translate(-50%, -50%) rotate(${sample.camera.directionDeg}deg)` }} title={`${sample.camera.label} · ${Number(sample.camera.focalLengthMm.toFixed(1))}mm`}><Camera size={13} /></div> : null}
      <div className="timeline-shot-caption">{sample.activeShotOrder ? `SHOT ${String(sample.activeShotOrder).padStart(2, '0')} · ${sample.activeShotTitle}` : 'No shot'}</div>
    </div>
    <div className="spatial-timeline-scrub">
      <span>{sample.elapsedSec.toFixed(1)}s</span>
      <input aria-label="Spatial Timeline 재생 위치" type="range" min="0" max="1" step="0.001" value={progress} onChange={(event) => setTimelineProgress(Number(event.target.value))} />
      <span>{sample.totalSec.toFixed(1)}s</span>
    </div>
    <div className="timeline-shot-buttons">{orderedShots.map((shot) => <button key={shot.id} className={shot.id === sample.activeShotId ? 'active' : ''} onClick={() => { setTimelineProgress(timelineShotProgress(scene, shot.id)); selectShot(scene.id, shot.id) }}>S{String(shot.order).padStart(2, '0')}</button>)}</div>
    <small className="timeline-disclaimer">Shot setup 차이는 컷으로 표시됩니다. 실제 연속 이동은 Spatial Transition이 있을 때만 보간합니다.</small>
  </section>
}
