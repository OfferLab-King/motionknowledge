import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile, rm, stat} from 'node:fs/promises';
import {dirname, join, resolve, sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {
  assertSafeObjectKey,
  type PutObjectInput,
  type StorageProvider,
  type StoredObject,
} from '@motionknowledge/providers';

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly root: string) {}

  private pathFor(key: string): string {
    assertSafeObjectKey(key);
    const parts = key.split('/').filter(Boolean);
    const path = join(this.root, ...parts);
    const absolute = resolve(path);
    if (!absolute.startsWith(resolve(this.root) + sep) && absolute !== resolve(this.root)) {
      throw new Error('Object key escapes storage root');
    }
    return absolute;
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    assertSafeObjectKey(input.key);
    const actualSha = createHash('sha256').update(Buffer.from(input.body)).digest('hex');
    if (actualSha !== input.sha256) {
      throw new Error('Stored bytes do not match declared SHA-256');
    }
    const path = this.pathFor(input.key);
    await mkdir(dirname(path), {recursive: true});
    await writeFile(path, Buffer.from(input.body));
    return {
      key: input.key,
      sha256: actualSha,
      contentType: input.contentType,
      byteCount: input.body.byteLength,
    };
  }

  async get(key: string): Promise<Uint8Array> {
    const path = this.pathFor(key);
    const bytes = await readFile(path);
    return new Uint8Array(bytes);
  }

  async delete(key: string): Promise<void> {
    await rm(this.pathFor(key), {force: true});
  }

  async createSignedReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    const path = this.pathFor(key);
    await stat(path);
    const url = pathToFileURL(path);
    url.searchParams.set('expiresInSeconds', String(expiresInSeconds));
    return url.toString();
  }

  async exists(key: string): Promise<boolean> {
    try {
      await stat(this.pathFor(key));
      return true;
    } catch {
      return false;
    }
  }
}
