import {LocalStorageProvider} from './local';
import {S3StorageProvider} from './s3';
import {mkdirSync} from 'node:fs';
import {existsSync} from 'node:fs';
import {join, dirname} from 'node:path';

export function resolveRepoRoot(startDir: string = process.cwd()): string {
  let current = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(current, 'pnpm-workspace.yaml'))) return current;
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return startDir;
}

export const localStorageRoot = join(resolveRepoRoot(), 'var', 'storage');
export const localExportRoot = join(resolveRepoRoot(), 'var', 'exports');

export interface StorageOptions {
  driver?: 'local' | 's3';
  localRoot?: string;
  s3?: {
    endpoint?: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle?: boolean;
  };
}

export function createStorageProvider(options: StorageOptions) {
  if ((options.driver ?? 'local') === 'local') {
    const root = options.localRoot ?? localStorageRoot;
    mkdirSync(root, {recursive: true});
    return new LocalStorageProvider(root);
  }
  if (!options.s3) throw new Error('S3 storage configuration required');
  return new S3StorageProvider(options.s3);
}

export * from './local';
export * from './s3';
