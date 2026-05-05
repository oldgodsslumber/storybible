import { z } from 'zod';
import { Id, TimestampMs } from './common';

export const ConnectionSchema = z.object({
  id: Id,
  projectId: Id,
  fromCardId: Id,
  toCardId: Id,
  // Optional React Flow handle ids ('t'|'r'|'b'|'l'). Stored so a user-chosen
  // routing (e.g. dragged endpoint to the bottom of a card) survives reload.
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().default(''),
  type: z.string().min(1),
  // Ghost: render the line dim and hide the type label. Useful for
  // backdrop relationships you want present but not visually loud.
  ghost: z.boolean().optional().default(false),
  createdAt: TimestampMs,
});
export type Connection = z.infer<typeof ConnectionSchema>;
