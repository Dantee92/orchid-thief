// The night gardeners: they patrol waypoints with a lantern, and their vision cone is
// the game's core threat. Each guard carries a detection meter (0 unseen, 1 spotted):
// seeing the player fills it, losing sight drains it. At the suspicious threshold the
// guard stops and stares; at full it gives chase. A guard that loses the player
// investigates the last-seen spot, looks around, then goes back to patrol.

import { DETECT, GUARD, TILE } from './config.js';
import { isBush, isWall, tileCenter } from './level.js';
import { movePlayer } from './player.js';

export const GUARD_PATROL = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_ALERTED = 'alerted';
export const GUARD_INVESTIGATE = 'investigate';

/** True when the straight line from (x0, y0) to (x1, y1) crosses no wall tile. */
function lineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i += 1) {
    const x = x0 + (dx * i) / steps;
    const y = y0 + (dy * i) / steps;
    if (isWall(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Can this guard see the player right now? Range, cone angle and line of sight must
 * all hold. A player crouched in a bush is invisible unless the guard is very close.
 */
export function guardSees(guard, grid, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD.range) return false;
  const inBush = isBush(grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  if (inBush && dist > DETECT.bushSpotRange) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(angle, guard.angle)) > GUARD.halfAngle) return false;
  return lineOfSight(grid, guard.x, guard.y, player.x, player.y);
}

/** How fast the meter fills while this guard sees the player. */
function fillRate(guard, player, grid) {
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  const near = dist < GUARD.range * 0.45;
  let rate = near ? DETECT.nearRate : DETECT.farRate;
  if (player.sneaking) rate *= DETECT.sneakFactor;
  const inBush = isBush(grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
  if (inBush) rate *= 0.5;
  return rate;
}

export function createGuard(waypoints) {
  const start = tileCenter(waypoints[0][0], waypoints[0][1]);
  return {
    x: start.x,
    y: start.y,
    radius: GUARD.radius,
    angle: 0,
    waypoints,
    wpIndex: 1 % waypoints.length,
    pause: 0,
    state: GUARD_PATROL,
    alert: 0,
    lastSeen: null,
    lookTimer: 0,
    loseTimer: 0,
    everAlerted: false,
  };
}

function moveToward(guard, grid, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = (dx / dist) * step;
  const ny = (dy / dist) * step;
  const before = { x: guard.x, y: guard.y };
  movePlayer(guard, grid, nx, ny);
  guard.angle = Math.atan2(guard.y - before.y, guard.x - before.x) || guard.angle;
  return Math.hypot(tx - guard.x, ty - guard.y) < 4;
}

/** One fixed step of one guard. `seen` says whether it sees the player this step. */
export function stepGuard(guard, grid, player, dt) {
  const seen = guardSees(guard, grid, player);
  if (seen) {
    guard.alert = Math.min(1, guard.alert + fillRate(guard, player, grid) * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    guard.loseTimer = 0;
    if (guard.alert >= DETECT.alerted) {
      if (guard.state !== GUARD_ALERTED) guard.everAlerted = true;
      guard.state = GUARD_ALERTED;
    } else if (guard.alert >= DETECT.suspicious && guard.state === GUARD_PATROL) {
      guard.state = GUARD_SUSPICIOUS;
    }
  } else {
    guard.alert = Math.max(0, guard.alert - DETECT.decay * dt);
    if (guard.state === GUARD_ALERTED) {
      guard.loseTimer += dt;
      if (guard.loseTimer > 1.2) {
        guard.state = GUARD_INVESTIGATE;
        guard.lookTimer = 0;
      }
    } else if (guard.state === GUARD_SUSPICIOUS && guard.alert < DETECT.suspicious * 0.5) {
      guard.state = GUARD_PATROL;
    }
  }

  if (guard.state === GUARD_ALERTED) {
    const target = guard.lastSeen || { x: player.x, y: player.y };
    moveToward(guard, grid, target.x, target.y, GUARD.chase, dt);
    return;
  }
  if (guard.state === GUARD_INVESTIGATE) {
    if (guard.lastSeen) {
      const arrived = moveToward(guard, grid, guard.lastSeen.x, guard.lastSeen.y, GUARD.investigate, dt);
      if (arrived) {
        guard.lookTimer += dt;
        guard.angle += dt * 1.6;
        if (guard.lookTimer > GUARD.lookAround) {
          guard.state = GUARD_PATROL;
          guard.lastSeen = null;
        }
      }
    } else {
      guard.state = GUARD_PATROL;
    }
    return;
  }
  if (guard.state === GUARD_SUSPICIOUS) {
    if (guard.lastSeen) {
      const want = Math.atan2(guard.lastSeen.y - guard.y, guard.lastSeen.x - guard.x);
      const diff = angleDiff(want, guard.angle);
      guard.angle += Math.max(-3 * dt, Math.min(3 * dt, diff));
    }
    return;
  }
  // Patrol: walk the waypoints, pausing at each.
  if (guard.pause > 0) {
    guard.pause -= dt;
    return;
  }
  const wp = guard.waypoints[guard.wpIndex];
  const target = tileCenter(wp[0], wp[1]);
  if (moveToward(guard, grid, target.x, target.y, GUARD.patrol, dt)) {
    guard.pause = GUARD.waypointPause;
    guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
  }
}
