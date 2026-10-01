import { useEffect, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import { Camera, Eye, EyeOff, ImagePlus, Move, Plus, Route, RotateCcw, RotateCw, Trash2 } from 'lucide-react'
import { compassDirection, ensureSceneGeography, findSnapZone, horizontalFovDeg, parseAspectRatio, spatialZone, zoneName } from '../../core/geography'
import { referenceFromFile } from '../../core/referenceImages'
import type { SpatialTransitionSubjectType, SpatialZoneKind } from '../../core/types'
import { useProjectStore } from '../../store/projectStore'
import { SpatialTimeline } from './SpatialTimeline'

type Selection = { type: 'character' | 'prop' | 'camera' | 'zone'; id: string }
type DragState = Selection & { pointerId: number; mode: 'position' | 'direction' }
type DragPreview = { x?: number; y?: number; directionDeg?: number }
type BackgroundGesture = { pointerId: number; mode: 'position' | 'scale' | 'rotation'; startX: number; startY: number; startScale: number; startRotation: number; centerClientX: number; centerClientY: number; startDistance: number; startAngle: number }

const pct = (value: number) => `${Math.round(value * 1000) / 10}%`
const clampPct = (value: number) => Math.min(100, Math.max(0, value))

export function BlockingBoard({ sceneId, shotId }: { sceneId: string; shotId: string }) {
  const project = useProjectStore((state) => state.project)
  const updateCharacterPlacement = useProjectStore((state) => state.updateCharacterPlacement)
  const snapCharacterPlacement = useProjectStore((state) => state.snapCharacterPlacement)
  const updatePropPlacement = useProjectStore((state) => state.updatePropPlacement)
  const snapPropPlacement = useProjectStore((state) => state.snapPropPlacement)
  const updateShotCamera = useProjectStore((state) => state.updateShotCamera)
  const snapShotCamera = useProjectStore((state) => state.snapShotCamera)
  const resetSceneGeography = useProjectStore((state) => state.resetSceneGeography)
  const setSceneBackground = useProjectStore((state) => state.setSceneBackground)
  const updateSceneBackground = useProjectStore((state) => state.updateSceneBackground)
  const removeSceneBackground = useProjectStore((state) => state.removeSceneBackground)
  const addSpatialZone = useProjectStore((state) => state.addSpatialZone)
  const updateSpatialZone = useProjectStore((state) => state.updateSpatialZone)
  const removeSpatialZone = useProjectStore((state) => state.removeSpatialZone)
  const boardRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selection, setSelection] = useState<Selection>({ type: 'camera', id: shotId })
  const [drag, setDrag] = useState<DragState | null>(null)
  const [dragPreview, setDragPreviewState] = useState<DragPreview | null>(null)
  const dragPreviewRef = useRef<DragPreview | null>(null)
  const [showCameraPath, setShowCameraPath] = useState(true)
  const [backgroundError, setBackgroundError] = useState('')
  const [zoneKind, setZoneKind] = useState<SpatialZoneKind>('doorway')
  const [backgroundEdit, setBackgroundEdit] = useState(false)
  const [backgroundGesture, setBackgroundGesture] = useState<BackgroundGesture | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<{ x: number; y: number; scale: number; rotationDeg: number } | null>(null)
  const backgroundPreviewRef = useRef<typeof backgroundPreview>(null)

  const scene = project.scenes.find((item) => item.id === sceneId) ?? project.scenes[0]
  const shot = scene.shots.find((item) => item.id === shotId) ?? scene.shots[0]
  const geography = useMemo(() => ensureSceneGeography(scene, project.styleDNA.aspectRatio), [scene, project.styleDNA.aspectRatio])
  const displayGeography = useMemo(() => {
    if (!drag || !dragPreview) return geography
    if (drag.type === 'character') return { ...geography, characterPlacements: geography.characterPlacements.map((item) => item.characterId === drag.id ? { ...item, ...dragPreview } : item) }
    if (drag.type === 'prop') return { ...geography, propPlacements: geography.propPlacements.map((item) => item.propId === drag.id ? { ...item, ...dragPreview } : item) }
    if (drag.type === 'zone') return { ...geography, zones: (geography.zones ?? []).map((item) => item.id === drag.id ? { ...item, ...dragPreview } : item) }
    return { ...geography, shotCameras: geography.shotCameras.map((item) => item.shotId === drag.id ? { ...item, ...dragPreview } : item) }
  }, [drag, dragPreview, geography])
  const snapCandidate = useMemo(() => {
    if (!drag || drag.mode !== 'position' || drag.type === 'zone' || !dragPreview || dragPreview.x === undefined || dragPreview.y === undefined) return undefined
    return findSnapZone(geography, dragPreview.x, dragPreview.y)
  }, [drag, dragPreview, geography])
  const camera = displayGeography.shotCameras.find((item) => item.shotId === shot.id) ?? displayGeography.shotCameras[0]
  const ratio = parseAspectRatio(geography.stageAspectRatio)
  const stageHeightUnits = 100 / ratio
  const fov = camera ? horizontalFovDeg(camera.focalLengthMm) : 40
  const orderedCameras = useMemo(() => {
    const shotById = new Map(scene.shots.map((item) => [item.id, item]))
    return displayGeography.shotCameras
      .map((item) => ({ camera: item, shot: shotById.get(item.shotId) }))
      .filter((item): item is { camera: typeof displayGeography.shotCameras[number]; shot: typeof scene.shots[number] } => Boolean(item.shot))
      .sort((a, b) => a.shot.order - b.shot.order)
  }, [displayGeography.shotCameras, scene.shots])

  useEffect(() => setSelection({ type: 'camera', id: shot.id }), [shot.id])

  const assetName = (id: string) => project.assets.find((asset) => asset.id === id)?.name ?? id
  const character = selection.type === 'character' ? displayGeography.characterPlacements.find((item) => item.characterId === selection.id) : undefined
  const prop = selection.type === 'prop' ? displayGeography.propPlacements.find((item) => item.propId === selection.id) : undefined
  const selectedCamera = selection.type === 'camera' ? displayGeography.shotCameras.find((item) => item.shotId === selection.id) : undefined
  const selectedZone = selection.type === 'zone' ? (displayGeography.zones ?? []).find((item) => item.id === selection.id) : undefined

  const pointFromPointer = (clientX: number, clientY: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    return {
      x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
      rect
    }
  }

  const setDragPreview = (preview: DragPreview | null) => {
    dragPreviewRef.current = preview
    setDragPreviewState(preview)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    const point = pointFromPointer(event.clientX, event.clientY)
    if (!point) return
    if (drag.mode === 'direction' && drag.type === 'camera') {
      const current = displayGeography.shotCameras.find((item) => item.shotId === drag.id)
      if (!current) return
      const cx = point.rect.left + current.x * point.rect.width
      const cy = point.rect.top + current.y * point.rect.height
      const angle = Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI
      setDragPreview({ directionDeg: (angle + 360) % 360 })
      return
    }
    setDragPreview({ x: point.x, y: point.y })
  }

  const beginDrag = (event: ReactPointerEvent<HTMLButtonElement>, next: Selection, mode: DragState['mode'] = 'position') => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSelection(next)
    setDrag({ ...next, pointerId: event.pointerId, mode })
    setDragPreview(null)
  }

  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!drag || drag.pointerId !== event.pointerId) return
    onPointerMove(event)
    const preview = dragPreviewRef.current
    if (preview) {
      if (drag.mode === 'position' && preview.x !== undefined && preview.y !== undefined) {
        if (drag.type === 'character') snapCharacterPlacement(scene.id, drag.id, preview.x, preview.y)
        if (drag.type === 'prop') snapPropPlacement(scene.id, drag.id, preview.x, preview.y)
        if (drag.type === 'camera') snapShotCamera(scene.id, drag.id, preview.x, preview.y)
        if (drag.type === 'zone') updateSpatialZone(scene.id, drag.id, preview)
      } else if (drag.type === 'camera') updateShotCamera(scene.id, drag.id, preview)
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDrag(null)
    setDragPreview(null)
  }

  const cancelDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDrag(null)
    setDragPreview(null)
  }

  const onBackgroundFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBackgroundError('')
    try {
      const reference = await referenceFromFile(file)
      setSceneBackground(scene.id, reference)
    } catch (error) {
      setBackgroundError(error instanceof Error ? error.message : '배경 이미지를 읽지 못했습니다.')
    }
  }

  const cameraCone = camera ? (() => {
    const x = camera.x * 100
    const y = camera.y * stageHeightUnits
    const length = 56
    const half = fov / 2
    const ray = (deg: number) => ({ x: x + Math.cos(deg * Math.PI / 180) * length, y: y + Math.sin(deg * Math.PI / 180) * length })
    const a = ray(camera.directionDeg - half)
    const b = ray(camera.directionDeg + half)
    const c = ray(camera.directionDeg)
    return { x, y, a, b, c }
  })() : null

  const handlePosition = camera ? {
    left: pct(Math.min(0.98, Math.max(0.02, camera.x + Math.cos(camera.directionDeg * Math.PI / 180) * 0.075))),
    top: pct(Math.min(0.98, Math.max(0.02, camera.y + Math.sin(camera.directionDeg * Math.PI / 180) * 0.075 * ratio)))
  } : undefined

  const pathPoints = orderedCameras.map(({ camera: item }) => `${item.x * 100},${item.y * stageHeightUnits}`).join(' ')
  const background = geography.background
  const displayBackground = background ? { ...background, ...(backgroundPreview ?? {}) } : undefined

  const setBackgroundPreviewSafe = (preview: typeof backgroundPreview) => {
    backgroundPreviewRef.current = preview
    setBackgroundPreview(preview)
  }

  const beginBackgroundGesture = (event: ReactPointerEvent<HTMLButtonElement>, mode: BackgroundGesture['mode']) => {
    if (!background || !boardRef.current) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = boardRef.current.getBoundingClientRect()
    const centerClientX = rect.left + background.x * rect.width
    const centerClientY = rect.top + background.y * rect.height
    const dx = event.clientX - centerClientX
    const dy = event.clientY - centerClientY
    setBackgroundGesture({ pointerId: event.pointerId, mode, startX: background.x, startY: background.y, startScale: background.scale, startRotation: background.rotationDeg, centerClientX, centerClientY, startDistance: Math.max(8, Math.hypot(dx, dy)), startAngle: Math.atan2(dy, dx) * 180 / Math.PI })
    setBackgroundPreviewSafe({ x: background.x, y: background.y, scale: background.scale, rotationDeg: background.rotationDeg })
  }

  const moveBackgroundGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!backgroundGesture || backgroundGesture.pointerId !== event.pointerId || !boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const current = backgroundPreviewRef.current ?? { x: backgroundGesture.startX, y: backgroundGesture.startY, scale: backgroundGesture.startScale, rotationDeg: backgroundGesture.startRotation }
    if (backgroundGesture.mode === 'position') {
      setBackgroundPreviewSafe({ ...current, x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) })
      return
    }
    const dx = event.clientX - backgroundGesture.centerClientX
    const dy = event.clientY - backgroundGesture.centerClientY
    if (backgroundGesture.mode === 'scale') {
      const scale = Math.min(4, Math.max(0.25, backgroundGesture.startScale * Math.hypot(dx, dy) / backgroundGesture.startDistance))
      setBackgroundPreviewSafe({ ...current, scale })
      return
    }
    const angle = Math.atan2(dy, dx) * 180 / Math.PI
    setBackgroundPreviewSafe({ ...current, rotationDeg: (backgroundGesture.startRotation + angle - backgroundGesture.startAngle + 360) % 360 })
  }

  const endBackgroundGesture = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!backgroundGesture || backgroundGesture.pointerId !== event.pointerId) return
    moveBackgroundGesture(event)
    const preview = backgroundPreviewRef.current
    if (preview) updateSceneBackground(scene.id, preview)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setBackgroundGesture(null)
    setBackgroundPreviewSafe(null)
  }

  return (
    <div className="blocking-board-wrap">
      <div className="blocking-board-toolbar">
        <div><span className="eyebrow">BLOCKING BOARD</span><strong>{scene.title} · {shot.title}</strong></div>
        <div className="blocking-board-actions">
          <button className={`secondary-button compact-button ${showCameraPath ? 'active' : ''}`} onClick={() => setShowCameraPath((value) => !value)} aria-pressed={showCameraPath}>{showCameraPath ? <Eye size={13} /> : <EyeOff size={13} />} Camera path</button>
          <button className="secondary-button compact-button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={13} /> 배경</button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={onBackgroundFile} />
          {background ? <button className={`secondary-button compact-button ${backgroundEdit ? 'active' : ''}`} aria-pressed={backgroundEdit} onClick={() => setBackgroundEdit((value) => !value)}><Move size={13} /> 배경 편집</button> : null}
          <button className="secondary-button compact-button" onClick={() => resetSceneGeography(scene.id)}><RotateCcw size={13} /> 초기 배치</button>
        </div>
      </div>

      {backgroundError ? <p className="blocking-error" role="alert">{backgroundError}</p> : null}

      <div className="zone-toolbar"><div><span className="eyebrow">SPATIAL ZONES</span><small>Doorway · Window · Table · Custom</small></div><div><select aria-label="추가할 공간 영역 종류" value={zoneKind} onChange={(event) => setZoneKind(event.target.value as SpatialZoneKind)}><option value="doorway">Doorway</option><option value="window">Window</option><option value="table">Table</option><option value="custom">Custom</option></select><button className="secondary-button compact-button" onClick={() => { const id = addSpatialZone(scene.id, zoneKind); if (id) setSelection({ type: 'zone', id }) }}><Plus size={13} /> Zone 추가</button></div></div>

      <div ref={boardRef} className="blocking-board" role="group" style={{ aspectRatio: String(ratio) }} aria-label={`${scene.title} 2D Blocking Board`}>
        {displayBackground?.reference.dataUrl ? <img
          className="blocking-background-image"
          src={displayBackground.reference.dataUrl}
          alt=""
          aria-hidden="true"
          style={{
            left: pct(displayBackground.x),
            top: pct(displayBackground.y),
            opacity: displayBackground.opacity,
            objectFit: displayBackground.fit,
            transform: `translate(-50%, -50%) scale(${displayBackground.scale}) rotate(${displayBackground.rotationDeg}deg)`
          }}
        /> : null}
        <div className="blocking-zone zone-background">BACKGROUND</div>
        <div className="blocking-zone zone-midground">MIDGROUND</div>
        <div className="blocking-zone zone-foreground">FOREGROUND</div>

        {(displayGeography.zones ?? []).map((zone) => <button key={zone.id} className={`spatial-zone-node ${selection.type === 'zone' && selection.id === zone.id ? 'selected' : ''} ${snapCandidate?.zone.id === zone.id ? 'snap-target' : ''}`} style={{ left: pct(zone.x), top: pct(zone.y), width: pct(zone.width), height: pct(zone.height), transform: `translate(-50%, -50%) rotate(${zone.rotationDeg}deg)` }} aria-label={`${zone.name} 공간 영역. 드래그해서 이동`} onClick={() => setSelection({ type: 'zone', id: zone.id })} onPointerDown={(event) => beginDrag(event, { type: 'zone', id: zone.id })} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={cancelDrag}><span>{zone.name}</span></button>)}

        {showCameraPath && orderedCameras.length > 1 ? <svg className="camera-path-overlay" viewBox={`0 0 100 ${stageHeightUnits}`} preserveAspectRatio="none" aria-label="Shot 순서에 따른 카메라 경로">
          <polyline points={pathPoints} />
          {orderedCameras.map(({ camera: item, shot: pathShot }) => <g key={item.shotId} className={item.shotId === shot.id ? 'current' : ''}>
            <circle cx={item.x * 100} cy={item.y * stageHeightUnits} r={item.shotId === shot.id ? 2.2 : 1.7} />
            <text x={item.x * 100} y={item.y * stageHeightUnits - 3}>{pathShot.order}</text>
          </g>)}
        </svg> : null}

        {cameraCone ? <svg className="camera-fov" viewBox={`0 0 100 ${stageHeightUnits}`} preserveAspectRatio="none" aria-hidden="true">
          <polygon points={`${cameraCone.x},${cameraCone.y} ${cameraCone.a.x},${cameraCone.a.y} ${cameraCone.b.x},${cameraCone.b.y}`} />
          <line x1={cameraCone.x} y1={cameraCone.y} x2={cameraCone.c.x} y2={cameraCone.c.y} />
        </svg> : null}

        {displayGeography.characterPlacements.map((item) => <button
          key={item.characterId}
          className={`blocking-node character-node ${item.zoneId ? 'zone-bound' : ''} ${selection.type === 'character' && selection.id === item.characterId ? 'selected' : ''}`}
          style={{ left: pct(item.x), top: pct(item.y), transform: `translate(-50%, -50%) rotate(${item.facingDeg}deg)` }}
          aria-label={`${assetName(item.characterId)} 캐릭터 위치. 드래그해서 이동`}
          title={`${assetName(item.characterId)} · facing ${Math.round(item.facingDeg)}°`}
          onClick={() => setSelection({ type: 'character', id: item.characterId })}
          onPointerDown={(event) => beginDrag(event, { type: 'character', id: item.characterId })}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
        ><span style={{ transform: `rotate(${-item.facingDeg}deg)` }}>{assetName(item.characterId).slice(0, 2)}</span></button>)}

        {displayGeography.propPlacements.map((item) => <button
          key={item.propId}
          className={`blocking-node prop-node ${item.zoneId ? 'zone-bound' : ''} ${selection.type === 'prop' && selection.id === item.propId ? 'selected' : ''}`}
          style={{ left: pct(item.x), top: pct(item.y), transform: `translate(-50%, -50%) rotate(${item.rotationDeg}deg)` }}
          aria-label={`${assetName(item.propId)} 소품 위치. 드래그해서 이동`}
          title={assetName(item.propId)}
          onClick={() => setSelection({ type: 'prop', id: item.propId })}
          onPointerDown={(event) => beginDrag(event, { type: 'prop', id: item.propId })}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={cancelDrag}
        ><span style={{ transform: `rotate(${-item.rotationDeg}deg)` }}>{assetName(item.propId).slice(0, 2)}</span></button>)}

        {camera ? <>
          <button
            className={`blocking-node camera-node ${camera.zoneId ? 'zone-bound' : ''} ${selection.type === 'camera' ? 'selected' : ''}`}
            style={{ left: pct(camera.x), top: pct(camera.y), transform: `translate(-50%, -50%) rotate(${camera.directionDeg}deg)` }}
            aria-label={`${shot.title} 카메라 위치. 드래그해서 이동`}
            title={`${Number(camera.focalLengthMm.toFixed(1))}mm · ${Math.round(fov)}° FOV`}
            onClick={() => setSelection({ type: 'camera', id: shot.id })}
            onPointerDown={(event) => beginDrag(event, { type: 'camera', id: shot.id })}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
          ><Camera size={16} /></button>
          <button
            className="camera-direction-handle"
            style={handlePosition}
            aria-label="카메라 방향 조절 핸들"
            title="드래그해서 카메라 방향 변경"
            onPointerDown={(event) => beginDrag(event, { type: 'camera', id: shot.id }, 'direction')}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={cancelDrag}
          />
        </> : null}

        {backgroundEdit && displayBackground ? <>
          <button className="background-direct-handle background-move-handle" style={{ left: pct(displayBackground.x), top: pct(displayBackground.y) }} aria-label="배경 이미지 이동 핸들" title="드래그해서 배경 이동" onPointerDown={(event) => beginBackgroundGesture(event, 'position')} onPointerMove={moveBackgroundGesture} onPointerUp={endBackgroundGesture} onPointerCancel={endBackgroundGesture}><Move size={14} /></button>
          <button className="background-direct-handle background-scale-handle" style={{ left: pct(Math.min(.98, displayBackground.x + .13 * Math.min(displayBackground.scale, 2))), top: pct(Math.min(.98, displayBackground.y + .1 * Math.min(displayBackground.scale, 2))) }} aria-label="배경 이미지 확대 축소 핸들" title="드래그해서 배경 크기 변경" onPointerDown={(event) => beginBackgroundGesture(event, 'scale')} onPointerMove={moveBackgroundGesture} onPointerUp={endBackgroundGesture} onPointerCancel={endBackgroundGesture}>↗</button>
          <button className="background-direct-handle background-rotate-handle" style={{ left: pct(displayBackground.x), top: pct(Math.max(.02, displayBackground.y - .13 * Math.min(displayBackground.scale, 2))) }} aria-label="배경 이미지 회전 핸들" title="드래그해서 배경 회전" onPointerDown={(event) => beginBackgroundGesture(event, 'rotation')} onPointerMove={moveBackgroundGesture} onPointerUp={endBackgroundGesture} onPointerCancel={endBackgroundGesture}><RotateCw size={14} /></button>
        </> : null}
      </div>

      {snapCandidate ? <div className="snap-hint" role="status">Release to snap → <strong>{snapCandidate.zone.name}</strong></div> : null}

      <div className="blocking-inspector">
        {character ? <>
          <strong>@{assetName(character.characterId)}{character.zoneId ? <small className="zone-binding-badge"> ↳ {zoneName(displayGeography, character.zoneId)}</small> : null}</strong>
          <CoordinateInputs x={character.x} y={character.y} onChange={(patch) => updateCharacterPlacement(scene.id, character.characterId, patch)} />
          <NumberControl label="Facing" value={character.facingDeg} min={0} max={359} suffix="°" onChange={(facingDeg) => updateCharacterPlacement(scene.id, character.characterId, { facingDeg })} />
        </> : null}
        {prop ? <>
          <strong>@{assetName(prop.propId)}{prop.zoneId ? <small className="zone-binding-badge"> ↳ {zoneName(displayGeography, prop.zoneId)}</small> : null}</strong>
          <CoordinateInputs x={prop.x} y={prop.y} onChange={(patch) => updatePropPlacement(scene.id, prop.propId, patch)} />
          <NumberControl label="Rotation" value={prop.rotationDeg} min={0} max={359} suffix="°" onChange={(rotationDeg) => updatePropPlacement(scene.id, prop.propId, { rotationDeg })} />
        </> : null}
        {selectedZone ? <>
          <strong>{selectedZone.name}</strong>
          <CoordinateInputs x={selectedZone.x} y={selectedZone.y} onChange={(patch) => updateSpatialZone(scene.id, selectedZone.id, patch)} />
          <NumberControl label="Width" value={selectedZone.width * 100} min={4} max={100} suffix="%" onChange={(width) => updateSpatialZone(scene.id, selectedZone.id, { width: width / 100 })} />
          <NumberControl label="Height" value={selectedZone.height * 100} min={4} max={100} suffix="%" onChange={(height) => updateSpatialZone(scene.id, selectedZone.id, { height: height / 100 })} />
        </> : null}
        {selectedCamera ? <>
          <strong><Camera size={14} /> {shot.title}{selectedCamera.zoneId ? <small className="zone-binding-badge"> ↳ {zoneName(displayGeography, selectedCamera.zoneId)}</small> : null}</strong>
          <CoordinateInputs x={selectedCamera.x} y={selectedCamera.y} onChange={(patch) => updateShotCamera(scene.id, shot.id, patch)} />
          <NumberControl label="Direction" value={selectedCamera.directionDeg} min={0} max={359} suffix={`° · ${compassDirection(selectedCamera.directionDeg)}`} onChange={(directionDeg) => updateShotCamera(scene.id, shot.id, { directionDeg })} />
          <NumberControl label="Focal" value={selectedCamera.focalLengthMm} min={8} max={200} step={0.5} suffix={`mm · ${Math.round(horizontalFovDeg(selectedCamera.focalLengthMm))}° FOV`} onChange={(focalLengthMm) => updateShotCamera(scene.id, shot.id, { focalLengthMm })} />
        </> : null}
      </div>

      {selectedZone ? <div className="zone-editor"><label><span>Name</span><input value={selectedZone.name} onChange={(event) => updateSpatialZone(scene.id, selectedZone.id, { name: event.target.value })} /></label><label><span>Type</span><select value={selectedZone.kind} onChange={(event) => updateSpatialZone(scene.id, selectedZone.id, { kind: event.target.value as SpatialZoneKind })}><option value="doorway">Doorway</option><option value="window">Window</option><option value="table">Table</option><option value="custom">Custom</option></select></label><NumberControl label="Rotation" value={selectedZone.rotationDeg} min={0} max={359} suffix="°" onChange={(rotationDeg) => updateSpatialZone(scene.id, selectedZone.id, { rotationDeg })} /><button className="danger-button" onClick={() => { removeSpatialZone(scene.id, selectedZone.id); setSelection({ type: 'camera', id: shot.id }) }}><Trash2 size={14} /> Zone 삭제</button></div> : null}

      {background ? <div className="background-controls" aria-label="Blocking Board 배경 설정">
        <div className="background-control-title"><span><ImagePlus size={14} /> {background.reference.name}</span><button className="icon-button" aria-label="배경 제거" title="배경 제거" onClick={() => removeSceneBackground(scene.id)}><Trash2 size={14} /></button></div>
        <RangeControl label="Opacity" value={background.opacity} min={0.08} max={1} step={0.01} display={`${Math.round(background.opacity * 100)}%`} onChange={(opacity) => updateSceneBackground(scene.id, { opacity })} />
        <RangeControl label="Scale" value={background.scale} min={0.25} max={4} step={0.05} display={`${Math.round(background.scale * 100)}%`} onChange={(scale) => updateSceneBackground(scene.id, { scale })} />
        <NumberControl label="X" value={background.x * 100} min={0} max={100} suffix="%" onChange={(x) => updateSceneBackground(scene.id, { x: x / 100 })} />
        <NumberControl label="Y" value={background.y * 100} min={0} max={100} suffix="%" onChange={(y) => updateSceneBackground(scene.id, { y: y / 100 })} />
        <NumberControl label="Rotation" value={background.rotationDeg} min={0} max={359} suffix="°" onChange={(rotationDeg) => updateSceneBackground(scene.id, { rotationDeg })} />
        <label className="background-fit-control"><span>Fit</span><select value={background.fit} onChange={(event) => updateSceneBackground(scene.id, { fit: event.target.value as 'contain' | 'cover' })}><option value="contain">Contain</option><option value="cover">Cover</option></select></label>
      </div> : null}

      <CameraPathSummary cameras={orderedCameras} activeShotId={shot.id} />
      <SpatialTimeline sceneId={scene.id} />
      <SpatialTransitionsPanel sceneId={scene.id} />
    </div>
  )
}

function CameraPathSummary({ cameras, activeShotId }: { cameras: Array<{ camera: { shotId: string; x: number; y: number; directionDeg: number; focalLengthMm: number }; shot: { id: string; order: number; title: string } }>; activeShotId: string }) {
  if (cameras.length < 2) return null
  return <div className="camera-path-summary"><span className="eyebrow"><Route size={12} /> CAMERA PATH · SHOT SETUPS</span><div>{cameras.map(({ camera, shot }, index) => <span key={camera.shotId} className={camera.shotId === activeShotId ? 'current' : ''}>{index > 0 ? '→ ' : ''}{String(shot.order).padStart(2, '0')} · {spatialZone(camera.x, camera.y)}</span>)}</div><small>경로선은 Shot별 카메라 setup 순서입니다. 실제 연속 카메라 이동은 Spatial Transition에서 명시하세요.</small></div>
}

function SpatialTransitionsPanel({ sceneId }: { sceneId: string }) {
  const project = useProjectStore((state) => state.project)
  const addSpatialTransition = useProjectStore((state) => state.addSpatialTransition)
  const updateSpatialTransition = useProjectStore((state) => state.updateSpatialTransition)
  const removeSpatialTransition = useProjectStore((state) => state.removeSpatialTransition)
  const scene = project.scenes.find((item) => item.id === sceneId) ?? project.scenes[0]
  const zones = ensureSceneGeography(scene, project.styleDNA.aspectRatio).zones ?? []
  const [subjectType, setSubjectType] = useState<SpatialTransitionSubjectType>('character')
  const candidates = useMemo(() => subjectType === 'character'
    ? scene.characterBindings.map((binding) => project.assets.find((asset) => asset.id === binding.characterId)).filter((asset) => asset?.type === 'character')
    : subjectType === 'prop'
      ? scene.propIds.map((id) => project.assets.find((asset) => asset.id === id)).filter((asset) => asset?.type === 'prop')
      : [], [project.assets, scene.characterBindings, scene.propIds, subjectType])
  const [subjectId, setSubjectId] = useState('')

  useEffect(() => {
    if (subjectType === 'camera') { setSubjectId(''); return }
    if (!candidates.some((asset) => asset?.id === subjectId)) setSubjectId(candidates[0]?.id ?? '')
  }, [subjectType, candidates, subjectId])

  const orderedShots = [...scene.shots].sort((a, b) => a.order - b.order)

  const addEvent = () => {
    const fromShotId = orderedShots[0]?.id
    const toShotId = orderedShots[1]?.id ?? orderedShots[0]?.id
    const geography = ensureSceneGeography(scene, project.styleDNA.aspectRatio)
    const cameraByShot = new Map(geography.shotCameras.map((camera) => [camera.shotId, camera]))
    const fromCamera = fromShotId ? cameraByShot.get(fromShotId) : undefined
    const toCamera = toShotId ? cameraByShot.get(toShotId) : undefined
    addSpatialTransition(scene.id, {
      subjectType,
      subjectId: subjectType === 'camera' ? undefined : subjectId || undefined,
      fromShotId,
      toShotId,
      from: subjectType === 'camera' && fromCamera ? spatialZone(fromCamera.x, fromCamera.y) : '',
      to: subjectType === 'camera' && toCamera ? spatialZone(toCamera.x, toCamera.y) : '',
      motion: subjectType === 'camera' ? 'controlled camera move' : 'motivated movement',
      note: ''
    })
  }

  return <section className="spatial-transition-panel" aria-label="Spatial Transition Events">
    <div className="spatial-transition-heading"><div><span className="eyebrow">SPATIAL TRANSITIONS</span><strong>의도된 공간 이동을 Shot 사이에 명시합니다.</strong></div><div className="spatial-transition-add"><select value={subjectType} onChange={(event) => setSubjectType(event.target.value as SpatialTransitionSubjectType)}><option value="character">Character</option><option value="prop">Prop</option><option value="camera">Camera</option></select>{subjectType !== 'camera' ? <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{candidates.length ? candidates.map((asset) => <option key={asset!.id} value={asset!.id}>{asset!.name}</option>) : <option value="">No bound asset</option>}</select> : null}<button className="secondary-button compact-button" disabled={subjectType !== 'camera' && !subjectId} onClick={addEvent}>추가</button></div></div>
    {(scene.spatialTransitions ?? []).length ? <div className="spatial-transition-list">{(scene.spatialTransitions ?? []).map((event) => {
      const eventCandidates = event.subjectType === 'character'
        ? scene.characterBindings.map((binding) => project.assets.find((asset) => asset.id === binding.characterId)).filter((asset) => asset?.type === 'character')
        : event.subjectType === 'prop'
          ? scene.propIds.map((id) => project.assets.find((asset) => asset.id === id)).filter((asset) => asset?.type === 'prop')
          : []
      return <article key={event.id} className="spatial-transition-row">
      <div className="spatial-transition-row-head"><div className="spatial-subject-edit"><select aria-label="공간 전환 대상 종류" value={event.subjectType} onChange={(e) => { const nextType = e.target.value as SpatialTransitionSubjectType; const firstId = nextType === 'character' ? scene.characterBindings[0]?.characterId : nextType === 'prop' ? scene.propIds[0] : undefined; updateSpatialTransition(scene.id, event.id, { subjectType: nextType, subjectId: firstId }) }}><option value="character">Character</option><option value="prop">Prop</option><option value="camera">Camera</option></select>{event.subjectType !== 'camera' ? <select aria-label="공간 전환 대상 자산" value={event.subjectId ?? ''} onChange={(e) => updateSpatialTransition(scene.id, event.id, { subjectId: e.target.value || undefined })}>{eventCandidates.map((asset) => <option key={asset!.id} value={asset!.id}>{asset!.name}</option>)}</select> : <strong>Camera</strong>}</div><button className="icon-button" aria-label="공간 전환 삭제" onClick={() => removeSpatialTransition(scene.id, event.id)}><Trash2 size={13} /></button></div>
      <div className="spatial-transition-shot-range"><select value={event.fromShotId ?? ''} onChange={(e) => updateSpatialTransition(scene.id, event.id, { fromShotId: e.target.value || undefined })}><option value="">Scene start</option>{orderedShots.map((shot) => <option key={shot.id} value={shot.id}>Shot {String(shot.order).padStart(2, '0')}</option>)}</select><span>→</span><select value={event.toShotId ?? ''} onChange={(e) => updateSpatialTransition(scene.id, event.id, { toShotId: e.target.value || undefined })}><option value="">Scene end</option>{orderedShots.map((shot) => <option key={shot.id} value={shot.id}>Shot {String(shot.order).padStart(2, '0')}</option>)}</select></div>
      <div className="spatial-transition-fields"><select aria-label="시작 Spatial Zone" value={event.fromZoneId ?? ''} onChange={(e) => updateSpatialTransition(scene.id, event.id, { fromZoneId: e.target.value || undefined })}><option value="">From zone · free text</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><select aria-label="도착 Spatial Zone" value={event.toZoneId ?? ''} onChange={(e) => updateSpatialTransition(scene.id, event.id, { toZoneId: e.target.value || undefined })}><option value="">To zone · free text</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select><input aria-label="시작 공간" placeholder="fallback: left background" value={event.from} onChange={(e) => updateSpatialTransition(scene.id, event.id, { from: e.target.value })} /><input aria-label="도착 공간" placeholder="fallback: center foreground" value={event.to} onChange={(e) => updateSpatialTransition(scene.id, event.id, { to: e.target.value })} /><input aria-label="이동 방식" placeholder="slow cross / dolly forward" value={event.motion} onChange={(e) => updateSpatialTransition(scene.id, event.id, { motion: e.target.value })} /><input aria-label="공간 전환 메모" placeholder="Motivation / timing note" value={event.note} onChange={(e) => updateSpatialTransition(scene.id, event.id, { note: e.target.value })} /></div>
    </article>})}</div> : <p className="spatial-transition-empty">아직 공간 전환이 없습니다. 카메라 이동이나 캐릭터/소품의 의도된 이동을 추가하세요.</p>}
  </section>
}

function CoordinateInputs({ x, y, onChange }: { x: number; y: number; onChange: (patch: { x?: number; y?: number }) => void }) {
  return <>
    <label><span>X</span><input type="number" min="0" max="100" value={Math.round(x * 100)} onChange={(event) => onChange({ x: clampPct(Number(event.target.value)) / 100 })} /><small>%</small></label>
    <label><span>Y</span><input type="number" min="0" max="100" value={Math.round(y * 100)} onChange={(event) => onChange({ y: clampPct(Number(event.target.value)) / 100 })} /><small>%</small></label>
  </>
}

function NumberControl({ label, value, min, max, step = 1, suffix, onChange }: { label: string; value: number; min: number; max: number; step?: number; suffix: string; onChange: (value: number) => void }) {
  const displayValue = step < 1 ? Number(value.toFixed(1)) : Math.round(value)
  return <label><span>{label}</span><input type="number" min={min} max={max} step={step} value={displayValue} onChange={(event) => onChange(Math.min(max, Math.max(min, Number(event.target.value) || min)))} /><small>{suffix}</small></label>
}

function RangeControl({ label, value, min, max, step, display, onChange }: { label: string; value: number; min: number; max: number; step: number; display: string; onChange: (value: number) => void }) {
  return <label className="background-range-control"><span>{label}</span><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} /><small>{display}</small></label>
}
