import {NextResponse} from 'next/server';
import {z} from 'zod';
import {createMultiVoiceTTSFromEnv} from '@motionknowledge/tts';

const PreviewSchema = z.object({
  voice: z.string().min(1).max(80),
});

const SAMPLE_TEXT = 'This is a preview of the voice that will narrate your video.';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = PreviewSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({error: 'invalid input'}, {status: 400});
  try {
    const router = createMultiVoiceTTSFromEnv(process.env);
    const result = await router.synthesize({
      text: SAMPLE_TEXT,
      voice: parsed.data.voice,
      sampleRateHz: 24_000,
      idempotencyKey: `voice-preview:${parsed.data.voice}`,
    });
    const audioBytes = Buffer.from(result.data.audioBytes);
    return NextResponse.json({
      audioBase64: audioBytes.toString('base64'),
      format: result.data.format,
      provider: result.provider,
      durationMs: result.data.durationMs,
    });
  } catch (error) {
    return NextResponse.json({error: error instanceof Error ? error.message : 'synthesis failed'}, {status: 400});
  }
}
