/** A number in [0, 1) from any list of integers. */
export declare function hash(...parts: number[]): number;
/**
 * Smooth noise in [-1, 1] along a closed loop of `total` steps (for hand-cut edges).
 * It wraps, so the end meets the start without a jump.
 */
export declare function smoothNoise(seed: number, every?: number): (i: number, total: number) => number;
