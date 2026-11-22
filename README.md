# The Orchid Thief

A moonlit stealth game for make.fun's "Make the best stealth game" bounty.

Steal the glowing Moon Orchid from a botanical conservatory under a full moon,
then slip out through the garden gate — unseen. Night gardeners patrol with
lanterns; their vision cones are their eyes. Hide in the bushes, sneak with
Shift, and never let the detection eye open.

## How to play

- **Move:** WASD or arrow keys, or click on the ground (click-to-move)
- **Sneak:** hold Shift (slower, quieter, harder to spot)
- **Pause:** P or Esc
- **Start / continue:** Space, Enter, or click

Three gardens, each harder than the last: Glasshouse (2 gardeners), Rose Maze
(3), Orchid Vault (4). Grab the orchid to open the gate, then reach it. Get
caught by an alerted gardener and you lose a life and restart the garden.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

Screenshot scenes: `?shot=start|play|mid|end&seed=N`.

## Files

- `game/index.html` — the page; `game/src/` — one job per file:
  `config.js` (tuning), `random.js` (seeded RNG), `level.js` (maps + patrols),
  `player.js` (movement + wall sliding), `guard.js` (vision cones + detection),
  `world.js` (rules), `render.js` (canvas + lamplight), `audio.js` (WebAudio),
  `input.js` (keyboard + click-to-move), `shots.js` (screenshot autopilot),
  `main.js` (boot + loop).
- `main.ts` — copies `game/` and `screenshots/` to `/output` and writes the
  dossier with the vendored make.fun library.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.
