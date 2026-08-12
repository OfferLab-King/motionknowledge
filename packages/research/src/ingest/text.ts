import {sha256Text} from './hash';

export interface ExtractedText {
  text: string;
  kind: 'text' | 'markdown';
  normalizedSha256: string;
  byteCount: number;
}

const HTML_TAG = /<[^>]*>/g;
const SVG_SCRIPT = /<script[\s\S]*?<\/script>/gi;
const JAVASCRIPT_URL = /\bjavascript:\s*[^\s"']+/gi;

export function extractTextFromPlain(bytes: Uint8Array, declaredKind: 'text' | 'csv' | 'json' | 'file'): ExtractedText {
  const raw = Buffer.from(bytes).toString('utf8');
  let text = raw.replace(/^\uFEFF/, '');
  if (text.includes('<') && /<\/?(script|html|svg|body|iframe)/i.test(text)) {
    text = text
      .replace(SVG_SCRIPT, '')
      .replace(HTML_TAG, ' ')
      .replace(JAVASCRIPT_URL, '');
  }
  const normalized = normalizeWhitespace(text);
  return {
    text: normalized,
    kind: declaredKind === 'file' ? 'text' : 'text',
    normalizedSha256: sha256Text(normalized),
    byteCount: raw.length,
  };
}

export function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

export function stripActiveHtml(html: string): string {
  return html
    .replace(SVG_SCRIPT, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/style\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(HTML_TAG, ' ')
    .replace(JAVASCRIPT_URL, '');
}
