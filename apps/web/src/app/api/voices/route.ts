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
  const voices: VoiceOption[] = [
    ...macos,
    ...(process.env.GOOGLE_TTS_CREDENTIALS_JSON ? [...GOOGLE_NEURAL_VOICES, ...GOOGLE_WAVENET_VOICES] : []),
    ...(process.env.ELEVENLABS_API_KEY ? ELEVENLABS_VOICES : []),
  ];
  return NextResponse.json({
    voices,
    providers: {
      macos: {configured: macos.length > 0, label: 'macOS (free, on-device)'},
      google: {configured: Boolean(process.env.GOOGLE_TTS_CREDENTIALS_JSON), label: 'Google Cloud TTS (neural)'},
      elevenlabs: {configured: Boolean(process.env.ELEVENLABS_API_KEY), label: 'ElevenLabs (premium)'},
    },
  });
}
