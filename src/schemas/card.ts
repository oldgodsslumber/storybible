import { z } from 'zod';
import { Id, TimestampMs } from './common';

export const CARD_TYPES = [
  'character',
  'object',
  'location',
  'scene',
  'dialogue',
  'history',
  'arc',
  'theme',
  'obstacle',
  'descriptor',
  'beat',
] as const;

export const CardTypeSchema = z.enum(CARD_TYPES);
export type CardType = z.infer<typeof CardTypeSchema>;

export const CARD_TYPE_META: Record<
  CardType,
  { label: string; color: string; description: string }
> = {
  character:  { label: 'Character',  color: '#fbbf24', description: 'A person in the story.' },
  object:     { label: 'Object',     color: '#a78bfa', description: 'A significant item, prop, or artifact.' },
  location:   { label: 'Location',   color: '#34d399', description: 'A place, setting, or region.' },
  scene:      { label: 'Scene',      color: '#60a5fa', description: 'A narrative beat with short and long descriptions.' },
  dialogue:   { label: 'Dialogue',   color: '#f472b6', description: 'A memorable line or exchange.' },
  history:    { label: 'History',    color: '#fb923c', description: 'A past event or backstory anchor.' },
  arc:        { label: 'Arc',        color: '#22d3ee', description: 'A character or plot trajectory.' },
  theme:      { label: 'Theme',      color: '#e879f9', description: 'An abstract idea the work is about.' },
  obstacle:   { label: 'Obstacle',   color: '#f87171', description: 'A conflict, problem, or antagonistic force.' },
  descriptor: { label: 'Descriptor', color: '#94a3b8', description: 'A sensory detail, fragment, or tone note.' },
  beat:       { label: 'Beat',       color: '#86efac', description: 'A sub-scene moment.' },
};

export const CustomFieldsSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));
export type CustomFields = z.infer<typeof CustomFieldsSchema>;

export const CardSchema = z.object({
  id: Id,
  projectId: Id,
  type: CardTypeSchema,
  title: z.string().default(''),
  body: z.string().default(''),
  customFields: CustomFieldsSchema.default({}),
  tags: z.array(z.string()).default([]),
  alwaysIncludeInRag: z.boolean().default(false),
  createdAt: TimestampMs,
  updatedAt: TimestampMs,
});
export type Card = z.infer<typeof CardSchema>;

export const CardCreateInputSchema = CardSchema.pick({
  type: true,
  title: true,
  body: true,
}).partial({ title: true, body: true });
export type CardCreateInput = z.infer<typeof CardCreateInputSchema>;
