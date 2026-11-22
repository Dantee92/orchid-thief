// Every tuning number and colour in one place. The playfield is a fixed 1280x720 logical
// area (32 by 18 tiles of 40 px); the renderer scales it to the window, so no rule below
// depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** Tile size in pixels; the maps are COLS by ROWS tiles. */
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PLAYER = {
  radius: 13,
  walk: 178,
  sneak: 96,
};

export const GUARD = {
  radius: 13,
  patrol: 72,
  investigate: 120,
  chase: 208,
  /** How far a guard can see, in pixels. */
  range: 198,
  /** Half of the vision cone's angle, in radians (~37 degrees each side). */
  halfAngle: 0.65,
  /** Pause at each patrol waypoint, in seconds. */
  waypointPause: 0.9,
  /** Seconds a guard looks around at the last-seen spot before giving up. */
  lookAround: 2.2,
};

/** Detection meter: 0 is unseen, 1 is fully spotted. */
export const DETECT = {
  /** Alert level where a guard grows suspicious and turns to look. */
  suspicious: 0.35,
  /** Alert level where a guard gives chase. */
  alerted: 1,
  /** Alert gained per second while the player is seen (near, walking, in the open). */
  nearRate: 1.35,
  farRate: 0.5,
  /** Multiplier while the player sneaks. */
  sneakFactor: 0.45,
  /** Alert lost per second while the player is unseen. */
  decay: 0.22,
  /** A guard only spots a player hidden in a bush this close, in pixels. */
  bushSpotRange: 55,
};

export const LIVES = 3;

export const SCORE = {
  orchid: 500,
  levelClear: 300,
  /** Bonus per second under par on a cleared level. */
  timeBonus: 12,
  /** Bonus for clearing a level without ever being chased. */
  ghostBonus: 250,
  win: 1000,
};

/** Par time per level, in seconds, for the time bonus. */
export const PAR = [75, 100, 130];

export const PALETTE = {
  backdrop: '#070a12',
  floor: '#16241c',
  floorAlt: '#132019',
  floorEdge: '#1d2f24',
  wall: '#2c3444',
  wallTop: '#3d4a63',
  bush: '#1e4d2a',
  bushLeaf: '#2f7a3e',
  bushDark: '#14351d',
  orchid: '#e8a7ff',
  orchidCore: '#fff3fd',
  exit: '#f2c94c',
  exitDim: '#7a6a2e',
  guard: '#3a2f2a',
  guardCoat: '#5a4632',
  lantern: '#ffca6a',
  cone: 'rgba(255, 202, 106, 0.20)',
  coneHot: 'rgba(255, 190, 80, 0.34)',
  coneAlert: 'rgba(255, 84, 64, 0.30)',
  player: '#20242e',
  playerCloak: '#2e3442',
  playerFace: '#e8dcc8',
  moon: '#cfe4ff',
  panel: '#101623',
  panelEdge: '#2a3550',
  text: '#eef1f5',
  muted: '#93a0b5',
  good: '#7ee2a0',
  warn: '#ffca6a',
  bad: '#ff6a5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'orchid-thief.best';
