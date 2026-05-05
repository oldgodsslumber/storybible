import { z } from 'zod';
import { Id, TimestampMs, ViewStateSchema } from './common';

export const CanvasTypeSchema = z.enum(['freeform', 'scene-5-act']);
export type CanvasType = z.infer<typeof CanvasTypeSchema>;

export const CanvasSchema = z.object({
  id: Id,
  projectId: Id,
  name: z.string(),
  type: CanvasTypeSchema,
  viewState: ViewStateSchema,
  createdAt: TimestampMs,
});
export type Canvas = z.infer<typeof CanvasSchema>;
