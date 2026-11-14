// Playing a sequence: draw it into an element, a frame at a time, as the clock runs.

import { render, toSVG } from "./sequence.js";
import type { Sequence } from "./types.js";

export interface PlayOptions {
  /** seconds to start from (default 0) */
  from?: number;
  /** seconds to stop at; leave out to play until stopped. With an entrance, `time.enter` stops on the still picture */
  until?: number;
  padding?: number;
  fit?: "contain" | "cover";
  /** called after every frame is drawn, with the seconds it showed */
  onFrame?: (time: number) => void;
  /** called once, when `until` is reached */
  onEnd?: () => void;
}

export interface Player {
  /** stop drawing; the last frame stays */
  stop(): void;
  /** the seconds now showing */
  readonly time: number;
}

/**
 * Play a sequence into an element. The sequence can be a function, so settings that change while it
 * plays are read every frame. Someone who asked their system for less motion sees the last
 * frame straight away.
 */
export function play(sequence: Sequence | (() => Sequence), target: Element | { innerHTML: string }, options: PlayOptions = {}): Player {
  const get = typeof sequence === "function" ? sequence : () => sequence;
  const { until, padding, fit } = options;
  const frame = globalThis.requestAnimationFrame?.bind(globalThis) ?? ((cb: (now: number) => void) => setTimeout(() => cb(performance.now()), 16));
  const still = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let at = options.from ?? 0, last: number | undefined, running = true;

  // in a page, change only what moved each frame; anywhere else, write the SVG
  const draw = () => {
    if (typeof Element !== "undefined" && target instanceof Element) render(get(), target, { time: at, padding, fit });
    else target.innerHTML = toSVG(get(), { time: at, padding, fit });
    options.onFrame?.(at);
  };
  const end = () => { running = false; options.onEnd?.(); };
  const tick = (now: number) => {
    if (!running) return;
    if (last !== undefined) at += (now - last) / 1000;
    last = now;
    if (until !== undefined && at >= until) { at = until; draw(); return end(); }
    draw();
    frame(tick);
  };

  if (still) { if (until !== undefined) at = until; draw(); end(); }
  else { draw(); frame(tick); }
  return { stop: () => { running = false; }, get time() { return at; } };
}
