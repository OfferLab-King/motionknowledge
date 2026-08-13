import {NextResponse} from 'next/server';
import {getSessionUser} from '../../../../lib/supabase/auth';
import {getServiceDb} from '../../../../lib/db';
import {getWorkspaceMemberships} from '../../../../services/projects';
import {createStorageProvider, localStorageRoot} from '@motionknowledge/storage';
import {verifyObjectSignature} from '../../../../services/downloads';

export async function GET(request: Request, {params}: {params: Promise<{key: string[]}>}) {
  const {key} = await params;
  const objectKey = key.join('/');
  const url = new URL(request.url);
  const expires = Number(url.searchParams.get('expires') ?? '0');
  const sig = url.searchParams.get('sig') ?? '';
  const hasSignature = Boolean(url.searchParams.get('expires')) && sig.length > 0;

  if (!hasSignature) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({error: 'unauthorized'}, {status: 401});
    const db = getServiceDb();
    const memberships = await getWorkspaceMemberships(user.id, db);
    const workspaceId = memberships[0]?.workspaceId;
    if (!workspaceId || !objectKey.startsWith(`${workspaceId}/`)) {
      return NextResponse.json({error: 'not found'}, {status: 404});
    }
  } else if (!verifyObjectSignature(objectKey, expires, sig)) {
    return NextResponse.json({error: 'invalid or expired signature'}, {status: 403});
  }

  const storage = createStorageProvider({driver: 'local', localRoot: localStorageRoot});
  try {
    const bytes = await storage.get(objectKey);
    const contentType = objectKey.endsWith('.mp4')
      ? 'video/mp4'
      : objectKey.endsWith('.wav')
        ? 'audio/wav'
        : objectKey.endsWith('.png')
          ? 'image/png'
          : objectKey.endsWith('.json')
            ? 'application/json'
            : 'text/plain; charset=utf-8';
    const disposition = objectKey.endsWith('.mp4') || objectKey.endsWith('.png') ? 'inline' : 'attachment';
    return new NextResponse(Buffer.from(bytes), {
      headers: {'Content-Type': contentType, 'Content-Disposition': disposition, 'Cache-Control': 'private, max-age=300'},
    });
  } catch {
    return NextResponse.json({error: 'not found'}, {status: 404});
  }
}
