import {
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {getSignedUrl} from '@aws-sdk/s3-request-presigner';
import {createHash} from 'node:crypto';
import {
  assertSafeObjectKey,
  type PutObjectInput,
  type S3StorageConfig,
  type StorageProvider,
  type StoredObject,
} from '@motionknowledge/providers';

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;

  constructor(private readonly config: S3StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle ?? false,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(input: PutObjectInput): Promise<StoredObject> {
    assertSafeObjectKey(input.key);
    const actualSha = createHash('sha256').update(Buffer.from(input.body)).digest('hex');
    if (actualSha !== input.sha256) {
      throw new Error('Stored bytes do not match declared SHA-256');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: input.key,
        Body: Buffer.from(input.body),
        ContentType: input.contentType,
        Metadata: {sha256: input.sha256},
      }),
    );
    return {
      key: input.key,
      sha256: actualSha,
      contentType: input.contentType,
      byteCount: input.body.byteLength,
    };
  }

  async get(key: string): Promise<Uint8Array> {
    assertSafeObjectKey(key);
    const result = await this.client.send(
      new GetObjectCommand({Bucket: this.config.bucket, Key: key}),
    );
    const body = await result.Body?.transformToByteArray();
    if (!body) throw new Error(`Object ${key} has no body`);
    return new Uint8Array(body);
  }

  async delete(key: string): Promise<void> {
    assertSafeObjectKey(key);
    await this.client.send(new DeleteObjectCommand({Bucket: this.config.bucket, Key: key}));
  }

  async createSignedReadUrl(key: string, expiresInSeconds: number): Promise<string> {
    assertSafeObjectKey(key);
    return getSignedUrl(
      this.client,
      new GetObjectCommand({Bucket: this.config.bucket, Key: key}),
      {expiresIn: expiresInSeconds},
    );
  }
}
