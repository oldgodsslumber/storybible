import { z } from 'zod';
import { Id, TimestampMs } from './common';

export const CardVersionSourceSchema = z.enum(['user', 'llm-rewrite', 'llm-expand']);
export type CardVersionSource = z.infer<typeof CardVersionSourceSchema>;

export const CardVersionSchema = z.object({
  id: Id,
  cardId: Id,
  projectId: Id,
  body: z.string(),
  createdAt: TimestampMs,
  source: CardVersionSourceSchema,
});
export type CardVersion = z.infer<typeof CardVersionSchema>;
