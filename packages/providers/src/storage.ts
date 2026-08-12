import {z} from 'zod';

export interface StoredObject {
  key: string;
  sha256: string;
  contentType: string;
  byteCount: number;
}

export interface PutObjectInput {
  key: string;
  body: Uint8Array;
  contentType: string;
  sha256: string;
}

export interface StorageProvider {
  put(input: PutObjectInput): Promise<StoredObject>;
  get(key: string): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  createSignedReadUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export const StorageDriverSchema = z.enum(['local', 's3']);

export type StorageDriver = z.infer<typeof StorageDriverSchema>;

export interface S3StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
  publicBaseUrl?: string;
}

export const objectKeySchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[a-zA-Z0-9/._-]+$/, 'Object keys must be safe path segments');

export function assertSafeObjectKey(key: string): void {
  objectKeySchema.parse(key);
}
