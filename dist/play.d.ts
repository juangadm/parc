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
export declare function play(sequence: Sequence | (() => Sequence), target: Element | {
    innerHTML: string;
}, options?: PlayOptions): Player;
