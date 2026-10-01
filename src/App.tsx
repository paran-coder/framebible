import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from './components/AppShell'
import { lintProject } from './core/continuity'
import { loadLatestProject, saveProject } from './core/db'
import { applyTheme } from './core/theme'
import { AssetsView } from './features/assets/AssetsView'
import { DashboardView } from './features/dashboard/DashboardView'
import { ExportView } from './features/export/ExportView'
import { ShotsView } from './features/shots/ShotsView'
import { StoryView } from './features/story/StoryView'
import { useProjectStore } from './store/projectStore'

export default function App() {
  const project = useProjectStore((state) => state.project)
  const activeView = useProjectStore((state) => state.activeView)
  const setProject = useProjectStore((state) => state.setProject)
  const setActiveView = useProjectStore((state) => state.setActiveView)
  const setTheme = useProjectStore((state) => state.setTheme)
  const historyPast = useProjectStore((state) => state.historyPast)
  const historyFuture = useProjectStore((state) => state.historyFuture)
  const undo = useProjectStore((state) => state.undo)
  const redo = useProjectStore((state) => state.redo)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'local-only'>('local-only')
  const hydrated = useRef(false)
  const issues = useMemo(() => lintProject(project), [project])
  const historyItems = useMemo(() => historyPast.map(({ id, label, timestamp }) => ({ id, label, timestamp })), [historyPast])
  const futureItems = useMemo(() => historyFuture.map(({ id, label, timestamp }) => ({ id, label, timestamp })), [historyFuture])

  useEffect(() => {
    let cancelled = false
    loadLatestProject()
      .then((stored) => {
        if (!cancelled && stored) setProject(stored)
        hydrated.current = true
        if (!cancelled) setSaveState('saved')
      })
      .catch(() => {
        hydrated.current = true
        if (!cancelled) setSaveState('local-only')
      })
    return () => { cancelled = true }
  }, [setProject])

  useEffect(() => {
    applyTheme(project.settings.theme)
  }, [project.settings.theme])

  useEffect(() => {
    if (!hydrated.current) return
    setSaveState('saving')
    const timer = window.setTimeout(() => {
      saveProject(project)
        .then(() => setSaveState('saved'))
        .catch(() => setSaveState('local-only'))
    }, 450)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return
      const target = event.target
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) return
      const key = event.key.toLowerCase()
      if (key === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      } else if (key === 'y' && !event.shiftKey) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, undo])

  return (
    <AppShell
      projectTitle={project.title}
      activeView={activeView}
      theme={project.settings.theme}
      issueCount={issues.length}
      saveState={saveState}
      historyPast={historyItems}
      historyFuture={futureItems}
      onUndo={undo}
      onRedo={redo}
      onViewChange={setActiveView}
      onThemeChange={setTheme}
    >
      {activeView === 'dashboard' ? <DashboardView /> : null}
      {activeView === 'assets' ? <AssetsView /> : null}
      {activeView === 'story' ? <StoryView /> : null}
      {activeView === 'shots' ? <ShotsView /> : null}
      {activeView === 'export' ? <ExportView /> : null}
    </AppShell>
  )
}
