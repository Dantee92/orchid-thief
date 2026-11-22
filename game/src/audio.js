// Synthesized sound, no audio files: soft footsteps, a low alert sting, a bright
// pickup chime and a small win phrase. Everything is guarded: with no AudioContext
// (before any user gesture, or in a headless screenshot run) every call is a no-op.

export function createAudio() {
  let context = null;
  let master = null;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, at, dur, type, vol) {
    const ctx = ensure();
    if (!ctx || !master) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + at);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + at + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + dur + 0.05);
    } catch {
      // Sound is garnish: never let it break the game.
    }
  }

  return {
    /** Call on the first user gesture so later sounds are allowed to play. */
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    step(sneak) {
      if (sneak) tone(140, 0, 0.05, 'sine', 0.12);
      else tone(180, 0, 0.06, 'triangle', 0.25);
    },
    alert() {
      tone(196, 0, 0.22, 'sawtooth', 0.3);
      tone(147, 0.1, 0.3, 'sawtooth', 0.3);
    },
    pickup() {
      tone(880, 0, 0.14, 'sine', 0.4);
      tone(1318, 0.09, 0.2, 'sine', 0.35);
    },
    clear() {
      tone(523, 0, 0.12, 'sine', 0.35);
      tone(659, 0.1, 0.12, 'sine', 0.35);
      tone(784, 0.2, 0.22, 'sine', 0.35);
    },
    caught() {
      tone(110, 0, 0.3, 'sawtooth', 0.4);
      tone(82, 0.15, 0.4, 'sawtooth', 0.4);
    },
  };
}
