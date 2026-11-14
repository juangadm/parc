// Turn a shape's settings into colored polygons, centered on (0, 0) in cell units.

import { arc, clipY, diamond, ellipse, pie, rect, translate, type Point, type Polygon } from "./geometry.js";

const TAU = Math.PI * 2;
import { hash } from "./random.js";
import type { Shape } from "./types.js";

export interface Piece {
  points: Polygon;
  color: string;
  /** which piece this is (for changes that target one piece) */
  part: number;
  /** what the piece turns around on its own */
  anchor: Point;
}

const INK = "#141414";

export function buildShape(shape: Shape): Piece[] {
  let pieces = baseShape(shape);
  if (shape.split !== undefined && !shape.kind.startsWith("split-")) pieces = splitInTwo(pieces, shape);
  // mirror: flip left to right, pieces and the points they turn around
  return shape.mirror ? pieces.map((p) => ({ ...p, points: p.points.map(([x, y]) => [-x, y] as Point), anchor: [-p.anchor[0], p.anchor[1]] as Point })) : pieces;
}

/**
 * Cut every piece in two along a level line, `split` of the way up from its bottom, with `gap` of background
 * between. The top half takes the first color and the bottom half the second, as in a split square.
 */
function splitInTwo(pieces: Piece[], shape: Shape): Piece[] {
  const cs = shape.colors ?? [shape.color ?? INK];
  const at = Math.max(0, Math.min(1, shape.split ?? 0.5)), g = (shape.gap ?? 0) / 2;
  return pieces.flatMap((p, i) => {
    const ys = p.points.map((q) => q[1]), top = Math.min(...ys), bottom = Math.max(...ys);
    const line = bottom - (bottom - top) * at;
    return [
      { ...p, points: clipY(p.points, line - g, "above"), color: cs[0], part: i * 2 },
      { ...p, points: clipY(p.points, line + g, "below"), color: cs[1] ?? cs[0], part: i * 2 + 1 },
    ].filter((q) => q.points.length > 2);
  });
}

function baseShape(shape: Shape): Piece[] {
  const c = shape.color ?? shape.colors?.[0] ?? INK;
  const cs = shape.colors ?? [c];
  const one = (points: Polygon, color = c): Piece[] => [{ points, color, part: 0, anchor: [0, 0] }];

  switch (shape.kind) {
    case "square": {
      const s = shape.width ?? 0.5;
      return one(rect(s, shape.height ?? s));
    }
    case "rectangle":
      return one(rect(shape.width ?? 0.5, shape.height ?? 0.3));
    case "bar":
      return one(rect(shape.width ?? 0.12, shape.height ?? 0.45));
    case "circle": {
      const s = shape.width ?? 0.5;
      return one(ellipse(s, shape.height ?? s));
    }
    case "dot": {
      const s = shape.width ?? 0.07;
      return one(ellipse(s, shape.height ?? s));
    }
    case "diamond":
      return one(diamond(shape.width ?? 0.5, shape.height ?? 0.5));
    case "pie":
      return one(pie((shape.width ?? 0.6) / 2, shape.amount ?? 0.25));
    case "cut-circle": {
      const r = (shape.width ?? 0.6) / 2;
      return one(clipY(ellipse(2 * r, 2 * r), -r + 2 * r * (shape.amount ?? 0.85), "above"));
    }
    case "split-square":
    case "split-circle": {
      const w = shape.width ?? 0.5, h = shape.height ?? w;
      const whole = shape.kind === "split-square" ? rect(w, h) : ellipse(w, h);
      // `gap` leaves a strip of background between the two colors, inside the same outline
      const line = h / 2 - h * (shape.amount ?? 0.5), g = (shape.gap ?? 0) / 2;
      const halves: Piece[] = [
        { points: clipY(whole, line - g, "above"), color: cs[0], part: 0, anchor: [0, 0] },
        { points: clipY(whole, line + g, "below"), color: cs[1] ?? INK, part: 1, anchor: [0, 0] },
      ];
      return halves.filter((p) => p.points.length > 2);
    }
    case "filled-square": {
      const w = shape.width ?? 0.9, h = shape.height ?? w, f = shape.amount ?? 0.5;
      return f > 0 ? one(rect(w, h * f, 0, h / 2 - (h * f) / 2)) : [];
    }
    case "count": {
      // the amount, counted in small squares: up the first column, down the next, and so on.
      // Drawn as one outline (the full columns as a block, the part-filled column joined on),
      // so there are no seams between columns.
      const w = shape.width ?? 1, k = shape.count ?? 4, s = w / k;
      const n = Math.round((shape.amount ?? 0) * k * k), full = Math.floor(n / k), m = n % k;
      if (n === 0) return [];
      const L = -w / 2, T = -w / 2, B = w / 2, X1 = L + full * s, X2 = X1 + s;
      let outline: Polygon;
      if (m === 0) outline = [[L, T], [X1, T], [X1, B], [L, B]];
      else if (full === 0) outline = [[L, B - m * s], [X2, B - m * s], [X2, B], [L, B]];
      else if (full % 2 === 0) outline = [[L, T], [X1, T], [X1, B - m * s], [X2, B - m * s], [X2, B], [L, B]]; // next column grows up from the floor
      else outline = [[L, T], [X2, T], [X2, T + m * s], [X1, T + m * s], [X1, B], [L, B]]; // next column grows down from the top
      return one(outline);
    }
    case "cross": {
      const len = shape.width ?? 0.6, thick = shape.height ?? 0.08;
      return [
        { points: rect(len, thick), color: cs[0], part: 0, anchor: [0, 0] },
        { points: rect(thick, len), color: cs[1] ?? INK, part: 1, anchor: [0, 0] },
      ];
    }
    case "segments": {
      const n = shape.count ?? 3, r = (shape.width ?? 0.55) / 2, spread = shape.spread ?? 0;
      // each piece turns on its own around its true center (the area centroid of a circle segment)
      const half = Math.PI / n, toCenter = (4 * r * Math.sin(half) ** 3) / (3 * (2 * half - Math.sin(2 * half)));
      return Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / n, b = a + (2 * Math.PI) / n, mid = (a + b) / 2;
        const out: Point = [Math.cos(mid) * spread, Math.sin(mid) * spread];
        const center: Point = [Math.cos(mid) * toCenter + out[0], Math.sin(mid) * toCenter + out[1]];
        return { points: translate(arc(r, a, b), out[0], out[1]), color: cs[i % cs.length], part: i, anchor: center };
      });
    }
    case "group":
      return (shape.pieces ?? []).flatMap((p, i) =>
        buildShape(p.shape).map((piece) => ({
          ...piece,
          points: translate(piece.points, p.x ?? 0, p.y ?? 0),
          part: i,
          anchor: p.around ?? ([p.x ?? 0, p.y ?? 0] as Point),
        })),
      );
    case "outline": {
      const sx = shape.width ?? 1, sy = shape.height ?? sx;
      return one((shape.points ?? []).map(([x, y]) => [x * sx, y * sy] as Point));
    }
    case "triangle": {
      const w = shape.width ?? 0.6, h = shape.height ?? (w * Math.sqrt(3)) / 2;
      return one([[0, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]]);
    }
    case "polygon": {
      const n = Math.max(3, Math.round(shape.sides ?? 6)), r = (shape.width ?? 0.6) / 2;
      return one(Array.from({ length: n }, (_, i) => [r * Math.cos(-Math.PI / 2 + (i * TAU) / n), r * Math.sin(-Math.PI / 2 + (i * TAU) / n)] as Point));
    }
    case "ring": {
      // drawn as one outline: round the outside, across, and back round the inside the other way, which leaves the hole
      const r = (shape.width ?? 0.6) / 2, band = Math.max(0, Math.min(1, shape.amount ?? 0.3));
      if (band >= 1) return one(ellipse(2 * r, 2 * r));
      return band > 0 ? one([...arc(r, -Math.PI / 2, -Math.PI / 2 + TAU), ...arc(r * (1 - band), -Math.PI / 2 + TAU, -Math.PI / 2)]) : [];
    }
    case "crescent": {
      // the disc minus the same disc slid sideways: full when it's slid all the way off, nothing when it isn't slid
      const r = (shape.width ?? 0.6) / 2, full = Math.max(0, Math.min(1, shape.amount ?? 0.5));
      if (full >= 1) return one(ellipse(2 * r, 2 * r));
      const a = Math.acos(full), d = 2 * r * full;
      return full > 0 ? one([...arc(r, a, TAU - a), ...arc(r, Math.PI + a, Math.PI - a, d, 0)].map(([x, y]) => [x - d / 2, y] as Point)) : [];
    }
    case "cluster":
      return clusterSpots(shape).flatMap(([x, y], i) =>
        buildShape({ kind: "dot", ...shape.piece, color: cs[i % cs.length] }).map((piece) => ({
          ...piece,
          points: translate(piece.points, x, y),
          part: i,
          anchor: [x, y] as Point,
        })),
      );
  }
}

function clusterSpots(shape: Shape): Point[] {
  const n = shape.count ?? 12, r = (shape.width ?? 0.7) / 2, seed = shape.seed ?? 1;
  switch (shape.arrangement ?? "scatter") {
    case "ring":
      return Array.from({ length: n }, (_, i) => {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        return [Math.cos(a) * r, Math.sin(a) * r];
      });
    case "grid": {
      const side = Math.ceil(Math.sqrt(n));
      return Array.from({ length: n }, (_, i) => [
        side > 1 ? -r + (2 * r * (i % side)) / (side - 1) : 0,
        side > 1 ? -r + (2 * r * Math.floor(i / side)) / (side - 1) : 0,
      ]);
    }
    case "scatter":
      // repeatable random spots over a square area
      return Array.from({ length: n }, (_, i) => [(hash(seed, i, 1) * 2 - 1) * r, (hash(seed, i, 2) * 2 - 1) * r]);
  }
}
