// Repeatable randomness: the same seed always gives the same picture.

/** A number in [0, 1) from any list of integers. */
export function hash(...parts: number[]): number {
  let h = 0x9e3779b9;
  for (const p of parts) {
    h = Math.imul(h ^ (p | 0), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 4294967296;
}

/**
 * Smooth noise in [-1, 1] along a closed loop of `total` steps (for hand-cut edges).
 * It wraps, so the end meets the start without a jump.
 */
export function smoothNoise(seed: number, every = 6): (i: number, total: number) => number {
  return (i, total) => {
    const knots = Math.max(1, Math.round(total / every));
    const pos = (i / total) * knots;
    const k = Math.floor(pos), t = pos - k;
    const a = hash(seed, k % knots) * 2 - 1, b = hash(seed, (k + 1) % knots) * 2 - 1;
    const s = t * t * (3 - 2 * t);
    return a + (b - a) * s;
  };
}
