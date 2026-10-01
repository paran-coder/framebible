import { AlertTriangle, CheckCircle2, CircleX, ExternalLink, Film, LocateFixed } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { StatusPill } from '../../components/StatusPill'
import { buildProjectReadiness, type ReadinessStatus } from '../../core/readiness'
import type { GenerationTarget } from '../../core/types'
import { useProjectStore } from '../../store/projectStore'
import { useMemo, useState } from 'react'

const label: Record<ReadinessStatus, string> = { ready: 'Ready', 'needs-review': 'Needs Review', blocked: 'Blocked' }
const tone: Record<ReadinessStatus, 'success' | 'warning' | 'danger'> = { ready: 'success', 'needs-review': 'warning', blocked: 'danger' }

export function DashboardView() {
  const project = useProjectStore((state) => state.project)
  const selectScene = useProjectStore((state) => state.selectScene)
  const selectShot = useProjectStore((state) => state.selectShot)
  const setActiveView = useProjectStore((state) => state.setActiveView)
  const [model, setModel] = useState<GenerationTarget>('seedance')
  const readiness = useMemo(() => buildProjectReadiness(project, model), [project, model])

  const navigate = (sceneId: string, shotId?: string) => {
    if (shotId) {
      selectShot(sceneId, shotId)
      setActiveView('shots')
      return
    }
    selectScene(sceneId)
    setActiveView('export')
  }

  return (
    <section className="page dashboard-page">
      <PageHeader eyebrow="PRODUCTION DASHBOARD" title="생성 준비 상태를 확인합니다." description="품질 점수가 아니라 Capability·Continuity·Package 규칙의 통과 여부와 다음 조치만 보여줍니다." action={<label className="dashboard-model-select"><span>Target</span><select value={model} onChange={(event) => setModel(event.target.value as GenerationTarget)}><option value="seedance">Seedance 2.5</option><option value="veo">Veo 3.1</option><option value="kling">Kling</option></select></label>} />

      <div className="dashboard-summary-grid">
        <article className={`readiness-hero ${readiness.status}`}>
          <div><span className="eyebrow">PROJECT STATUS</span><h2>{label[readiness.status]}</h2><p>{project.title} · {model}</p></div>
          {readiness.status === 'ready' ? <CheckCircle2 size={34} /> : readiness.status === 'blocked' ? <CircleX size={34} /> : <AlertTriangle size={34} />}
        </article>
        <article className="dashboard-metric"><strong>{readiness.counts.ready}</strong><span>Ready</span></article>
        <article className="dashboard-metric"><strong>{readiness.counts.needsReview}</strong><span>Needs Review</span></article>
        <article className="dashboard-metric"><strong>{readiness.counts.blocked}</strong><span>Blocked</span></article>
      </div>

      <div className="panel dashboard-scene-panel">
        <div className="panel-heading"><div><span className="eyebrow">SCENE READINESS</span><h2>Production Queue</h2></div><span className="muted-copy">{readiness.scenes.length} scenes</span></div>
        <div className="dashboard-scene-list">
          {readiness.scenes.map((scene) => (
            <article key={scene.sceneId} className={`dashboard-scene-row ${scene.status}`}>
              <div className="dashboard-scene-main">
                <span className="dashboard-scene-order"><Film size={14} /> S{String(scene.sceneOrder).padStart(2, '0')}</span>
                <div><strong>{scene.title || 'Untitled Scene'}</strong><small>{scene.blockers.length} blockers · {scene.reviews.length} review items</small></div>
                <StatusPill tone={tone[scene.status]}>{label[scene.status]}</StatusPill>
              </div>
              {(scene.blockers.length || scene.reviews.length) ? <div className="dashboard-issue-stack">
                {[...scene.blockers, ...scene.reviews].slice(0, 6).map((item) => <button key={item.id} className={`dashboard-issue ${item.status}`} onClick={() => navigate(item.sceneId, item.shotId)}><span>{item.status === 'blocked' ? 'BLOCK' : 'REVIEW'}</span><p>{item.message}</p><LocateFixed size={14} /></button>)}
                {scene.blockers.length + scene.reviews.length > 6 ? <small>+ {scene.blockers.length + scene.reviews.length - 6} more items</small> : null}
              </div> : <button className="dashboard-ready-action" onClick={() => navigate(scene.sceneId)}><CheckCircle2 size={15} /> Export에서 패키지 확인 <ExternalLink size={13} /></button>}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
