import test from "node:test";
import assert from "node:assert/strict";
import { toSVG, cells, cellAt, ease, play, frames } from "../dist/index.js";
import { learning } from "../studies/learning.js";

test("same settings, same picture", () => {
  // settings can hold a rule (a small function), so draw the same settings twice rather than cloning them
  for (const { sequence } of learning) assert.equal(toSVG(sequence), toSVG(sequence));
});

test("every learning work draws something in every copy", () => {
  for (const { title, sequence: study } of learning) {
    const all = cells(study);
    assert.ok(all.length > 0, title);
    // Quantitative Sequences has empty squares by design (amount 0)
    if (title !== "Quantitative Sequences") for (const c of all) assert.ok(c.pieces.length > 0, `${title} copy ${c.index}`);
  }
});

test("a shape squashed flat still shows, as a line", () => {
  const svg = toSVG({ shape: { kind: "diamond", height: 0 }, layout: { kind: "row", count: 1 } });
  assert.match(svg, /stroke="#141414"/);
});

test("a gap leaves paper between the two colors, inside the same outline", () => {
  const study = (gap) => ({ shape: { kind: "split-square", width: 0.4, amount: 0.5, gap }, layout: { kind: "row", count: 1 } });
  const [top, bottom] = cells(study(0.04))[0].pieces;
  const topEdge = Math.max(...top.points.map((p) => p[1]));
  const bottomEdge = Math.min(...bottom.points.map((p) => p[1]));
  assert.ok(Math.abs(bottomEdge - topEdge - 0.04) < 1e-9, "the strip is exactly the gap");
  const ys = [...top.points, ...bottom.points].map((p) => p[1]);
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 0.4) < 1e-9, "the outline keeps its size");
});

test("gap can change from copy to copy", () => {
  const study = { shape: { kind: "split-square", width: 0.4, amount: 0.5 }, layout: { kind: "row", count: 2 }, changes: [{ property: "gap", from: 0, to: 0.1 }] };
  const strip = (c) => Math.min(...c.pieces[1].points.map((p) => p[1])) - Math.max(...c.pieces[0].points.map((p) => p[1]));
  const [a, b] = cells(study);
  assert.ok(Math.abs(strip(a)) < 1e-9 && Math.abs(strip(b) - 0.1) < 1e-9);
});

test("easing: gentle and strong curves, and Figma/CSS cubic-beziers", () => {
  const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-3, `${msg}: ${a} vs ${b}`);
  near(ease(0.5, "ease in"), 0.25, "ease in is squared");
  near(ease(0.5, "ease in, strong"), 0.125, "strong ease in is cubed");
  near(ease(0.5, "ease in out"), 0.5, "ease in out is symmetric");
  near(ease(0.3, [0, 0, 1, 1]), 0.3, "a straight bezier is linear");
  near(ease(0.5, [0.42, 0, 1, 1]), 0.3153, "CSS ease-in");
  for (const e of ["ease in", "ease out", "ease in out", [0.25, 0.1, 0.25, 1]]) {
    near(ease(0, e), 0, `${e} starts at 0`);
    near(ease(1, e), 1, `${e} ends at 1`);
  }
});

test("pieces of a group follow their own paths", () => {
  const work = learning.find((w) => w.title.startsWith("Seven Sequences"));
  const [first, , , , , , last] = cells(work.sequence);
  const centre = (p) => p.points.reduce((s, q) => [s[0] + q[0] / p.points.length, s[1] + q[1] / p.points.length], [0, 0]);
  const [blue0, red0] = first.pieces.map(centre), [blue6, red6] = last.pieces.map(centre);
  assert.ok(blue0[0] < 0 && blue0[1] < 0 && blue6[0] > 0 && blue6[1] > 0, "blue: top-left to bottom-right");
  assert.ok(red0[0] < 0 && red0[1] > 0 && red6[0] > 0 && red6[1] < 0, "red: bottom-left to top-right");
});

test("place sets a shape against an edge or corner of its cell", () => {
  const box = (place, inset) => {
    const pts = cells({ shape: { kind: "bar", width: 0.2, height: 0.4, align: place, inset }, layout: { kind: "row", count: 1 } })[0].pieces[0].points;
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  };
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const bl = box("bottom left", 0.05);
  assert.ok(near(bl.left, -0.45) && near(bl.bottom, 0.45), "bottom left, kept 0.05 from the edges");
  const tr = box("top right");
  assert.ok(near(tr.right, 0.5) && near(tr.top, -0.5), "top right, touching the edges");
  const top = box("top");
  assert.ok(near(top.left, -0.1) && near(top.top, -0.5), "top: centred across, touching the top");
});

test("Progression: half a roll carries the bar from the bottom-left corner into the bottom-right", () => {
  const work = learning.find((w) => w.title === "Progression");
  const all = cells(work.sequence);
  const box = (c) => {
    const pts = c.pieces[0].points, xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.max(...ys) };
  };
  const first = box(all[0]), last = box(all[all.length - 1]);
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(near(first.left, -0.5) && near(first.bottom, 0.5), "starts nestled bottom-left");
  assert.ok(near(last.right, 0.5) && near(last.bottom, 0.5), "ends nestled bottom-right");
  for (const c of all) assert.ok(near(box(c).bottom, 0.5), `copy ${c.index + 1} stays on the floor`);
});

test("cells can be cards mounted on a board", () => {
  const svg = toSVG({ shape: { kind: "dot" }, layout: { kind: "row", count: 3, gap: 0.1, cellBackground: "#e7dac5" }, background: "#b3b3af" });
  assert.match(svg, /<rect[^>]*fill="#b3b3af"/, "the board is the paper");
  const cards = svg.match(/<path d="([^"]*)" fill="#e7dac5"/);
  assert.ok(cards && cards[1].split("Z").filter(Boolean).length === 3, "one card per cell");
});

test("a piece can circle a point beside it (Nine Sequences)", () => {
  // a dot 0.1 to the right of its mark, turned a quarter turn clockwise, ends 0.1 below the mark
  const study = {
    shape: { kind: "group", pieces: [{ shape: { kind: "dot", width: 0.05 }, x: 0.1, y: 0, around: [0, 0] }] },
    layout: { kind: "row", count: 2 },
    changes: [{ property: "angle", from: 0, to: 90, perPiece: true }],
  };
  const pts = cells(study)[1].pieces[0].points;
  const c = pts.reduce((a, q) => [a[0] + q[0] / pts.length, a[1] + q[1] / pts.length], [0, 0]);
  assert.ok(Math.abs(c[0]) < 1e-9 && Math.abs(c[1] - 0.1) < 1e-9, `centre ${c}`);

  const work = learning.find((w) => w.title.startsWith("Nine Sequences"));
  const all = cells(work.sequence);
  assert.deepEqual(all[8].pieces.map((p) => p.points.map((q) => q.map((v) => v.toFixed(9)))),
    all[0].pieces.map((p) => p.points.map((q) => q.map((v) => v.toFixed(9)))), "after a full circle the ninth cell repeats the first");
});

test("there and back: turn at any point, with its own easing on the way back", () => {
  // the width of a bar along a row of 11, so copy k sits at t = k / 10
  const widths = (change) => cells({ shape: { kind: "bar" }, layout: { kind: "row", count: 11 }, changes: [{ property: "width", ...change }] })
    .map((c) => { const xs = c.pieces[0].points.map((p) => p[0]); return Math.max(...xs) - Math.min(...xs); });
  const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} vs ${b}`);
  const w = widths({ from: 0, to: 1, pattern: "there and back", peak: 0.6 });
  near(w[6], 1, "peaks at 60%");
  near(w[3], 0.5, "halfway up at 30%");
  near(w[8], 0.5, "halfway down at 80%");
  const b = widths({ from: 0, to: 1, pattern: "there and back", easingBack: "ease out" });
  near(b[4], 0.8, "the way there stays linear");
  // way back, 2/5 of the way from the turn: ease out gives 1 - (1 - 0.4)^2 = 0.64 of the return done
  near(b[7], 1 - 0.64, "the way back eases out, in time order");
});

test("sine easings: width in, height out, is a line turning in depth (Metamorphosis)", () => {
  const work = learning.find((w) => w.title.startsWith("Metamorphosis"));
  const all = cells(work.sequence);
  const size = (c) => { const P = c.pieces[0].points, xs = P.map((p) => p[0]), ys = P.map((p) => p[1]); return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]; };
  all.forEach((c, k) => {
    const [w, h] = size(c), theta = (k * 9 * Math.PI) / 180;
    assert.ok(Math.abs(w - 0.82 * Math.cos(theta)) < 1e-9 && Math.abs(h - 0.82 * Math.sin(theta)) < 1e-9, `copy ${k + 1}`);
  });
  const [w5, h5] = size(all[5]);
  assert.ok(Math.abs(w5 - h5) < 1e-9 && Math.abs(w5 - 0.82 * Math.SQRT1_2) < 1e-9, "the middle copy is a square on its point, 0.71 of the line");
});

test("write your own rule: a value worked out from each copy's column and row", () => {
  const study = {
    shape: { kind: "bar" },
    layout: { kind: "grid", columns: 3, rows: 2 },
    changes: [{ property: "width", rule: ({ column, row }) => 0.1 * (column + 1) * (row + 1) }],
  };
  const widths = cells(study).map((c) => { const xs = c.pieces[0].points.map((p) => p[0]); return Math.max(...xs) - Math.min(...xs); });
  [0.1, 0.2, 0.3, 0.2, 0.4, 0.6].forEach((want, i) => assert.ok(Math.abs(widths[i] - want) < 1e-9, `copy ${i}: ${widths[i]}`));
});

test("a piece can have its own size, not just its own turn (Mutation of Forms)", () => {
  const study = {
    shape: { kind: "group", pieces: [{ shape: { kind: "bar", width: 0.1 } }, { shape: { kind: "bar", width: 0.1 } }] },
    layout: { kind: "row", count: 2 },
    changes: [{ property: "width", piece: 1, from: 0.1, to: 0.3 }],
  };
  const w = (p) => { const xs = p.points.map((q) => q[0]); return Math.max(...xs) - Math.min(...xs); };
  const [a, b] = cells(study);
  assert.ok(Math.abs(w(b.pieces[0]) - 0.1) < 1e-9, "the other piece is untouched");
  assert.ok(Math.abs(w(b.pieces[1]) - 0.3) < 1e-9, "the targeted piece grew");
  assert.ok(Math.abs(w(a.pieces[1]) - 0.1) < 1e-9, "and copies don't leak changes into each other");
  assert.equal(study.shape.pieces[1].shape.width, 0.1, "the settings themselves are never altered");
});

test("counted amount: small squares inked in snake order, from the left or mirrored", () => {
  const inked = (fill, mirror) => {
    const [c] = cells({ shape: { kind: "count", width: 1, count: 4, amount: fill, mirror }, layout: { kind: "row", count: 1 } });
    // is a point inside a piece's outline (which can be L-shaped)?
    const inside = (P, x, y) => { let k = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) k = !k; } return k; };
    const out = [];
    for (let q = 0; q < 4; q++) for (let r = 0; r < 4; r++) {
      const x = -0.5 + (q + 0.5) / 4, y = -0.5 + (r + 0.5) / 4;
      if (c.pieces.some((p) => inside(p.points, x, y))) out.push(`${q}${r}`);
    }
    assert.ok(c.pieces.length <= 1, "drawn as one outline, so no seams between columns");
    return out.sort().join(" ");
  };
  // 6 of 16: the whole first column (bottom up), then the top two of the second (top down)
  assert.equal(inked(6 / 16, false), "00 01 02 03 10 11");
  assert.equal(inked(6 / 16, true), "20 21 30 31 32 33");
  assert.equal(inked(0, false), "");
  assert.equal(inked(1, false).split(" ").length, 16);
});

test("uneven grids: columns and rows of their own sizes, shapes stretched to fit (Tribute)", () => {
  const svg = toSVG({ shape: { kind: "square", width: 1 }, layout: { kind: "grid", columnSizes: [1, 3], rowSizes: [2, 2], margin: 0 }, background: "#fff" });
  // average column is one cell (100 units): widths 50 and 150; rows 100 and 100
  assert.match(svg, /viewBox="0 0 200 200"/);
  const squares = [...svg.matchAll(/<path d="M([\d.]+) ([\d.]+)L([\d.]+) [\d.]+L[\d.]+ ([\d.]+)/g)].map((m) => m.slice(1).map(Number));
  assert.deepEqual(squares.map(([x0, y0, x1, y1]) => [x1 - x0, y1 - y0]), [[50, 100], [150, 100], [50, 100], [150, 100]]);
});

test("a loop doesn't repeat its first copy at the end", () => {
  const study = { shape: { kind: "bar" }, layout: { kind: "row", count: 4 }, changes: [{ property: "angle", from: 0, to: 360, pattern: "loop" }] };
  const [first, , , last] = cells(study);
  assert.notDeepEqual(first.pieces[0].points, last.pieces[0].points);
});

test("rolling 90° lays a standing bar flat, one bar-height to the right", () => {
  const study = { shape: { kind: "bar", width: 0.1, height: 0.4 }, layout: { kind: "row", count: 2 }, changes: [{ property: "angle", from: 0, to: 90, pivot: "roll" }] };
  const pts = cells(study)[1].pieces[0].points;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  assert.ok(Math.abs(Math.max(...xs) - Math.min(...xs) - 0.4) < 1e-9, "now 0.4 wide");
  assert.ok(Math.abs(Math.max(...ys) - 0.2) < 1e-9, "still resting on the same floor");
  assert.ok(Math.abs(Math.min(...xs) - 0.05) < 1e-9, "tipped over its right corner");
});

test("time: paused at the start, every work is exactly its still picture", () => {
  for (const { title, sequence: study } of learning) {
    const timed = { ...study, time: study.time ?? { duration: 2 } };
    assert.equal(toSVG(timed, { time: 0 }), toSVG({ ...study, time: undefined }), title);
  }
});

test("time: playing moves the pattern through the copies (Metamorphosis)", () => {
  const work = learning.find((w) => w.title.startsWith("Metamorphosis"));
  const size = (c) => { const P = c.pieces[0].points, xs = P.map((p) => p[0]); return Math.max(...xs) - Math.min(...xs); };
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  // a tenth of a cycle later, copy 0 looks exactly like copy 1 did in the painting
  const still = cells(work.sequence), later = cells(work.sequence, 0.1 * work.sequence.time.duration);
  for (let k = 0; k < 9; k++) assert.ok(near(size(later[k]), size(still[k + 1])), `copy ${k}`);
  // bounce: the last copy, already at the end, comes back the way it went
  assert.ok(near(size(later[10]), size(still[9])), "the last copy turns back");
});

test("time: delay 0 moves every copy together; a single box plays the whole animation", () => {
  const base = { shape: { kind: "bar" }, layout: { kind: "row", count: 5 }, changes: [{ property: "angle", from: 0, to: 90 }] };
  const angle = (c) => { const P = c.pieces[0].points; return (Math.atan2(P[1][1] - P[0][1], P[1][0] - P[0][0]) * 180) / Math.PI; };
  const together = cells({ ...base, time: { duration: 1, stagger: 0 } }, 0.25).map(angle);
  assert.ok(together.every((a) => Math.abs(a - together[0]) < 1e-9) && Math.abs(together[0] - 22.5) < 1e-9);
  const one = { ...base, layout: { kind: "row", count: 1 }, time: { duration: 1 } };
  assert.deepEqual([0, 0.5, 1, 1.5].map((s) => Math.round(angle(cells(one, s)[0]))), [0, 45, 90, 45], "up and back");
});

test("numbers that arrive as text (from a form) draw exactly like numbers", () => {
  const asNumbers = { shape: { kind: "square" }, layout: { kind: "row", count: 7 }, changes: [{ property: "angle", from: 0, to: 90 }] };
  const asText = { shape: { kind: "square" }, layout: { kind: "row", count: "7" }, changes: [{ property: "angle", from: "0", to: "90" }] };
  const svg = toSVG(asText);
  assert.equal(svg, toSVG(asNumbers));
  assert.ok(!svg.includes("NaN"), "no broken coordinates");
  assert.equal(cells({ ...asText, layout: { kind: "grid", columns: "3", rows: "2" } }).length, 6);
});

// ---- entrance, labels, taps and playing ----

const turning = (time) => ({ shape: { kind: "square", width: 0.5 }, layout: { kind: "row", count: 5 }, changes: [{ property: "angle", from: 0, to: 90 }], time });
const points = (study, at) => cells(study, at).map((c) => c.pieces[0].points.map(([x, y]) => [x.toFixed(6), y.toFixed(6)].join()).join(" "));

test("an entrance starts with every copy the same and ends on the still picture", () => {
  const study = turning({ enter: 2 });
  const start = points(study, 0);
  assert.ok(start.every((p) => p === start[0]), "at 0 s every copy is at the first moment");
  assert.deepEqual(points(study, 2), points(turning(), 0), "when the entrance ends, the still picture");
  const mid = points(study, 1);
  assert.equal(mid[0], points(turning(), 0)[0], "the first copy is already in place");
  assert.notEqual(mid[4], points(turning(), 0)[4], "the last is still on its way");
});

test("after an entrance, playing time picks up from the still picture", () => {
  assert.deepEqual(points(turning({ enter: 2, duration: 3 }), 3.5), points(turning({ duration: 3 }), 1.5));
});

test("every copy is labelled with its column and row", () => {
  const svg = toSVG({ shape: { kind: "square" }, layout: { kind: "grid", columns: 3, rows: 2 } });
  assert.equal(svg.match(/<g data-cell=/g).length, 6);
  assert.match(svg, /<g data-cell="2,1">/);
});

test("cellAt finds the copy under a point, and nothing between cells", () => {
  const study = { shape: { kind: "square" }, layout: { kind: "grid", columns: 4, rows: 3, gap: 0.2 } };
  // cells are 100 units, 20 apart, inside a padding of 25
  assert.deepEqual(cellAt(study, [25 + 2 * 120 + 50, 25 + 1 * 120 + 50]), { index: 6, column: 2, row: 1, x: 2, y: 1 });
  const corner = cellAt(study, [25 + 2 * 120 + 75, 25 + 1 * 120 + 25]);
  assert.ok(Math.abs(corner.x - 2.25) < 1e-9 && Math.abs(corner.y - 0.75) < 1e-9, "x and y say exactly where, in columns and rows");
  assert.equal(cellAt(study, [25 + 110, 75]), null, "the gap between two cells");
  assert.equal(cellAt(study, [5, 5]), null, "the margin");
  assert.deepEqual(cellAt(study, [50, 50], { padding: 0 }), { index: 0, column: 0, row: 0, x: 0, y: 0 });
});

test("a change can run out from any copy", () => {
  const study = { shape: { kind: "square" }, layout: { kind: "grid", columns: 5, rows: 5 }, changes: [{ property: "size", from: 0.1, to: 0.9, order: { from: [1, 3] } }] };
  const width = (c) => Math.max(...c.pieces[0].points.map((p) => p[0])) * 2;
  const all = cells(study);
  assert.ok(Math.abs(width(all[3 * 5 + 1]) - 0.1) < 1e-9, "the chosen copy is the start");
  assert.ok(Math.abs(width(all[4]) - 0.9) < 1e-9, "the farthest corner is the end");
});

test("play draws frames into an element and stops on the last one", async () => {
  const el = { innerHTML: "" };
  let ended = false;
  play(turning({ enter: 0.1 }), el, { until: 0.1, onEnd: () => (ended = true) });
  assert.ok(el.innerHTML.startsWith("<svg"), "the first frame is drawn at once");
  await new Promise((r) => setTimeout(r, 300));
  assert.ok(ended);
  assert.equal(el.innerHTML, toSVG(turning({ enter: 0.1 }), { time: 0.1 }), "it stops on the still picture");
});

test("the moment can differ from copy to copy", () => {
  const study = turning({ duration: 2 });
  assert.deepEqual(points(study, () => 0.7), points(study, 0.7), "the same moment everywhere is just that moment");
  const mixed = points(study, ({ column }) => (column === 3 ? 0.7 : 0));
  assert.equal(mixed[3], points(study, 0.7)[3], "the copy given its own moment shows it");
  assert.deepEqual(mixed.filter((_, i) => i !== 3), points(study, 0).filter((_, i) => i !== 3), "the rest stay still");
});

test("in an entrance every copy eases into align: no copy stops dead", () => {
  const study = turning({ enter: 2 });
  const angleOf = (at, i) => { const [a, b] = cells(study, at)[i].pieces[0].points; return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  for (const i of [1, 2, 3, 4]) {
    // speed just before arriving is far below the speed in the middle of the journey
    const speeds = [];
    for (let s = 0; s < 2; s += 0.02) speeds.push(Math.abs(angleOf(s + 0.02, i) - angleOf(s, i)));
    const top = Math.max(...speeds), arrive = speeds.findLastIndex((v) => v > 1e-12);
    assert.ok(speeds[arrive] < top * 0.15, `copy ${i} slows down before it stops`);
  }
});

test("line draws every shape as an outline of the given width", () => {
  const base = { shape: { kind: "split-square", width: 0.6 }, layout: { kind: "row", count: 3 }, changes: [{ property: "angle", from: 0, to: 90 }] };
  const solid = toSVG(base), lines = toSVG({ ...base, stroke: 0.02 });
  assert.equal(lines.match(/<path /g).length, solid.match(/<path /g).length, "the same shapes");
  assert.equal((lines.match(/stroke-width="2"/g) ?? []).length, 6, "every piece outlined, 2 units wide (a fiftieth of a 100-unit cell)");
  assert.doesNotMatch(lines.replace(/<rect[^>]*>/, ""), /fill="#/, "nothing filled");
  const d = (svg) => [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(d(lines), d(solid), "outlines follow exactly the same edges");
});

// ---- range: rules that move, your own shape, more shapes, layers, ring, frames ----

const areaOf = (pts) => Math.abs(pts.reduce((s, [x, y], i) => { const [x2, y2] = pts[(i + 1) % pts.length]; return s + x * y2 - x2 * y; }, 0)) / 2;

test("rules move with the clock and grow in during an entrance", () => {
  const rule = { property: "angle", rule: ({ column, row, time }) => 10 * (column + row) + 90 * time };
  const study = (time) => ({ shape: { kind: "bar" }, layout: { kind: "grid", columns: 3, rows: 3 }, changes: [rule], time });
  assert.notDeepEqual(points(study({ duration: 2 }), 0.5), points(study({ duration: 2 }), 0), "the moment moves a rule");
  const start = points(study({ enter: 2 }), 0);
  assert.ok(start.every((p) => p === start[0]), "at the start of an entrance every copy is at nothing");
  assert.deepEqual(points(study({ enter: 2 }), 2), points(study({}), 0), "and it ends on the still picture");
});

test("your own shape: any outline, scaled by width and height", () => {
  const tri = [[0, -0.5], [0.5, 0.5], [-0.5, 0.5]];
  const [a] = cells({ shape: { kind: "outline", points: tri }, layout: { kind: "row", count: 1 } })[0].pieces;
  assert.deepEqual(a.points, tri);
  const [b] = cells({ shape: { kind: "outline", points: tri, width: 0.5 }, layout: { kind: "row", count: 1 }, changes: [{ property: "angle", from: 90, to: 90 }] })[0].pieces;
  assert.ok(Math.abs(areaOf(b.points) - areaOf(tri) / 4) < 1e-9, "half the width, a quarter of the area, and it still turns");
});

test("polygon, ring and crescent have the areas their settings say", () => {
  const one = (shape) => cells({ shape, layout: { kind: "row", count: 1 } })[0].pieces;
  const hex = one({ kind: "polygon", sides: 6, width: 0.6 })[0].points;
  assert.equal(hex.length, 6);
  assert.ok(Math.abs(areaOf(hex) - (3 * Math.sqrt(3) / 2) * 0.3 ** 2) < 1e-9);
  const ring = one({ kind: "ring", width: 0.6, amount: 0.5 })[0].points, circle = (r) => Math.PI * r * r;
  assert.ok(Math.abs(areaOf(ring) - (circle(0.3) - circle(0.15))) / circle(0.3) < 0.01, "a band half the radius thick");
  const crescent = (amount) => areaOf(one({ kind: "crescent", width: 0.6, amount })[0].points);
  assert.ok(crescent(0.2) < crescent(0.5) && crescent(0.5) < crescent(0.8), "fuller as amount grows");
  assert.equal(one({ kind: "crescent", amount: 0 }).length, 0, "nothing at amount 0");
});

test("layers are drawn over the study, fitted to it, on the same clock", () => {
  const base = { shape: { kind: "bar" }, layout: { kind: "grid", columns: 4, rows: 4, margin: 0 }, changes: [{ property: "angle", from: 0, to: 90 }], time: { duration: 2 } };
  const top = { shape: { kind: "bar", color: "#c00" }, layout: { kind: "grid", columns: 8, rows: 8, margin: 0 }, changes: [{ property: "angle", from: 90, to: 0 }] };
  const svg = toSVG({ ...base, layers: [top] });
  assert.match(svg, /viewBox="0 0 400 400"/, "the study below sets the size");
  assert.equal(svg.match(/<g data-cell="1:/g).length, 64, "every copy of the layer, labelled with its layer");
  const xs = [...svg.matchAll(/<g data-cell="1:[^"]+"><path d="M([\d.]+)/g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...xs) < 400 && Math.min(...xs) >= 0, "the layer sits inside the study");
  assert.notEqual(toSVG({ ...base, layers: [top] }, { time: 0.5 }), svg, "and moves with the clock");
});

test("a ring layout puts the copies around a circle, and can turn them to face out", () => {
  const study = (facing) => ({ shape: { kind: "bar", width: 0.1, height: 0.6 }, layout: { kind: "ring", count: 8, margin: 0, facing } });
  const centres = [...toSVG(study(false)).matchAll(/<path d="M([^"]+)"/g)].map((m) => { const n = m[1].split(/[MLZ ]+/).filter(Boolean).map(Number); const px = n.filter((_, i) => i % 2 === 0), py = n.filter((_, i) => i % 2); return [(Math.min(...px) + Math.max(...px)) / 2, (Math.min(...py) + Math.max(...py)) / 2]; });
  const mid = centres.reduce((a, c) => [a[0] + c[0] / 8, a[1] + c[1] / 8], [0, 0]);
  const radii = centres.map(([x, y]) => Math.hypot(x - mid[0], y - mid[1]));
  assert.ok(Math.max(...radii) - Math.min(...radii) < 0.5, "all the same distance from the centre");
  assert.notEqual(toSVG(study(true)), toSVG(study(false)), "facing turns them");
  assert.deepEqual(cellAt(study(false), [centres[2][0], centres[2][1]]).column, 2, "cellAt finds a copy on the ring");
});

test("frames gives one whole cycle, frame by frame", () => {
  const study = turning({ duration: 1, repeat: "loop" });
  const all = frames(study, { fps: 10 });
  assert.equal(all.length, 10);
  assert.equal(all[0], toSVG(study, { time: 0 }));
  assert.equal(all[5], toSVG(study, { time: 0.5 }));
});

test("rules can count from the middle: x and y are 0 at the centre", () => {
  const seen = [];
  cells({ shape: { kind: "square" }, layout: { kind: "grid", columns: 3, rows: 5 }, changes: [{ property: "angle", rule: ({ x, y }) => (seen.push([x, y]), 0) }] });
  assert.deepEqual(seen[0], [-1, -2]);
  assert.deepEqual(seen[7], [0, 0], "the middle copy");
  assert.deepEqual(seen[14], [1, 2]);
});

test("a triangle points up, equal-sided unless given a height", () => {
  const one = (shape) => cells({ shape, layout: { kind: "row", count: 1 } })[0].pieces[0].points;
  const t = one({ kind: "triangle", width: 0.6 });
  const side = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  assert.ok(Math.abs(side(t[0], t[1]) - 0.6) < 1e-9 && Math.abs(side(t[1], t[2]) - 0.6) < 1e-9, "all sides 0.6");
  assert.ok(t[0][1] < t[1][1], "the point is at the top");
  assert.ok(Math.abs(areaOf(one({ kind: "triangle", width: 0.6, height: 0.3 })) - 0.09) < 1e-9, "a given height");
});

test("any shape can be split in two colors, with paper between", () => {
  const one = (shape) => cells({ shape, layout: { kind: "row", count: 1 } })[0].pieces;
  for (const kind of ["triangle", "diamond", "circle", "polygon", "crescent"]) {
    const whole = areaOf(one({ kind, width: 0.6 })[0].points);
    const [top, bottom] = one({ kind, width: 0.6, split: 0.5, colors: ["#000", "#c00"] });
    assert.equal(top.color, "#000"); assert.equal(bottom.color, "#c00");
    assert.ok(Math.abs(areaOf(top.points) + areaOf(bottom.points) - whole) < 1e-9, `${kind}: the two halves make the whole`);
    const gapped = one({ kind, width: 0.6, split: 0.5, gap: 0.06, colors: ["#000", "#c00"] });
    const strip = Math.min(...gapped[1].points.map((p) => p[1])) - Math.max(...gapped[0].points.map((p) => p[1]));
    assert.ok(Math.abs(strip - 0.06) < 1e-9, `${kind}: a strip of paper as wide as the gap`);
  }
  // the cut is measured on the shape's own height: a split triangle at 0.5 cuts halfway up
  const [, base] = one({ kind: "triangle", width: 0.6, split: 0.5, colors: ["#000", "#c00"] });
  const h = 0.6 * Math.sqrt(3) / 2;
  assert.ok(Math.abs(Math.min(...base.points.map((p) => p[1])) - 0) < 1e-9 && Math.abs(Math.max(...base.points.map((p) => p[1])) - h / 2) < 1e-9);
  // and a change can move it
  const moved = cells({ shape: { kind: "diamond", width: 0.6, colors: ["#000", "#c00"] }, layout: { kind: "row", count: 3 }, changes: [{ property: "split", from: 0.2, to: 0.8 }] });
  assert.ok(areaOf(moved[0].pieces[1].points) < areaOf(moved[2].pieces[1].points), "more of the second color further along");
});

test("aspect makes tall or wide cells, and shapes stretch with them", () => {
  const svg = (aspect) => toSVG({ shape: { kind: "bar", width: 0.5, height: 0.9 }, layout: { kind: "row", count: 3, margin: 0, aspect } });
  assert.match(svg(3), /viewBox="0 0 300 300"/, "three cells, each three times as tall as wide");
  const ys = [...svg(3).matchAll(/<path d="([^"]+)"/g)][0][1].split(/[MLZ ]+/).filter(Boolean).map(Number).filter((_, i) => i % 2);
  assert.ok(Math.abs(Math.max(...ys) - Math.min(...ys) - 270) < 1e-6, "a bar 0.9 of the cell is 0.9 of its height");
  assert.equal(svg(undefined), svg(1), "square by default");
});

test("mirror flips any shape left to right", () => {
  const one = (shape) => cells({ shape, layout: { kind: "row", count: 1 } })[0].pieces;
  for (const kind of ["triangle", "pie", "crescent", "segments"]) {
    const plain = one({ kind, width: 0.6, amount: 0.3, spread: 0.1 }), flipped = one({ kind, width: 0.6, amount: 0.3, spread: 0.1, mirror: true });
    plain.forEach((p, i) => p.points.forEach(([x, y], j) => {
      const [fx, fy] = flipped[i].points[j];
      assert.ok(Math.abs(fx + x) < 1e-12 && fy === y, kind);
    }));
  }
});

test("rolling a shape with nothing drawn draws nothing, and doesn't throw", () => {
  const svg = toSVG({ shape: { kind: "count", amount: 0 }, layout: { kind: "row", count: 3 },
    changes: [{ property: "angle", from: 0, to: 180, pivot: "roll" }] });
  assert.ok(!svg.includes("NaN") && !svg.includes("<path"));
});
