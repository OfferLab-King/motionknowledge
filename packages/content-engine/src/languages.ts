/**
 * Supported generation languages (ISO 639-1 codes with display names).
 * Research, lesson, script and storyboard stages receive the language; the
 * narration voice remains a per-project choice.
 */
export const SUPPORTED_LANGUAGES = [
  {code: 'en', name: 'English'},
  {code: 'es', name: 'Spanish'},
  {code: 'fr', name: 'French'},
  {code: 'de', name: 'German'},
  {code: 'pt', name: 'Portuguese'},
  {code: 'it', name: 'Italian'},
  {code: 'nl', name: 'Dutch'},
  {code: 'ru', name: 'Russian'},
  {code: 'pl', name: 'Polish'},
  {code: 'uk', name: 'Ukrainian'},
  {code: 'sv', name: 'Swedish'},
  {code: 'da', name: 'Danish'},
  {code: 'no', name: 'Norwegian'},
  {code: 'fi', name: 'Finnish'},
  {code: 'el', name: 'Greek'},
  {code: 'tr', name: 'Turkish'},
  {code: 'ja', name: 'Japanese'},
  {code: 'ko', name: 'Korean'},
  {code: 'zh', name: 'Chinese'},
  {code: 'ar', name: 'Arabic'},
  {code: 'he', name: 'Hebrew'},
  {code: 'hi', name: 'Hindi'},
  {code: 'th', name: 'Thai'},
  {code: 'vi', name: 'Vietnamese'},
  {code: 'id', name: 'Indonesian'},
  {code: 'ms', name: 'Malay'},
  {code: 'cs', name: 'Czech'},
  {code: 'ro', name: 'Romanian'},
  {code: 'hu', name: 'Hungarian'},
  {code: 'bg', name: 'Bulgarian'},
  {code: 'hr', name: 'Croatian'},
  {code: 'sk', name: 'Slovak'},
  {code: 'sl', name: 'Slovenian'},
  {code: 'et', name: 'Estonian'},
  {code: 'lt', name: 'Lithuanian'},
  {code: 'lv', name: 'Latvian'},
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const CODES = new Set<string>(SUPPORTED_LANGUAGES.map((lang) => lang.code));

export function isSupportedLanguage(code: string): boolean {
  return CODES.has(code);
}

export function languageName(code: string): string {
  return SUPPORTED_LANGUAGES.find((lang) => lang.code === code)?.name ?? code;
}
