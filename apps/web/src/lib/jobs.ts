import type {PgBoss} from 'pg-boss';
import {PgBossJobQueue, startBoss, JOB_NAMES} from '@motionknowledge/jobs';
import {getServiceDb} from './db';

let bossPromise: Promise<PgBoss> | null = null;

export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = startBoss(
      process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres',
      [...JOB_NAMES],
    );
  }
  return bossPromise;
}

export async function getQueue() {
  const boss = await getBoss();
  return new PgBossJobQueue(boss, getServiceDb());
}
