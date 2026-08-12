import {createHash} from 'node:crypto';

export function sha256Hex(bytes: Uint8Array): string {
  return createHash('sha256').update(Buffer.from(bytes)).digest('hex');
}

export function sha256Text(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
