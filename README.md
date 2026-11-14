# parc

A small engine for sequences, rendered to SVG.

parc repeats one shape and changes it a step at a time. Each cell is one step of the same change, so every picture is also an animation. Press play and it moves.

It draws plain SVG. No dependencies, about 12 KB. The look comes from the motion studies Julio Le Parc painted in 1958 and 1959.

## Use it

```bash
npm install github:juangadm/parc
```

```js
import { toSVG } from "parc";

toSVG({
  shape: { kind: "square" },
  layout: { kind: "row", count: 7 },
  changes: [{ property: "angle", to: 90 }],
});
```

`render` draws into an element and `play` animates it. The guide shows every setting with a live picture.

## The guide

`index.html` is the guide. Open it through a local server:

```bash
python3 tools/serve.py
```

Then go to http://localhost:8765/.

## Work on it

```bash
npm install
npm test
```

The engine lives in `src`. `npm run build` writes `dist`, which is checked in so the package works straight from GitHub.

## Credits

The engine and its guide are inspired by [heerich.js](https://meodai.github.io/heerich/), David Aerne's voxel engine.

The art is inspired by Julio Le Parc. I've loved his motion studies since I saw [*Julio Le Parc 1959*](https://www.metmuseum.org/exhibitions/listings/2018/julio-le-parc-1959) at the Met.
