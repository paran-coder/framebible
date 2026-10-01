import Dexie, { type Table } from 'dexie'
import { parseFrameBibleProject } from './projectValidation'
import type { Project } from './types'

class FrameBibleDatabase extends Dexie {
  projects!: Table<unknown, string>

  constructor() {
    super('framebible')
    this.version(1).stores({ projects: 'id, updatedAt' })
  }
}

export const db = new FrameBibleDatabase()

export async function loadLatestProject(): Promise<Project | undefined> {
  const stored = await db.projects.orderBy('updatedAt').last()
  const parsed = parseFrameBibleProject(stored)
  return parsed ?? undefined
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({ ...project, updatedAt: new Date().toISOString() })
}
