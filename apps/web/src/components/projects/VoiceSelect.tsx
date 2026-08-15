'use client';

import {useEffect, useState} from 'react';

export interface VoiceOption {
  id: string;
  label: string;
  provider: 'macos' | 'google' | 'elevenlabs';
  quality: 'standard' | 'neural' | 'premium';
}

const PROVIDER_GROUPS: Array<{key: string; label: string; quality: string}> = [
  {key: 'elevenlabs', label: 'ElevenLabs (premium)', quality: 'premium'},
  {key: 'google', label: 'Google Cloud (neural)', quality: 'neural'},
  {key: 'macos', label: 'macOS (free, on-device)', quality: 'standard'},
];

export function VoiceSelect(props: {language: string; defaultValue?: string}) {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [providers, setProviders] = useState<Record<string, {configured: boolean; label: string}>>({});
  const [voice, setVoice] = useState(props.defaultValue ?? 'Samantha');
  const [previewing, setPreviewing] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/voices', {cache: 'no-store'})
      .then((response) => (response.ok ? response.json() : null))
      .then((data: {voices: VoiceOption[]; providers: Record<string, {configured: boolean; label: string}>} | null) => {
        if (!data) return;
        setVoices(data.voices);
        setProviders(data.providers);
        // Suggest the language-matched voice when the matching provider is
        // configured; otherwise prefer the configured ElevenLabs default.
        const languageVoice = languageDefault(props.language);
        const languageMatch = data.voices.find((option) => option.id === languageVoice);
        if (languageMatch && data.providers.google?.configured) {
          setVoice(languageMatch.id);
        } else if (data.providers.elevenlabs?.configured) {
          const elevenLabsDefault = data.voices.find((option) => option.provider === 'elevenlabs');
          if (elevenLabsDefault && !props.defaultValue) setVoice(elevenLabsDefault.id);
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.language]);

  async function preview() {
    setPreviewing(true);
    setPreviewSrc(null);
    setError(null);
    try {
      const response = await fetch('/api/voices/preview', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({voice}),
      });
      const data = (await response.json()) as {audioBase64?: string; format?: string; error?: string};
      if (!response.ok || !data.audioBase64) {
        setError(data.error ?? 'Preview failed');
        return;
      }
      setPreviewSrc(`data:audio/${data.format ?? 'wav'};base64,${data.audioBase64}`);
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <select
          name="voice"
          value={voice}
          onChange={(event) => {
            setVoice(event.target.value);
            setPreviewSrc(null);
          }}
          aria-label="Narration voice"
          className="w-full rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm text-[#f8fafc] outline-none focus:border-[#59d5e0]"
        >
          {PROVIDER_GROUPS.filter((group) => providers[group.key]?.configured || group.key === 'macos').map((group) => (
            <optgroup key={group.key} label={`${group.label}${voices.some((v) => v.provider === group.key) ? '' : ' — not configured'}`}>
              {voices
                .filter((option) => option.provider === group.key)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label} · {option.quality === 'premium' ? 'Premium' : option.quality === 'neural' ? 'Neural' : 'Standard'}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <button
          type="button"
          disabled={previewing}
          onClick={() => void preview()}
          className="shrink-0 rounded-lg border border-[#2a4568] bg-[#10213a] px-3 py-2 text-sm font-semibold text-[#59d5e0] hover:bg-[#1a3050] disabled:opacity-50"
        >
          {previewing ? '…' : 'Preview'}
        </button>
      </div>
      {previewSrc ? <audio controls src={previewSrc} className="h-8 w-full" /> : null}
      {error ? <p className="text-xs text-[#fb7185]">{error}</p> : null}
      <p className="text-[10px] text-[#64748b]">
        {providers.elevenlabs?.configured || providers.google?.configured
          ? 'Neural and premium voices activate when provider keys are configured.'
          : 'No provider keys configured — using the free on-device voice.'}
      </p>
    </div>
  );
}

function languageDefault(language: string): string {
  const defaults: Record<string, string> = {
    en: 'en-US-Neural2-J', es: 'es-ES-Neural2-F', fr: 'fr-FR-Neural2-C', de: 'de-DE-Neural2-D',
    pt: 'pt-BR-Neural2-A', it: 'it-IT-Neural2-C', nl: 'nl-NL-Neural2-A', ru: 'ru-RU-Neural2-F',
    pl: 'pl-PL-Neural2-A', sv: 'sv-SE-Neural2-A', da: 'da-DK-Neural2-D', no: 'nb-NO-Neural2-A',
    fi: 'fi-FI-Neural2-A', el: 'el-GR-Neural2-A', tr: 'tr-TR-Neural2-C', ja: 'ja-JP-Neural2-C',
    ko: 'ko-KR-Neural2-C', zh: 'cmn-CN-Neural2-C', hi: 'hi-IN-Neural2-A',
  };
  return defaults[language] ?? 'en-US-Neural2-J';
}
