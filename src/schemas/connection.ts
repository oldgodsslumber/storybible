import { z } from 'zod';
import { Id, TimestampMs } from './common';

export const ConnectionSchema = z.object({
  id: Id,
  projectId: Id,
  fromCardId: Id,
  toCardId: Id,
  label: z.string().default(''),
  type: z.string().min(1),
  createdAt: TimestampMs,
});
export type Connection = z.infer<typeof ConnectionSchema>;
