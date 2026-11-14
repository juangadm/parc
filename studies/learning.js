// The 14 learning-set works, written as settings, then Rotations, the blind test: written once with the engine as it was
// (2026-11-14), so it is marked `test`. (Seven Sequences started as a test work and joined the learning set.)
// `reads` is what the painting shows, from the plan's table; ⚠️ marks my uncertain readings.

/** @typedef {import("../dist/index.js").Sequence} Sequence */

const BLACK = "#141414", RED = "#c8352b", BLUE = "#2b4fa8", YELLOW = "#e8b923";
const GREY = "#8f8d88", LIGHT = "#cfccc4", DARK = "#4a4946";

// Le Parc's 14-color scale, sampled off Fourteen Colors – Sequence (LP032). It closes into a circle:
// after blue comes navy again.
const FOURTEEN = [
  "#2b2b58", "#452854", "#771b4f", "#c93543", "#ee7b52", "#fabb73", "#fbd886",
  "#fdeb92", "#ede78f", "#aed191", "#64ac8d", "#3a8486", "#215f88", "#0249b5",
];

/**
 * Nine Sequences: 16 discs, each circling its own red mark. Le Parc's rule is that the darker
 * the disc, the wider its circle, so the orbit comes from the tone. Values measured off LP023.
 * @returns {Sequence}
 */
function nineSequences() {
  const tones = {
    black: { color: "#373936", orbit: 0.075 },
    dark: { color: "#5f5c5a", orbit: 0.053 },
    mid: { color: "#918e8a", orbit: 0.038 },
    light: { color: "#c1b5b3", orbit: 0.03 },
    ghost: { color: "#ebe4dc", orbit: 0 },
  };
  // [tone, start angle in degrees, clockwise from pointing right], row by row
  const grid = [
    [["black", 130], ["mid", 180], ["black", 228], ["dark", 273]],
    [["mid", 85], ["black", 132], ["ghost", 0], ["dark", 320]],
    [["black", 45], ["ghost", 0], ["black", 226], ["dark", 7]],
    [["light", 5], ["black", 318], ["light", 270], ["dark", 42]],
  ];
  const step = 0.222, MARK = "#8b2a2c";
  const discs = [], marks = [];
  grid.forEach((row, j) =>
    row.forEach(([tone, start], i) => {
      const mx = (i - 1.5) * step, my = (j - 1.5) * step, { color, orbit } = tones[tone];
      const a = (start * Math.PI) / 180;
      discs.push({ shape: { kind: "dot", color, width: 0.1 }, x: mx + orbit * Math.cos(a), y: my + orbit * Math.sin(a), around: [mx, my] });
      marks.push({ shape: { kind: "dot", color: MARK, width: 0.027 }, x: mx, y: my });
    }),
  );
  return {
    // marks are drawn last so they show on top of the discs that cover them
    shape: { kind: "group", pieces: [...discs, ...marks] },
    layout: { kind: "row", count: 9, gap: 0.12, gridLines: true },
    background: "#f4ede3",
    changes: [{ property: "angle", from: 0, to: 360, perPiece: true }],
  };
}

/**
 * Mutation of Forms: a blue and a red slice of one circle, opposite each other, together always
 * half the circle. Blue = 90° + (40/9)° × (column − 4.5)(row − 4.5), so exactly a semicircle in the
 * top-left and bottom-right corners and nothing in the other two; red takes the rest of the half.
 * @returns {Sequence}
 */
function mutationOfForms() {
  const blue = ({ column, row }) => 90 + (40 / 9) * (column - 4.5) * (row - 4.5);
  const red = (c) => 180 - blue(c);
  // a pie slice starts at 12 o'clock and runs clockwise; turn it so its middle points where we want
  const centredOn = (direction, degrees) => direction - (-90 + degrees / 2);
  return {
    shape: {
      kind: "group",
      pieces: [
        { shape: { kind: "pie", color: "#023da6", width: 0.955 } },
        { shape: { kind: "pie", color: "#ac2f39", width: 0.955 } },
      ],
    },
    layout: { kind: "grid", columns: 10, rows: 10, margin: 1.1 },
    background: "#e6ddca",
    changes: [
      { property: "amount", piece: 0, rule: (c) => blue(c) / 360 },
      { property: "angle", piece: 0, rule: (c) => centredOn(225, blue(c)) },
      { property: "amount", piece: 1, rule: (c) => red(c) / 360 },
      { property: "angle", piece: 1, rule: (c) => centredOn(45, red(c)) },
    ],
  };
}

/**
 * Tribute: two striped layers over each other. Every column (and every row) is a light strip
 * followed by a dark band. Dark × dark is black, light × light is white, anything else shows the
 * beige sheet. Widths in pixels, measured off LP066; the dark bands shrink toward the middle about
 * geometrically, and the light strips run the same widths in reverse. The last column and row are
 * a light strip only.
 * @returns {Sequence}
 */
function tribute() {
  const colLight = [3.4, 3.8, 5.1, 6.5, 7.2, 9.5, 11.9, 13.9, 16.8, 20.0, 22.1, 25.8, 22.5, 19.6, 17.0, 14.0, 11.5, 9.2, 6.9, 6.5, 5.2, 3.7, 3.2];
  const colDark = [23.4, 21.3, 18.3, 15.8, 13.1, 10.4, 9.1, 8.0, 6.3, 5.0, 3.8, 3.7, 4.9, 6.6, 7.9, 9.1, 10.2, 13.3, 16.0, 18.3, 21.1, 23.3, 0];
  const rowLight = [3.2, 3.6, 5.3, 6.2, 7.1, 9.6, 11.7, 14.0, 17.3, 19.6, 22.1, 25.3, 23.1, 19.8, 18.4, 14.5, 12.2, 9.8, 7.4, 6.8, 5.5, 3.4, 2.7];
  const rowDark = [23.6, 21.6, 18.4, 16.0, 13.1, 10.1, 9.2, 7.8, 6.0, 5.2, 3.8, 3.5, 4.6, 5.9, 6.8, 8.3, 9.8, 12.7, 15.7, 18.2, 21.2, 24.3, 0];
  const colSize = colLight.map((u, k) => u + colDark[k]), rowSize = rowLight.map((u, k) => u + rowDark[k]);
  // shares of the cell: the light part first (left / top), then the dark part (right / bottom)
  const lightW = ({ column }) => colLight[column] / colSize[column], lightH = ({ row }) => rowLight[row] / rowSize[row];
  const darkW = ({ column, row }) => (rowDark[row] ? colDark[column] / colSize[column] : 0);
  const darkH = ({ column, row }) => (colDark[column] ? rowDark[row] / rowSize[row] : 0);
  return {
    shape: {
      kind: "group",
      pieces: [
        { shape: { kind: "rectangle", color: "#fdfcfa" } }, // light × light, in the top-left corner
        { shape: { kind: "rectangle", color: "#1d1b20" } }, // dark × dark, in the bottom-right corner
      ],
    },
    layout: { kind: "grid", columnSizes: colSize, rowSizes: rowSize, margin: 1.4 },
    background: "#e2d8c7",
    changes: [
      { property: "width", piece: 0, rule: lightW },
      { property: "height", piece: 0, rule: lightH },
      { property: "x", piece: 0, rule: (c) => -0.5 + lightW(c) / 2 },
      { property: "y", piece: 0, rule: (c) => -0.5 + lightH(c) / 2 },
      { property: "width", piece: 1, rule: darkW },
      { property: "height", piece: 1, rule: darkH },
      { property: "x", piece: 1, rule: (c) => 0.5 - darkW(c) / 2 },
      { property: "y", piece: 1, rule: (c) => 0.5 - darkH(c) / 2 },
    ],
  };
}

/** @type {{ title: string, year: number, reads: string, sequence: Sequence }[]} */
export const learning = [
  {
    title: "Sequence of Translational Motion", year: 1959,
    reads: "A square, part black, part red, with a thin gap between the colors. Row of 7. It turns half a turn clockwise while travelling from the bottom-left of its cell to the top-right, and the black/red split shifts.",
    // measured off the Met's larger image (LP015): square ≈ 1/3 of the cell, gap ≈ 3% of the cell,
    // centre runs from about (-0.235, +0.235) to (+0.235, -0.235).
    // Colors are median samples of the same image: crimson #aa172e, board #e5dccb.
    sequence: {
      shape: { kind: "split-square", colors: [BLACK, "#aa172e"], width: 0.335, amount: 0.15, gap: 0.026 },
      layout: { kind: "row", count: 7, gridLines: true },
      background: "#e5dccb",
      changes: [
        { property: "angle", from: 0, to: 180 },
        { property: "x", from: -0.235, to: 0.235 },
        { property: "y", from: 0.235, to: -0.235 },
        { property: "amount", from: 0.15, to: 0.85 },
      ],
    },
  },
  {
    title: "Seven Sequences of the Movement of the Translational Motion of Red and Blue Segments", year: 1959,
    reads: "Two sticks, blue and red, each moving on its own. Row of 7. Blue goes in a straight line from top-left to bottom-right; red goes from bottom-left to top-right on a curve, rising steadily but moving right slowly at first. Both turn half a turn clockwise.",
    // Measured off the Met's larger image (LP014) with parc's measuring script; values in cell units.
    // Moved from the hidden test set to the learning set on 2026-10-31, at JuanGa's request.
    sequence: {
      shape: {
        kind: "group",
        pieces: [
          // lengths: measured core length plus the ~2px the soft edges hide
          { shape: { kind: "bar", color: "#162796", width: 0.038, height: 0.25 } },
          { shape: { kind: "bar", color: "#7f121f", width: 0.038, height: 0.23 } },
        ],
      },
      layout: { kind: "row", count: 7, gridLines: true },
      background: "#ebe3d1",
      changes: [
        // blue: straight line, top-left → bottom-right, upright → flat → upright
        { property: "x", piece: 0, from: -0.26, to: 0.26 },
        { property: "y", piece: 0, from: -0.26, to: 0.26 },
        { property: "angle", piece: 0, from: 0, to: 180 },
        // red: bottom-left → top-right, rising steadily but moving right slowly at first
        { property: "x", piece: 1, from: -0.25, to: 0.25, easing: "ease in" },
        { property: "y", piece: 1, from: 0.39, to: -0.39 },
        { property: "angle", piece: 1, from: 90, to: 270 },
      ],
    },
  },
  {
    title: "Progression", year: 1958,
    reads: "One chunky black bar (about 1:2), upright in the bottom-left corner of its cell. Row of 13. It rolls over its corner in 15° steps, lies flat in the middle copy and ends upright against the right wall.",
    // Measured off the Met's larger image (LP019): cells ≈ 35px square, ≈ 2.75px apart.
    // The bar touches the left wall and floor in the first cell and the right wall in the last.
    // It's a quarter of the cell by a half: twice its width plus its length is exactly one cell,
    // which is why half a roll carries it from one corner into the other.
    sequence: {
      // Each cell is a cream card mounted on a grey board (colors sampled from the same image).
      shape: { kind: "bar", color: BLACK, width: 0.25, height: 0.5, align: "bottom left" },
      layout: { kind: "row", count: 13, gap: 0.079, cellBackground: "#e7dac5" },
      background: "#b3b3af",
      changes: [{ property: "angle", from: 0, to: 180, pivot: "roll" }],
    },
  },
  {
    title: "Nine Sequences of Translational Motion", year: 1959,
    reads: "A 4×4 grid of tiny red marks, each with a disc beside it in one of five tones. Row of 9. Every disc circles its own mark, an eighth of a turn clockwise per cell, so the last cell repeats the first. The darker the disc, the wider its circle: black discs sit just outside their mark, ghost-white ones sit on it.",
    // Measured off the Met's larger image (web-additional/LP023, 946px): marks 0.222 of a cell apart,
    // centred in a pencil square; discs ≈ 0.1 of a cell across. Start angles are read from the
    // first cell and confirmed by the 45° steps in the other eight.
    sequence: nineSequences(),
  },
  {
    title: "Three Segments in Translational Motion", year: 1959,
    reads: "Three segments of one circle, yellow, red, blue, flat sides facing in. Row of 7. They close in fast, meet into a circle about 60% of the way along, linger, then fly apart, while the group turns half a turn anticlockwise, fastest as they meet.",
    // Measured off the Met's larger image (web-additional/LP026, 741px): circle ≈ 0.46 of the cell,
    // group centred. Spread per cell 0.19, 0.10, 0.03, 0.01, 0, 0.07, 0.20; turn 0°, -11°, -25°, -55°,
    // -105°, -151°, -183°. The fits below miss by at most 0.01 of a cell and 2°.
    sequence: {
      shape: { kind: "segments", count: 3, colors: ["#f9e36d", "#b9353d", "#0544ac"], width: 0.46 },
      layout: { kind: "row", count: 7, gap: 0.03, gridLines: true },
      background: "#f0e6da",
      changes: [
        { property: "spread", from: 0.2, to: 0, pattern: "there and back", peak: 0.6, easing: "ease out" },
        // the engine puts yellow at 330°; in the first cell it points up (265°)
        { property: "angle", from: -65, to: -248, easing: [0.7, 0.2, 0.45, 0.5] },
        // each piece is also twisted on its own: 36° clockwise apart, 0° where they meet,
        // untwisting steadily on the way in, snapping back on the way out (measured 36, 26, 11, 0, 24, 38, 37)
        { property: "angle", from: 37, to: 0, perPiece: true, pattern: "there and back", easingBack: "ease out, strong" },
      ],
    },
  },
  {
    title: "Segmented in Rotation", year: 1959,
    reads: "A black disc with a flat cut, on bare paper. Row of 13. The cut turns three-quarters of the way round, clockwise, an even 22.5° per disc: from facing left to facing down.",
    // Measured off the Met's larger image (web-additional/LP022, 770px): discs 54.1px apart and
    // 48.6px across (0.9 of the spacing); the flat side sits 0.74 of the radius from the centre in
    // every disc. Edges are clean to about half a pixel, so the hand is barely there.
    sequence: {
      shape: { kind: "cut-circle", color: "#1d1d1c", width: 0.9, amount: 0.87 },
      layout: { kind: "row", count: 13 },
      background: "#f5ede1",
      // at 0° the cut faces down; in the first disc it faces left (178°)
      changes: [{ property: "angle", from: 88, to: 361 }],
      wobble: 0.3, seed: 3,
    },
  },
  {
    title: "Metamorphosis of a Line", year: 1959,
    reads: "A diamond. Row of 11. A flat line turns in depth, an even 9° per cell, until it stands upright: it opens into a diamond, square at the middle, then closes into a standing line.",
    // Measured off the Met's larger image (web-large/LP021, 596px): cells ≈ 43px pencil squares;
    // width = L·cos θ and height = L·sin θ with L ≈ 0.82 of a cell and θ = 0°…90° in 9° steps
    // (straight-line changes would make the middle diamond 0.5 L; it measures 0.71 L).
    sequence: {
      shape: { kind: "diamond", color: "#141414" },
      layout: { kind: "row", count: 11, gap: 0.037, gridLines: true },
      background: "#e2d7c3",
      changes: [
        { property: "width", from: 0.82, to: 0, easing: "ease in, sine" },
        { property: "height", from: 0, to: 0.82, easing: "ease out, sine" },
      ],
      // played: each line turns up and back, a moment ahead of its left-hand neighbour
      time: { duration: 3, repeat: "reverse" },
    },
  },
  {
    title: "Translational Rotation", year: 1959,
    reads: "A grey rectangle (about 4:3) with a black dot set a little off its centre. 9×9 grid. The dots sit on a perfect grid; each rectangle turns around its dot. How far it turns depends on how central it is in both directions at once: 18° × u × v − 45°, where u and v count 1 at the edge up to 5 in the middle column and row.",
    // Measured off the Met's larger image (web-large/LP048, 600px): dots 38.8px apart; rectangle
    // 0.72 × 0.52 of a cell, its centre 0.094 off the dot across the short side; dot 0.245 across.
    // The rule fits all 79 measurable cells to within about 2°.
    sequence: {
      shape: {
        kind: "group",
        pieces: [
          { shape: { kind: "rectangle", color: "#adaeaf", width: 0.72, height: 0.52 }, y: -0.094 },
          { shape: { kind: "dot", color: "#1c1d1d", width: 0.245 } },
        ],
      },
      // the grid sits on a cream sheet with about 1.17 cells of paper all round
      layout: { kind: "grid", columns: 9, rows: 9, margin: 1.17 },
      background: "#e4ded0",
      changes: [
        {
          property: "angle",
          rule: ({ column, row }) => {
            const u = 5 - Math.abs(column - 4), v = 5 - Math.abs(row - 4);
            return 18 * u * v - 45;
          },
        },
      ],
    },
  },
  {
    title: "Rotation in Red and Black", year: 1959,
    reads: "A cross of two bars at right angles, red over black. 10×10 grid on a sheet with wide margins. The red bar's angle is 20° × (i − 4.5) × (j − 4.5), counting columns and rows from 0: diagonal X's on the outer ring, and rings that turn 90°, 70°, 50°, 30°, 10° per cell from the outside in.",
    // Measured off the Met's larger image (web-large/LP054, 600px): crossings on a regular grid
    // 47.18px apart (within 1.4px); bars 0.92 × 0.087 of a cell, always perpendicular, red always
    // on top; 1.36 cells of paper all round.
    sequence: {
      // the cross's first color is the flat bar, the second the upright one, drawn on top
      shape: { kind: "cross", colors: ["#161310", "#b51f31"], width: 0.92, height: 0.087 },
      layout: { kind: "grid", columns: 10, rows: 10, margin: 1.36 },
      background: "#f3ece0",
      changes: [
        {
          property: "angle",
          // the red bar starts upright (90°), so turn it by the rule minus 90°
          rule: ({ column, row }) => 20 * (column - 4.5) * (row - 4.5) - 90,
        },
      ],
    },
  },
  {
    title: "Rotation of Fractioned Circles", year: 1959,
    reads: "A circle split into a larger light part and a smaller dark part, with a strip of paper between. 9×9 grid. The dark side faces −90° + 18° × (column + 1) × (row + 1): the top row turns 18° per circle, the next 36°, and so on down.",
    // Measured off the Met's larger image (web-large/LP057, 600px): circles 0.839 of a cell across
    // on a 62px grid (read from the dark side's edge; the light grey is too close to the paper to
    // trace); the gap is 0.134 of a cell wide, centred 0.2 of the radius toward the dark side, in
    // every circle; 0.34 of a cell of paper all round.
    sequence: {
      // split-circle: first color on top, second below; amount 0.4 puts the gap 0.2 of the radius below center
      shape: { kind: "split-circle", colors: ["#d2d2d2", "#626468"], width: 0.839, amount: 0.4, gap: 0.134 },
      layout: { kind: "grid", columns: 9, rows: 9, margin: 0.34 },
      background: "#f3ede2",
      changes: [
        {
          property: "angle",
          // the dark part starts facing down (90°)
          rule: ({ column, row }) => 18 * (column + 1) * (row + 1) - 180,
        },
      ],
    },
  },
  {
    title: "Mutation of Forms", year: 1959,
    reads: "Two slices of one circle meeting at its centre, together always half the circle: blue centred on up-left, red on down-right. 10×10 grid. The blue's share runs in straight lines from a full semicircle in the top-left and bottom-right corners to nothing in the other two: blue = 90° + (40/9)° × (column − 4.5) × (row − 4.5), red = 180° − blue.",
    // Measured off the Met's larger image (web-large/LP053, 600px) by each color's area per cell:
    // blue + red ≈ 540px in every cell (one semicircle, 0.955 of a cell across); the blue share is
    // ((9 − column)(9 − row) + column × row) / 81. 38.8px grid, about 1.1 cells of margin.
    sequence: mutationOfForms(),
  },
  {
    title: "Quantitative Sequences", year: 1959,
    reads: "17×17 pencil squares. Each square is secretly a 4×4 of small squares, and its amount is counted in them: as many as its distance from the empty diagonal (0 to 16), inked in snake order, up the first column, down the next. Above the diagonal the snake starts from the left; below it, from the right.",
    // Measured off the Met's larger image (web-large/LP068, 600px): pencil cells 34.1px; every one of
    // the 289 cells has exactly the predicted small squares inked. 0.32 of a cell of paper round the grid.
    sequence: {
      shape: { kind: "count", color: "#0e0e0d", width: 0.97, count: 4 }, // inked squares sit just inside the pencil lines
      layout: { kind: "grid", columns: 17, rows: 17, gridLines: true, margin: 0.32 },
      background: "#f8efde",
      changes: [
        { property: "amount", rule: ({ column, row }) => Math.abs(column - row) / 16 },
        { property: "mirror", rule: ({ column, row }) => (column < row ? 1 : 0) },
      ],
    },
  },
  {
    title: "Tribute", year: 1959,
    reads: "Two striped layers over each other, 23 × 23. Each column and row is a light strip then a dark band; dark × dark shows black, light × light white, the rest the beige sheet. The dark bands narrow toward the middle (about geometrically) while the light strips widen, so the black shrinks and a white lattice opens up in the centre.",
    // Measured off the Met's larger image (web-large/LP066, 600px): every strip and band to sub-pixel,
    // columns and rows alike (they agree within about a pixel); about 1.4 cells of sheet all round.
    sequence: tribute(),
  },
  {
    title: "Fourteen Colors – Sequence", year: 1959,
    reads: "Two lattices woven together: rows of squares and, between them, rows of circles offset by half a step, 15 of each. Every square in a row shares one color, stepping down Le Parc's 14-color scale; every circle in a column shares one, stepping across it. The squares start halfway round the scale (yellow), the circles at navy, and the scale closes into a circle.",
    // Measured off the Met's larger image (web-large/LP032, 600px): shapes on a 36.4px step; squares
    // 0.51 and circles 0.565 of a step across; color per square row = (row + 7) mod 14, per circle
    // column = column mod 14. Drawn on a half-step grid (30 × 30), with nothing on the in-between spots.
    sequence: {
      shape: { kind: "circle" },
      layout: { kind: "grid", columns: 30, rows: 30, margin: 1.5 },
      palette: FOURTEEN,
      background: "#e8dccc",
      changes: [
        { property: "shape", rule: ({ row }) => (row % 2 === 0 ? "square" : "circle") },
        // one step is two cells of this grid
        { property: "size", rule: ({ column, row }) => ((column + row) % 2 ? 0 : row % 2 === 0 ? 1.02 : 1.13) },
        { property: "color", rule: ({ column, row }) => (row % 2 === 0 ? (row / 2 + 7) % 14 : ((column - 1) / 2) % 14) },
      ],
    },
  },
  {
    title: "Rotations", year: 1959, test: true,
    reads: "Black hand-cut discs with one flat edge. 13×13 grid. The flat edge faces 180° + 15° × (column + row): one step a cell, so the far corners are a full turn apart.",
    // The blind test (2026-11-14): written once, with no engine changes, then measured the same way as the photograph
    // (web-large/LP061, 600px). Flat-edge direction: half the discs within 5°, 90% within 10°, worst 20° (the hand).
    // Discs 0.87 of a cell, the cut leaving 0.85 of the width: area 977 px against 968, depth 0.68 against 0.67;
    // every centre within 3 px of the photograph's (cells are 42.6 px).
    // Colors are mean samples of the same image.
    sequence: {
      shape: { kind: "cut-circle", color: "#100f0d", width: 0.87, amount: 0.85 },
      layout: { kind: "grid", columns: 13, rows: 13, margin: 0.5 },
      background: "#f7f2ea",
      wobble: 0.5, seed: 61,
      // the flat edge points down at 0°, so 90° turns it to face right; it starts facing left
      changes: [{ property: "angle", from: 90, to: 450, order: "diagonally" }],
    },
  },
];

// How the row works play. Paused at the start each is its painting; playing, each copy runs a moment
// ahead of the one before. Most go up and back ("reverse"); Nine Sequences goes all the way round, so it
// loops. The grids are drawn by rules of column and row, so they hold still unless a rule uses `time`.
const PLAY = {
  "Sequence of Translational Motion": { duration: 3 },
  "Seven Sequences of the Movement of the Translational Motion of Red and Blue Segments": { duration: 3 },
  "Progression": { duration: 4 },
  "Nine Sequences of Translational Motion": { duration: 4, repeat: "loop" },
  "Three Segments in Translational Motion": { duration: 3 },
  "Segmented in Rotation": { duration: 4 },
  "Rotations": { duration: 4 },
};
for (const work of learning) if (PLAY[work.title] && !work.sequence.time) work.sequence.time = PLAY[work.title];
