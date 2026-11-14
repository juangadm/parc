import { type Piece } from "./shapes.js";
import type { Order, Easing, Pattern, Sequence } from "./types.js";
export interface Cell {
    index: number;
    column: number;
    row: number;
    pieces: Piece[];
}
/** Where a cell sits in a change's order, from 0 to 1, and how many distinct positions there are. */
export declare function orderOf(dir: Order, col: number, row: number, cols: number, rows: number, random: () => number): {
    t: number;
    n: number;
};
export declare function shapeOfChange(t: number, n: number, pattern?: Pattern, steps?: number, peak?: number): number;
export declare function ease(t: number, easing?: Easing): number;
/**
 * The time to draw, in seconds: one for the whole sequence, or worked out for each cell, so part of a field
 * can run ahead of the rest (a spotlight under a pointer, a moment that spreads from one cell).
 */
export type TimeAt = number | ((cell: {
    index: number;
    column: number;
    row: number;
    columns: number;
    rows: number;
}) => number);
/** Work out every cell of a sequence: its place in the layout and its finished pieces. */
export declare function cells(sequence: Sequence, at?: TimeAt): Cell[];
/**
 * Which cell is at a point of the drawing (in the SVG's own units, as toSVG drew it with the same
 * padding). A point anywhere in a cell's cell counts, so a tap needn't land on the ink. Null between cells.
 * `x` and `y` say exactly where, in columns and rows (2.5 is the middle of the third column), so
 * something following a pointer can glide across cells instead of hopping from one to the next.
 */
export declare function cellAt(sequence: Sequence, [x, y]: [number, number], options?: {
    padding?: number;
}): {
    index: number;
    column: number;
    row: number;
    x: number;
    y: number;
} | null;
type DrawOptions = {
    padding?: number;
    time?: TimeAt;
    fit?: "contain" | "cover";
};
/**
 * Draw a sequence as an SVG string. Each cell is a group labelled with its place, data-cell="column,row".
 * `fit`: how the drawing sits in a box of another shape, "contain" (all of it, the default) or "cover" (fill the box).
 */
export declare function toSVG(sequence: Sequence, options?: DrawOptions): string;
/**
 * Draw a sequence into an element, for animation. The first time it builds the SVG; after that it only
 * changes the outlines and colors that moved, so the browser repaints little and playing stays smooth.
 * If the picture's make-up changes (other cells, other shapes), it starts again.
 */
export declare function render(sequence: Sequence, target: Element, options?: DrawOptions): void;
/**
 * Every frame of a sequence as SVG strings, for export (video, a flipbook, a plotter). By default one
 * whole cycle there and back (or round once, for a loop), 30 frames a second.
 */
export declare function frames(sequence: Sequence, options?: {
    seconds?: number;
    fps?: number;
    padding?: number;
}): string[];
export {};
