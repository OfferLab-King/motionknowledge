import {NextResponse} from 'next/server';
import {
  ELEVENLABS_VOICES,
  GOOGLE_NEURAL_VOICES,
  GOOGLE_WAVENET_VOICES,
  listMacVoices,
  type VoiceOption,
} from '@motionknowledge/tts';

export async function GET() {
  const macos = await listMacVoices();
  const googleConfigured = Boolean(process.env.GOOGLE_TTS_CREDENTIALS_JSON);
  const elevenLabsConfigured = Boolean(process.env.ELEVENLABS_API_KEY);

  let elevenLabs: VoiceOption[] = ELEVENLABS_VOICES;
  if (elevenLabsConfigured) {
    try {
      // Prefer the account's actual voice library — the only authoritative
      // list of what this key may use.
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {['xi-api-key']: process.env.ELEVENLABS_API_KEY!},
      });
      if (response.ok) {
        const data = (await response.json()) as {voices?: Array<{voice_id: string; name: string; category?: string}>};
        const fetched = (data.voices ?? [])
          .filter((voice) => voice.category === 'premade' || voice.category === 'cloned')
          .map((voice) => ({
            id: voice.voice_id,
            label: `${voice.name}`,
            provider: 'elevenlabs' as const,
            quality: 'premium' as const,
          }));
        if (fetched.length > 0) elevenLabs = fetched;
      }
    } catch {
      // fall back to the curated list
    }
  }

  return NextResponse.json({
    voices: [...macos, ...(googleConfigured ? [...GOOGLE_NEURAL_VOICES, ...GOOGLE_WAVENET_VOICES] : []), ...elevenLabs],
    providers: {
      macos: {configured: macos.length > 0, label: 'macOS (free, on-device)'},
      google: {configured: googleConfigured, label: 'Google Cloud TTS (neural)'},
      elevenlabs: {configured: elevenLabsConfigured, label: 'ElevenLabs (premium)'},
    },
  });
}
