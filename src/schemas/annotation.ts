import { z } from 'zod';
import { Id, PositionSchema, TimestampMs } from './common';

export const ANNOTATION_KINDS = ['sticky', 'text', 'rect', 'line'] as const;
export const AnnotationKindSchema = z.enum(ANNOTATION_KINDS);
export type AnnotationKind = z.infer<typeof AnnotationKindSchema>;

export const ThicknessSchema = z.union([z.literal(1), z.literal(2), z.literal(4)]);
export type Thickness = z.infer<typeof ThicknessSchema>;

export const SizeSchema = z.object({ w: z.number(), h: z.number() });
export type Size = z.infer<typeof SizeSchema>;

// Single annotation table with optional fields per kind. Validation enforces
// required fields per kind through the discriminated union below.
const AnnotationBase = z.object({
  id: Id,
  projectId: Id,
  canvasId: Id,
  position: PositionSchema,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  rotation: z.number().default(0),
  createdAt: TimestampMs,
});

export const StickyAnnotationSchema = AnnotationBase.extend({
  kind: z.literal('sticky'),
  text: z.string().default(''),
  size: SizeSchema,
});

export const TextAnnotationSchema = AnnotationBase.extend({
  kind: z.literal('text'),
  text: z.string().default(''),
  fontSize: z.number().int().positive().default(20),
});

export const RectAnnotationSchema = AnnotationBase.extend({
  kind: z.literal('rect'),
  size: SizeSchema,
  thickness: ThicknessSchema.default(2),
  filled: z.boolean().default(false),
});

export const LineAnnotationSchema = AnnotationBase.extend({
  kind: z.literal('line'),
  size: SizeSchema,        // bounding box; the line spans width
  thickness: ThicknessSchema.default(2),
});

export const AnnotationSchema = z.discriminatedUnion('kind', [
  StickyAnnotationSchema,
  TextAnnotationSchema,
  RectAnnotationSchema,
  LineAnnotationSchema,
]);
export type Annotation = z.infer<typeof AnnotationSchema>;
export type StickyAnnotation = z.infer<typeof StickyAnnotationSchema>;
export type TextAnnotation = z.infer<typeof TextAnnotationSchema>;
export type RectAnnotation = z.infer<typeof RectAnnotationSchema>;
export type LineAnnotation = z.infer<typeof LineAnnotationSchema>;

export const ANNOTATION_KIND_META: Record<AnnotationKind, { label: string; defaultColor: string }> = {
  sticky: { label: 'Sticky note', defaultColor: '#fde68a' },
  text:   { label: 'Text',        defaultColor: '#e2e8f0' },
  rect:   { label: 'Rectangle',   defaultColor: '#94a3b8' },
  line:   { label: 'Line',        defaultColor: '#94a3b8' },
};
