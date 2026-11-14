import type { Point } from "./geometry.js";
export type ShapeKind = "square" | "rectangle" | "bar" | "circle" | "dot" | "diamond" | "triangle" | "pie" | "cut-circle" | "split-square" | "split-circle" | "filled-square" | "cross" | "segments" | "count" | "group" | "cluster" | "outline" | "polygon" | "ring" | "crescent";
/** One small shape. Sizes are shares of the cell (1 = the whole cell). */
export interface Shape {
    kind: ShapeKind;
    width?: number;
    height?: number;
    color?: string;
    colors?: string[];
    /** how much of the shape: what that means depends on the kind (see ShapeKind) */
    amount?: number;
    /** outline: the corners of your own shape, in cells around its center, at width 1 (width and height scale it) */
    points?: Point[];
    /** polygon: how many sides (default 6) */
    sides?: number;
    /**
     * cut any shape in two colors: where the cut falls, as the share of the shape below it
     * (0.5 is halfway). The top takes the first color, the bottom the second
     */
    split?: number;
    /** split shapes: a strip of background between the two colors */
    gap?: number;
    /** flip the shape left to right (a count then starts its snake from the right) */
    mirror?: boolean;
    count?: number;
    spread?: number;
    /**
     * group: the pieces and where they sit. `around` is the point a piece turns around
     * (default: its own center); put it beside the piece and turning makes the piece circle it.
     */
    pieces?: {
        shape: Shape;
        x?: number;
        y?: number;
        around?: Point;
    }[];
    /** cluster: what each piece is, and how they're arranged */
    piece?: Shape;
    arrangement?: "scatter" | "ring" | "grid";
    seed?: number;
    /** where the shape sits in its cell, before any change moves it (default: center) */
    align?: Align;
    /** with `align`: the space kept from the cell's edges, as a share of the cell */
    inset?: number;
}
export type Align = "center" | "top" | "bottom" | "left" | "right" | "top left" | "top right" | "bottom left" | "bottom right";
export interface Layout {
    /** ring: the cells sit around a circle, in order, one cell apart */
    kind: "row" | "grid" | "ring";
    count?: number;
    /** ring: turn each cell to face out from the center, like spokes */
    facing?: boolean;
    columns?: number;
    rows?: number;
    gap?: number;
    /** draw a thin line around every cell */
    gridLines?: boolean;
    /** fill every cell with this color, on the sequence's background */
    cellBackground?: string;
    /** each cell's height as a share of its width: 3 makes tall cells, 0.5 wide ones (default 1, square). Shapes stretch with it */
    aspect?: number;
    /** background left around the cells, in cells (default 0.25) */
    margin?: number;
    /**
     * uneven grids: the relative width of each column and height of each row (any units; the average
     * becomes one cell). Shapes stretch to fill their cell. Sets the number of columns and rows.
     */
    columnSizes?: number[];
    rowSizes?: number[];
}
/** The order the cells go through a change. */
export type Order = "left to right" | "top to bottom" | "diagonally" | "diagonally, other way" | "from center" | "in rings" | "from middle column" | "from middle row" | "checkerboard" | "random"
/** out from one cell, in circles: { from: [column, row] }, e.g. the cell someone tapped */
 | {
    from: [number, number];
};
export type Pattern = "one way" | "there and back" | "loop" | "steps";
/**
 * How a change is spaced out. The named curves are gentle (squared); "strong" ones are cubed;
 * "sine" ones follow a turning motion, so a width eased "in, sine" and a height eased "out, sine"
 * are a shape turning in depth (Metamorphosis of a Line).
 * Four numbers are a cubic-bezier, exactly as in Figma or CSS: [x1, y1, x2, y2].
 */
export type Easing = "linear" | "ease in" | "ease out" | "ease in out" | "ease in, strong" | "ease out, strong" | "ease in out, strong" | "ease in, sine" | "ease out, sine" | "ease in out, sine" | [number, number, number, number] | ((t: number) => number);
export type Property = "angle" | "x" | "y" | "width" | "height" | "size" | "amount" | "spread" | "split" | "gap" | "mirror" | "color" | "shape" | "drift";
export interface Change {
    property: Property;
    /** with `rule`, from and to aren't needed */
    from?: number | string;
    to?: number | string;
    /**
     * Write your own rule: the value for each cell, worked out from where it sits.
     * Used instead of from / to / order / pattern / easing when a change needs a formula,
     * e.g. Translational Rotation's turn, 18° × u × v − 45°.
     */
    rule?: (cell: CellPlace) => number | string;
    order?: Order;
    pattern?: Pattern;
    steps?: number;
    /** how many times the pattern runs across the cells (default 1) */
    repeat?: number;
    /** "there and back": where along the cells it turns back, from 0 to 1 (default 0.5, halfway) */
    peak?: number;
    /**
     * "there and back": a different easing for the way back, read in time order from the peak to
     * the end (default: the way there, mirrored)
     */
    easingBack?: Easing;
    easing?: Easing;
    /** for angle: what it turns around. "roll" tips it over its bottom corner. */
    pivot?: "center" | "roll" | Point;
    /** only this piece of a group (0, 1, 2) */
    piece?: number;
    /** cluster or group: change each piece separately, instead of the whole shape */
    perPiece?: boolean;
}
/** Where a cell sits, for rules: its number and its column and row (all counted from 0). */
export interface CellPlace {
    index: number;
    column: number;
    row: number;
    columns: number;
    rows: number;
    /** column and row counted from the middle of the layout, so formulas can be centered: 0, 0 is the middle */
    x: number;
    y: number;
    /** how far the animation has run, in cycles (0 when paused at the start); rules may use it */
    time: number;
}
/**
 * Time: a row of cells is a paused animation. Playing adds the same amount to every cell's
 * place in each change, so the pattern travels through the cells. At time 0 it is the still picture.
 */
export interface Time {
    /** seconds for one cycle (default 2) */
    duration?: number;
    /**
     * how far apart neighbouring cells run: 1 is exactly as painted (each cell a moment further along
     * than the one before), 0 moves every cell together, 2 doubles the gap (default 1)
     */
    stagger?: number;
    /** after one cycle, start again ("loop") or come back ("reverse", the default) */
    repeat?: "loop" | "reverse";
    /** easing over time: how the clock speeds up and slows down within each cycle */
    easing?: Easing;
    /**
     * seconds for an entrance before the picture: every cell starts at the first moment and runs to
     * its own place, so the still picture is built in front of you, step by step. Playing time
     * starts after it: at `enter` seconds you see the still picture (default 0, no entrance)
     */
    enter?: number;
}
export interface Sequence {
    title?: string;
    shape: Shape;
    layout: Layout;
    palette?: string[];
    changes?: Change[];
    /** a slight hand-made wobble on every edge (0.5 is gentle); `seed` picks which wobble */
    wobble?: number;
    /**
     * more sequences drawn over this one, on the same background and the same clock, each fitted to this
     * sequence's size: one grid turning over another, Le Parc's overlays
     */
    layers?: Sequence[];
    /** draw every shape as an outline of this width instead of a solid fill, in cells (0.02 is a fiftieth of a cell) */
    stroke?: number;
    time?: Time;
    background?: string;
    seed?: number;
}
