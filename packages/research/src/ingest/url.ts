import {assertSafeDestination, dnsResolver, type AddressResolver} from '../ssrf';
import {sniffContent} from './sniff';
import {stripActiveHtml, normalizeWhitespace} from './text';

export interface FetchedUrl {
  finalUrl: string;
  contentType: string | null;
  text: string;
  byteCount: number;
  rawSha256: string;
}

const MAX_REDIRECTS = 3;
const MAX_BYTES = 10_000_000;
const TIMEOUT_MS = 15_000;

export async function fetchSafeUrl(url: string, resolver: AddressResolver = dnsResolver): Promise<FetchedUrl> {
  let current = url;
  const visited: string[] = [];
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await assertSafeDestination(current, resolver, visited);
    visited.push(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {'user-agent': 'MotionKnowledgeIngestion/1.0', accept: 'text/html,text/plain,application/pdf,application/json,text/csv'},
      });
    } finally {
      clearTimeout(timer);
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect without location');
      current = new URL(location, current).toString();
      continue;
    }
    if (!response.ok) throw new Error(`URL fetch failed with status ${response.status}`);
    const contentType = response.headers.get('content-type') ?? null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) throw new Error('URL response exceeds byte limit');
    const bytes = new Uint8Array(buffer);
    const sniff = await sniffContent(bytes, 'file');
    if (!sniff.safe) throw new Error(`Unsafe content from URL: ${sniff.reason}`);
    let text: string;
    if (contentType?.includes('json')) {
      text = buffer.toString('utf8');
    } else if (contentType?.includes('csv')) {
      text = buffer.toString('utf8');
    } else {
      text = stripActiveHtml(buffer.toString('utf8'));
    }
    return {
      finalUrl: current,
      contentType,
      text: normalizeWhitespace(text),
      byteCount: buffer.byteLength,
      rawSha256: sniff.sha256,
    };
  }
  throw new Error('Too many redirects');
}
