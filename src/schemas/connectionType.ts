import { z } from 'zod';

export const ConnectionTypeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;

export const DEFAULT_CONNECTION_TYPES: ConnectionType[] = [
  { id: 'lives-in',   label: 'lives in',   color: '#34d399' },
  { id: 'knows',      label: 'knows',      color: '#60a5fa' },
  { id: 'wants',      label: 'wants',      color: '#fbbf24' },
  { id: 'opposes',    label: 'opposes',    color: '#f87171' },
  { id: 'parent-of',  label: 'parent of',  color: '#a78bfa' },
  { id: 'member-of',  label: 'member of',  color: '#22d3ee' },
  { id: 'appears-in', label: 'appears in', color: '#e879f9' },
  { id: 'owns',       label: 'owns',       color: '#fb923c' },
];
