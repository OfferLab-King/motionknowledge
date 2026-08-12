import {PgBoss} from 'pg-boss';
import {PgBossJobQueue} from '@motionknowledge/jobs';
import {getServiceDb} from './db';

let bossPromise: Promise<PgBoss> | null = null;

export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss({
        connectionString: process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54332/postgres',
        schema: 'boss',
        useListenNotify: false,
      });
      await boss.start();
      return boss;
    })();
  }
  return bossPromise;
}

export async function getQueue() {
  const boss = await getBoss();
  return new PgBossJobQueue(boss, getServiceDb());
}
