interface StatusPillProps {
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
}

export function StatusPill({ tone = 'neutral', children }: StatusPillProps) {
  return <span className={`status-pill ${tone}`}>{children}</span>
}
