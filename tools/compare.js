// Compare a rendered row against measurements: where each piece sits and which way it points.
// Usage: node tools/compare.js "<title>" '<json: [[ [x,y,angle], ... per piece ], ... per cell]>'
import { cells } from "../dist/index.js";
import { learning } from "../studies/learning.js";

const [title, json] = process.argv.slice(2);
const work = learning.find((w) => w.title.startsWith(title));
const measured = JSON.parse(json);

// axis angle of a piece, folded to (-90, 90], like the measuring script reports it
const axis = (pts) => {
  const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  return { x: mx, y: my, angle: (0.5 * Math.atan2(2 * sxy, sxx - syy) * 180) / Math.PI };
};
const fold = (a) => ((((a + 90) % 180) + 180) % 180) - 90;

let worst = { pos: 0, angle: 0 };
cells(work.sequence).forEach((cell, i) => {
  const row = cell.pieces.map((p, k) => {
    const got = axis(p.points), [mx, my, ma] = measured[i][k];
    const dPos = Math.hypot(got.x - mx, got.y - my), dAng = Math.abs(fold(got.angle - ma));
    worst = { pos: Math.max(worst.pos, dPos), angle: Math.max(worst.angle, dAng) };
    return `piece ${k}: (${got.x.toFixed(2)}, ${got.y.toFixed(2)}) ${got.angle.toFixed(0)}°  off by ${dPos.toFixed(3)} / ${dAng.toFixed(0)}°`;
  });
  console.log(`cell ${i + 1}  ${row.join("   ")}`);
});
console.log(`worst: ${worst.pos.toFixed(3)} of a cell, ${worst.angle.toFixed(0)}°`);
