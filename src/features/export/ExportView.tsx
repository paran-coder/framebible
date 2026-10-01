import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Braces, CheckCircle2, Clipboard, Download, FileArchive, FileUp, Images, LocateFixed, PackageCheck, Plus, ScrollText, ShieldCheck } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { StatusPill } from '../../components/StatusPill'
import { apiParameterManifestJson } from '../../core/apiParameterManifest'
import { CAPABILITY_PROFILES, generationHasErrors, resolveGenerationSettings, validateGenerationSettings } from '../../core/capabilities'
import { lintProject } from '../../core/continuity'
import { copyText } from '../../core/browser'
import { downloadBlob, projectJson, projectZip } from '../../core/exportProject'
import { sceneGenerationPackage } from '../../core/generationPackage'
import { compileSceneForModel } from '../../core/promptCompiler'
import type { PromptModel } from '../../core/promptIR'
import { parseFrameBibleProject } from '../../core/projectValidation'
import { collectSceneReferences } from '../../core/sceneReferences'
import type { IssueSeverity, SceneGenerationSettings } from '../../core/types'
import { useProjectStore } from '../../store/projectStore'
import { ContactSheetPreview } from './ContactSheetPreview'

type IssueFilter = 'all' | IssueSeverity

export function ExportView() {
  const project = useProjectStore((state) => state.project)
  const setProject = useProjectStore((state) => state.setProject)
  const updateScene = useProjectStore((state) => state.updateScene)
  const setActiveView = useProjectStore((state) => state.setActiveView)
  const addTransitionEvent = useProjectStore((state) => state.addTransitionEvent)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importMessage, setImportMessage] = useState('')
  const [issueFilter, setIssueFilter] = useState<IssueFilter>('all')
  const [promptModel, setPromptModel] = useState<PromptModel>('seedance')
  const [copyMessage, setCopyMessage] = useState('')
  const [workspaceTab, setWorkspaceTab] = useState<'prompt' | 'api' | 'references' | 'package'>('prompt')
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId)
  const selectScene = useProjectStore((state) => state.selectScene)
  const selectShot = useProjectStore((state) => state.selectShot)
  const issues = useMemo(() => lintProject(project), [project])
  const filteredIssues = issueFilter === 'all' ? issues : issues.filter((issue) => issue.severity === issueFilter)
  const scene = project.scenes.find((item) => item.id === selectedSceneId) ?? project.scenes[0]
  const prompt = compileSceneForModel(project, scene, promptModel)
  const profile = CAPABILITY_PROFILES[promptModel]
  const generationSettings = useMemo(() => resolveGenerationSettings(project, scene, promptModel), [project, scene, promptModel])
  const capabilityIssues = useMemo(() => validateGenerationSettings(project, scene, promptModel, generationSettings), [project, scene, promptModel, generationSettings])
  const sceneReferences = useMemo(() => collectSceneReferences(project, scene), [project, scene])
  const apiManifest = useMemo(() => apiParameterManifestJson(project, scene, promptModel), [project, scene, promptModel])
  const capabilityErrors = capabilityIssues.filter((issue) => issue.severity === 'error').length
  const capabilityWarnings = capabilityIssues.filter((issue) => issue.severity === 'warning').length
  const errors = issues.filter((issue) => issue.severity === 'error').length
  const warnings = issues.filter((issue) => issue.severity === 'warning').length
  const info = issues.filter((issue) => issue.severity === 'info').length

  const updateGeneration = (patch: Partial<SceneGenerationSettings>) => {
    updateScene(scene.id, { generation: { ...(scene.generation ?? {}), [promptModel]: { ...generationSettings, ...patch } } })
  }

  const toggleReference = (referenceId: string) => {
    const selected = new Set(generationSettings.referenceImageIds)
    if (selected.has(referenceId)) selected.delete(referenceId)
    else selected.add(referenceId)
    updateGeneration({ referenceImageIds: [...selected] })
  }

  const downloadJson = () => {
    downloadBlob(new Blob([projectJson(project)], { type: 'application/json' }), `${project.title.toLowerCase().replace(/\s+/g, '-')}.framebible.json`)
  }

  const downloadZip = async () => {
    const blob = await projectZip(project, promptModel)
    downloadBlob(blob, `${project.title.toLowerCase().replace(/\s+/g, '-')}-framebible.zip`)
  }

  const downloadApiManifest = () => {
    const slug = `${String(scene.order).padStart(2, '0')}-${scene.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadBlob(new Blob([apiManifest], { type: 'application/json' }), `${slug || 'scene'}-${promptModel}-api-request.json`)
  }

  const downloadScenePackage = async () => {
    const blob = await sceneGenerationPackage(project, scene, promptModel)
    const slug = `${String(scene.order).padStart(2, '0')}-${scene.title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    downloadBlob(blob, `${slug || 'scene'}-${promptModel}-package.zip`)
  }

  const importJson = async (file?: File) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const normalized = parseFrameBibleProject(parsed)
      if (!normalized) throw new Error('invalid schema')
      setProject(normalized)
      setImportMessage('프로젝트를 불러왔습니다. 이전 작업 히스토리는 초기화되었습니다.')
    } catch {
      setImportMessage('지원되는 FrameBible 프로젝트 JSON이 아닙니다.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const navigateToIssue = (sceneId?: string, shotId?: string) => {
    if (!sceneId) return
    if (shotId) {
      selectShot(sceneId, shotId)
      setActiveView('shots')
    } else {
      selectScene(sceneId)
      setActiveView('story')
    }
  }

  return (
    <section className="page export-page">
      <PageHeader eyebrow="GENERATION PACKAGE" title="생성에 넘길 패키지를 최종 점검합니다." description="모델 설정, Continuity, Prompt, References와 API handoff를 한 Scene 단위로 확인합니다." action={<div className="header-actions"><input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => importJson(event.target.files?.[0])} /><button className="secondary-button" onClick={() => fileInputRef.current?.click()}><FileUp size={16} /> JSON 불러오기</button><button className="secondary-button" onClick={downloadZip}><FileArchive size={16} /> 프로젝트 ZIP</button></div>} />
      {importMessage ? <div className="import-message" role="status">{importMessage}</div> : null}

      <div className="export-command-strip">
        <div className="scene-select-row export-scene-row">
          {project.scenes.map((item) => <button key={item.id} className={item.id === scene.id ? 'active' : ''} onClick={() => selectScene(item.id)}>S{String(item.order).padStart(2, '0')} <span>{item.title}</span></button>)}
        </div>
        <div className="export-summary-inline" aria-label="현재 Scene 상태">
          <span><ShieldCheck size={14} /> {project.assets.reduce((sum, asset) => sum + asset.lockedFields.length, 0)} locks</span>
          <span className={errors ? 'danger' : warnings ? 'warning' : 'success'}>{errors || warnings ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {issues.length} continuity</span>
          <span className={capabilityErrors ? 'danger' : capabilityWarnings ? 'warning' : 'success'}>{capabilityErrors || capabilityWarnings ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />} {capabilityIssues.length} capability</span>
        </div>
      </div>

      <div className="generation-setup-surface">
        <div className="generation-setup-head"><div><span className="eyebrow">MODEL SETUP</span><h2>{profile.label}</h2><p>Scene {scene.order} · {scene.title}</p></div><a className="source-link" href={profile.sourceUrl} target="_blank" rel="noreferrer">공식 기준 보기</a></div>
        <div className="capability-settings-grid compact">
          <label><span>Target</span><select value={promptModel} onChange={(event) => setPromptModel(event.target.value as PromptModel)}><option value="seedance">Seedance 2.5</option><option value="veo">Veo 3.1</option><option value="kling">Kling</option></select></label>
          <label><span>Duration</span><div className="input-with-suffix"><input type="number" min="1" step="1" value={generationSettings.durationSec} onChange={(event) => updateGeneration({ durationSec: Number(event.target.value) || 0 })} /><small>sec</small></div></label>
          <label><span>Aspect</span><select value={generationSettings.aspectRatio} onChange={(event) => updateGeneration({ aspectRatio: event.target.value })}>{profile.aspectRatios.map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label>
          <label><span>Resolution</span><select value={generationSettings.resolution} onChange={(event) => updateGeneration({ resolution: event.target.value })}>{profile.resolutions.map((resolution) => <option key={resolution}>{resolution}</option>)}</select></label>
          <label><span>Audio</span><select value={generationSettings.audio} onChange={(event) => updateGeneration({ audio: event.target.value as SceneGenerationSettings['audio'] })}><option value="auto">Auto</option><option value="on">On</option><option value="off">Off</option></select></label>
          <label><span>Frame input</span><select value={generationSettings.frameMode} onChange={(event) => updateGeneration({ frameMode: event.target.value as SceneGenerationSettings['frameMode'] })}><option value="prompt-only">Prompt only</option><option value="first-image">First image</option><option value="first-last-images">First + last</option></select></label>
        </div>
        {generationSettings.frameMode !== 'prompt-only' ? <div className="frame-reference-grid compact">
          <label><span>First frame</span><select value={generationSettings.firstFrameReferenceId ?? ''} onChange={(event) => updateGeneration({ firstFrameReferenceId: event.target.value || undefined })}><option value="">선택 안 함</option>{sceneReferences.map((item) => <option key={item.id} value={item.id}>{item.assetName} · {item.reference.name}</option>)}</select></label>
          {generationSettings.frameMode === 'first-last-images' ? <label><span>Last frame</span><select value={generationSettings.lastFrameReferenceId ?? ''} onChange={(event) => updateGeneration({ lastFrameReferenceId: event.target.value || undefined })}><option value="">선택 안 함</option>{sceneReferences.map((item) => <option key={item.id} value={item.id}>{item.assetName} · {item.reference.name}</option>)}</select></label> : null}
        </div> : null}
        <div className="capability-issue-list compact" aria-live="polite">
          {capabilityIssues.length ? capabilityIssues.map((issue) => <div key={issue.id} className={`capability-issue ${issue.severity}`}><strong>{issue.severity.toUpperCase()}</strong><span>{issue.message}</span></div>) : <div className="capability-pass"><CheckCircle2 size={16} /> {profile.label} Capability Profile 통과</div>}
        </div>
      </div>

      <section className="package-workspace">
        <div className="package-tabs" role="tablist" aria-label="Generation package workspace">
          <button role="tab" aria-selected={workspaceTab === 'prompt'} className={workspaceTab === 'prompt' ? 'active' : ''} onClick={() => setWorkspaceTab('prompt')}><ScrollText size={15} /> Prompt</button>
          <button role="tab" aria-selected={workspaceTab === 'api'} className={workspaceTab === 'api' ? 'active' : ''} onClick={() => setWorkspaceTab('api')}><Braces size={15} /> API</button>
          <button role="tab" aria-selected={workspaceTab === 'references'} className={workspaceTab === 'references' ? 'active' : ''} onClick={() => setWorkspaceTab('references')}><Images size={15} /> References <span>{sceneReferences.length}</span></button>
          <button role="tab" aria-selected={workspaceTab === 'package'} className={workspaceTab === 'package' ? 'active' : ''} onClick={() => setWorkspaceTab('package')}><PackageCheck size={15} /> Package <span>{errors + capabilityErrors}</span></button>
        </div>

        {workspaceTab === 'prompt' ? <div className="package-tab-panel prompt-tab">
          <div className="tab-panel-head"><div><span className="eyebrow">MODEL PROMPT</span><h2>{profile.label} Prompt</h2><p>사람이 검토하기 쉬운 최종 생성 지시문입니다.</p></div><button className="secondary-button" onClick={async () => { const ok = await copyText(prompt); setCopyMessage(ok ? '프롬프트를 복사했습니다.' : '복사하지 못했습니다. 텍스트를 직접 선택해 주세요.') }}><Clipboard size={15} /> 복사</button></div>
          {copyMessage ? <div className="copy-status" role="status">{copyMessage}</div> : null}
          <pre className="prompt-preview polished">{prompt}</pre>
        </div> : null}

        {workspaceTab === 'api' ? <div className="package-tab-panel api-tab">
          <div className="tab-panel-head"><div><span className="eyebrow">API PARAMETER MANIFEST</span><h2>Credential-free request template</h2><p>로컬 reference는 package:// 경로로 남고 인증 정보는 포함하지 않습니다.</p></div><button className="secondary-button" onClick={downloadApiManifest}><Download size={14} /> api-request.json</button></div>
          <pre className="api-json-preview">{apiManifest}</pre>
        </div> : null}

        {workspaceTab === 'references' ? <div className="package-tab-panel references-tab">
          <div className="generation-reference-picker polished"><div><span className="eyebrow">GENERATION REFERENCES</span><h2>모델 입력에 사용할 이미지만 선택합니다.</h2><p>Scene에 연결된 전체 reference와 실제 generation 입력을 구분합니다.</p></div>{sceneReferences.length ? <div className="generation-reference-list">{sceneReferences.map((item) => <label key={item.id}><input type="checkbox" checked={generationSettings.referenceImageIds.includes(item.id)} onChange={() => toggleReference(item.id)} /><span>{item.assetName}</span><small>{item.variantName ? `${item.role} · ${item.variantName}` : item.role} · {item.reference.name}</small></label>)}</div> : <p className="muted-copy">이 Scene에는 이미지 레퍼런스가 없습니다.</p>}</div>
          <ContactSheetPreview project={project} scene={scene} />
        </div> : null}

        {workspaceTab === 'package' ? <div className="package-tab-panel package-tab">
          <div className="package-readiness-grid">
            <div className="issue-panel-flat">
              <div className="tab-panel-head"><div><span className="eyebrow">CONTINUITY</span><h2>Rule-based checks</h2><p>{errors} error · {warnings} warning · {info} info</p></div><StatusPill tone={errors ? 'danger' : warnings ? 'warning' : 'success'}>{issues.length} issues</StatusPill></div>
              <div className="issue-filters" aria-label="Continuity issue 필터">{(['all', 'error', 'warning', 'info'] as IssueFilter[]).map((filter) => <button key={filter} className={issueFilter === filter ? 'active' : ''} onClick={() => setIssueFilter(filter)}>{filter === 'all' ? `All ${issues.length}` : `${filter} ${issues.filter((issue) => issue.severity === filter).length}`}</button>)}</div>
              <div className="issue-list">{filteredIssues.length ? filteredIssues.map((issue) => <div key={issue.id} className={`issue-row ${issue.severity}`}><span className="issue-marker">{issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '△' : 'i'}</span><div className="issue-copy"><strong>{issue.title}</strong><p>{issue.detail}</p><small>{issue.rule}</small><div className="issue-actions">{issue.sceneId ? <button onClick={() => navigateToIssue(issue.sceneId, issue.shotId)}><LocateFixed size={13} /> 관련 위치</button> : null}{issue.sceneId && issue.suggestedTransition ? <button onClick={() => addTransitionEvent(issue.sceneId!, issue.suggestedTransition!)}><Plus size={13} /> 전환 이벤트로 승인</button> : null}</div></div></div>) : <div className="empty-success"><CheckCircle2 size={24} /><strong>{issues.length ? '이 필터에 해당하는 이슈가 없습니다.' : '명시된 규칙 충돌이 없습니다.'}</strong></div>}</div>
            </div>
            <aside className="package-actions-card">
              <span className="eyebrow">SCENE PACKAGE</span><h2>{generationHasErrors(capabilityIssues) || errors ? '검토가 필요합니다.' : '생성 준비가 됐습니다.'}</h2><p>Prompt, references, capability report, contact sheet와 manifest를 하나의 ZIP으로 묶습니다.</p>
              <div className="package-status-list"><span><CheckCircle2 size={15} /> Prompt adapter</span><span className={capabilityErrors ? 'danger' : ''}><PackageCheck size={15} /> Capability · {capabilityErrors ? `${capabilityErrors} error` : 'pass'}</span><span className={errors ? 'danger' : ''}><ShieldCheck size={15} /> Continuity · {errors ? `${errors} error` : 'pass'}</span></div>
              <button className="primary-button package-primary-action" disabled={generationHasErrors(capabilityIssues)} title={capabilityErrors ? 'Capability error를 먼저 해결하세요.' : undefined} onClick={downloadScenePackage}><PackageCheck size={16} /> Scene Generate Package</button>
              <div className="secondary-export-actions"><button onClick={downloadJson}>Project JSON</button><button onClick={downloadZip}>Project ZIP</button></div>
            </aside>
          </div>
        </div> : null}
      </section>
    </section>
  )
}
