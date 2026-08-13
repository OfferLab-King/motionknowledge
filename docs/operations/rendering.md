# Rendering

## Video pipeline

1. The worker builds a versioned `RenderManifestV1` from the active storyboard scenes, narration
   audio assets, and measured caption timings — never from mutable editor state.
2. The manifest is baked into a per-render Remotion bundle (frozen inputs; the composition makes no
   database or provider calls).
3. `renderProject()` renders H.264 via Remotion, then `attachNarrationToVideo()` mixes the
   per-scene narration at measured offsets with FFmpeg (48 kHz stereo normalization, loudnorm to
   -16 LUFS).
4. Every render is verified with ffprobe (duration, streams, dimensions, codec, frame rate) before
   it becomes downloadable.

## QA gates

`evaluateRenderQa()` checks expected duration, video stream, dimensions, H.264 codec, frame rate,
audio stream, silence/clipping (via `volumedetect`), and scene-manifest integrity. Any critical
failure prevents promotion to `READY_FOR_REVIEW`.

## Sandboxed specialist rendering (HyperFrames)

Specialist HTML/SVG/GSAP scenes render in a locked container (`docker/hyperframes`):

- `--network=none`, `--read-only`, `--cpus=2`, `--memory=2g`, `--pids-limit=256`, no capabilities,
  no new privileges
- only frozen local assets are mounted (read-only); output is a fresh directory
- a 120-second timeout is enforced; output is validated with ffprobe and hashed before the asset is
  registered with provenance

Build the image once:

```bash
docker build -t motionknowledge-hyperframes:0.7.107 docker/hyperframes
RUN_HYPERFRAMES_SMOKE=1 pnpm --filter @motionknowledge/hyperframes-adapter test:integration
```

## Storage and downloads

Renders are stored content-addressed under `workspace/project/renders/<kind>/`. Final exports
(MP4, SRT, transcript, chapters, thumbnail, metadata) are registered in `renders`. Downloads are
short-lived signed URLs issued only to workspace members; the signature (HMAC over key + expiry)
is verified by the object route before streaming.

## Remotion licensing

Remotion is source-available under the Remotion License. MotionKnowledge is an
automation/video-creation application and must budget for the Automators plan
($0.01 per render, $100 monthly minimum) when it no longer qualifies for the free small-entity
terms. Recheck terms before production launch.
