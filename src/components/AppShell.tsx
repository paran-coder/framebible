import { useEffect, useState } from 'react'
import { BookOpen, Clapperboard, Download, Film, Gauge, History as HistoryIcon, LockKeyhole, Moon, Redo2, Sun, Monitor, Undo2, X, type LucideIcon } from 'lucide-react'
import { APP_VERSION, type ThemePreference, type ViewKey } from '../core/types'
import type { HistoryDisplayItem } from '../store/projectStore'

interface NavItem {
  key: ViewKey
  label: string
  description: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', description: 'Readiness', icon: Gauge },
  { key: 'assets', label: 'Asset Bible', description: 'Characters · locations · props', icon: BookOpen },
  { key: 'story', label: 'Story', description: 'Scenes · continuity', icon: Film },
  { key: 'shots', label: 'Shots', description: 'Blocking · camera', icon: Clapperboard },
  { key: 'export', label: 'Export', description: 'Prompts · packages', icon: Download }
]

const themeIcons: Record<ThemePreference, LucideIcon> = {
  system: Monitor,
  light: Sun,
  dark: Moon
}

interface AppShellProps {
  projectTitle: string
  activeView: ViewKey
  theme: ThemePreference
  issueCount: number
  saveState: 'saved' | 'saving' | 'local-only'
  historyPast: HistoryDisplayItem[]
  historyFuture: HistoryDisplayItem[]
  onUndo: () => void
  onRedo: () => void
  onViewChange: (view: ViewKey) => void
  onThemeChange: (theme: ThemePreference) => void
  children: React.ReactNode
}

const historyTimeFormatter = new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

function timeLabel(timestamp: number) {
  return historyTimeFormatter.format(timestamp)
}

export function AppShell({ projectTitle, activeView, theme, issueCount, saveState, historyPast, historyFuture, onUndo, onRedo, onViewChange, onThemeChange, children }: AppShellProps) {
  const ThemeIcon = themeIcons[theme]
  const [historyOpen, setHistoryOpen] = useState(false)
  const latestHistory = [...historyPast].reverse()
  const redoHistory = [...historyFuture].reverse()

  useEffect(() => {
    if (!historyOpen) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setHistoryOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [historyOpen])

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="프로젝트 탐색">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true"><span /></div>
          <div>
            <div className="brand-name">FrameBible</div>
            <div className="brand-version">v{APP_VERSION}</div>
          </div>
        </div>

        <div className="project-chip">
          <span className="eyebrow">PROJECT</span>
          <strong>{projectTitle}</strong>
          <span className="save-state"><i className={`save-dot ${saveState}`} />{saveState === 'saved' ? '브라우저에 저장됨' : saveState === 'saving' ? '저장 중' : '로컬 모드'}</span>
        </div>

        <nav className="primary-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeView === item.key
            return (
              <button key={item.key} className={`nav-button ${isActive ? 'active' : ''}`} onClick={() => onViewChange(item.key)} aria-current={isActive ? 'page' : undefined}>
                <Icon size={18} strokeWidth={1.8} />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                {item.key === 'export' && issueCount > 0 ? <span className="issue-count">{issueCount}</span> : null}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-spacer" />

        <div className="theme-control">
          <div className="control-label"><ThemeIcon size={15} /> 테마</div>
          <select value={theme} onChange={(event) => onThemeChange(event.target.value as ThemePreference)} aria-label="테마 선택">
            <option value="system">시스템</option>
            <option value="light">라이트</option>
            <option value="dark">다크</option>
          </select>
        </div>

        <div className="sidebar-footnote">
          <LockKeyhole size={14} />
          <span>프로젝트는 로컬 저장 · API 키는 세션 메모리만 사용</span>
        </div>
      </aside>
      <main className="workspace">
        <div className="workspace-toolbar" aria-label="작업 히스토리 도구">
          <div className="history-actions">
            <button className="history-tool-button" onClick={onUndo} disabled={!historyPast.length} aria-label="실행 취소 (Ctrl 또는 Command + Z)" title="Undo · Ctrl/Cmd+Z"><Undo2 size={16} /> <span>Undo</span></button>
            <button className="history-tool-button" onClick={onRedo} disabled={!historyFuture.length} aria-label="다시 실행 (Ctrl 또는 Command + Shift + Z)" title="Redo · Ctrl/Cmd+Shift+Z"><Redo2 size={16} /> <span>Redo</span></button>
            <button className={`history-tool-button ${historyOpen ? 'active' : ''}`} onClick={() => setHistoryOpen((value) => !value)} aria-expanded={historyOpen} aria-controls="history-panel"><HistoryIcon size={16} /> <span>History</span><small>{historyPast.length}</small></button>
          </div>
          <span className="shortcut-hint">Ctrl/Cmd+Z · Shift+Z</span>
        </div>
        {historyOpen ? (
          <aside id="history-panel" className="history-panel" aria-label="작업 히스토리">
            <div className="history-panel-head"><div><span className="eyebrow">PROJECT HISTORY</span><strong>최근 작업</strong></div><button className="icon-button" onClick={() => setHistoryOpen(false)} aria-label="히스토리 닫기"><X size={16} /></button></div>
            <div className="history-panel-list">
              {redoHistory.map((item) => <div key={`future-${item.id}`} className="history-entry future"><span><Redo2 size={13} /></span><div><strong>{item.label}</strong><small>Redo 대기 · {timeLabel(item.timestamp)}</small></div></div>)}
              {latestHistory.map((item, index) => <div key={item.id} className={`history-entry ${index === 0 ? 'latest' : ''}`}><span><HistoryIcon size={13} /></span><div><strong>{item.label}</strong><small>{index === 0 ? '현재 마지막 작업 · ' : ''}{timeLabel(item.timestamp)}</small></div></div>)}
              {!historyPast.length && !historyFuture.length ? <div className="history-empty">아직 기록된 프로젝트 변경이 없습니다.</div> : null}
            </div>
            <p className="history-note">프로젝트 데이터 변경만 기록합니다. 테마, 탭 선택, API 키는 히스토리에 포함하지 않습니다.</p>
          </aside>
        ) : null}
        {children}
      </main>
    </div>
  )
}
