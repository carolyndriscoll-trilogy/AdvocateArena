import { run, Runner } from 'graphile-worker';
import { pool } from '../db';
import tasks from './tasks';

let runner: Runner | null = null;

export async function startWorker(): Promise<Runner> {
  if (runner) {
    console.log('[Worker] Already running');
    return runner;
  }

  const concurrency = process.env.WORKER_CONCURRENCY
    ? parseInt(process.env.WORKER_CONCURRENCY, 10)
    : 3;

  runner = await run({
    pgPool: pool,
    taskList: tasks as any,
    concurrency,
    pollInterval: 1000,
  });

  const jobStartTimes = new Map<string | number, number>();

  runner.events.on('job:start', ({ job }) => {
    jobStartTimes.set(job.id, Date.now());
    console.log(`[Worker] Starting job ${job.id} (${job.task_identifier})`);
  });

  runner.events.on('job:success', ({ job }) => {
    const startTime = jobStartTimes.get(job.id);
    const duration = startTime ? Date.now() - startTime : 0;
    jobStartTimes.delete(job.id);
    console.log(`[Worker] Completed job ${job.id} in ${duration}ms`);
  });

  runner.events.on('job:error', ({ job, error }) => {
    jobStartTimes.delete(job.id);
    console.error(
      `[Worker] Job ${job.id} failed:`,
      error instanceof Error ? error.message : String(error)
    );
  });

  runner.events.on('pool:listen:success', () => {
    console.log(`[Worker] Listening for jobs (concurrency: ${concurrency})`);
  });

  return runner;
}

export async function stopWorker(): Promise<void> {
  if (!runner) return;
  console.log('[Worker] Stopping...');
  await runner.stop();
  runner = null;
  console.log('[Worker] Stopped');
}
