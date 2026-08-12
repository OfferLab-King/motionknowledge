import {buildWorkerDeps, attachQueue} from './deps';
import {startBoss, PgBossJobQueue, JOB_NAMES} from '@motionknowledge/jobs';
import {attachBossHandlers} from './register';
import {parseServerEnv} from '@motionknowledge/config';

async function main(): Promise<void> {
  const env = parseServerEnv(process.env);
  const deps = buildWorkerDeps(process.env);
  const boss = await startBoss(env.DATABASE_URL, [...JOB_NAMES]);
  attachQueue(deps, new PgBossJobQueue(boss, deps.db));
  await attachBossHandlers(boss, deps);
  deps.logger.info('worker started', {queues: JOB_NAMES.length});
  const shutdown = async () => {
    deps.logger.info('worker stopping');
    await boss.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

main().catch((error) => {
  console.error(JSON.stringify({level: 'error', message: 'worker failed to start', error: String(error)}));
  process.exit(1);
});
