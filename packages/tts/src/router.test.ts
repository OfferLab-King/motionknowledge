import {describe, expect, it} from 'vitest';
import {voiceProviderKind} from './router';

describe('voice provider routing', () => {
  it('routes Google voice ids to google', () => {
    expect(voiceProviderKind('en-US-Neural2-A')).toBe('google');
    expect(voiceProviderKind('es-ES-Neural2-F')).toBe('google');
    expect(voiceProviderKind('cmn-CN-Neural2-C')).toBe('google');
    expect(voiceProviderKind('en-GB-Wavenet-B')).toBe('google');
  });

  it('routes ElevenLabs ids to elevenlabs', () => {
    expect(voiceProviderKind('21m00Tcm4TlvDq8ikWAM')).toBe('elevenlabs');
    expect(voiceProviderKind('EXAVITQu4vr4xnSDxMaL')).toBe('elevenlabs');
  });

  it('routes macOS voice names to mock', () => {
    expect(voiceProviderKind('Samantha')).toBe('mock');
    expect(voiceProviderKind('Daniel')).toBe('mock');
    expect(voiceProviderKind('Samantha (Enhanced)')).toBe('mock');
    expect(voiceProviderKind('')).toBe('mock');
  });

  it('prefers the configured provider when voices overlap formats', () => {
    // A bare alphanumeric id is treated as ElevenLabs even if it could be a
    // macOS name — macOS names contain spaces/parens.
    expect(voiceProviderKind('Alicia1234567890')).toBe('elevenlabs');
  });
});
