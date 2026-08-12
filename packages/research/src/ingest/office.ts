import {OfficeConverter} from 'officeparser';
import {normalizeWhitespace, stripActiveHtml} from './text';
import {sha256Text} from './hash';

export interface OfficeExtraction {
  text: string;
  normalizedSha256: string;
}

export async function extractTextFromOffice(
  bytes: Uint8Array,
  kind: 'pdf' | 'docx' | 'pptx',
): Promise<OfficeExtraction> {
  let result: string;
  try {
    const conversion = await OfficeConverter.convert(Buffer.from(bytes), 'md');
    result = typeof conversion.value === 'string' ? conversion.value : JSON.stringify(conversion.value);
  } catch (error) {
    throw new Error(`Office document extraction failed for ${kind}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const normalized = normalizeWhitespace(stripActiveHtml(result));
  if (!normalized) {
    throw new Error('Office document contained no extractable text');
  }
  return {text: normalized, normalizedSha256: sha256Text(normalized)};
}
