import {NextResponse} from 'next/server';
import {getServiceDb} from '../../../lib/db';

export async function GET() {
  const db = getServiceDb();
  try {
    const rows = await db.execute(await import('drizzle-orm').then(({sql}) => sql`select 1 as ok`));
    return NextResponse.json({
      status: 'ok',
      database: 'ok',
      version: process.env.npm_package_version ?? 'dev',
      codeVersion: process.env.WORKER_CODE_VERSION ?? null,
      time: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({status: 'degraded', database: 'unreachable'}, {status: 503});
  }
}
