import { z } from 'zod';

export const ConnectionTypeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;

export const DEFAULT_CONNECTION_TYPES: ConnectionType[] = [
  // people / places / things
  { id: 'lives-in',   label: 'lives in',   color: '#34d399' },
  { id: 'knows',      label: 'knows',      color: '#60a5fa' },
  { id: 'wants',      label: 'wants',      color: '#fbbf24' },
  { id: 'opposes',    label: 'opposes',    color: '#f87171' },
  { id: 'parent-of',  label: 'parent of',  color: '#a78bfa' },
  { id: 'member-of',  label: 'member of',  color: '#22d3ee' },
  { id: 'appears-in', label: 'appears in', color: '#e879f9' },
  { id: 'owns',       label: 'owns',       color: '#fb923c' },
  { id: 'describes',  label: 'describes',  color: '#94a3b8' },
  { id: 'is',         label: 'is',         color: '#cbd5e1' }, // character/location → descriptor
  // narrative grammar
  { id: 'precedes',   label: 'precedes',   color: '#7dd3fc' }, // scene → scene
  { id: 'said-by',    label: 'said by',    color: '#f472b6' }, // dialogue → character
  { id: 'drives',     label: 'drives',     color: '#22d3ee' }, // character/arc → arc
  { id: 'blocks',     label: 'blocks',     color: '#fb7185' }, // obstacle → anything
  { id: 'foil-of',    label: 'foil of',    color: '#facc15' }, // character → character
];
