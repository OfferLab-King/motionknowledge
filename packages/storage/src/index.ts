import {LocalStorageProvider} from './local';
import {S3StorageProvider} from './s3';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

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
    const root = options.localRoot ?? join(process.cwd(), 'var', 'storage');
    mkdirSync(root, {recursive: true});
    return new LocalStorageProvider(root);
  }
  if (!options.s3) throw new Error('S3 storage configuration required');
  return new S3StorageProvider(options.s3);
}

export * from './local';
export * from './s3';
