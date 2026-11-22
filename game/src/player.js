// The thief: a circle that slides along walls. Movement is axis-separated, so the
// player glides along a wall instead of sticking to it when pushing diagonally.

import { PLAYER, TILE } from './config.js';
import { isWall } from './level.js';

/** True when a circle at (x, y) with radius r overlaps a wall tile. */
function hitsWall(grid, x, y, r) {
  const left = Math.floor((x - r) / TILE);
  const right = Math.floor((x + r) / TILE);
  const top = Math.floor((y - r) / TILE);
  const bottom = Math.floor((y + r) / TILE);
  for (let ty = top; ty <= bottom; ty += 1) {
    for (let tx = left; tx <= right; tx += 1) {
      if (!isWall(grid, tx, ty)) continue;
      const nearestX = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const nearestY = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - nearestX;
      const dy = y - nearestY;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

export function createPlayer(x, y) {
  return { x, y, radius: PLAYER.radius, sneaking: false, moving: false, face: 0 };
}

/**
 * Move the player by (dx, dy) in pixels, sliding along walls. Returns the distance
 * actually travelled (0 when fully blocked).
 */
export function movePlayer(player, grid, dx, dy) {
  let moved = 0;
  if (dx !== 0 && !hitsWall(grid, player.x + dx, player.y, player.radius)) {
    player.x += dx;
    moved += Math.abs(dx);
  }
  if (dy !== 0 && !hitsWall(grid, player.x, player.y + dy, player.radius)) {
    player.y += dy;
    moved += Math.abs(dy);
  }
  player.moving = moved > 0;
  if (moved > 0) player.face = Math.atan2(dy, dx);
  return moved;
}
