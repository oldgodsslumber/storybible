import { useEffect, type RefObject } from 'react';

/**
 * Calls `onAway` when a pointerdown occurs outside the referenced element.
 * Uses the capture phase so React Flow (and other libs that stopPropagation
 * on bubble) can't swallow the event before we see it.
 */
export function useClickAway(
  ref: RefObject<HTMLElement | null>,
  onAway: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: Event) {
      const el = ref.current;
      if (!el) return;
      const target = e.target;
      if (target instanceof Node && el.contains(target)) return;
      onAway();
    }
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, [ref, onAway, enabled]);
}
