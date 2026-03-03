import { exampleJob } from './exampleJob';
import { arenaEvaluateJob } from './arenaEvaluateJob';
import { arenaGenerateConfigJob } from './arenaGenerateConfigJob';
import { arenaCompetitiveStackJob } from './arenaCompetitiveStackJob';

const tasks = {
  'example:hello': exampleJob,
  'arena:evaluate': arenaEvaluateJob,
  'arena:generate-config': arenaGenerateConfigJob,
  'arena:competitive-stack': arenaCompetitiveStackJob,
} as const;

export default tasks;
export type TaskList = typeof tasks;
export type JobType = keyof TaskList;
