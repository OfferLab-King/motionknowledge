import {fileTypeFromBuffer} from 'file-type';
import {sha256Hex} from './hash';

export interface SniffResult {
  detected: string | null;
  safe: boolean;
  reason: string | null;
  declared: string;
  sha256: string;
}

const UPLOAD_ALLOWLIST = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/json',
  'application/csv',
  'text/markdown',
]);

const DANGEROUS_TYPES = new Set(['text/html', 'image/svg+xml', 'application/xml', 'application/x-sh', 'application/x-msdownload', 'application/javascript', 'text/javascript']);

export async function sniffContent(bytes: Uint8Array, declaredKind: string): Promise<SniffResult> {
  const detected = (await fileTypeFromBuffer(Buffer.from(bytes))) ?? null;
  const sha256 = sha256Hex(bytes);
  if (detected && DANGEROUS_TYPES.has(detected.mime)) {
    return {detected: detected.mime, safe: false, reason: 'dangerous content type', declared: declaredKind, sha256};
  }
  if (detected && !UPLOAD_ALLOWLIST.has(detected.mime)) {
    return {detected: detected.mime, safe: false, reason: 'content type not allowlisted', declared: declaredKind, sha256};
  }
  const declaredAllowed = declaredKind === 'text' || declaredKind === 'pdf' || declaredKind === 'docx' || declaredKind === 'pptx' || declaredKind === 'csv' || declaredKind === 'json' || declaredKind === 'file';
  if (!detected && !declaredAllowed) {
    return {detected: null, safe: false, reason: 'unrecognized content and unknown declared kind', declared: declaredKind, sha256};
  }
  return {detected: detected?.mime ?? null, safe: true, reason: null, declared: declaredKind, sha256};
}
