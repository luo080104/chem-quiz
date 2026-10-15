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

export function sfx(kind: SfxKind): void {
  if (!sfxOn) return;
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const table: Record<SfxKind, { f: number[]; type: OscillatorType; dur: number; vol: number }> = {
    tap: { f: [520], type: "square", dur: 0.06, vol: 0.05 },
    open: { f: [440, 660], type: "square", dur: 0.12, vol: 0.05 },
    next: { f: [600, 760], type: "square", dur: 0.1, vol: 0.05 },
    correct: { f: [660, 880, 1180], type: "triangle", dur: 0.22, vol: 0.07 },
    wrong: { f: [200, 150], type: "sawtooth", dur: 0.2, vol: 0.06 },
  };
  const cfg = table[kind];
  o.type = cfg.type;
  cfg.f.forEach((f, i) => o.frequency.setValueAtTime(f, t + i * (cfg.dur / cfg.f.length)));
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(cfg.vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
  o.connect(g).connect(masterGain ?? c.destination);
  o.start(t);
  o.stop(t + cfg.dur + 0.02);
}

// gentle looping arpeggio (main screen only)
const SCALE = [261.63, 329.63, 392.0, 523.25, 440.0, 349.23]; // C E G C A F

export function startMusic(): void {
  if (!musicOn || musicPlaying) return;
  const c = ac();
  if (!c) return;
  if (c.state === "suspended") void c.resume();
  musicPlaying = true;
  musicStep = 0;
  const play = () => {
    if (!musicPlaying || !c) return;
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "triangle";
    o.frequency.value = SCALE[musicStep % SCALE.length];
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.028, t + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    o.connect(g).connect(masterGain ?? c.destination);
    o.start(t);
    o.stop(t + 1.2);
    musicStep++;
  };
  play();
  musicTimer = window.setInterval(play, 760);
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
