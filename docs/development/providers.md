# Providers

All provider credentials are optional. When a provider is not configured, the worker falls back to
deterministic local/mock implementations so the full product (including the DCF reference project)
runs credential-free.

## LLM (structured generation)

| Variable | Default | Notes |
| --- | --- | --- |
| `LLM_PROVIDER` | `mock` | `mock`, `openai`, or `openai-compatible` |
| `OPENAI_API_KEY` | — | required for `openai` (Responses structured output) |
| `LLM_API_KEY` | — | required for `openai-compatible` |
| `LLM_BASE_URL` | `https://api.deepseek.com` | base URL for `openai-compatible` |
| `LLM_MODEL` | `gpt-4o-mini` | model id, e.g. `deepseek-chat` for DeepSeek |

`openai-compatible` uses Chat Completions with JSON output, so DeepSeek, Ollama/vLLM gateways, and
other OpenAI-compatible endpoints work with just `LLM_PROVIDER=openai-compatible`, `LLM_BASE_URL`,
`LLM_API_KEY`, and `LLM_MODEL`. If the endpoint rejects `response_format`, the adapter falls back
to a JSON-only prompt.

The mock provider returns deterministic, source-grounded DCF fixtures and records zero cost.
Source text is always wrapped as untrusted data and cannot modify system instructions.

## TTS (narration)

| Variable | Default | Notes |
| --- | --- | --- |
| `TTS_PROVIDER` | `mock` | `mock`, `google`, or `elevenlabs` |
| `GOOGLE_TTS_CREDENTIALS_JSON` | — | service-account JSON for `google` |
| `ELEVENLABS_API_KEY` | — | for `elevenlabs` |
| `ELEVENLABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | |
| `ELEVENLABS_MODEL` | `eleven_multilingual_v2` | |
| `TTS_VOICE` | `en-US-Neural2-F` | Google voice name |
| `TTS_SAMPLE_RATE` | `24000` | output sample rate |

- Google uses SSML marks to obtain measured word timepoints (economical provider).
- ElevenLabs uses timestamped synthesis (premium provider).
- The mock provider synthesizes real short audio per word with FFmpeg, so word timings are always
  measured, never estimated from text length. Timings are validated for monotonicity.

## Storage

| Variable | Default | Notes |
| --- | --- | --- |
| `STORAGE_DRIVER` | `local` | `local` or `s3` |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | — | S3-compatible endpoint (e.g. Supabase Storage) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | credentials |
| `S3_FORCE_PATH_STYLE` | `true` | MinIO-style path addressing |

Local storage lives in `var/storage` (gitignored). Object keys are content-addressed
(`workspace/project/kind/hash-prefix/hash`).

## HyperFrames (specialist scenes)

| Variable | Default | Notes |
| --- | --- | --- |
| `HYPERFRAMES_RENDER_IMAGE` | `motionknowledge-hyperframes:0.7.107` | sandboxed container image |
| `RUN_HYPERFRAMES_SMOKE` | `0` | set `1` to run the container integration test |

Build the container once: `docker build -t motionknowledge-hyperframes:0.7.107 docker/hyperframes`.

## Rendering

| Variable | Default | Notes |
| --- | --- | --- |
| `PREVIEW_WIDTH` / `PREVIEW_HEIGHT` | `640` / `360` | preview render resolution |
| `RENDER_WIDTH` / `RENDER_HEIGHT` | `1280` / `720` | final render resolution |

Renders always run in the worker from immutable manifests; the web app never renders video.
