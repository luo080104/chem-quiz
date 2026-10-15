/**
 * Lightweight Web Audio: crisp SFX + a calm ambient loop.
 * SFX and music have independent volumes (and on/off toggles). No audio files:
 * fully offline, no copyright issues. Audio needs a user gesture to unlock.
 */

const LS_SFX = "chemquiz.sfx";
const LS_MUSIC = "chemquiz.music";
const LS_VOL_SFX = "chemquiz.volSfx";
const LS_VOL_MUSIC = "chemquiz.volMusic";

let ctx: AudioContext | null = null;
let sfxGain: GainNode | null = null;
let musicGain: GainNode | null = null;

let sfxOn = localStorage.getItem(LS_SFX) !== "0";
let musicOn = localStorage.getItem(LS_MUSIC) !== "0";
let sfxVolume = num(localStorage.getItem(LS_VOL_SFX), 0.9);
let musicVolume = num(localStorage.getItem(LS_VOL_MUSIC), 0.5);

function num(v: string | null, d: number): number {
  const n = Number(v);
  return v !== null && n >= 0 && n <= 1 ? n : d;
}
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

let musicPlaying = false;
let musicTimer: number | null = null;
let musicStep = 0;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    ctx = new Ctor();
    // soft limiter so boosted SFX never clip/hiss
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -6;
    comp.knee.value = 8;
    comp.ratio.value = 4;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    comp.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxVolume;
    sfxGain.connect(comp);
    musicGain = ctx.createGain();
    musicGain.gain.value = musicVolume;
    musicGain.connect(comp);
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

export function getSfxVolume(): number {
  return sfxVolume;
}
export function setSfxVolume(v: number): void {
  sfxVolume = clamp01(v);
  localStorage.setItem(LS_VOL_SFX, String(sfxVolume));
  if (sfxGain) sfxGain.gain.value = sfxVolume;
}
export function getMusicVolume(): number {
  return musicVolume;
}
export function setMusicVolume(v: number): void {
  musicVolume = clamp01(v);
  localStorage.setItem(LS_VOL_MUSIC, String(musicVolume));
  if (musicGain) musicGain.gain.value = musicVolume;
}

// ---- SFX ----
function blip(dest: GainNode, freq: number, at: number, dur: number, vol: number, type: OscillatorType = "sine"): void {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(dest);
  o.start(at);
  o.stop(at + dur + 0.02);
}

export type SfxKind = "tap" | "next" | "correct" | "wrong" | "open";

export function sfx(kind: SfxKind): void {
  if (!sfxOn) return;
  const c = ac();
  if (!c || !sfxGain) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime;
  const d = sfxGain;
  switch (kind) {
    case "tap":
      blip(d, 1500, t, 0.06, 0.6, "triangle");
      blip(d, 3000, t, 0.025, 0.28, "sine");
      break;
    case "open":
      blip(d, 1046.5, t, 0.08, 0.5, "triangle");
      blip(d, 1568.0, t + 0.05, 0.09, 0.45, "triangle");
      break;
    case "next":
      blip(d, 1318.5, t, 0.07, 0.55, "triangle");
      blip(d, 1760.0, t + 0.045, 0.08, 0.45, "triangle");
      break;
    case "correct":
      blip(d, 783.99, t, 0.11, 0.5, "triangle");
      blip(d, 987.77, t + 0.09, 0.11, 0.5, "triangle");
      blip(d, 1318.5, t + 0.18, 0.2, 0.5, "triangle");
      break;
    case "wrong":
      blip(d, 311.13, t, 0.15, 0.45, "triangle");
      blip(d, 207.65, t + 0.12, 0.22, 0.45, "triangle");
      break;
  }
}

// ---- music ----
const PROGRESSION: number[][] = [
  [261.63, 329.63, 392.0, 130.81],
  [220.0, 261.63, 329.63, 110.0],
  [174.61, 220.0, 261.63, 87.31],
  [196.0, 246.94, 293.66, 98.0],
];

export function startMusic(): void {
  if (!musicOn || musicPlaying) return;
  const c = ac();
  if (!c || !musicGain) return;
  if (c.state === "suspended") void c.resume();
  musicPlaying = true;
  musicStep = 0;
  const playChord = () => {
    if (!musicPlaying || !c || !musicGain) return;
    const t = c.currentTime;
    const dur = 3.2;
    const freqs = PROGRESSION[musicStep % PROGRESSION.length];
    freqs.forEach((f, i) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const vol = i === freqs.length - 1 ? 0.04 : 0.03;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.9);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(musicGain!);
      o.start(t);
      o.stop(t + dur + 0.1);
    });
    blip(musicGain, freqs[0] * 4, t + 0.2, 1.6, 0.012, "sine");
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
