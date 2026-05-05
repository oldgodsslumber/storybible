import type { CardType, ConnectionType } from '@/schemas';

/**
 * Picks a sensible default connection type for a (from-type, to-type) pair.
 * Falls back to the first available type only if no rule matches AND no
 * neutral type is present in the project's ontology.
 *
 * Rules are checked in order — first match wins.
 */
type Rule = {
  from: CardType[] | '*';
  to: CardType[] | '*';
  prefer: string[]; // connection-type ids in priority order
};

const RULES: Rule[] = [
  // Descriptor pairings (checked first so "any → descriptor" beats narrower rules below)
  { from: ['descriptor'],              to: ['descriptor'], prefer: ['foil-of'] },
  { from: '*',                         to: ['descriptor'], prefer: ['is', 'describes'] },
  { from: ['descriptor'],              to: '*',            prefer: ['is', 'describes'] },

  // Appearances in narrative units
  { from: ['character', 'object'],     to: ['scene', 'beat'], prefer: ['appears-in'] },
  { from: ['scene', 'beat'],           to: ['character', 'object'], prefer: ['appears-in'] },

  // Dialogue
  { from: ['dialogue'],                to: ['character'], prefer: ['said-by'] },
  { from: ['dialogue'],                to: ['scene', 'beat'], prefer: ['appears-in'] },

  // Scene order
  { from: ['scene'],                   to: ['scene'], prefer: ['precedes'] },
  { from: ['beat'],                    to: ['beat'], prefer: ['precedes'] },

  // Obstacles
  { from: ['obstacle'],                to: '*',           prefer: ['blocks', 'opposes'] },

  // Arcs
  { from: ['character', 'arc'],        to: ['arc'],       prefer: ['drives'] },

  // People & places
  { from: ['character'],               to: ['location'],  prefer: ['lives-in'] },
  { from: ['character'],               to: ['character'], prefer: ['knows'] },
  { from: ['character'],               to: ['object'],    prefer: ['owns'] },
];

function matches(side: CardType[] | '*', t: CardType): boolean {
  return side === '*' || side.includes(t);
}

export function pickConnectionType(
  fromType: CardType,
  toType: CardType,
  available: ConnectionType[],
): string {
  const ids = new Set(available.map((t) => t.id));
  for (const rule of RULES) {
    if (matches(rule.from, fromType) && matches(rule.to, toType)) {
      const hit = rule.prefer.find((p) => ids.has(p));
      if (hit) return hit;
    }
  }
  // Fall back to a neutral type if available, else the first.
  return (
    available.find((t) => t.id === 'describes')?.id ??
    available[0]?.id ??
    'describes'
  );
}
