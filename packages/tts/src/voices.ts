import {execFile} from 'node:child_process';
import {promisify} from 'node:util';

const execFileAsync = promisify(execFile);

export interface VoiceOption {
  id: string;
  label: string;
  provider: 'macos' | 'google' | 'elevenlabs';
  quality: 'standard' | 'neural' | 'premium';
}

/** Curated human-sounding macOS voices (classic quality; Enhanced voices are
 * reported when installed). Excludes novelty/system voices. */
const MAC_ALLOWLIST = [
  'Alex',
  'Samantha',
  'Samantha (Enhanced)',
  'Kathy',
  'Daniel',
  'Reed (English (US))',
  'Flo (English (US))',
  'Eddy (English (US))',
  'Rocko (English (US))',
  'Grandma (English (US))',
  'Grandpa (English (US))',
  'Junior',
  'Albert',
];

export async function listMacVoices(): Promise<VoiceOption[]> {
  let stdout = '';
  try {
    const result = await execFileAsync('say', ['-v', '?'], {timeout: 15_000});
    stdout = result.stdout;
  } catch {
    return [];
  }
  const byName = new Map<string, string>();
  for (const line of stdout.split('\n')) {
    const match = line.match(/^([A-Za-z][^#]*?)\s+([a-zA-Z_]+)\s+#/);
    if (match) byName.set(match[1]!.trim(), match[2]!);
  }
  const voices: VoiceOption[] = [];
  for (const name of MAC_ALLOWLIST) {
    const lang = byName.get(name);
    if (lang && lang.startsWith('en_')) {
      voices.push({
        id: name,
        label: `${name} (English)`,
        provider: 'macos',
        quality: name.includes('Enhanced') ? 'neural' : 'standard',
      });
    }
  }
  if (voices.length === 0) {
    voices.push({id: 'Samantha', label: 'Samantha (English)', provider: 'macos', quality: 'standard'});
  }
  return voices;
}

export const GOOGLE_NEURAL_VOICES: VoiceOption[] = ['A', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(
  (suffix, index) => ({
    id: `en-US-Neural2-${suffix}`,
    label: `Google Neural2 ${['Male', 'Female', 'Female', 'Female', 'Female', 'Male', 'Male', 'Female', 'Male'][index]} (${suffix})`,
    provider: 'google' as const,
    quality: 'neural' as const,
  }),
);

export const GOOGLE_WAVENET_VOICES: VoiceOption[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(
  (suffix, index) => ({
    id: `en-US-Wavenet-${suffix}`,
    label: `Google Wavenet ${['Male', 'Male', 'Female', 'Female', 'Female', 'Female', 'Female', 'Female'][index]} (${suffix})`,
    provider: 'google' as const,
    quality: 'neural' as const,
  }),
);

/** Fallback ElevenLabs voices. Free accounts can use the "premade" voices;
 * library voices (Rachel, Sarah, …) require a paid plan. The live account
 * voice list is fetched by /api/voices when a key is configured. */
export const ELEVENLABS_VOICES: VoiceOption[] = [
  {id: 'XrExE9yKIg1WjnnlVkGX', label: 'Matilda — Knowledgable, Professional', provider: 'elevenlabs', quality: 'premium'},
  {id: 'Xb7hH8MSUJpSbSDYk0k2', label: 'Alice — Clear, Engaging Educator', provider: 'elevenlabs', quality: 'premium'},
  {id: 'bIHbv24MWmeRgasZH58o', label: 'Will — Relaxed Optimist', provider: 'elevenlabs', quality: 'premium'},
  {id: 'CwhRBWXzGAHq8TQ4Fs17', label: 'Roger — Laid-Back, Casual', provider: 'elevenlabs', quality: 'premium'},
  {id: 'jBpfuIE2acCO8z3wKNLl', label: 'Gigi — Adorable, Friendly, Playful', provider: 'elevenlabs', quality: 'premium'},
  {id: '21m00Tcm4TlvDq8ikWAM', label: 'Rachel (paid plan required)', provider: 'elevenlabs', quality: 'premium'},
  {id: 'EXAVITQu4vr4xnSDxMaL', label: 'Sarah (paid plan required)', provider: 'elevenlabs', quality: 'premium'},
];

export const VOICE_NAME_PATTERN = /^[A-Za-z0-9 ()'-]+$/;

export function isSafeVoiceName(name: string): boolean {
  return VOICE_NAME_PATTERN.test(name) && name.length <= 80;
}


/** Quality tier labels for the UI. */
export function qualityLabel(quality: VoiceOption['quality']): string {
  switch (quality) {
    case 'premium': return 'Premium';
    case 'neural': return 'Neural';
    default: return 'Standard';
  }
}

/** Recommended Google Neural2 voice per language code. */
export const LANGUAGE_DEFAULT_VOICES: Readonly<Record<string, string>> = {
  en: 'en-US-Neural2-J',
  es: 'es-ES-Neural2-F',
  fr: 'fr-FR-Neural2-C',
  de: 'de-DE-Neural2-D',
  pt: 'pt-BR-Neural2-A',
  it: 'it-IT-Neural2-C',
  nl: 'nl-NL-Neural2-A',
  ru: 'ru-RU-Neural2-F',
  pl: 'pl-PL-Neural2-A',
  sv: 'sv-SE-Neural2-A',
  da: 'da-DK-Neural2-D',
  no: 'nb-NO-Neural2-A',
  fi: 'fi-FI-Neural2-A',
  el: 'el-GR-Neural2-A',
  tr: 'tr-TR-Neural2-C',
  ja: 'ja-JP-Neural2-C',
  ko: 'ko-KR-Neural2-C',
  zh: 'cmn-CN-Neural2-C',
  hi: 'hi-IN-Neural2-A',
  cs: 'cs-CZ-Neural2-A',
  ro: 'ro-RO-Neural2-A',
  hu: 'hu-HU-Neural2-A',
  bg: 'bg-BG-Neural2-A',
  uk: 'uk-UA-Neural2-A',
  vi: 'vi-VN-Neural2-A',
  th: 'th-TH-Neural2-A',
  id: 'id-ID-Neural2-A',
};

/** Recommended default voice for a language (Google Neural2 when possible). */
export function defaultVoiceForLanguage(language: string): string {
  return LANGUAGE_DEFAULT_VOICES[language] ?? 'en-US-Neural2-J';
}
