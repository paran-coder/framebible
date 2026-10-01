import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronDown, KeyRound, Plus, Settings2, ShieldAlert, Sparkles, Trash2, WandSparkles, X } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { StatusPill } from '../../components/StatusPill'
import { generateAIStoryDraft, type AIStoryDraft } from '../../ai/story'
import { providers } from '../../ai/providers'
import { useAIStore } from '../../ai/sessionStore'
import type { AIProviderId } from '../../ai/types'
import type { Asset, CharacterAsset, CharacterBinding, ContinuityTransitionEvent, PropContinuityState, TransitionEventType } from '../../core/types'
import { buildRuleBasedStoryDraft } from '../../core/storyRules'
import { useProjectStore } from '../../store/projectStore'

type SceneEditorTab = 'details' | 'cast' | 'continuity'

export function StoryView() {
  const [idea, setIdea] = useState('서울의 새벽. 한 여자가 오래된 호텔에 들어가고 누군가 자신보다 먼저 도착했다는 사실을 눈치챈다.')
  const [showDraft, setShowDraft] = useState(false)
  const [aiDraft, setAiDraft] = useState<AIStoryDraft | null>(null)
  const [aiStatus, setAiStatus] = useState('')
  const [running, setRunning] = useState(false)
  const [aiConfigOpen, setAiConfigOpen] = useState(false)
  const [sceneEditorTab, setSceneEditorTab] = useState<SceneEditorTab>('details')
  const abortRef = useRef<AbortController | null>(null)
  const project = useProjectStore((state) => state.project)
  const selectedSceneId = useProjectStore((state) => state.selectedSceneId)
  const selectScene = useProjectStore((state) => state.selectScene)
  const addScene = useProjectStore((state) => state.addScene)
  const updateScene = useProjectStore((state) => state.updateScene)
  const deleteScene = useProjectStore((state) => state.deleteScene)
  const moveScene = useProjectStore((state) => state.moveScene)
  const addTransitionEvent = useProjectStore((state) => state.addTransitionEvent)
  const removeTransitionEvent = useProjectStore((state) => state.removeTransitionEvent)
  const updateProjectMeta = useProjectStore((state) => state.updateProjectMeta)
  const applyAIStoryDraft = useProjectStore((state) => state.applyAIStoryDraft)
  const providerId = useAIStore((state) => state.providerId)
  const apiKey = useAIStore((state) => state.apiKey)
  const model = useAIStore((state) => state.model)
  const acknowledgedRisk = useAIStore((state) => state.acknowledgedRisk)
  const setProvider = useAIStore((state) => state.setProvider)
  const setApiKey = useAIStore((state) => state.setApiKey)
  const setModel = useAIStore((state) => state.setModel)
  const setAcknowledgedRisk = useAIStore((state) => state.setAcknowledgedRisk)
  const clearKey = useAIStore((state) => state.clearKey)
  const draft = buildRuleBasedStoryDraft(idea)
  const scene = project.scenes.find((item) => item.id === selectedSceneId) ?? project.scenes[0]
  const activeProvider = providers[providerId]
  const characters = useMemo(() => project.assets.filter((asset) => asset.type === 'character'), [project.assets])
  const locations = useMemo(() => project.assets.filter((asset) => asset.type === 'location'), [project.assets])
  const props = useMemo(() => project.assets.filter((asset) => asset.type === 'prop'), [project.assets])
  const orderedScenes = useMemo(() => [...project.scenes].sort((a, b) => a.order - b.order), [project.scenes])

  useEffect(() => () => abortRef.current?.abort(), [])

  const runAI = async () => {
    if (!apiKey.trim()) {
      setAiConfigOpen(true)
      return setAiStatus('API 키를 입력하세요.')
    }
    if (!acknowledgedRisk) {
      setAiConfigOpen(true)
      return setAiStatus('브라우저 직결 위험을 확인해야 실행할 수 있습니다.')
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRunning(true)
    setAiStatus('스토리 구조를 생성하고 있습니다…')
    try {
      const result = await generateAIStoryDraft({ providerId, apiKey, model, idea, project, signal: controller.signal })
      setAiDraft(result)
      setAiStatus(`${result.scenes.length}개 장면의 AI 초안을 만들었습니다. 적용 전 내용을 확인하세요.`)
    } catch (error) {
      if ((error as Error).name !== 'AbortError') setAiStatus(error instanceof Error ? error.message : 'AI 요청에 실패했습니다.')
    } finally {
      setRunning(false)
    }
  }

  if (!scene) return null

  const onDeleteScene = () => {
    if (project.scenes.length <= 1) return
    if (window.confirm(`“${scene.title}” 장면을 삭제할까요?`)) deleteScene(scene.id)
  }

  const sceneIndex = orderedScenes.findIndex((item) => item.id === scene.id)
  const totalShots = orderedScenes.reduce((sum, item) => sum + item.shots.length, 0)

  return (
    <section className="page story-page">
      <PageHeader eyebrow="STORY" title="아이디어를 장면으로 구조화합니다." description="아이디어에서 Scene 구조와 연속성 상태까지 한 흐름에서 정리합니다." />

      <section className="story-idea-surface" aria-labelledby="story-idea-title">
        <div className="story-section-heading">
          <div><span className="eyebrow">IDEA</span><h2 id="story-idea-title">무슨 영상인지 평범한 문장으로 적으세요.</h2></div>
          <p>AI 키가 없어도 로컬 규칙으로 장면 초안을 만들 수 있습니다.</p>
        </div>
        <textarea className="story-idea-input" value={idea} onChange={(event) => setIdea(event.target.value)} aria-label="영상 아이디어" />
        <div className="story-idea-footer">
          <span>{idea.trim().length ? `${idea.trim().length}자` : '아이디어를 입력하세요'}</span>
          <div className="story-idea-actions">
            <button className="secondary-button" onClick={() => setShowDraft((value) => !value)}><Sparkles size={16} /> {showDraft ? '로컬 초안 숨기기' : '로컬 초안'}</button>
            <button className="primary-button" disabled={running} onClick={runAI}><WandSparkles size={16} /> {running ? 'AI 생성 중…' : 'AI로 확장'}</button>
          </div>
        </div>
      </section>

      {showDraft ? <section className="story-draft-shelf" aria-label="로컬 규칙 기반 초안"><div className="story-draft-head"><strong>로컬 초안</strong><span>프로젝트에 자동 적용되지 않습니다.</span></div><div className="beat-draft-grid compact">{draft.map((beat, index) => <article key={beat.id} className="beat-card"><span>{String(index + 1).padStart(2, '0')} · {beat.label}</span><strong>{beat.purpose}</strong><p>{beat.prompt}</p></article>)}</div></section> : null}

      <section className={`story-ai-bar ${aiConfigOpen ? 'open' : ''}`}>
        <div className="story-ai-summary">
          <WandSparkles size={17} />
          <div><strong>AI Assist</strong><span>{activeProvider.config.label} · {model} · {apiKey ? '세션 키 설정됨' : '키 없음'}</span></div>
          <StatusPill tone={apiKey && acknowledgedRisk ? 'success' : 'warning'}>{apiKey && acknowledgedRisk ? 'Ready' : 'Optional'}</StatusPill>
          <button className="quiet-button" onClick={() => setAiConfigOpen((value) => !value)} aria-expanded={aiConfigOpen}><Settings2 size={15} /> 설정 <ChevronDown size={14} /></button>
        </div>
        {aiConfigOpen ? <div className="ai-config-body story-ai-config">
          <div className="ai-config-grid">
            <label><span>Provider</span><select value={providerId} onChange={(event) => setProvider(event.target.value as AIProviderId)}><option value="gemini">Gemini</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option></select></label>
            <label><span>Model</span><input value={model} onChange={(event) => setModel(event.target.value)} /></label>
            <label className="api-key-field"><span><KeyRound size={14} /> {activeProvider.config.apiKeyLabel}</span><div><input type="password" autoComplete="off" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="현재 탭 메모리에만 유지" /><button type="button" onClick={clearKey}>지우기</button></div></label>
          </div>
          <div className="security-note compact"><ShieldAlert size={16} /><div><strong>Browser-direct는 실험적 연결 방식입니다.</strong><p>{activeProvider.config.securityNote} 키는 프로젝트나 브라우저 저장소에 기록하지 않습니다.</p><label><input type="checkbox" checked={acknowledgedRisk} onChange={(event) => setAcknowledgedRisk(event.target.checked)} /> 이 탭에서 직접 API를 호출한다는 점을 이해했습니다.</label></div></div>
        </div> : null}
        {aiStatus ? <p className="inline-message story-ai-status" role="status">{aiStatus}</p> : null}
      </section>

      {aiDraft ? (
        <section className="story-draft-shelf ai-draft-panel">
          <div className="story-draft-head"><div><span className="eyebrow">AI DRAFT</span><strong>{aiDraft.logline}</strong></div><button className="primary-button" onClick={() => { if (window.confirm('현재 Scene 구성을 AI 초안으로 교체할까요? 자산 라이브러리는 유지됩니다.')) { applyAIStoryDraft(aiDraft); setAiStatus('AI 초안을 프로젝트에 적용했습니다. 기존 Scene 구성은 교체되었습니다.') } }}>프로젝트에 적용</button></div>
          <div className="beat-draft-grid compact">{aiDraft.scenes.map((item, index) => <article key={`${item.title}-${index}`} className="beat-card"><span>{String(index + 1).padStart(2, '0')} · {item.emotionalBeat}</span><strong>{item.title}</strong><p>{item.purpose}</p><small>{item.shots.length} shots · {item.durationSec}s · {item.locationName ?? 'Unbound'}</small></article>)}</div>
        </section>
      ) : null}

      <section className="story-logline" aria-labelledby="logline-title">
        <div><span className="eyebrow">LOGLINE</span><strong id="logline-title">프로젝트의 한 문장</strong></div>
        <textarea value={project.logline} onChange={(event) => updateProjectMeta({ logline: event.target.value })} aria-label="프로젝트 로그라인" />
      </section>

      <section className="story-workspace" aria-label="장면 편집 워크스페이스">
        <aside className="story-scene-nav" aria-label="장면 탐색">
          <div className="story-scene-nav-head"><div><span className="eyebrow">SCENES</span><strong>{orderedScenes.length} scenes · {totalShots} shots</strong></div><button className="icon-button" aria-label="새 장면 추가" onClick={addScene}><Plus size={16} /></button></div>
          <div className="story-scene-list">
            {orderedScenes.map((item) => {
              const needsSetup = !item.emotionalBeat.trim() || !item.purpose.trim()
              return <button key={item.id} className={`story-scene-item ${selectedSceneId === item.id ? 'active' : ''}`} onClick={() => selectScene(item.id)}><span className="story-scene-number">{String(item.order).padStart(2, '0')}</span><span className="story-scene-copy"><strong>{item.title || '새 장면'}</strong><small>{item.emotionalBeat || (needsSetup ? '설정 필요' : 'Beat 미정')}</small></span><span className={`scene-state-dot ${needsSetup ? 'review' : 'ready'}`} aria-label={needsSetup ? '설정 필요' : '기본 설정 완료'} /></button>
            })}
          </div>
          <button className="story-add-scene" onClick={addScene}><Plus size={15} /> 새 장면</button>
        </aside>

        <div className="story-scene-editor">
          <header className="story-scene-editor-head">
            <div><span className="eyebrow">SCENE {String(scene.order).padStart(2, '0')}</span><h2>{scene.title || '새 장면'}</h2><p>{scene.purpose || '이 장면이 이야기에서 해야 할 일을 정의하세요.'}</p></div>
            <div className="scene-editor-actions"><button className="icon-button" aria-label="Scene 위로 이동" disabled={sceneIndex <= 0} onClick={() => moveScene(scene.id, -1)}><ArrowUp size={15} /></button><button className="icon-button" aria-label="Scene 아래로 이동" disabled={sceneIndex < 0 || sceneIndex >= orderedScenes.length - 1} onClick={() => moveScene(scene.id, 1)}><ArrowDown size={15} /></button><button className="danger-button subtle" disabled={project.scenes.length <= 1} onClick={onDeleteScene}><Trash2 size={15} /> 삭제</button></div>
          </header>

          <div className="story-editor-tabs" role="tablist" aria-label="장면 편집 영역">
            <button className={sceneEditorTab === 'details' ? 'active' : ''} onClick={() => setSceneEditorTab('details')} role="tab" aria-selected={sceneEditorTab === 'details'}>Details</button>
            <button className={sceneEditorTab === 'cast' ? 'active' : ''} onClick={() => setSceneEditorTab('cast')} role="tab" aria-selected={sceneEditorTab === 'cast'}>Cast & Props</button>
            <button className={sceneEditorTab === 'continuity' ? 'active' : ''} onClick={() => setSceneEditorTab('continuity')} role="tab" aria-selected={sceneEditorTab === 'continuity'}>Continuity <span>{scene.transitionEvents?.length ?? 0}</span></button>
          </div>

          <div className="story-editor-panel" role="tabpanel">
            {sceneEditorTab === 'details' ? <div className="scene-editor-grid story-details-grid">
              <SceneField label="제목" value={scene.title} onChange={(title) => updateScene(scene.id, { title })} />
              <SceneField label="Emotional beat" value={scene.emotionalBeat} onChange={(emotionalBeat) => updateScene(scene.id, { emotionalBeat })} />
              <SceneField label="Purpose" value={scene.purpose} onChange={(purpose) => updateScene(scene.id, { purpose })} multiline />
              <SceneField label="Time of day" value={scene.timeOfDay} onChange={(timeOfDay) => updateScene(scene.id, { timeOfDay })} />
              <SceneField label="Weather" value={scene.weather ?? ''} onChange={(weather) => updateScene(scene.id, { weather })} />
              <label className="edit-field"><span>Duration (sec)</span><input type="number" min="1" max="120" value={scene.durationSec} onChange={(event) => updateScene(scene.id, { durationSec: Math.max(1, Number(event.target.value) || 1) })} /></label>
              <label className="edit-field"><span>Location</span><select value={scene.locationId ?? ''} onChange={(event) => updateScene(scene.id, { locationId: event.target.value || undefined })}><option value="">Unbound</option>{locations.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>
            </div> : null}
            {sceneEditorTab === 'cast' ? <div className="story-cast-panel"><CharacterBindingEditor characters={characters as CharacterAsset[]} bindings={scene.characterBindings} onChange={(characterBindings) => updateScene(scene.id, { characterBindings })} /><PropStateEditor props={props} characters={characters as CharacterAsset[]} characterBindings={scene.characterBindings} propIds={scene.propIds} propStates={scene.propStates ?? []} onPropIdsChange={(propIds) => updateScene(scene.id, { propIds })} onPropStatesChange={(propStates) => updateScene(scene.id, { propStates })} /></div> : null}
            {sceneEditorTab === 'continuity' ? <TransitionEventEditor sceneId={scene.id} events={scene.transitionEvents ?? []} assets={project.assets} onAdd={addTransitionEvent} onRemove={removeTransitionEvent} /> : null}
          </div>
        </div>
      </section>
    </section>
  )
}

function SceneField({ label, value, multiline = false, onChange }: { label: string; value: string; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="edit-field"><span>{label}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>
}

function CharacterBindingEditor({ characters, bindings, onChange }: { characters: CharacterAsset[]; bindings: CharacterBinding[]; onChange: (bindings: CharacterBinding[]) => void }) {
  const toggle = (character: CharacterAsset) => {
    const existing = bindings.find((binding) => binding.characterId === character.id)
    onChange(existing ? bindings.filter((binding) => binding.characterId !== character.id) : [...bindings, { characterId: character.id }])
  }
  const setVariant = (characterId: string, variantId: string) => onChange(bindings.map((binding) => binding.characterId === characterId ? { ...binding, variantId: variantId || undefined } : binding))

  return <fieldset className="binding-editor character-binding-editor"><legend>Characters</legend>{characters.length ? characters.map((character) => {
    const binding = bindings.find((item) => item.characterId === character.id)
    return <div key={character.id} className={`character-binding-row ${binding ? 'selected' : ''}`}><label><input type="checkbox" checked={Boolean(binding)} onChange={() => toggle(character)} /><span>{character.name}</span></label>{binding ? <select aria-label={`${character.name} Variant`} value={binding.variantId ?? ''} onChange={(event) => setVariant(character.id, event.target.value)}><option value="">Base / 기본 상태</option>{character.variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}</select> : null}</div>
  }) : <small>등록된 캐릭터가 없습니다.</small>}</fieldset>
}

function PropStateEditor({ props, characters, characterBindings, propIds, propStates, onPropIdsChange, onPropStatesChange }: {
  props: Asset[]
  characters: CharacterAsset[]
  characterBindings: CharacterBinding[]
  propIds: string[]
  propStates: PropContinuityState[]
  onPropIdsChange: (ids: string[]) => void
  onPropStatesChange: (states: PropContinuityState[]) => void
}) {
  const boundCharacters = characters.filter((character) => characterBindings.some((binding) => binding.characterId === character.id))
  const updateState = (propId: string, patch: Partial<PropContinuityState>) => {
    const existing = propStates.find((state) => state.propId === propId) ?? { propId, presence: 'present' as const, condition: '' }
    const next = propStates.some((state) => state.propId === propId)
      ? propStates.map((state) => state.propId === propId ? { ...state, ...patch } : state)
      : [...propStates, { ...existing, ...patch }]
    onPropStatesChange(next)
  }

  return <fieldset className="binding-editor prop-state-editor"><legend>Props + continuity state</legend>{props.length ? props.map((prop) => {
    const checked = propIds.includes(prop.id)
    const state = propStates.find((item) => item.propId === prop.id)
    return <div key={prop.id} className={`prop-state-row ${checked ? 'selected' : ''}`}><label className="prop-toggle"><input type="checkbox" checked={checked} onChange={() => onPropIdsChange(checked ? propIds.filter((id) => id !== prop.id) : [...propIds, prop.id])} /><span>{prop.name}</span></label>{checked ? <div className="prop-state-controls"><label><span>Owner</span><select value={state?.ownerCharacterId ?? ''} onChange={(event) => updateState(prop.id, { ownerCharacterId: event.target.value || undefined })}><option value="">Unassigned</option>{boundCharacters.map((character) => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label><label><span>Condition</span><input value={state?.condition ?? ''} placeholder="intact / broken / empty…" onChange={(event) => updateState(prop.id, { condition: event.target.value })} /></label></div> : null}</div>
  }) : <small>등록된 소품이 없습니다.</small>}</fieldset>
}

const transitionLabels: Record<TransitionEventType, string> = {
  'character-variant': 'Character Variant',
  'character-state': 'Character State',
  wetness: 'Wet / Dry',
  injury: 'Injury',
  'prop-presence': 'Prop Presence',
  'prop-transfer': 'Prop Transfer',
  'prop-condition': 'Prop Condition',
  location: 'Location',
  time: 'Time',
  weather: 'Weather',
  custom: 'Custom'
}

const subjectRequiredTransitionTypes: TransitionEventType[] = ['character-variant', 'character-state', 'wetness', 'injury', 'prop-presence', 'prop-transfer', 'prop-condition', 'location']

function TransitionEventEditor({ sceneId, events, assets, onAdd, onRemove }: {
  sceneId: string
  events: ContinuityTransitionEvent[]
  assets: Asset[]
  onAdd: (sceneId: string, event: Omit<ContinuityTransitionEvent, 'id'>) => string
  onRemove: (sceneId: string, eventId: string) => void
}) {
  const [type, setType] = useState<TransitionEventType>('custom')
  const [subjectId, setSubjectId] = useState('')
  const [note, setNote] = useState('')
  const needsSubject = subjectRequiredTransitionTypes.includes(type)
  const relevantAssets = type.startsWith('prop-') ? assets.filter((asset) => asset.type === 'prop') : type === 'location' ? assets.filter((asset) => asset.type === 'location') : ['character-variant', 'character-state', 'wetness', 'injury'].includes(type) ? assets.filter((asset) => asset.type === 'character') : []
  const hasEligibleSubject = !needsSubject || relevantAssets.length > 0

  const add = () => {
    const trimmed = note.trim()
    if (!trimmed || (needsSubject && (!hasEligibleSubject || !subjectId))) return
    onAdd(sceneId, { type, subjectId: needsSubject ? subjectId : undefined, note: trimmed })
    setNote('')
  }

  return <div className="transition-editor"><div className="panel-heading compact"><div><span className="eyebrow">CONTINUITY EVENTS</span><h3>의도된 상태 변화</h3></div><StatusPill>{events.length} events</StatusPill></div><p className="transition-help">이 Scene으로 넘어오며 의도적으로 바뀌는 상태를 기록하면 Linter가 같은 변화를 오류로 취급하지 않습니다.</p>
    {events.length ? <div className="transition-list">{events.map((event) => <div key={event.id} className="transition-row"><span className="transition-type">{transitionLabels[event.type]}</span><div><strong>{event.note || '설명 없음'}</strong><small>{event.subjectId ? assets.find((asset) => asset.id === event.subjectId)?.name ?? event.subjectId : 'Scene-level event'}{event.from !== undefined || event.to !== undefined ? ` · ${event.from || '—'} → ${event.to || '—'}` : ''}</small></div><button className="icon-button" aria-label="Transition event 삭제" onClick={() => onRemove(sceneId, event.id)}><X size={14} /></button></div>)}</div> : null}
    <div className="transition-add-row"><select aria-label="Transition 종류" value={type} onChange={(event) => { setType(event.target.value as TransitionEventType); setSubjectId('') }}>{Object.entries(transitionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{needsSubject ? <select aria-label="Transition 대상" value={subjectId} disabled={!hasEligibleSubject} onChange={(event) => setSubjectId(event.target.value)}><option value="">{hasEligibleSubject ? '대상 선택' : '사용 가능한 대상 없음'}</option>{relevantAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select> : null}<input aria-label="Transition 설명" value={note} placeholder="예: Mira가 비를 맞아 옷이 젖는다" onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); add() } }} /><button className="secondary-button" disabled={!note.trim() || (needsSubject && (!hasEligibleSubject || !subjectId))} onClick={add}><Plus size={14} /> 추가</button></div>
  </div>
}
