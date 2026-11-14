export type Point = [number, number];
export type Polygon = Point[];
export declare function rect(width: number, height: number, cx?: number, cy?: number): Polygon;
export declare function diamond(width: number, height: number): Polygon;
/** Points along a circle from angle a to b (radians, 0 = right, clockwise on screen). */
export declare function arc(radius: number, a: number, b: number, cx?: number, cy?: number): Polygon;
export declare function ellipse(width: number, height: number): Polygon;
/** A pie slice: `amount` of a full circle, starting at 12 o'clock. */
export declare function pie(radius: number, amount: number): Polygon;
/** Keep the part of a polygon above (keep = "above") or below a horizontal line y = k. */
export declare function clipY(poly: Polygon, k: number, keep: "above" | "below"): Polygon;
export declare function rotate(poly: Polygon, degrees: number, about?: Point): Polygon;
export declare function translate(poly: Polygon, dx: number, dy: number): Polygon;
export declare function area(poly: Polygon): number;
/**
 * Tip a shape (all its pieces together) over its bottom-right corner, like a box
 * rolling to the right. Every 90° it lands on a new side and the next corner
 * becomes the pivot.
 */
export declare function roll(polys: Polygon[], degrees: number): Polygon[];
/** Rough up the edges by a repeatable amount, like a hand-cut shape. */
export declare function wobble(poly: Polygon, amount: number, noise: (i: number, total: number) => number): Polygon;
