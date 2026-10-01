import JSZip from 'jszip'
import type { GenerationTarget, Project, Scene } from './types'
import { apiParameterManifestJson } from './apiParameterManifest'
import { contactSheetHtml } from './contactSheet'
import { compileSceneForModel } from './promptCompiler'
import { buildProjectReadiness } from './readiness'
import { collectSceneReferences } from './sceneReferences'
import { buildSceneManifest, capabilityReportText, frameInstructions, referenceFileInfo, safePackageName } from './generationManifest'

export { buildSceneManifest, capabilityReportText, frameInstructions } from './generationManifest'

export async function sceneGenerationPackage(project: Project, scene: Scene, model: GenerationTarget): Promise<Blob> {
  const zip = new JSZip()
  const manifest = buildSceneManifest(project, scene, model)
  const frames = frameInstructions(scene)
  zip.file('manifest.json', JSON.stringify(manifest, null, 2))
  zip.file('api-request.json', apiParameterManifestJson(project, scene, model))
  const readiness = buildProjectReadiness(project, model).scenes.find((item) => item.sceneId === scene.id)
  zip.file('readiness-report.json', JSON.stringify(readiness ?? null, null, 2))
  zip.file(`prompt/${model}.txt`, compileSceneForModel(project, scene, model))
  zip.file('capability-report.txt', capabilityReportText(project, scene, model))
  zip.file('frames/first-frame.txt', frames.first)
  zip.file('frames/last-frame.txt', frames.last)
  zip.file('contact-sheet.html', contactSheetHtml(project, scene))
  zip.file('README.txt', `FrameBible Scene package for ${project.title} / Scene ${scene.order} ${scene.title}. Target: ${model}. api-request.json is a credential-free request template. Resolve package:// references in a secure execution layer before a real provider call. API keys and AI session state are not included.`)

  for (const item of collectSceneReferences(project, scene)) {
    const file = referenceFileInfo(item.reference)
    if (!file) continue
    const folder = zip.folder(`references/${item.role}/${safePackageName(item.assetName)}`)
    folder?.file(file.name, file.base64, { base64: true })
  }

  return zip.generateAsync({ type: 'blob' })
}
