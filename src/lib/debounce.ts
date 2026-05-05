export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  ms: number,
): (...args: Args) => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// Per-key debounce: each key has its own timer.
export function keyedDebounce<Args extends unknown[]>(
  fn: (key: string, ...args: Args) => void,
  ms: number,
): (key: string, ...args: Args) => void {
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  return (key: string, ...args: Args) => {
    const prev = timers.get(key);
    if (prev) clearTimeout(prev);
    const t = setTimeout(() => {
      timers.delete(key);
      fn(key, ...args);
    }, ms);
    timers.set(key, t);
  };
}
