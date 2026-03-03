import type { JobHelpers } from 'graphile-worker';

export async function exampleJob(
  payload: { message: string },
  helpers: JobHelpers
) {
  helpers.logger.info('Example job running', { message: payload.message });
  return { result: 'ok' };
}
