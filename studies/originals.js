// The palettes, the settings panel's finish, and the eight original sequences.

// ---- palettes. "Page" uses the page's own colors, so studies follow light and dark mode (as heerich does) ----
export const FOURTEEN = ["#2b2b58", "#452854", "#771b4f", "#c93543", "#ee7b52", "#fabb73", "#fbd886", "#fdeb92", "#ede78f", "#aed191", "#64ac8d", "#3a8486", "#215f88", "#0249b5"];
export const PALETTES = {
  "Page": { background: "var(--bg)", ink: "var(--text)", accent: "var(--red)", second: "var(--blue)" },
  "Ink and red": { background: "var(--bg)", ink: "var(--text)", accent: "var(--red)", second: "var(--text)" },
  "Blue and yellow": { background: "var(--bg)", ink: "var(--blue)", accent: "var(--yellow)", second: "var(--text)" },
  "Fourteen colors": { background: "var(--bg)", ink: "#2b2b58", accent: "#c93543", second: "#0249b5" },
};

// density scales the number of cells; a grid drawn from its own column sizes keeps them
export const denser = (layout, d) => {
  if (d === 1 || layout.columnSizes) return layout;
  const n = (v) => Math.max(1, Math.round(v * d));
  return layout.kind === "row" || layout.kind === "ring" ? { ...layout, count: n(layout.count ?? 7) } : { ...layout, columns: n(layout.columns ?? 9), rows: n(layout.rows ?? layout.columns ?? 9) };
};
export const finish = (sequence, s) => ({
  ...sequence, background: s.colors.background,
  layout: { ...denser(sequence.layout, s.density), gridLines: sequence.layout.gridLines || s.gridLines,
    ...(s.cards && !sequence.layout.cellBackground ? { cellBackground: "var(--code-bg)", gap: sequence.layout.gap ?? 0.06 } : {}) },
  time: s.time, wobble: sequence.wobble ?? (s.wobble || undefined),
  stroke: s.stroke || undefined,
  layers: sequence.layers?.map((l) => ({ ...l, layout: denser(l.layout, s.density) })),
});

// ---- sequences: original pictures, one capability each ----
export const SEQUENCES = [
  { title: "Tumble", shows: "placing and rolling", strip: true, sequence: (c) => ({ shape: { kind: "bar", width: 0.28, height: 0.62, align: "bottom left" },
    layout: { kind: "row", count: 15, margin: 0.4 }, palette: [c.ink, c.accent],
    changes: [{ property: "angle", from: 0, to: 90, pivot: "roll", pattern: "loop", easing: "ease in out, strong" }, { property: "color", from: 0, to: 1, order: "checkerboard" }] }) },
  { title: "Breath", shows: "counting, on cards", sequence: (c) => ({ shape: { kind: "count", color: c.ink, width: 0.84, count: 4 },
    layout: { kind: "grid", columns: 9, rows: 9, margin: 0.3, gap: 0.08, cellBackground: "var(--code-bg)", gridLines: true },
    changes: [{ property: "amount", from: 0, to: 1, order: "from center", pattern: "there and back", easing: "ease in out, sine" }] }) },
  { title: "Fourteen", shows: "color", sequence: () => ({ shape: { kind: "circle", width: 0.8 }, layout: { kind: "grid", columns: 13, rows: 13, margin: 0.3 }, palette: FOURTEEN,
    changes: [{ property: "color", from: 0, to: 13, order: "in rings", pattern: "loop", steps: 14 }, { property: "size", from: 0.45, to: 1, order: "from center", pattern: "there and back" }] }) },
  { title: "Orbits", shows: "rules that move", sequence: (c) => ({ shape: { kind: "group", pieces: [{ shape: { kind: "dot", color: c.ink, width: 0.44 }, x: 0.24, around: [0, 0] }, { shape: { kind: "dot", color: c.accent, width: 0.12 } }] },
    layout: { kind: "grid", columns: 8, rows: 8, margin: 0.3 }, changes: [{ property: "angle", perPiece: true, rule: ({ x, y, time }) => 24 * x * y + 360 * time }] }) },
  { title: "Shards", shows: "pieces", sequence: (c) => ({ shape: { kind: "segments", colors: [c.ink, c.accent, c.ink], width: 0.8, count: 3 },
    layout: { kind: "grid", columns: 9, rows: 9, margin: 0.3 },
    changes: [{ property: "spread", from: 0, to: 0.18, order: "from center", pattern: "there and back" }, { property: "angle", from: 0, to: 120, order: "diagonally" }] }) },
  { title: "Interference", shows: "layers", sequence: (c) => ({ shape: { kind: "ring", color: c.ink, width: 0.9, amount: 0.14 }, layout: { kind: "grid", columns: 16, rows: 16, margin: 0 }, changes: [],
    layers: [{ shape: { kind: "ring", color: c.accent, width: 0.9, amount: 0.14 }, layout: { kind: "grid", columns: 17, rows: 17, margin: 0 },
      changes: [{ property: "size", from: 0.7, to: 1.15, order: "from center", pattern: "there and back" }] }] }) },
  { title: "Wheel", shows: "a ring", sequence: (c) => ({ shape: { kind: "split-square", colors: [c.ink, c.accent], width: 0.62 }, layout: { kind: "ring", count: 30, facing: true, margin: 0.4 },
    changes: [{ property: "angle", from: 0, to: 360, pattern: "loop" }, { property: "amount", from: 0.15, to: 0.85, pattern: "there and back", repeat: 2 }] }) },
  { title: "Horizon", shows: "splits and easing", strip: true, sequence: (c) => ({ shape: { kind: "circle", colors: [c.ink, c.accent], width: 0.82, split: 0.5, gap: 0.05 },
    layout: { kind: "grid", columns: 18, rows: 4, margin: 0.3 },
    changes: [{ property: "split", from: 0.05, to: 0.95, order: "left to right", pattern: "there and back", easing: "ease in out, sine" }] }) },
];
