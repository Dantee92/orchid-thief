// The game's rules and state, with no drawing and no browser in it: the thief, the
// gardeners, the Moon Orchid, the garden gate, lives, score and the timer. step()
// advances one fixed step and returns what happened as bit flags, so the caller can
// react (and play sounds) without the world knowing about screens or sound.

import { LIVES, PAR, PLAYER, SCORE } from './config.js';
import { LEVELS, isBush, parseLevel, tileCenter } from './level.js';
import { createGuard, stepGuard } from './guard.js';
import { createPlayer, movePlayer } from './player.js';

export const EVENT_ORCHID = 1;
export const EVENT_CLEAR = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;
export const EVENT_SPOTTED = 16;
export const EVENT_OVER = 32;

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    levelName: '',
    player: null,
    guards: [],
    orchid: null,
    exit: null,
    grid: null,
    score: 0,
    lives: LIVES,
    elapsed: 0,
    levelTime: 0,
    ghost: true,
    orchidTaken: false,
    exitOpen: false,
    status: 'playing',
  };

  function loadLevel(index) {
    const level = LEVELS[index];
    const parsed = parseLevel(level);
    state.levelIndex = index;
    state.levelName = level.name;
    state.grid = parsed.grid;
    const start = tileCenter(parsed.player.tx, parsed.player.ty);
    state.player = createPlayer(start.x, start.y);
    state.guards = level.patrols.map((wp) => createGuard(wp));
    const orchidAt = tileCenter(parsed.orchid.tx, parsed.orchid.ty);
    state.orchid = { x: orchidAt.x, y: orchidAt.y, taken: false };
    const exitAt = tileCenter(parsed.exit.tx, parsed.exit.ty);
    state.exit = { x: exitAt.x, y: exitAt.y, open: false };
    state.levelTime = 0;
    state.ghost = true;
    state.orchidTaken = false;
    state.exitOpen = false;
    state.status = 'playing';
  }

  function reset() {
    state.score = 0;
    state.lives = LIVES;
    state.elapsed = 0;
    loadLevel(0);
  }

  /** After being caught: same level again, guards back on patrol, meter drained. */
  function retryLevel() {
    loadLevel(state.levelIndex);
  }

  /**
   * One fixed step. `move` is {x, y} (-1..1 each) and `sneak` a boolean.
   * With `harmless` set (the title screen's backdrop) the gardeners patrol but the
   * thief is never seen, nothing scores and nothing catches.
   */
  function step(dt, move, sneak, harmless) {
    if (state.status !== 'playing') return 0;
    let events = 0;
    state.elapsed += dt;
    state.levelTime += dt;

    const player = state.player;
    player.sneaking = sneak;
    if (!harmless && (move.x !== 0 || move.y !== 0)) {
      const len = Math.hypot(move.x, move.y) || 1;
      const speed = (sneak ? PLAYER.sneak : PLAYER.walk) * dt;
      movePlayer(player, state.grid, (move.x / len) * speed, (move.y / len) * speed);
    }

    let maxAlert = 0;
    for (const guard of state.guards) {
      const wasAlerted = guard.state === 'alerted';
      stepGuard(guard, state.grid, harmless ? { x: -9999, y: -9999, sneaking: false } : player, dt);
      if (guard.state === 'alerted') {
        state.ghost = false;
        if (!wasAlerted) events |= EVENT_SPOTTED;
      }
      maxAlert = Math.max(maxAlert, guard.alert);
    }
    state.maxAlert = maxAlert;

    if (harmless) return events;

    // The orchid: close enough and it is yours; the gate swings open.
    if (!state.orchid.taken && Math.hypot(player.x - state.orchid.x, player.y - state.orchid.y) < 30) {
      state.orchid.taken = true;
      state.orchidTaken = true;
      state.exit.open = true;
      state.exitOpen = true;
      state.score += SCORE.orchid;
      events |= EVENT_ORCHID;
    }

    // Caught: an alerted gardener close enough to grab the thief.
    for (const guard of state.guards) {
      if (guard.state === 'alerted' && Math.hypot(player.x - guard.x, player.y - guard.y) < 26) {
        state.lives -= 1;
        events |= EVENT_CAUGHT;
        if (state.lives <= 0) {
          state.status = 'over';
          events |= EVENT_OVER;
        } else {
          retryLevel();
        }
        return events;
      }
    }

    // The gate: orchid in hand and the thief slips out.
    if (state.exit.open && Math.hypot(player.x - state.exit.x, player.y - state.exit.y) < 30) {
      const timeBonus = Math.max(0, Math.round((PAR[state.levelIndex] - state.levelTime) * SCORE.timeBonus));
      state.score += SCORE.levelClear + timeBonus + (state.ghost ? SCORE.ghostBonus : 0);
      events |= EVENT_CLEAR;
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.score += SCORE.win;
        state.status = 'won';
        events |= EVENT_WIN;
      } else {
        state.status = 'clear';
      }
      return events;
    }

    return events;
  }

  /** Advance to the next level after a clear. */
  function nextLevel() {
    loadLevel(state.levelIndex + 1);
  }

  function playerInBush() {
    const player = state.player;
    return isBush(state.grid, Math.floor(player.x / 40), Math.floor(player.y / 40));
  }

  reset();
  return { state, reset, step, nextLevel, retryLevel, loadLevel, playerInBush };
}
