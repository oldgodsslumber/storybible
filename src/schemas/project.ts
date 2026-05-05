import { z } from 'zod';
import { Id, TimestampMs } from './common';
import { ConnectionTypeSchema } from './connectionType';

export const ProjectSchema = z.object({
  id: Id,
  name: z.string().min(1),
  ownerId: Id,
  authorVoiceProfile: z.string().default(''),
  summaryText: z.string().default(''),
  summaryDirty: z.boolean().default(true),
  connectionTypes: z.array(ConnectionTypeSchema),
  createdAt: TimestampMs,
  updatedAt: TimestampMs,
});
export type Project = z.infer<typeof ProjectSchema>;
