import {describe, expect, it} from 'vitest';
import {assertSafeUrl, type AddressResolver} from './ssrf';

const resolver: AddressResolver = {
  async resolve(hostname) {
    if (hostname === 'public.example.com') return ['93.184.216.34'];
    if (hostname === 'internal.example.com') return ['10.0.0.5'];
    if (hostname === 'meta.example.com') return ['169.254.169.254'];
    if (hostname === 'link.example.com') return ['169.254.1.1'];
    throw new Error('nxdomain');
  },
};

describe('SSRF protection', () => {
  it.each(['http://127.0.0.1/x', 'http://169.254.169.254/latest/meta-data', 'http://[::1]/'])(
    'blocks private destination %s',
    async (url) => expect(assertSafeUrl(url, resolver)).rejects.toThrow('Unsafe URL destination'),
  );

  it.each(['http://internal.example.com/x', 'http://meta.example.com/latest/meta-data', 'http://link.example.com/x', 'http://localhost/x'])(
    'blocks hostname-based private destinations %s',
    async (url) => expect(assertSafeUrl(url, resolver)).rejects.toThrow('Unsafe URL destination'),
  );

  it.each(['file:///etc/passwd', 'ftp://example.com/x', 'gopher://example.com/x'])(
    'blocks unsafe schemes %s',
    async (url) => expect(assertSafeUrl(url, resolver)).rejects.toThrow('Unsafe URL scheme'),
  );

  it('allows public destinations', async () => {
    await expect(assertSafeUrl('https://public.example.com/page', resolver)).resolves.toBeUndefined();
  });

  it('blocks unresolvable hostnames', async () => {
    await expect(assertSafeUrl('https://no-such-host.invalid/', resolver)).rejects.toThrow('Unsafe URL destination');
  });
});
