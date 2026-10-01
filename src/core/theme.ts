import type { ThemePreference } from './types'

export function applyTheme(preference: ThemePreference): void {
  const root = document.documentElement
  if (preference === 'system') {
    root.removeAttribute('data-theme')
    return
  }
  root.dataset.theme = preference
}
