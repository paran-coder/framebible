import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, Copy, HardDrive, ImagePlus, Lock, MapPin, Plus, Trash2, Unlock, UserRound } from 'lucide-react'
import { PageHeader } from '../../components/PageHeader'
import { copyText } from '../../core/browser'
import { StatusPill } from '../../components/StatusPill'
import { compileCharacterSheetPrompt, compileIdentityReferencePrompt } from '../../core/characterCompiler'
import { formatBytes, projectReferenceStats, referenceBytes, referencesFromFiles } from '../../core/referenceImages'
import type { Asset, AssetType, CharacterAsset, CharacterVariant, LocationAsset, PropAsset, ReferenceImage } from '../../core/types'
import { useProjectStore } from '../../store/projectStore'

const iconFor = (asset: Asset) => asset.type === 'character' ? UserRound : asset.type === 'location' ? MapPin : Box
const assetLabel = (asset: Asset) => asset.type === 'character' ? 'CHARACTER' : asset.type === 'location' ? 'LOCATION' : 'PROP'

export function AssetsView() {
  const project = useProjectStore((state) => state.project)
  const selectedAssetId = useProjectStore((state) => state.selectedAssetId)
  const selectAsset = useProjectStore((state) => state.selectAsset)
  const addAsset = useProjectStore((state) => state.addAsset)
  const updateAsset = useProjectStore((state) => state.updateAsset)
  const deleteAsset = useProjectStore((state) => state.deleteAsset)
  const addReference = useProjectStore((state) => state.addReference)
  const removeReference = useProjectStore((state) => state.removeReference)
  const addVariant = useProjectStore((state) => state.addVariant)
  const duplicateVariant = useProjectStore((state) => state.duplicateVariant)
  const updateVariant = useProjectStore((state) => state.updateVariant)
  const deleteVariant = useProjectStore((state) => state.deleteVariant)
  const addVariantReference = useProjectStore((state) => state.addVariantReference)
  const removeVariantReference = useProjectStore((state) => state.removeVariantReference)
  const toggleAssetLock = useProjectStore((state) => state.toggleAssetLock)
  const [newType, setNewType] = useState<AssetType>('character')
  const [uploadMessage, setUploadMessage] = useState('')
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [editorTab, setEditorTab] = useState<'overview' | 'variants' | 'references' | 'continuity' | 'prompt'>('overview')
  const fileRef = useRef<HTMLInputElement>(null)
  const variantFileRef = useRef<HTMLInputElement>(null)
  const selected = project.assets.find((asset) => asset.id === selectedAssetId) ?? project.assets[0]
  const mediaStats = useMemo(() => projectReferenceStats(project), [project])
  const mediaBytes = mediaStats.payloadBytes
  const storageEstimate = mediaStats.estimatedProjectBytes
  const referenceCount = mediaStats.count

  useEffect(() => {
    if (selected.type !== 'character') return setSelectedVariantId('')
    if (!selected.variants.some((variant) => variant.id === selectedVariantId)) setSelectedVariantId(selected.variants[0]?.id ?? '')
  }, [selected, selectedVariantId])

  useEffect(() => {
    if (selected.type !== 'character' && (editorTab === 'variants' || editorTab === 'prompt')) setEditorTab('overview')
  }, [selected.type, editorTab])

  const lockableFields = selected.type === 'character'
    ? ['identityDNA.face', 'identityDNA.hair', 'defaultWardrobe']
    : selected.type === 'location'
      ? ['architecture', 'timeOfDay', 'lighting']
      : ['appearance']

  const onImages = async (files: FileList | null) => {
    if (!files) return
    setUploadMessage('')
    try {
      const references = await referencesFromFiles(Array.from(files))
      references.forEach((reference) => addReference(selected.id, reference))
      const saved = references.reduce((sum, reference) => sum + Math.max(0, (reference.originalBytes ?? referenceBytes(reference)) - referenceBytes(reference)), 0)
      setUploadMessage(`${references.length}개 레퍼런스를 추가했습니다.${saved > 0 ? ` 약 ${formatBytes(saved)} 절약했습니다.` : ''}`)
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : '이미지를 추가하지 못했습니다.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const onVariantImages = async (character: CharacterAsset, variant: CharacterVariant, files: FileList | null) => {
    if (!files) return
    setUploadMessage('')
    try {
      const references = await referencesFromFiles(Array.from(files))
      references.forEach((reference) => addVariantReference(character.id, variant.id, reference))
      setUploadMessage(`${variant.name}에 ${references.length}개 레퍼런스를 추가했습니다.`)
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : 'Variant 이미지를 추가하지 못했습니다.')
    } finally {
      if (variantFileRef.current) variantFileRef.current.value = ''
    }
  }

  const onDelete = () => {
    if (project.assets.length <= 1) return
    if (window.confirm(`“${selected.name}” 자산을 삭제할까요? 씬의 연결도 함께 정리됩니다.`)) deleteAsset(selected.id)
  }

  return (
    <section className="page page-wide assets-page">
      <PageHeader
        eyebrow="ASSET BIBLE"
        title="제작 기준을 먼저 잠급니다."
        description="캐릭터·장소·소품의 기준을 한 곳에서 관리하고, 장면 전체가 같은 자산 정의를 재사용하게 합니다."
        action={<div className="header-actions"><select aria-label="새 자산 종류" value={newType} onChange={(event) => setNewType(event.target.value as AssetType)}><option value="character">Character</option><option value="location">Location</option><option value="prop">Prop</option></select><button className="primary-button" onClick={() => addAsset(newType)}><Plus size={15} /> 새 자산</button></div>}
      />

      <div className="media-usage-bar" aria-label="레퍼런스 저장용량">
        <HardDrive size={16} />
        <strong>{formatBytes(storageEstimate)}</strong>
        <span>프로젝트 · {referenceCount} references</span>
        <small>이미지 {formatBytes(mediaBytes)} · 최대 1600px WebP 자동 최적화</small>
      </div>

      <div className="assets-workspace">
        <aside className="asset-library-surface">
          <div className="workspace-section-head"><div><span className="eyebrow">LIBRARY</span><h2>프로젝트 자산</h2></div><StatusPill>{project.assets.length}</StatusPill></div>
          <div className="asset-list">
            {project.assets.map((asset) => {
              const Icon = iconFor(asset)
              return (
                <button key={asset.id} className={`asset-row ${asset.id === selected.id ? 'selected' : ''}`} onClick={() => { selectAsset(asset.id); setEditorTab('overview') }}>
                  <span className="asset-icon"><Icon size={17} /></span>
                  <span className="asset-row-copy"><small>{assetLabel(asset)}</small><strong>{asset.name}</strong><span>{asset.description || '설명을 추가하세요.'}</span></span>
                  <span className="lock-summary"><Lock size={12} /> {asset.lockedFields.length}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="asset-editor-surface">
          <div className="asset-editor-head">
            <div><span className="eyebrow">{assetLabel(selected)}</span><h2>{selected.name}</h2><p>{selected.description || '이 자산의 제작 기준을 정의하세요.'}</p></div>
            <button className="danger-button subtle" disabled={project.assets.length <= 1} onClick={onDelete}><Trash2 size={15} /> 삭제</button>
          </div>

          <div className="editor-tabs" role="tablist" aria-label="자산 편집 영역">
            {([['overview', 'Overview'], ['variants', 'Variants'], ['references', 'References'], ['continuity', 'Continuity'], ['prompt', 'Prompt']] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={editorTab === key} className={editorTab === key ? 'active' : ''} disabled={(key === 'variants' || key === 'prompt') && selected.type !== 'character'} onClick={() => setEditorTab(key)}>{label}</button>
            ))}
          </div>

          <div className="asset-editor-body">
            {editorTab === 'overview' ? <>
              <div className="asset-edit-grid">
                <EditField label="이름" value={selected.name} onChange={(name) => updateAsset(selected.id, { name })} />
                <EditField label="설명" value={selected.description} onChange={(description) => updateAsset(selected.id, { description })} multiline />
                <EditField label="태그" value={selected.tags.join(', ')} onChange={(value) => updateAsset(selected.id, { tags: value.split(',').map((item) => item.trim()).filter(Boolean) })} hint="쉼표로 구분" />
              </div>
              {selected.type === 'character' ? <CharacterFields asset={selected} /> : selected.type === 'location' ? <LocationFields asset={selected} /> : <PropFields asset={selected} />}
            </> : null}

            {editorTab === 'variants' && selected.type === 'character' ? <VariantEditor character={selected} selectedVariantId={selectedVariantId} setSelectedVariantId={setSelectedVariantId} addVariant={addVariant} duplicateVariant={duplicateVariant} updateVariant={updateVariant} deleteVariant={deleteVariant} variantFileRef={variantFileRef} onVariantImages={onVariantImages} removeVariantReference={removeVariantReference} /> : null}

            {editorTab === 'references' ? <>
              <ReferenceSection title="기본 레퍼런스 이미지" references={selected.references} ownerName={selected.name} uploadRef={fileRef} onImages={onImages} onRemove={(referenceId) => removeReference(selected.id, referenceId)} />
              {uploadMessage ? <p className="inline-message reference-message" role="status">{uploadMessage}</p> : null}
            </> : null}

            {editorTab === 'continuity' ? <div className="lock-panel tab-section">
              <div className="section-intro"><span className="eyebrow">CONTINUITY LOCKS</span><h3>변경 금지 필드</h3><p>잠긴 값은 Story와 Shot을 수정해도 제작 기준으로 유지됩니다.</p></div>
              <div className="lock-list">{lockableFields.map((field) => {
                const active = selected.lockedFields.includes(field)
                return <button key={field} className={`lock-row ${active ? 'locked' : ''}`} onClick={() => toggleAssetLock(selected.id, field)}>{active ? <Lock size={16} /> : <Unlock size={16} />}<span>{field}</span><strong>{active ? 'LOCKED' : 'UNLOCKED'}</strong></button>
              })}</div>
            </div> : null}

            {editorTab === 'prompt' && selected.type === 'character' ? <div className="character-package tab-section">
              <div className="section-intro"><span className="eyebrow">CHARACTER REFERENCE PACKAGE</span><h3>생성용 기준 프롬프트</h3><p>Master Sheet와 단일 얼굴 Identity Reference를 분리해 사용합니다.</p></div>
              <PromptBlock label="MASTER SHEET" value={compileCharacterSheetPrompt(selected)} />
              <PromptBlock label="IDENTITY REFERENCE" value={compileIdentityReferencePrompt(selected)} />
            </div> : null}
          </div>
        </div>
      </div>
    </section>
  )
}

function CharacterFields({ asset }: { asset: CharacterAsset }) {
  const updateAsset = useProjectStore((state) => state.updateAsset)
  const setDNA = (patch: Partial<CharacterAsset['identityDNA']>) => updateAsset(asset.id, { identityDNA: { ...asset.identityDNA, ...patch } } as Partial<Asset>)
  return <div className="detail-sections editable-details"><EditField label="나이 인상" value={asset.identityDNA.apparentAge} onChange={(apparentAge) => setDNA({ apparentAge })} /><EditField label="얼굴" value={asset.identityDNA.face} onChange={(face) => setDNA({ face })} multiline /><EditField label="헤어" value={asset.identityDNA.hair} onChange={(hair) => setDNA({ hair })} /><EditField label="체형" value={asset.identityDNA.build} onChange={(build) => setDNA({ build })} /><EditField label="기본 의상" value={asset.defaultWardrobe} onChange={(defaultWardrobe) => updateAsset(asset.id, { defaultWardrobe } as Partial<Asset>)} multiline /><EditField label="식별 특징" value={asset.identityDNA.distinguishingFeatures} onChange={(distinguishingFeatures) => setDNA({ distinguishingFeatures })} /></div>
}

function VariantEditor({ character, selectedVariantId, setSelectedVariantId, addVariant, duplicateVariant, updateVariant, deleteVariant, variantFileRef, onVariantImages, removeVariantReference }: {
  character: CharacterAsset
  selectedVariantId: string
  setSelectedVariantId: (value: string) => void
  addVariant: (characterId: string) => string
  duplicateVariant: (characterId: string, variantId: string) => string
  updateVariant: (characterId: string, variantId: string, patch: Partial<CharacterVariant>) => void
  deleteVariant: (characterId: string, variantId: string) => void
  variantFileRef: React.RefObject<HTMLInputElement | null>
  onVariantImages: (character: CharacterAsset, variant: CharacterVariant, files: FileList | null) => Promise<void>
  removeVariantReference: (characterId: string, variantId: string, referenceId: string) => void
}) {
  const variant = character.variants.find((item) => item.id === selectedVariantId)
  const create = () => { const id = addVariant(character.id); setSelectedVariantId(id) }
  const duplicate = () => { if (!variant) return; const id = duplicateVariant(character.id, variant.id); if (id) setSelectedVariantId(id) }
  const remove = () => {
    if (!variant || !window.confirm(`“${variant.name}” Variant를 삭제할까요? 씬의 Variant 연결은 Base로 돌아갑니다.`)) return
    deleteVariant(character.id, variant.id)
  }

  return <div className="variant-panel">
    <div className="panel-heading compact"><div><span className="eyebrow">CHARACTER VARIANTS</span><h3>의상·상태·헤어·나이 변화를 하나로 관리</h3></div><button className="icon-text-button" onClick={create}><Plus size={15} /> Variant 추가</button></div>
    {character.variants.length ? <div className="variant-workspace">
      <div className="variant-list" role="list" aria-label="캐릭터 Variant 목록">
        {character.variants.map((item) => <button key={item.id} className={item.id === variant?.id ? 'active' : ''} onClick={() => setSelectedVariantId(item.id)}><strong>{item.name}</strong><small>{[item.wardrobe, item.physicalState, item.wetState && item.wetState !== 'unspecified' ? item.wetState : '', item.injuryState].filter(Boolean).slice(0, 2).join(' · ') || '세부 상태 미정'}</small></button>)}
      </div>
      {variant ? <div className="variant-editor">
        <div className="variant-editor-actions"><button className="secondary-button" onClick={duplicate}><Copy size={14} /> 복제</button><button className="danger-button" onClick={remove}><Trash2 size={14} /> 삭제</button></div>
        <div className="variant-field-grid">
          <EditField label="Variant 이름" value={variant.name} onChange={(name) => updateVariant(character.id, variant.id, { name })} />
          <EditField label="설명" value={variant.description} onChange={(description) => updateVariant(character.id, variant.id, { description })} multiline />
          <EditField label="의상" value={variant.wardrobe} onChange={(wardrobe) => updateVariant(character.id, variant.id, { wardrobe })} multiline />
          <EditField label="신체 상태" value={variant.physicalState} onChange={(physicalState) => updateVariant(character.id, variant.id, { physicalState })} multiline />
          <label className="edit-field"><span>젖음 상태</span><select value={variant.wetState ?? 'unspecified'} onChange={(event) => updateVariant(character.id, variant.id, { wetState: event.target.value as CharacterVariant['wetState'] })}><option value="unspecified">Unspecified</option><option value="dry">Dry</option><option value="damp">Damp</option><option value="wet">Wet</option><option value="soaked">Soaked</option></select></label>
          <EditField label="부상 상태" value={variant.injuryState ?? ''} onChange={(injuryState) => updateVariant(character.id, variant.id, { injuryState })} multiline />
          <EditField label="헤어 / 메이크업" value={variant.hairMakeup} onChange={(hairMakeup) => updateVariant(character.id, variant.id, { hairMakeup })} multiline />
          <EditField label="나이 인상" value={variant.ageAppearance} onChange={(ageAppearance) => updateVariant(character.id, variant.id, { ageAppearance })} multiline />
        </div>
        <ReferenceSection
          compact
          title={`${variant.name} 레퍼런스`}
          references={variant.references}
          ownerName={`${character.name} ${variant.name}`}
          uploadRef={variantFileRef}
          onImages={(files) => onVariantImages(character, variant, files)}
          onRemove={(referenceId) => removeVariantReference(character.id, variant.id, referenceId)}
        />
      </div> : null}
    </div> : <div className="variant-empty"><p>아직 Variant가 없습니다. 기본 캐릭터 상태는 그대로 사용할 수 있습니다.</p><button className="secondary-button" onClick={create}><Plus size={14} /> 첫 Variant 만들기</button></div>}
  </div>
}

function ReferenceSection({ title, references, ownerName, uploadRef, onImages, onRemove, compact = false }: { title: string; references: ReferenceImage[]; ownerName: string; uploadRef: React.RefObject<HTMLInputElement | null>; onImages: (files: FileList | null) => void | Promise<void>; onRemove: (referenceId: string) => void; compact?: boolean }) {
  return <div className={`reference-panel ${compact ? 'compact-reference-panel' : ''}`}>
    <div className="panel-heading compact"><div><span className="eyebrow">REFERENCES</span><h3>{title}</h3></div><><input ref={uploadRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" multiple onChange={(event) => onImages(event.target.files)} /><button className="icon-text-button" onClick={() => uploadRef.current?.click()}><ImagePlus size={15} /> 이미지 추가</button></></div>
    <div className="reference-grid">
      {references.map((reference) => <ReferenceCard key={reference.id} reference={reference} ownerName={ownerName} onRemove={onRemove} />)}
      {references.length === 0 ? <div className="reference-placeholder">아직 연결된 이미지가 없습니다.</div> : null}
    </div>
  </div>
}

function ReferenceCard({ reference, ownerName, onRemove }: { reference: ReferenceImage; ownerName: string; onRemove: (referenceId: string) => void }) {
  const dimensions = reference.width && reference.height ? `${reference.width}×${reference.height}` : ''
  return <figure className="reference-card">
    {reference.dataUrl ? <img src={reference.dataUrl} alt={`${ownerName} 레퍼런스 ${reference.name}`} /> : <div className="reference-empty">No preview</div>}
    <figcaption><span title={reference.name}><strong>{reference.name}</strong><small>{[dimensions, formatBytes(referenceBytes(reference)), reference.optimized ? 'optimized' : 'original'].filter(Boolean).join(' · ')}</small></span><button aria-label={`${reference.name} 삭제`} onClick={() => onRemove(reference.id)}><Trash2 size={14} /></button></figcaption>
  </figure>
}

function LocationFields({ asset }: { asset: LocationAsset }) {
  const updateAsset = useProjectStore((state) => state.updateAsset)
  return <div className="detail-sections editable-details"><EditField label="시간" value={asset.timeOfDay} onChange={(timeOfDay) => updateAsset(asset.id, { timeOfDay } as Partial<Asset>)} /><EditField label="조명" value={asset.lighting} onChange={(lighting) => updateAsset(asset.id, { lighting } as Partial<Asset>)} multiline /><EditField label="공간 구조" value={asset.architecture} onChange={(architecture) => updateAsset(asset.id, { architecture } as Partial<Asset>)} multiline /></div>
}

function PropFields({ asset }: { asset: PropAsset }) {
  const updateAsset = useProjectStore((state) => state.updateAsset)
  return <div className="detail-sections editable-details"><EditField label="외형" value={asset.appearance} onChange={(appearance) => updateAsset(asset.id, { appearance } as Partial<Asset>)} multiline /></div>
}

function EditField({ label, value, hint, multiline = false, onChange }: { label: string; value: string; hint?: string; multiline?: boolean; onChange: (value: string) => void }) {
  return <label className="edit-field"><span>{label}{hint ? <small>{hint}</small> : null}</span>{multiline ? <textarea value={value} onChange={(event) => onChange(event.target.value)} /> : <input value={value} onChange={(event) => onChange(event.target.value)} />}</label>
}

function PromptBlock({ label, value }: { label: string; value: string }) {
  return <div className="asset-prompt-block"><div><span>{label}</span><button onClick={() => void copyText(value)}>복사</button></div><p>{value}</p></div>
}
