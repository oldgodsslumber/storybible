import { z } from 'zod';
import { Id, PositionSchema, TimestampMs } from './common';

export const CardPlacementSchema = z.object({
  id: Id,
  projectId: Id,
  cardId: Id,
  canvasId: Id,
  position: PositionSchema,
  createdAt: TimestampMs,
});
export type CardPlacement = z.infer<typeof CardPlacementSchema>;
