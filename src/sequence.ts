// From settings to a picture: work out each cell's values, build its pieces, draw.

import { area, roll, rotate, translate, wobble, type Point, type Polygon } from "./geometry.js";
import { hash, smoothNoise } from "./random.js";
import { buildShape, type Piece } from "./shapes.js";
import type { Order, Change, CellPlace, Easing, Pattern, Shape, Sequence, Time } from "./types.js";

const CELL = 100; // drawing units per cell
const PENCIL = "#8a8478";

export interface Cell {
  index: number;
  column: number;
  row: number;
  pieces: Piece[];
}

/** Where a cell sits in a change's order, from 0 to 1, and how many distinct positions there are. */
export function orderOf(dir: Order, col: number, row: number, cols: number, rows: number, random: () => number) {
  const ratio = (v: number, max: number) => (max > 0 ? v / max : 0);
  const midC = (cols - 1) / 2, midR = (rows - 1) / 2;
  if (typeof dir === "object") {
    const [c0, r0] = dir.from;
    const far = Math.max(...[[0, 0], [cols - 1, 0], [0, rows - 1], [cols - 1, rows - 1]].map(([c, r]) => Math.hypot(c - c0, r - r0)));
    return { t: ratio(Math.hypot(col - c0, row - r0), far), n: Math.max(cols, rows) };
  }
  switch (dir) {
    case "left to right": return { t: ratio(col, cols - 1), n: cols };
    case "top to bottom": return { t: ratio(row, rows - 1), n: rows };
    case "diagonally": return { t: ratio(col + row, cols + rows - 2), n: cols + rows - 1 };
    case "diagonally, other way": return { t: ratio(col + (rows - 1 - row), cols + rows - 2), n: cols + rows - 1 };
    case "from center": return { t: ratio(Math.hypot(col - midC, row - midR), Math.hypot(midC, midR)), n: Math.max(cols, rows) };
    case "in rings": return { t: ratio(Math.max(Math.abs(col - midC), Math.abs(row - midR)), Math.max(midC, midR)), n: Math.ceil(Math.max(cols, rows) / 2) };
    case "from middle column": return { t: ratio(Math.abs(col - midC), midC), n: Math.ceil(cols / 2) };
    case "from middle row": return { t: ratio(Math.abs(row - midR), midR), n: Math.ceil(rows / 2) };
    case "checkerboard": return { t: (col + row) % 2, n: 2 };
    case "random": return { t: random(), n: Infinity };
  }
}

export function shapeOfChange(t: number, n: number, pattern: Pattern = "one way", steps = 4, peak = 0.5): number {
  switch (pattern) {
    case "one way": return t;
    case "there and back": return t <= peak ? (peak > 0 ? t / peak : 1) : (1 - t) / (1 - peak);
    // a loop must not repeat its first cell at the end, so the last cell stops one step short
    case "loop": return Number.isFinite(n) && n > 1 ? (t * (n - 1)) / n : t;
    case "steps": return steps > 1 ? Math.min(steps - 1, Math.floor(t * steps)) / (steps - 1) : 0;
  }
}

export function ease(t: number, easing: Easing = "linear"): number {
  if (typeof easing === "function") return easing(t);
  if (Array.isArray(easing)) return bezier(easing, t);
  const power = (p: number, kind: "in" | "out" | "in out") =>
    kind === "in" ? t ** p
    : kind === "out" ? 1 - (1 - t) ** p
    : t < 0.5 ? 2 ** (p - 1) * t ** p : 1 - (-2 * t + 2) ** p / 2;
  switch (easing) {
    case "linear": return t;
    case "ease in": return power(2, "in");
    case "ease out": return power(2, "out");
    case "ease in out": return power(2, "in out");
    case "ease in, strong": return power(3, "in");
    case "ease out, strong": return power(3, "out");
    case "ease in out, strong": return power(3, "in out");
    case "ease in, sine": return 1 - Math.cos((t * Math.PI) / 2);
    case "ease out, sine": return Math.sin((t * Math.PI) / 2);
    case "ease in out, sine": return (1 - Math.cos(t * Math.PI)) / 2;
  }
}

/** A CSS/Figma cubic-bezier: find the curve's point at horizontal position x, return its height. */
function bezier([x1, y1, x2, y2]: [number, number, number, number], x: number): number {
  const at = (a: number, b: number, s: number) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
  let lo = 0, hi = 1, s = x;
  for (let i = 0; i < 40; i++) {
    s = (lo + hi) / 2;
    if (at(x1, x2, s) < x) lo = s; else hi = s;
  }
  return at(y1, y2, s);
}

function valueAt(change: Change, t: number, n: number): number | string {
  // repeat: run the pattern several times across the cells
  const r = change.repeat ?? 1;
  if (r > 1) t = (t * r) % 1;
  const u = shapeOfChange(t, n / r, change.pattern, change.steps, change.peak);
  // the way back has its own easing, read in time order: it starts at the turn and runs to the end
  const back = change.pattern === "there and back" && change.easingBack !== undefined && t > (change.peak ?? 0.5);
  const e = back ? 1 - ease(1 - u, change.easingBack) : ease(u, change.easing);
  // numbers can arrive as text from a form; anything that reads as a number is one
  const num = (v: number | string) => (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)) ? Number(v) : v);
  const from = num(change.from ?? 0), to = num(change.to ?? 0);
  if (typeof from === "number" && typeof to === "number") return from + (to - from) * e;
  return e < 0.5 ? from : to;
}

/** A change's value for one cell: from its own rule if it has one, otherwise from / to / order. */
/**
 * In an entrance, how far one cell has got on its own way in (0 to 1): it sets off a little later the
 * further along it sits, and eases in and out, so nothing starts or stops dead.
 */
function settle(t: number, entering: number): number {
  return ease(Math.max(0, Math.min(1, (entering - t * ENTER_STAGGER) / (1 - ENTER_STAGGER))), "ease in out, sine");
}

function valueFor(change: Change, place: CellPlace, random: () => number, time?: Time, entering?: number): number | string {
  if (change.rule) {
    const v = change.rule(place);
    // a rule's numbers grow in from nothing during an entrance, corner to corner
    if (entering === undefined || typeof v !== "number") return v;
    const order = place.columns + place.rows > 2 ? (place.column + place.row) / (place.columns + place.rows - 2) : 0;
    return v * settle(order, entering);
  }
  const { t, n } = orderOf(change.order ?? "left to right", place.column, place.row, place.columns, place.rows, random);
  // entering: every cell runs from the first moment to its own place in the picture
  if (entering !== undefined) return valueAt(change, t * settle(t, entering), n);
  return valueAt(change, playhead(t, place.time, time), n);
}

/**
 * Where a cell is in a change while playing: its place in the painting, spread by the stagger, plus
 * how far the clock has run. Paused at 0 with the default stagger, this is exactly the painting.
 */
function playhead(t: number, clock: number, time?: Time): number {
  if (!time) return t;
  const p = t * (time.stagger ?? 1) + clock;
  if (p >= 0 && p <= 1) return p;
  if ((time.repeat ?? "reverse") === "loop") return p - Math.ceil(p) + 1;
  const m = ((p % 2) + 2) % 2; // reverse: 0 → 1 → 0
  return m <= 1 ? m : 2 - m;
}

/** The clock, in cycles, at `seconds` into playing, with easing applied within each cycle. */
function clockAt(seconds: number, time?: Time): number {
  if (!time || !seconds) return 0;
  const cycles = seconds / (time.duration ?? 2), whole = Math.floor(cycles);
  return whole + ease(cycles - whole, time.easing);
}

/** How much of the entrance passes before the last cell sets off: 0 all together, near 1 one after another. */
const ENTER_STAGGER = 0.55;

/** During the entrance, how far it has got (0 to 1); after it, the playing clock. */
function timeAt(seconds: number, time?: Time): { clock: number; entering?: number } {
  const enter = time?.enter ?? 0;
  if (enter > 0 && seconds < enter) return { clock: 0, entering: Math.max(0, seconds) / enter };
  return { clock: clockAt(seconds - enter, time) };
}

interface Move { angle: number; x: number; y: number; pivot: Change["pivot"] }

/**
 * The time to draw, in seconds: one for the whole sequence, or worked out for each cell, so part of a field
 * can run ahead of the rest (a spotlight under a pointer, a moment that spreads from one cell).
 */
export type TimeAt = number | ((cell: { index: number; column: number; row: number; columns: number; rows: number }) => number);

/** Work out every cell of a sequence: its place in the layout and its finished pieces. */
export function cells(sequence: Sequence, at: TimeAt = 0): Cell[] {
  const { columns, rows } = size(sequence);
  const seed = sequence.seed ?? 1;
  const changes = sequence.changes ?? [];
  const out: Cell[] = [];

  for (let row = 0, index = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++, index++) {
      const shape: Shape = { ...sequence.shape };
      const whole: Move = { angle: 0, x: 0, y: 0, pivot: "center" };
      const parts = new Map<number, Move>();
      const perPiece: [Change, number][] = [];
      const { clock, entering } = timeAt(typeof at === "function" ? at({ index, column, row, columns, rows }) : at, sequence.time);
      const spot: CellPlace = { index, column, row, columns, rows, x: column - (columns - 1) / 2, y: row - (rows - 1) / 2, time: clock };

      // a group's pieces are copied too, so a change aimed at one piece can alter that piece's own shape
      if (shape.pieces) shape.pieces = shape.pieces.map((p) => ({ ...p, shape: { ...p.shape } }));

      changes.forEach((change, ci) => {
        if (change.perPiece) return perPiece.push([change, ci]);
        const v = valueFor(change, spot, () => hash(seed, index, ci), sequence.time, entering);
        const move = change.piece === undefined ? whole : getMove(parts, change.piece);
        // size, fill, color and the like change the piece's own shape; angle and position move it
        const target = change.piece !== undefined && shape.pieces?.[change.piece] ? shape.pieces[change.piece].shape : shape;
        apply(target, move, change, v, sequence.palette);
      });

      let pieces = buildShape(shape);

      // changes aimed at one piece, or at each piece separately
      pieces = pieces.map((p) => {
        let points = p.points;
        const own = parts.get(p.part);
        if (own) points = translate(rotate(points, own.angle, p.anchor), own.x, own.y);
        for (const [change, ci] of perPiece) {
          const v = Number(valueFor(change, spot, () => hash(seed, index, p.part, ci), sequence.time, entering));
          if (change.property === "drift") {
            const a = hash(seed, p.part, ci, 7) * Math.PI * 2;
            points = translate(points, Math.cos(a) * v, Math.sin(a) * v);
          } else if (change.property === "angle") {
            points = rotate(points, v, p.anchor);
          } else if (change.property === "x" || change.property === "y") {
            points = translate(points, change.property === "x" ? v : 0, change.property === "y" ? v : 0);
          }
        }
        return { ...p, points };
      });

      // set the shape against an edge or corner of its cell, then the whole shape turns and moves
      let polys: Polygon[] = alignIn(pieces.map((p) => p.points), shape);
      if (whole.pivot === "roll") polys = roll(polys, whole.angle);
      else {
        const about: Point = Array.isArray(whole.pivot) ? whole.pivot : [0, 0];
        polys = polys.map((p) => rotate(p, whole.angle, about));
      }
      polys = polys.map((p) => translate(p, whole.x, whole.y));

      if (sequence.wobble) {
        polys = polys.map((p, k) => wobble(p, sequence.wobble!, smoothNoise(Math.floor(hash(seed, index, k) * 1e9), 16)));
      }

      out.push({ index, column, row, pieces: pieces.map((p, k) => ({ ...p, points: polys[k] })) });
    }
  }
  return out;
}

/** Slide all pieces together so the shape's outline touches the chosen edge or corner of the cell. */
function alignIn(polys: Polygon[], shape: Shape): Polygon[] {
  const where = shape.align ?? "center";
  if (where === "center" || !polys.length) return polys;
  const pts = polys.flat(), edge = 0.5 - (shape.inset ?? 0);
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const dx = where.includes("left") ? -edge - Math.min(...xs) : where.includes("right") ? edge - Math.max(...xs) : 0;
  const dy = where.includes("top") ? -edge - Math.min(...ys) : where.includes("bottom") ? edge - Math.max(...ys) : 0;
  return polys.map((p) => translate(p, dx, dy));
}

function getMove(parts: Map<number, Move>, part: number): Move {
  if (!parts.has(part)) parts.set(part, { angle: 0, x: 0, y: 0, pivot: "center" });
  return parts.get(part)!;
}

function apply(shape: Shape, move: Move, change: Change, v: number | string, palette?: string[]) {
  switch (change.property) {
    case "angle":
      move.angle += Number(v);
      if (change.pivot) move.pivot = change.pivot;
      break;
    case "x": move.x += Number(v); break;
    case "y": move.y += Number(v); break;
    case "width": shape.width = Number(v); break;
    case "height": shape.height = Number(v); break;
    case "size": shape.width = shape.height = Number(v); break;
    case "amount": shape.amount = Number(v); break;
    case "spread": shape.spread = Number(v); break;
    case "gap": shape.gap = Number(v); break;
    case "split": shape.split = Number(v); break;
    case "mirror": shape.mirror = Boolean(Number(v)); break;
    case "shape": shape.kind = v as Shape["kind"]; break;
    case "color":
      if (palette?.length) {
        const i = Math.max(0, Math.min(palette.length - 1, Math.round(Number(v))));
        shape.color = palette[i];
      }
      break;
    case "drift": break; // only meaningful per piece
  }
}

function size(sequence: Sequence) {
  const l = sequence.layout;
  if (l.columnSizes || l.rowSizes) return { columns: l.columnSizes?.length ?? 1, rows: l.rowSizes?.length ?? 1 };
  // counts can arrive as text from a form; read them as whole numbers, at least one
  const n = (v: unknown, fallback: number) => Math.max(1, Math.round(Number(v ?? fallback)) || fallback);
  return l.kind === "row" || l.kind === "ring" ? { columns: n(l.count, l.kind === "ring" ? 12 : 7), rows: 1 } : { columns: n(l.columns, 9), rows: n(l.rows ?? l.columns, 9) };
}

/** Each column's width and each row's height in drawing units: equal, or from the layout's own sizes. */
function tracks(sizes: number[] | undefined, n: number): number[] {
  if (!sizes?.length) return Array(n).fill(CELL);
  const mean = sizes.reduce((a, b) => a + b, 0) / sizes.length;
  return sizes.map((v) => (CELL * v) / mean);
}

/** A cell's box in the drawing: its top-left corner and size in drawing units, and how far it's turned. */
interface Box { x: number; y: number; w: number; h: number; turn: number }

/** Where every cell sits in the drawing, in drawing units. */
function frame(sequence: Sequence, padding?: number) {
  const { columns, rows } = size(sequence);
  const gap = (sequence.layout.gap ?? 0) * CELL;
  const pad = padding ?? CELL * (sequence.layout.margin ?? 0.25);
  if (sequence.layout.kind === "ring") {
    // one cell apart around the circle (never tighter than a circle one cell across)
    const R = Math.max(CELL, (columns * (CELL + gap)) / (2 * Math.PI)), side = 2 * R + CELL + 2 * pad, mid = side / 2;
    const cell = (c: number): Box => {
      const a = -Math.PI / 2 + (c * 2 * Math.PI) / columns;
      return { x: mid + R * Math.cos(a) - CELL / 2, y: mid + R * Math.sin(a) - CELL / 2, w: CELL, h: CELL, turn: sequence.layout.facing ? (a * 180) / Math.PI + 90 : 0 };
    };
    return { columns, rows, width: side, height: side, cell: (c: number, _r?: number) => cell(c), grid: undefined };
  }
  const colW = tracks(sequence.layout.columnSizes, columns), rowH = tracks(sequence.layout.rowSizes, rows).map((h) => h * (sequence.layout.aspect ?? 1));
  const colX = colW.map((_, c) => pad + colW.slice(0, c).reduce((a, b) => a + b, 0) + c * gap);
  const rowY = rowH.map((_, r) => pad + rowH.slice(0, r).reduce((a, b) => a + b, 0) + r * gap);
  const width = pad * 2 + colW.reduce((a, b) => a + b, 0) + (columns - 1) * gap;
  const height = pad * 2 + rowH.reduce((a, b) => a + b, 0) + (rows - 1) * gap;
  return { columns, rows, width, height, cell: (c: number, r: number): Box => ({ x: colX[c], y: rowY[r], w: colW[c], h: rowH[r], turn: 0 }), grid: { colX, rowY, colW, rowH } };
}

/**
 * Which cell is at a point of the drawing (in the SVG's own units, as toSVG drew it with the same
 * padding). A point anywhere in a cell's cell counts, so a tap needn't land on the ink. Null between cells.
 * `x` and `y` say exactly where, in columns and rows (2.5 is the middle of the third column), so
 * something following a pointer can glide across cells instead of hopping from one to the next.
 */
export function cellAt(sequence: Sequence, [x, y]: [number, number], options: { padding?: number } = {}) {
  const g = frame(sequence, options.padding);
  if (!g.grid) {
    // a ring: the nearest cell, if the point is inside its cell
    let best = -1, dist = Infinity;
    for (let c = 0; c < g.columns; c++) {
      const k = g.cell(c, 0), d = Math.hypot(x - k.x - k.w / 2, y - k.y - k.h / 2);
      if (d < dist) { best = c; dist = d; }
    }
    return dist <= CELL / 2 ? { index: best, column: best, row: 0, x: best, y: 0 } : null;
  }
  const { colX, rowY, colW, rowH } = g.grid;
  const column = colX.findIndex((x0, c) => x >= x0 && x <= x0 + colW[c]);
  const row = rowY.findIndex((y0, r) => y >= y0 && y <= y0 + rowH[r]);
  if (column < 0 || row < 0) return null;
  return { index: row * g.columns + column, column, row, x: column + (x - colX[column]) / colW[column] - 0.5, y: row + (y - rowY[row]) / rowH[row] - 0.5 };
}

interface Mark { d: string; color: string; line: number } // line: 0 for a solid fill, otherwise the outline's width
interface Drawing { viewBox: string; fit: string; back: string; cells: { key: string; marks: Mark[] }[] }
type DrawOptions = { padding?: number; time?: TimeAt; fit?: "contain" | "cover" };

/**
 * Everything a picture is made of, before it becomes text or elements. A layer is drawn by the same
 * code, then scaled (`k`) and slid (`dx`, `dy`) to sit centered in the sequence below it.
 */
function drawing(sequence: Sequence, options: DrawOptions, k = 1, dx = 0, dy = 0, prefix = ""): Drawing {
  const g = frame(sequence, options.padding);
  const X = (v: number) => f(dx + v * k), Y = (v: number) => f(dy + v * k);
  const box = (c: Box) => `M${X(c.x)} ${Y(c.y)}h${f(c.w * k)}v${f(c.h * k)}h${f(-c.w * k)}Z`;
  const everyCell = () => {
    const out: string[] = [];
    for (let row = 0; row < g.rows; row++) for (let col = 0; col < g.columns; col++) out.push(box(g.cell(col, row)));
    return out.join("");
  };
  let back = prefix ? "" : `<rect width="${f(g.width)}" height="${f(g.height)}" fill="${sequence.background ?? "#f3eee2"}"/>`;
  if (sequence.layout.cellBackground) back += `<path d="${everyCell()}" fill="${sequence.layout.cellBackground}"/>`;
  if (sequence.layout.gridLines) back += `<path d="${everyCell()}" fill="none" stroke="${PENCIL}" stroke-width="0.6" opacity="0.6"/>`;

  const out = cells(sequence, options.time ?? 0).map((cell) => {
    // shapes are drawn in a 1 × 1 cell and stretched to fit cells of other sizes
    const c = g.cell(cell.column, cell.row);
    const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
    const marks: Mark[] = [];
    for (const piece of cell.pieces) {
      if (piece.points.length < 2) continue;
      const pts = c.turn ? rotate(piece.points, c.turn) : piece.points;
      const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
      if (Math.max(...xs) - Math.min(...xs) < 1e-9 && Math.max(...ys) - Math.min(...ys) < 1e-9) continue; // nothing to draw
      const d = "M" + pts.map(([x, y]) => `${X(cx + x * c.w)} ${Y(cy + y * c.h)}`).join("L") + "Z";
      // drawn as outlines when asked; a shape squashed to nothing still shows, as a line
      const lineWidth = sequence.stroke ? Math.max(0.1, sequence.stroke * CELL) : area(piece.points) < 1e-4 ? 1.4 : 0;
      marks.push({ d, color: piece.color, line: lineWidth * (lineWidth && sequence.stroke ? k : 1) });
    }
    return { key: `${prefix}${cell.column},${cell.row}`, marks };
  });

  // layers: each fitted inside this drawing, centered, on the same clock
  (sequence.layers ?? []).forEach((layer, i) => {
    const lg = frame(layer, options.padding);
    const lk = Math.min(g.width / lg.width, g.height / lg.height);
    const sub = drawing({ ...layer, time: layer.time ?? sequence.time, stroke: layer.stroke ?? sequence.stroke }, options,
      k * lk, dx + k * (g.width - lg.width * lk) / 2, dy + k * (g.height - lg.height * lk) / 2, `${prefix}${i + 1}:`);
    back += sub.back;
    out.push(...sub.cells);
  });
  return { viewBox: `0 0 ${f(g.width)} ${f(g.height)}`, fit: options.fit === "cover" ? "xMidYMid slice" : "", back, cells: out };
}

const markSVG = (m: Mark) =>
  m.line ? `<path d="${m.d}" fill="none" stroke="${m.color}" stroke-width="${f(m.line)}" stroke-linecap="round" stroke-linejoin="round"/>` : `<path d="${m.d}" fill="${m.color}"/>`;

/**
 * Draw a sequence as an SVG string. Each cell is a group labelled with its place, data-cell="column,row".
 * `fit`: how the drawing sits in a box of another shape, "contain" (all of it, the default) or "cover" (fill the box).
 */
export function toSVG(sequence: Sequence, options: DrawOptions = {}): string {
  const dr = drawing(sequence, options);
  const body = dr.cells.map((c) => `<g data-cell="${c.key}">${c.marks.map(markSVG).join("")}</g>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${dr.viewBox}"${dr.fit ? ` preserveAspectRatio="${dr.fit}"` : ""}>${dr.back}${body}</svg>`;
}

const drawn = new WeakMap<Element, string>(); // the outline of what render last drew into each element

/**
 * Draw a sequence into an element, for animation. The first time it builds the SVG; after that it only
 * changes the outlines and colors that moved, so the browser repaints little and playing stays smooth.
 * If the picture's make-up changes (other cells, other shapes), it starts again.
 */
export function render(sequence: Sequence, target: Element, options: DrawOptions = {}): void {
  const dr = drawing(sequence, options);
  const outline = [dr.viewBox, dr.fit, dr.back, ...dr.cells.map((c) => c.key + c.marks.map((m) => (m.line ? `l${f(m.line)}` : "f")).join(","))].join("|");
  const svg = target.firstElementChild;
  if (!svg || drawn.get(target) !== outline) {
    target.innerHTML = toSVG(sequence, options);
    drawn.set(target, outline);
    return;
  }
  const groups = svg.querySelectorAll(":scope > g");
  dr.cells.forEach((c, i) => {
    const paths = groups[i].children;
    c.marks.forEach((m, j) => {
      const p = paths[j];
      if (p.getAttribute("d") !== m.d) p.setAttribute("d", m.d);
      const colorAttr = m.line ? "stroke" : "fill";
      if (p.getAttribute(colorAttr) !== m.color) p.setAttribute(colorAttr, m.color);
    });
  });
}

/**
 * Every frame of a sequence as SVG strings, for export (video, a flipbook, a plotter). By default one
 * whole cycle there and back (or round once, for a loop), 30 frames a second.
 */
export function frames(sequence: Sequence, options: { seconds?: number; fps?: number; padding?: number } = {}): string[] {
  const t = sequence.time ?? {};
  const seconds = options.seconds ?? (t.enter ?? 0) + (t.duration ?? 2) * (t.repeat === "loop" ? 1 : 2);
  const fps = options.fps ?? 30, n = Math.max(1, Math.round(seconds * fps));
  return Array.from({ length: n }, (_, i) => toSVG(sequence, { time: i / fps, padding: options.padding }));
}

const f = (n: number) => String(Math.round(n * 100) / 100);
