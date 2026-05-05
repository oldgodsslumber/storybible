import { z } from 'zod';

export const ConnectionTypeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  // Optional connecting words rendered before the label in the card detail
  // panel — e.g. "is the" makes "Peter is the parent of John". Bare label is
  // used when omitted: "John knows Mary".
  prefix: z.string().optional(),
});
export type ConnectionType = z.infer<typeof ConnectionTypeSchema>;

// Hardcoded fallback prefixes for known type ids, applied when the stored
// ConnectionType doesn't have its own `prefix` (e.g. existing projects seeded
// before this field was added).
export const KNOWN_PREFIXES: Record<string, string> = {
  'foil-of':   'is a',
  'parent-of': 'is the',
  'member-of': 'is a',
};

export function connectionPrefix(t: ConnectionType | undefined, fallbackId?: string): string {
  return t?.prefix ?? KNOWN_PREFIXES[fallbackId ?? t?.id ?? ''] ?? '';
}

export const DEFAULT_CONNECTION_TYPES: ConnectionType[] = [
  // people / places / things
  { id: 'lives-in',   label: 'lives in',   color: '#34d399' },
  { id: 'knows',      label: 'knows',      color: '#60a5fa' },
  { id: 'wants',      label: 'wants',      color: '#fbbf24' },
  { id: 'opposes',    label: 'opposes',    color: '#f87171' },
  { id: 'parent-of',  label: 'parent of',  color: '#a78bfa', prefix: 'is the' },
  { id: 'member-of',  label: 'member of',  color: '#22d3ee', prefix: 'is a'   },
  { id: 'appears-in', label: 'appears in', color: '#e879f9' },
  { id: 'owns',       label: 'owns',       color: '#fb923c' },
  { id: 'describes',  label: 'describes',  color: '#94a3b8' },
  { id: 'is',         label: 'is',         color: '#a5b4fc' }, // descriptor link, distinct color
  // narrative grammar
  { id: 'precedes',   label: 'precedes',   color: '#7dd3fc' }, // scene → scene
  { id: 'said-by',    label: 'said by',    color: '#f472b6' }, // dialogue → character
  { id: 'drives',     label: 'drives',     color: '#22d3ee' }, // character/arc → arc
  { id: 'blocks',     label: 'blocks',     color: '#fb7185' }, // obstacle → anything
  { id: 'foil-of',    label: 'foil of',    color: '#facc15', prefix: 'is a' },
];
