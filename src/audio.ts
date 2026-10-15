/**
 * Lightweight Web Audio: short pixel-style SFX + a gentle background loop.
 * No audio files (fully offline, no copyright issues). All toggles persist in
 * localStorage. Audio must be unlocked by a user gesture (browser policy).
 */

const LS_SFX = "chemquiz.sfx";
const LS_MUSIC = "chemquiz.music";

let ctx: AudioContext | null = null;
let sfxOn = localStorage.getItem(LS_SFX) !== "0";
let musicOn = localStorage.getItem(LS_MUSIC) !== "0";

let musicPlaying = false;
let musicTimer: number | null = null;
let musicStep = 0;
let masterGain: GainNode | null = null;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export function unlockAudio(): void {
  const c = ac();
  if (c && c.state === "suspended") void c.resume();
}

export function isSfxOn(): boolean {
  return sfxOn;
}
export function setSfxOn(v: boolean): void {
  sfxOn = v;
  localStorage.setItem(LS_SFX, v ? "1" : "0");
}
export function isMusicOn(): boolean {
  return musicOn;
}
export function setMusicOn(v: boolean): void {
  musicOn = v;
  localStorage.setItem(LS_MUSIC, v ? "1" : "0");
  if (!v) stopMusic();
}

export type SfxKind = "tap" | "next" | "correct" | "wrong" | "open";

// one crisp sine "blip"
function blip(c: AudioContext, freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine"): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(masterGain ?? c.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

export function sfx(kind: SfxKind): void {
  if (!sfxOn) return;
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime;
  switch (kind) {
    case "tap":
      // crisp high tick (louder)
      blip(c, 1500, t, 0.05, 0.16, "triangle");
      blip(c, 3000, t, 0.02, 0.07, "sine");
      break;
    case "open":
      blip(c, 1046.5, t, 0.07, 0.13, "triangle");
      blip(c, 1568.0, t + 0.05, 0.08, 0.12, "triangle");
      break;
    case "next":
      blip(c, 1318.5, t, 0.06, 0.14, "triangle");
      blip(c, 1760.0, t + 0.045, 0.07, 0.12, "triangle");
      break;
    case "correct":
      blip(c, 783.99, t, 0.1, 0.12, "triangle");
      blip(c, 987.77, t + 0.09, 0.1, 0.12, "triangle");
      blip(c, 1318.5, t + 0.18, 0.18, 0.12, "triangle");
      break;
    case "wrong":
      blip(c, 311.13, t, 0.14, 0.11, "triangle");
      blip(c, 207.65, t + 0.12, 0.2, 0.11, "triangle");
      break;
  }
}

// calm ambient chord pad loop (main screen only): C - Am - F - G
const PROGRESSION: number[][] = [
  [261.63, 329.63, 392.0, 130.81],
  [220.0, 261.63, 329.63, 110.0],
  [174.61, 220.0, 261.63, 87.31],
  [196.0, 246.94, 293.66, 98.0],
];

export function startMusic(): void {
  if (!musicOn || musicPlaying) return;
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  musicPlaying = true;
  musicStep = 0;
  const playChord = () => {
    if (!musicPlaying || !c) return;
    const t = c.currentTime;
    const dur = 3.2;
    const freqs = PROGRESSION[musicStep % PROGRESSION.length];
    freqs.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const vol = i === freqs.length - 1 ? 0.02 : 0.015;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.9);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(masterGain ?? c.destination);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
    // faint high shimmer
    blip(c, freqs[0] * 4, t + 0.2, 1.6, 0.006, "sine");
    musicStep++;
  };
  playChord();
  musicTimer = window.setInterval(playChord, 3100);
}

export function stopMusic(): void {
  musicPlaying = false;
  if (musicTimer !== null) {
    window.clearInterval(musicTimer);
    musicTimer = null;
  }
}

export function isMusicPlaying(): boolean {
  return musicPlaying;
}
