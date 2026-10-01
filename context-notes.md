# FrameBible-v1.9.1 Context Notes

## Product goal
Turn a Scene package into an operational handoff artifact without violating the browser-only architecture or exposing provider credentials.

## API manifest principle
A browser-local ReferenceImage is not an API URL. `api-request.json` therefore uses explicit placeholders such as `package://references/...` for assets that must later be uploaded or hosted by a secure execution layer. The manifest records the target provider endpoint/model and request body shape, but never credentials.

## Provider baselines
### Seedance 2.5 / Higgsfield
- Text-to-video: prompt, duration, resolution, aspect_ratio, output_format, generate_audio.
- Image-to-video: image_url and optional end_image_url.
- Reference-to-video: image_urls/video_urls/audio_urls.

### Veo 3.1 / Gemini API
- Model: `veo-3.1-generate-preview` baseline.
- Request concepts: prompt, image, lastFrame, referenceImages; aspectRatio, durationSeconds, personGeneration, resolution, seed.
- 4/6/8 seconds; reference images, 1080p and 4K require 8 seconds.

### Kling Open Platform baseline
- Endpoint `/v1/videos/text2video`.
- Request concepts: model_name, prompt, negative_prompt, duration, mode, sound, aspect_ratio, optional callback_url/external_task_id/watermark_info.
- No auth data is included in exported manifests.

## Production readiness
Readiness is deterministic and inspectable, not a fake quality score.
- **Blocked**: hard capability/continuity/data-integrity failure.
- **Needs Review**: no blocker, but warnings or incomplete production metadata remain.
- **Ready**: no blockers and no review items under current rules.
