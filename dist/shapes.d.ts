import { type Point, type Polygon } from "./geometry.js";
import type { Shape } from "./types.js";
export interface Piece {
    points: Polygon;
    color: string;
    /** which piece this is (for changes that target one piece) */
    part: number;
    /** what the piece turns around on its own */
    anchor: Point;
}
export declare function buildShape(shape: Shape): Piece[];
