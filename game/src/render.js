// Drawing only: the world's state and the current screen in, pixels out. The 1280x720
// playfield is scaled to fit the window and centred, the margin filled with the
// backdrop colour. Lantern cones are drawn additively so overlapping light brightens,
// like real lamplight. Text that holds a number is rebuilt only when it changes.

import { FIELD, FONT, GUARD, LIVES, PALETTE, TILE } from './config.js';
import { isBush, isWall } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 640, top: 150, line: 34, bottom: 76 };
const LIFE_SIZE = 18;
const LIFE_GAP = 8;

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const levelLabel = cachedLabel('');
  const timeLabel = cachedLabel('');
  const finalLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function drawTiles(state) {
    const grid = state.grid;
    for (let ty = 0; ty < 18; ty += 1) {
      for (let tx = 0; tx < 32; tx += 1) {
        const x = tx * TILE;
        const y = ty * TILE;
        const ch = grid[ty][tx];
        if (ch === '#') {
          context.fillStyle = PALETTE.wall;
          context.fillRect(x, y, TILE, TILE);
          context.fillStyle = PALETTE.wallTop;
          context.fillRect(x, y, TILE, 5);
          context.fillStyle = 'rgba(0,0,0,0.25)';
          context.fillRect(x, y + TILE - 4, TILE, 4);
        } else {
          context.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
          context.fillRect(x, y, TILE, TILE);
          context.fillStyle = PALETTE.floorEdge;
          context.fillRect(x, y + TILE - 1, TILE, 1);
          if (ch === 'B') {
            context.fillStyle = PALETTE.bushDark;
            context.beginPath();
            context.arc(x + 14, y + 22, 13, 0, Math.PI * 2);
            context.arc(x + 27, y + 16, 11, 0, Math.PI * 2);
            context.arc(x + 22, y + 30, 10, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = PALETTE.bush;
            context.beginPath();
            context.arc(x + 13, y + 20, 10, 0, Math.PI * 2);
            context.arc(x + 26, y + 15, 9, 0, Math.PI * 2);
            context.arc(x + 21, y + 28, 8, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = PALETTE.bushLeaf;
            context.beginPath();
            context.arc(x + 12, y + 18, 4, 0, Math.PI * 2);
            context.arc(x + 25, y + 13, 3, 0, Math.PI * 2);
            context.arc(x + 20, y + 26, 3, 0, Math.PI * 2);
            context.fill();
          }
        }
      }
    }
  }

  function drawExit(state) {
    const exit = state.exit;
    const open = exit.open;
    context.save();
    context.translate(exit.x, exit.y);
    context.fillStyle = open ? PALETTE.exit : PALETTE.exitDim;
    context.fillRect(-16, -18, 32, 36);
    context.fillStyle = '#101623';
    context.fillRect(-11, -13, 22, 26);
    context.strokeStyle = open ? PALETTE.exit : PALETTE.exitDim;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(-11, -13);
    context.lineTo(11, -13);
    context.moveTo(-11, 0);
    context.lineTo(11, 0);
    context.moveTo(-11, 13);
    context.lineTo(11, 13);
    context.stroke();
    if (open) {
      context.globalCompositeOperation = 'lighter';
      const glow = context.createRadialGradient(0, 0, 4, 0, 0, 46);
      glow.addColorStop(0, 'rgba(242, 201, 76, 0.55)');
      glow.addColorStop(1, 'rgba(242, 201, 76, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(0, 0, 46, 0, Math.PI * 2);
      context.fill();
      context.globalCompositeOperation = 'source-over';
    }
    context.restore();
  }

  function drawOrchid(state) {
    if (state.orchid.taken) return;
    const orchid = state.orchid;
    const t = Date.now() / 1000;
    const pulse = 0.75 + Math.sin(t * 2.4) * 0.25;
    context.save();
    context.translate(orchid.x, orchid.y);
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, 44 * pulse);
    glow.addColorStop(0, 'rgba(232, 167, 255, 0.6)');
    glow.addColorStop(1, 'rgba(232, 167, 255, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 44 * pulse, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = PALETTE.orchid;
    for (let petal = 0; petal < 5; petal += 1) {
      const a = (petal / 5) * Math.PI * 2 - Math.PI / 2;
      context.beginPath();
      context.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 7, 4, a, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.orchidCore;
    context.beginPath();
    context.arc(0, 0, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }

  function drawCone(guard) {
    const range = GUARD.range;
    const half = GUARD.halfAngle;
    context.save();
    context.globalCompositeOperation = 'lighter';
    const hot = guard.state === 'alerted';
    const grad = context.createRadialGradient(guard.x, guard.y, 10, guard.x, guard.y, range);
    grad.addColorStop(0, hot ? 'rgba(255, 84, 64, 0.5)' : 'rgba(255, 202, 106, 0.4)');
    grad.addColorStop(1, 'rgba(255, 202, 106, 0)');
    context.fillStyle = grad;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, range, guard.angle - half, guard.angle + half);
    context.closePath();
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = hot ? PALETTE.coneAlert : PALETTE.cone;
    context.beginPath();
    context.moveTo(guard.x, guard.y);
    context.arc(guard.x, guard.y, range, guard.angle - half, guard.angle + half);
    context.closePath();
    context.fill();
    context.restore();
  }

  function drawGuard(guard) {
    drawCone(guard);
    context.save();
    context.translate(guard.x, guard.y);
    // Lantern light around the guard.
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, 34);
    glow.addColorStop(0, 'rgba(255, 202, 106, 0.5)');
    glow.addColorStop(1, 'rgba(255, 202, 106, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 34, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    // Body: coat, head, hat brim, lantern in hand.
    context.rotate(guard.angle);
    context.fillStyle = PALETTE.guardCoat;
    context.beginPath();
    context.arc(0, 0, 12, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.guard;
    context.beginPath();
    context.arc(4, 0, 6, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.lantern;
    context.beginPath();
    context.arc(14, 6, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
    // Alert marker above an alerted or suspicious guard.
    if (guard.state === 'alerted') {
      text('!', guard.x, guard.y - 22, 26, PALETTE.bad, 'center');
    } else if (guard.state === 'suspicious' || guard.state === 'investigate') {
      text('?', guard.x, guard.y - 22, 24, PALETTE.warn, 'center');
    }
  }

  function drawPlayer(state) {
    const player = state.player;
    const hidden = isBush(state.grid, Math.floor(player.x / TILE), Math.floor(player.y / TILE));
    context.save();
    context.translate(player.x, player.y);
    // Moonlight pool around the thief.
    context.globalCompositeOperation = 'lighter';
    const glow = context.createRadialGradient(0, 0, 2, 0, 0, 40);
    glow.addColorStop(0, 'rgba(207, 228, 255, 0.20)');
    glow.addColorStop(1, 'rgba(207, 228, 255, 0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(0, 0, 40, 0, Math.PI * 2);
    context.fill();
    context.globalCompositeOperation = 'source-over';
    context.globalAlpha = hidden ? 0.45 : 1;
    context.rotate(player.face || 0);
    // Hooded cloak, drawn smaller while sneaking.
    const s = player.sneaking ? 0.85 : 1;
    context.scale(s, s);
    context.fillStyle = PALETTE.playerCloak;
    context.beginPath();
    context.moveTo(14, 0);
    context.lineTo(-8, -10);
    context.lineTo(-12, 0);
    context.lineTo(-8, 10);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.playerFace;
    context.beginPath();
    context.arc(4, 0, 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    if (hidden) text('HIDDEN', player.x, player.y - 24, 15, PALETTE.good, 'center');
    else if (player.sneaking) text('sneaking', player.x, player.y - 24, 14, PALETTE.muted, 'center');
  }

  function drawField(state) {
    drawTiles(state);
    drawExit(state);
    drawOrchid(state);
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state);
    // Night vignette: darken the corners so the lantern light reads.
    const vig = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.85,
    );
    vig.addColorStop(0, 'rgba(4, 6, 12, 0)');
    vig.addColorStop(1, 'rgba(4, 6, 12, 0.5)');
    context.fillStyle = vig;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  /** The detection eye: opens and reddens as the worst guard's meter fills. */
  function drawEye(state) {
    const alert = state.maxAlert || 0;
    const cx = FIELD.width / 2;
    const cy = 34;
    const color = alert < 0.35 ? PALETTE.good : alert < 1 ? PALETTE.warn : PALETTE.bad;
    context.save();
    context.translate(cx, cy);
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(0, 0, 26, 13 + alert * 4, 0, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = color;
    context.beginPath();
    context.arc(0, 0, 4 + alert * 5, 0, Math.PI * 2);
    context.fill();
    context.restore();
    const label = alert < 0.35 ? 'unseen' : alert < 1 ? 'suspicious' : 'SPOTTED';
    text(label, cx, cy + 30, 15, color, 'center');
  }

  function drawHud(state, screen) {
    context.textBaseline = 'top';
    const objective = state.orchidTaken
      ? 'Reach the garden gate — unseen'
      : 'Steal the Moon Orchid';
    text(objective, 24, 18, 24, PALETTE.text, 'left');
    text(levelLabel(state.levelName), FIELD.width - 24, 18, 24, PALETTE.text, 'right');
    drawEye(state);
    const mins = Math.floor(state.levelTime / 60);
    const secs = Math.floor(state.levelTime % 60);
    const timeText = `${mins}:${String(secs).padStart(2, '0')}`;
    text(timeLabel(timeText), 24, 52, 20, PALETTE.muted, 'left');
    text(scoreLabel(state.score), FIELD.width - 24, 52, 20, PALETTE.muted, 'right');
    // Lives: small orchid dots, top-left under the objective.
    for (let life = 0; life < LIVES; life += 1) {
      context.fillStyle = life < state.lives ? PALETTE.orchid : 'rgba(255,255,255,0.14)';
      context.beginPath();
      context.arc(32 + life * (LIFE_SIZE + LIFE_GAP), 92, 7, 0, Math.PI * 2);
      context.fill();
    }
    if (screen === SCREEN_PLAY && state.exitOpen) {
      text('The gate is open — go!', FIELD.width / 2, FIELD.height - 34, 22, PALETTE.exit, 'center');
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 78, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.orchid, 'center');
  }

  const TITLE_LINES = [
    'Steal the glowing Moon Orchid from the conservatory,',
    'then slip out through the garden gate — unseen.',
    'Gardeners patrol with lanterns. Their cones are their eyes.',
    'Hide in the bushes. Sneak with Shift. Never let the eye open.',
    '',
  ];
  const PAUSED_LINES = ['The gardeners wait in the dark.'];
  const CLEAR_LINES = ['', ''];
  const OVER_LINES = ['', ''];
  const WIN_LINES = ['', ''];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      TITLE_LINES[4] = bestLabel(best);
      drawPanel('THE ORCHID THIEF', TITLE_LINES, 'Press Space or click to begin the heist');
      return;
    }
    drawHud(state, screen);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', PAUSED_LINES, 'Press P to keep sneaking');
    } else if (screen === SCREEN_CLEAR) {
      CLEAR_LINES[0] = `${state.levelName} cleared — Score ${state.score}`;
      CLEAR_LINES[1] = state.ghost ? 'Ghost: never chased. +250' : 'Seen, but the orchid is yours.';
      drawPanel('Level clear', CLEAR_LINES, 'Press Space for the next garden');
    } else if (screen === SCREEN_OVER) {
      OVER_LINES[0] = finalLabel(state.score);
      OVER_LINES[1] = bestLabel(best);
      drawPanel('Caught in the lamplight', OVER_LINES, 'Press Space to try again');
    } else if (screen === SCREEN_WIN) {
      WIN_LINES[0] = finalLabel(state.score);
      WIN_LINES[1] = bestLabel(best);
      drawPanel('The Moon Orchid is yours', WIN_LINES, 'Press Space to steal it all over again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
