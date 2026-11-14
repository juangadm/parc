// Flat geometry. Every piece is a polygon in "cell units": the cell is 1 × 1,
// centered on (0, 0), with y pointing down like SVG.
const TAU = Math.PI * 2;
const CURVE_STEPS = 96; // points on a full circle; plenty for print-sharp curves
export function rect(width, height, cx = 0, cy = 0) {
    const w = width / 2, h = height / 2;
    return [[cx - w, cy - h], [cx + w, cy - h], [cx + w, cy + h], [cx - w, cy + h]];
}
export function diamond(width, height) {
    return [[0, -height / 2], [width / 2, 0], [0, height / 2], [-width / 2, 0]];
}
/** Points along a circle from angle a to b (radians, 0 = right, clockwise on screen). */
export function arc(radius, a, b, cx = 0, cy = 0) {
    const steps = Math.max(2, Math.ceil((Math.abs(b - a) / TAU) * CURVE_STEPS));
    const out = [];
    for (let i = 0; i <= steps; i++) {
        const t = a + ((b - a) * i) / steps;
        out.push([cx + radius * Math.cos(t), cy + radius * Math.sin(t)]);
    }
    return out;
}
export function ellipse(width, height) {
    return arc(1, 0, TAU).slice(0, -1).map(([x, y]) => [(x * width) / 2, (y * height) / 2]);
}
/** A pie slice: `amount` of a full circle, starting at 12 o'clock. */
export function pie(radius, amount) {
    if (amount >= 0.999)
        return arc(radius, 0, TAU).slice(0, -1);
    const start = -Math.PI / 2;
    return [[0, 0], ...arc(radius, start, start + amount * TAU)];
}
/** Keep the part of a polygon above (keep = "above") or below a horizontal line y = k. */
export function clipY(poly, k, keep) {
    const inside = (p) => (keep === "above" ? p[1] <= k : p[1] >= k);
    const out = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        if (inside(a))
            out.push(a);
        if (inside(a) !== inside(b)) {
            const t = (k - a[1]) / (b[1] - a[1]);
            out.push([a[0] + (b[0] - a[0]) * t, k]);
        }
    }
    return out;
}
export function rotate(poly, degrees, about = [0, 0]) {
    if (!degrees)
        return poly;
    const r = (degrees * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    return poly.map(([x, y]) => {
        const dx = x - about[0], dy = y - about[1];
        return [about[0] + dx * c - dy * s, about[1] + dx * s + dy * c];
    });
}
export function translate(poly, dx, dy) {
    return poly.map(([x, y]) => [x + dx, y + dy]);
}
export function area(poly) {
    let sum = 0;
    for (let i = 0; i < poly.length; i++) {
        const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
        sum += x1 * y2 - x2 * y1;
    }
    return Math.abs(sum) / 2;
}
/**
 * Tip a shape (all its pieces together) over its bottom-right corner, like a box
 * rolling to the right. Every 90° it lands on a new side and the next corner
 * becomes the pivot.
 */
export function roll(polys, degrees) {
    let shape = polys;
    let left = shape.some((p) => p.length) ? degrees : 0; // nothing drawn, nothing to roll
    while (left > 1e-9) {
        const step = Math.min(90, left);
        const pivot = bottomRight(shape.flat());
        shape = shape.map((p) => rotate(p, step, pivot));
        left -= step;
    }
    return shape;
}
function bottomRight(points) {
    const floor = Math.max(...points.map((p) => p[1]));
    const onFloor = points.filter((p) => p[1] > floor - 1e-6);
    return onFloor.reduce((a, b) => (b[0] > a[0] ? b : a));
}
/** Rough up the edges by a repeatable amount, like a hand-cut shape. */
export function wobble(poly, amount, noise) {
    if (!amount)
        return poly;
    const spacing = 0.015;
    // walk the outline in small even steps, remembering each step's outward direction
    const walk = [];
    for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const steps = Math.max(1, Math.round(len / spacing));
        const nx = -(b[1] - a[1]) / (len || 1), ny = (b[0] - a[0]) / (len || 1);
        for (let s = 0; s < steps; s++) {
            const t = s / steps;
            walk.push([[a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], nx, ny]);
        }
    }
    return walk.map(([[x, y], nx, ny], i) => {
        const d = noise(i, walk.length) * amount * 0.01;
        return [x + nx * d, y + ny * d];
    });
}
