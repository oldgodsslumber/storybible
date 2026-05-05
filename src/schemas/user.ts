import { z } from 'zod';
import { Id, TimestampMs } from './common';

export const UserSchema = z.object({
  id: Id,
  email: z.string().email(),
  displayName: z.string(),
  createdAt: TimestampMs,
});
export type User = z.infer<typeof UserSchema>;
