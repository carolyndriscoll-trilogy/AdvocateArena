import { quickAddJob, type TaskSpec } from 'graphile-worker';
import { pool } from '../db';
import tasks, { type JobType } from '../jobs/tasks';

type JobOptions = TaskSpec;

function buildQueueMethods(name: string, payload: unknown, baseOptions: JobOptions) {
  return {
    queue: async (): Promise<string> => {
      const job = await quickAddJob(
        { pgPool: pool },
        name,
        payload,
        Object.keys(baseOptions).length > 0 ? baseOptions : undefined
      );
      return job.id;
    },

    scheduleFor: async (runAt: Date): Promise<string> => {
      const job = await quickAddJob(
        { pgPool: pool },
        name,
        payload,
        { ...baseOptions, runAt }
      );
      return job.id;
    },

    queueWith: async (options: {
      priority?: number;
      queueName?: string;
    }): Promise<string> => {
      const job = await quickAddJob(
        { pgPool: pool },
        name,
        payload,
        { ...baseOptions, ...options }
      );
      return job.id;
    },
  };
}

export function withJob<TJobType extends JobType>(name: TJobType) {
  const task = tasks[name];
  type PayloadType = Parameters<typeof task>[0];

  return {
    forPayload: (payload: PayloadType) => {
      return {
        ...buildQueueMethods(name as string, payload, {}),

        withOptions: (options: JobOptions) => {
          return buildQueueMethods(name as string, payload, options);
        },
      };
    },
  };
}
