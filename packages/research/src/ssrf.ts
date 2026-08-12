import {lookup} from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import {z} from 'zod';

export interface AddressResolver {
  resolve(hostname: string): Promise<string[]>;
}

export const dnsResolver: AddressResolver = {
  async resolve(hostname) {
    const records = await lookup(hostname, {all: true, verbatim: true});
    return records.map((record) => record.address);
  },
};

const ALLOWED_SCHEMES = new Set(['http:', 'https:']);

function isBlockedIp(address: string): string | null {
  try {
    const parsed = ipaddr.parse(address);
    if (parsed.range() === 'private' || parsed.range() === 'loopback' || parsed.range() === 'linkLocal') {
      return `private/loopback/link-local address ${address}`;
    }
    if (parsed.range() === 'multicast' || parsed.range() === 'unspecified' || parsed.range() === 'broadcast') {
      return `non-routable address ${address}`;
    }
    if (parsed.range() === 'reserved') {
      const bytes = parsed.toByteArray();
      if (bytes.length === 16 && bytes[0] === 169 && bytes[1] === 254) {
        return `metadata address ${address}`;
      }
    }
    if (parsed.kind() === 'ipv4') {
      const octets = parsed.toByteArray();
      const isMetadata = octets[0] === 169 && octets[1] === 254;
      if (isMetadata) return `metadata address ${address}`;
    }
    return null;
  } catch {
    return `unparseable address ${address}`;
  }
}

export function assertSafeUrl(url: string, resolver: AddressResolver = dnsResolver): Promise<void> {
  return assertSafeDestination(url, resolver, []);
}

export async function assertSafeDestination(
  url: string,
  resolver: AddressResolver,
  _visited: string[],
): Promise<void> {
  const parsed = new URL(url);
  if (!ALLOWED_SCHEMES.has(parsed.protocol)) {
    throw new Error('Unsafe URL scheme');
  }
  const hostname = parsed.hostname;
  if (!hostname) throw new Error('Unsafe URL destination: missing hostname');
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new Error('Unsafe URL destination');
  }
  const ipLiteral = ipaddr.isValid(hostname) ? hostname : null;
  if (ipLiteral) {
    const blocked = isBlockedIp(ipLiteral);
    if (blocked) throw new Error(`Unsafe URL destination: ${blocked}`);
    return;
  }
  let addresses: string[];
  try {
    addresses = await resolver.resolve(hostname);
  } catch {
    throw new Error('Unsafe URL destination: DNS resolution failed');
  }
  for (const address of addresses) {
    const blocked = isBlockedIp(address);
    if (blocked) throw new Error(`Unsafe URL destination: ${blocked}`);
  }
}

export const SafeUrlInputSchema = z.object({
  url: z.string().url(),
  redirectCount: z.number().int().min(0).max(3),
  maxBytes: z.number().int().positive().max(50_000_000),
  timeoutMs: z.number().int().positive().max(30_000),
});
