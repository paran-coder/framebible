import type { ReactNode } from 'react'
import { ArrowLeft, BookOpen, Boxes, CheckCircle2, Clapperboard, Download, Film, Gauge, HardDrive, Keyboard, Map, PackageCheck, ShieldCheck, Sparkles, TriangleAlert } from 'lucide-react'
import { APP_VERSION } from '../../core/types'

const sections = [
  ['getting-started', '빠른 시작'],
  ['workspace', '화면 구성'],
  ['assets', 'Asset Bible'],
  ['story', 'Story'],
  ['shots', 'Shots'],
  ['continuity', 'Continuity'],
  ['export', 'Export & Package'],
  ['models', '모델별 설정'],
  ['storage', '저장·백업·보안'],
  ['shortcuts', '단축키'],
  ['troubleshooting', '문제 해결'],
] as const

function ManualCallout({ tone = 'info', title, children }: { tone?: 'info' | 'warning' | 'success'; title: string; children: ReactNode }) {
  return <aside className={`manual-callout ${tone}`}><div>{tone === 'warning' ? <TriangleAlert size={18} /> : tone === 'success' ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}</div><div><strong>{title}</strong><div>{children}</div></div></aside>
}

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return <div className="manual-step"><span>{number}</span><div><strong>{title}</strong><p>{children}</p></div></div>
}

export function ManualPage() {
  return (
    <div className="manual-shell">
      <header className="manual-topbar">
        <a href="/" className="manual-brand" aria-label="FrameBible 워크스페이스로 돌아가기"><span className="brand-mark" aria-hidden="true"><span /></span><span><strong>FrameBible</strong><small>User Manual · v{APP_VERSION}</small></span></a>
        <a href="/" className="manual-back"><ArrowLeft size={15} /> 워크스페이스</a>
      </header>

      <div className="manual-layout">
        <aside className="manual-toc" aria-label="사용자 매뉴얼 목차">
          <div className="manual-toc-head"><BookOpen size={17} /><strong>사용자 매뉴얼</strong></div>
          <nav>{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <div className="manual-toc-note">FrameBible은 브라우저 로컬 저장을 기본으로 하는 AI 영상 프리프로덕션 워크스페이스입니다.</div>
        </aside>

        <main className="manual-content">
          <section className="manual-hero">
            <span className="eyebrow">FRAMEBIBLE MANUAL</span>
            <h1>아이디어부터 생성 패키지까지,<br />FrameBible을 제대로 사용하는 방법.</h1>
            <p>캐릭터 일관성, 장면 구조, 촬영 구성, 공간 블로킹, Continuity 검사, 모델별 Prompt와 Generation Package까지 실제 작업 순서대로 설명합니다.</p>
            <div className="manual-hero-meta"><span>v{APP_VERSION}</span><span>Local-first</span><span>System theme</span><span>No application backend</span></div>
          </section>

          <ManualCallout title="가장 중요한 사용 원칙">
            <p>영상부터 만들기보다 <strong>Asset → Story → Shots → Export</strong> 순서로 기준을 먼저 고정하세요. FrameBible의 핵심은 프롬프트를 길게 만드는 것이 아니라 장면 사이에서 바뀌면 안 되는 정보를 명시적으로 관리하는 것입니다.</p>
          </ManualCallout>

          <section id="getting-started" className="manual-section">
            <div className="manual-section-title"><Sparkles size={20} /><div><span>01</span><h2>빠른 시작</h2></div></div>
            <p className="manual-lead">처음 사용하는 경우 아래 다섯 단계만 따라가면 기본 제작 흐름을 완성할 수 있습니다.</p>
            <div className="manual-steps">
              <Step number="1" title="Asset Bible을 만듭니다">캐릭터, 장소, 소품을 등록하고 필요한 reference image와 Character Variant를 추가합니다. 유지해야 하는 특성은 Continuity Lock으로 고정합니다.</Step>
              <Step number="2" title="Story를 Scene으로 나눕니다">자연어 아이디어에서 로컬 초안을 만들거나 선택적으로 AI 보조를 사용하고, 각 Scene의 Purpose·Emotional Beat·Location·Cast를 정리합니다.</Step>
              <Step number="3" title="Shots에서 촬영 결정을 만듭니다">Shot을 추가하고 framing, focal length, camera movement, blocking을 정합니다. Blocking Board에서 캐릭터·소품·카메라의 공간 관계를 맞춥니다.</Step>
              <Step number="4" title="Dashboard에서 막힌 항목을 찾습니다">목표 모델을 선택한 뒤 Ready / Needs Review / Blocked 상태를 확인하고 명시적인 오류와 검토 항목을 해결합니다.</Step>
              <Step number="5" title="Export에서 생성 패키지를 만듭니다">Prompt, API parameter manifest, reference, contact sheet, first/last-frame 지시를 검토한 뒤 Scene Package ZIP을 생성합니다.</Step>
            </div>
          </section>

          <section id="workspace" className="manual-section">
            <div className="manual-section-title"><Gauge size={20} /><div><span>02</span><h2>화면 구성</h2></div></div>
            <div className="manual-feature-grid">
              <article><Gauge size={18} /><strong>Dashboard</strong><p>모델별 생성 준비 상태와 blocker를 확인합니다. 품질 점수가 아니라 명시적 규칙 통과 여부를 보여줍니다.</p></article>
              <article><Boxes size={18} /><strong>Asset Bible</strong><p>Character, Location, Prop과 reference, variant, continuity lock을 관리합니다.</p></article>
              <article><Film size={18} /><strong>Story</strong><p>아이디어를 Scene 구조로 만들고 Cast, Props, Continuity Event를 편집합니다.</p></article>
              <article><Clapperboard size={18} /><strong>Shots</strong><p>Shot 순서, 촬영 정보, Blocking Board, Spatial Zone과 이동을 설계합니다.</p></article>
              <article><Download size={18} /><strong>Export</strong><p>모델 제한 검증, Prompt, API manifest, reference, generation package를 관리합니다.</p></article>
            </div>
          </section>

          <section id="assets" className="manual-section">
            <div className="manual-section-title"><Boxes size={20} /><div><span>03</span><h2>Asset Bible</h2></div></div>
            <h3>Character</h3>
            <p>캐릭터의 이름과 설명뿐 아니라 얼굴, 머리, 체형, 기본 의상, 구별되는 특징을 별도 필드로 유지합니다. 이 정보는 Character Sheet와 identity reference prompt의 기준이 됩니다.</p>
            <h3>Character Variant</h3>
            <p>같은 인물의 의상·젖음·부상·헤어/메이크업·신체 상태 변화를 하나의 Variant로 관리합니다. Scene마다 어떤 Variant를 사용하는지 연결하면 Continuity Engine이 의도되지 않은 상태 변화를 찾을 수 있습니다.</p>
            <h3>References</h3>
            <p>캐릭터, Variant, 장소, 소품에 reference image를 등록할 수 있습니다. 이미지는 브라우저에서 최적화된 뒤 프로젝트 데이터에 저장되며, Generation Package를 만들 때 실제 파일로 분리됩니다.</p>
            <h3>Continuity Lock</h3>
            <p>Face, Hair, Wardrobe처럼 바뀌면 안 되는 속성을 잠급니다. Lock은 “생성 모델이 반드시 성공한다”는 보장이 아니라 FrameBible 내부에서 변경과 충돌을 검사하기 위한 명시적인 제작 규칙입니다.</p>
          </section>

          <section id="story" className="manual-section">
            <div className="manual-section-title"><Film size={20} /><div><span>04</span><h2>Story</h2></div></div>
            <p className="manual-lead">Story 화면의 중심은 Scene입니다. 아이디어 입력과 AI 설정은 Scene 구조를 만드는 보조 도구입니다.</p>
            <h3>Idea Composer</h3>
            <p>영상 아이디어를 평범한 문장으로 입력합니다. <strong>로컬 초안</strong>은 API 키 없이 규칙 기반 비트를 보여주고, <strong>AI로 확장</strong>은 선택한 BYOK Provider를 사용해 구조화된 초안을 만듭니다.</p>
            <h3>Scene Navigator</h3>
            <p>장면이 많아져도 왼쪽 Scene Navigator에서 순서를 확인하고 바로 이동합니다. 설정이 부족한 장면은 review 상태로 보입니다.</p>
            <h3>Scene Editor</h3>
            <ul>
              <li><strong>Details</strong> — 제목, Emotional Beat, Purpose, 시간, 날씨, Duration, Location</li>
              <li><strong>Cast & Props</strong> — Character/Variant 바인딩, Prop 존재·소유·상태</li>
              <li><strong>Continuity</strong> — Scene으로 들어오며 의도적으로 바뀌는 상태를 Transition Event로 기록</li>
            </ul>
            <ManualCallout tone="warning" title="AI Assist는 선택 기능입니다">
              <p>Browser-direct BYOK는 API 키가 현재 탭의 메모리에만 존재하도록 설계되어 있지만, 공급사는 일반적으로 프로덕션 브라우저에 비밀키를 직접 노출하는 방식을 권장하지 않습니다. 중요한 키는 별도의 안전한 실행 계층을 사용하는 편이 좋습니다.</p>
            </ManualCallout>
          </section>

          <section id="shots" className="manual-section">
            <div className="manual-section-title"><Clapperboard size={20} /><div><span>05</span><h2>Shots</h2></div></div>
            <p>왼쪽 Shot 목록에서 순서를 관리하고, 가운데 Blocking Board에서 공간 구성을 결정하며, 오른쪽 Inspector에서 선택한 Shot의 촬영 정보를 편집합니다.</p>
            <h3>Blocking Board</h3>
            <p>캐릭터, 소품, 카메라를 2D 공간에 배치합니다. 위치는 0–1 정규화 좌표로 저장되어 배경 이미지 크기와 독립적으로 유지됩니다.</p>
            <h3>Spatial Zone</h3>
            <p>Doorway, Window, Table 또는 Custom Zone을 만들어 “왼쪽 중경”보다 의미 있는 위치 이름을 사용할 수 있습니다. 오브젝트를 Zone 근처에 놓으면 자동 스냅·바인딩할 수 있고, Zone을 이동하면 명시적으로 연결된 노드도 함께 이동합니다.</p>
            <h3>Camera Path와 Spatial Timeline</h3>
            <p>Shot별 카메라 setup은 별도 컷으로 취급됩니다. Shot 01과 Shot 02의 카메라 위치가 다르다고 해서 자동으로 연속 camera movement로 해석하지 않습니다. 실제 이동은 Spatial Transition으로 명시한 경우에만 보간됩니다.</p>
          </section>

          <section id="continuity" className="manual-section">
            <div className="manual-section-title"><ShieldCheck size={20} /><div><span>06</span><h2>Continuity</h2></div></div>
            <p>Continuity Engine은 캐릭터 Variant, 젖음·부상 상태, 소품 등장·소유자·상태, 장소, 시간, 날씨, screen direction, 공간 점프 등을 검사합니다.</p>
            <ManualCallout tone="success" title="의도된 변화는 Transition Event로 기록하세요">
              <p>비에 젖는 장면, 열쇠를 다른 인물에게 넘기는 장면, 카메라가 실제로 이동하는 장면처럼 의도된 변화는 Event로 기록하면 같은 변화를 오류로 취급하지 않습니다.</p>
            </ManualCallout>
            <p>Dashboard의 Ready / Needs Review / Blocked 역시 이 명시적 검사 결과를 사용합니다. 출력 영상 품질이나 성공 확률을 추정하는 점수가 아닙니다.</p>
          </section>

          <section id="export" className="manual-section">
            <div className="manual-section-title"><PackageCheck size={20} /><div><span>07</span><h2>Export & Generation Package</h2></div></div>
            <p>Scene과 대상 모델을 선택한 뒤 Prompt / API / References / Package 탭을 순서대로 확인합니다.</p>
            <ul>
              <li><strong>Prompt</strong> — 모델별 Adapter가 만든 사람이 읽을 수 있는 Prompt</li>
              <li><strong>API</strong> — credential-free API parameter manifest. 로컬 이미지는 실제 URL인 척하지 않고 <code>package://references/...</code>로 표시</li>
              <li><strong>References</strong> — generation reference와 contact sheet 검토</li>
              <li><strong>Package</strong> — readiness, continuity, manifest와 최종 Scene Package ZIP 생성</li>
            </ul>
            <h3>Scene Package 구조</h3>
            <pre className="manual-code">{`scene-package.zip\n├── manifest.json\n├── api-request.json\n├── readiness-report.json\n├── prompt/\n├── frames/\n├── contact-sheet.html\n└── references/`}</pre>
          </section>

          <section id="models" className="manual-section">
            <div className="manual-section-title"><Map size={20} /><div><span>08</span><h2>모델별 설정</h2></div></div>
            <p>FrameBible은 프로젝트 정보를 model-neutral Prompt IR로 만든 뒤 Seedance, Veo, Kling Adapter로 변환합니다. 모델별 Duration, Aspect Ratio, Resolution, Reference 제약은 Capability Profile에서 검사합니다.</p>
            <p>확인된 제한 위반은 <strong>Error</strong>로 막고, 모델 버전이나 엔드포인트에 따라 달라지는 조건은 가능한 한 <strong>Warning</strong>으로 표시해 FrameBible이 과도하게 생성을 막지 않도록 설계되어 있습니다.</p>
          </section>

          <section id="storage" className="manual-section">
            <div className="manual-section-title"><HardDrive size={20} /><div><span>09</span><h2>저장·백업·보안</h2></div></div>
            <h3>어디에 저장되나요?</h3>
            <p>프로젝트는 기본적으로 현재 브라우저의 IndexedDB에 저장됩니다. 별도 FrameBible 데이터베이스 서버는 없습니다.</p>
            <h3>백업</h3>
            <p>중요 프로젝트는 주기적으로 Project JSON 또는 Project ZIP을 내보내세요. 브라우저의 사이트 데이터가 삭제되면 로컬 프로젝트도 함께 사라질 수 있습니다.</p>
            <h3>API Key</h3>
            <p>BYOK API Key는 세션 메모리 상태로 분리되어 프로젝트 JSON, IndexedDB 프로젝트 데이터, ZIP export에 포함되지 않습니다.</p>
          </section>

          <section id="shortcuts" className="manual-section">
            <div className="manual-section-title"><Keyboard size={20} /><div><span>10</span><h2>단축키</h2></div></div>
            <div className="manual-shortcuts">
              <div><kbd>Ctrl/Cmd</kbd><span>+</span><kbd>Z</kbd><strong>Undo</strong></div>
              <div><kbd>Ctrl/Cmd</kbd><span>+</span><kbd>Shift</kbd><span>+</span><kbd>Z</kbd><strong>Redo</strong></div>
            </div>
            <p>입력 필드 안에서는 브라우저의 텍스트 Undo가 우선합니다. 프로젝트 History는 입력 필드 밖에서 단축키를 사용할 때 작동합니다.</p>
          </section>

          <section id="troubleshooting" className="manual-section">
            <div className="manual-section-title"><TriangleAlert size={20} /><div><span>11</span><h2>문제 해결</h2></div></div>
            <div className="manual-faq">
              <details><summary>Vercel에서 npm run build가 실패합니다.</summary><p>Build Log에서 마지막 <code>exited with 2</code> 줄보다 위에 있는 첫 번째 TypeScript/Vite 오류를 확인하세요. 경고가 아니라 <code>error TS...</code> 또는 module resolve 오류가 실제 원인입니다.</p></details>
              <details><summary>Scene이 Blocked로 표시됩니다.</summary><p>Dashboard 또는 Export의 issue를 열어 Capability Error, Continuity Error, 누락된 Generation Reference가 있는지 확인합니다. 의도된 변화라면 Transition Event로 기록하세요.</p></details>
              <details><summary>프로젝트가 사라졌습니다.</summary><p>현재 브라우저/도메인이 같은지 확인하세요. 사이트 데이터가 삭제되었다면 자동 복구할 서버 사본은 없습니다. 이전에 내보낸 JSON/ZIP 백업을 가져와야 합니다.</p></details>
              <details><summary>API 키를 입력했는데 새로고침 후 사라졌습니다.</summary><p>정상 동작입니다. Browser-direct BYOK 키는 의도적으로 현재 세션에만 유지되며 프로젝트에 저장되지 않습니다.</p></details>
            </div>
          </section>

          <footer className="manual-footer"><strong>FrameBible v{APP_VERSION}</strong><span>Local-first AI film preproduction workspace</span><a href="/">워크스페이스로 돌아가기</a></footer>
        </main>
      </div>
    </div>
  )
}
