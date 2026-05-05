import { z } from 'zod';

export const TimestampMs = z.number().int().nonnegative();

export const Id = z.string().min(1);

export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type Position = z.infer<typeof PositionSchema>;

export const ViewStateSchema = z.object({
  pan: z.object({ x: z.number(), y: z.number() }).default({ x: 0, y: 0 }),
  zoom: z.number().positive().default(1),
});
export type ViewState = z.infer<typeof ViewStateSchema>;
