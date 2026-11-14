// Playing a sequence: draw it into an element, a frame at a time, as the clock runs.
import { render, toSVG } from "./sequence.js";
/**
 * Play a sequence into an element. The sequence can be a function, so settings that change while it
 * plays are read every frame. Someone who asked their system for less motion sees the last
 * frame straight away.
 */
export function play(sequence, target, options = {}) {
    const get = typeof sequence === "function" ? sequence : () => sequence;
    const { until, padding, fit } = options;
    const frame = globalThis.requestAnimationFrame?.bind(globalThis) ?? ((cb) => setTimeout(() => cb(performance.now()), 16));
    const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let at = options.from ?? 0, last, running = true;
    // in a page, change only what moved each frame; anywhere else, write the SVG
    const draw = () => {
        if (typeof Element !== "undefined" && target instanceof Element)
            render(get(), target, { time: at, padding, fit });
        else
            target.innerHTML = toSVG(get(), { time: at, padding, fit });
        options.onFrame?.(at);
    };
    const end = () => { running = false; options.onEnd?.(); };
    const tick = (now) => {
        if (!running)
            return;
        if (last !== undefined)
            at += (now - last) / 1000;
        last = now;
        if (until !== undefined && at >= until) {
            at = until;
            draw();
            return end();
        }
        draw();
        frame(tick);
    };
    if (still) {
        if (until !== undefined)
            at = until;
        draw();
        end();
    }
    else {
        draw();
        frame(tick);
    }
    return { stop: () => { running = false; }, get time() { return at; } };
}
