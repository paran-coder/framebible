import { z } from 'zod'
import type { Project } from '../core/types'
import { providers } from './providers'
import type { AIProviderId } from './types'

export interface AIStoryShotDraft {
  title: string
  durationSec: number
  framing: string
  focalLength: string
  cameraMovement: string
  action: string
}

export interface AIStorySceneDraft {
  title: string
  purpose: string
  emotionalBeat: string
  durationSec: number
  timeOfDay: string
  locationName: string | null
  characterNames: string[]
  propNames: string[]
  shots: AIStoryShotDraft[]
}

export interface AIStoryDraft {
  logline: string
  scenes: AIStorySceneDraft[]
}

const shotSchema = z.object({
  title: z.string().min(1),
  durationSec: z.number().positive().max(30),
  framing: z.string().min(1),
  focalLength: z.string().min(1),
  cameraMovement: z.string().min(1),
  action: z.string().min(1)
})

const sceneSchema = z.object({
  title: z.string().min(1),
  purpose: z.string().min(1),
  emotionalBeat: z.string().min(1),
  durationSec: z.number().positive().max(120),
  timeOfDay: z.string(),
  locationName: z.string().nullable(),
  characterNames: z.array(z.string()),
  propNames: z.array(z.string()),
  shots: z.array(shotSchema).min(1).max(8)
})

export const aiStoryDraftSchema = z.object({
  logline: z.string().min(1),
  scenes: z.array(sceneSchema).min(1).max(12)
})

export async function generateAIStoryDraft(args: { providerId: AIProviderId; apiKey: string; model: string; idea: string; project: Project; signal?: AbortSignal }): Promise<AIStoryDraft> {
  const { providerId, apiKey, model, idea, project, signal } = args
  const assetLines = project.assets.map((asset) => `- ${asset.type.toUpperCase()}: ${asset.name} — ${asset.description}`).join('\n')
  const system = 'You are a film pre-production story architect. Return only valid JSON. Never wrap JSON in markdown fences. Use the supplied asset names exactly when binding assets.'
  const prompt = `Create a concise, filmable storyline from the idea below.\n\nIDEA\n${idea}\n\nAVAILABLE ASSETS\n${assetLines}\n\nPROJECT STYLE\nGenre: ${project.styleDNA.genre}\nCamera: ${project.styleDNA.cameraLanguage}\nLighting: ${project.styleDNA.lightingLanguage}\n\nReturn exactly this JSON shape:\n{\n  "logline": "...",\n  "scenes": [{\n    "title": "...",\n    "purpose": "...",\n    "emotionalBeat": "...",\n    "durationSec": 8,\n    "timeOfDay": "...",\n    "locationName": "exact available location name or null",\n    "characterNames": ["exact available character names only"],\n    "propNames": ["exact available prop names only"],\n    "shots": [{\n      "title": "...",\n      "durationSec": 4,\n      "framing": "...",\n      "focalLength": "35mm",\n      "cameraMovement": "...",\n      "action": "..."\n    }]\n  }]\n}`

  const raw = await providers[providerId].generateText({ apiKey, model, system, prompt, signal })
  return aiStoryDraftSchema.parse(parseJson(raw)) as AIStoryDraft
}

function parseJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(trimmed) } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1))
    throw new Error('AI 응답을 JSON으로 해석하지 못했습니다.')
  }
}
