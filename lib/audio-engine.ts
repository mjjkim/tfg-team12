import { CHANGE_BANDS, DEAD_ZONE_PERCENT } from './stocks';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq: number, durationMs: number, type: OscillatorType, volume = 0.05) {
  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationMs / 1000);
}

export function calculateChangeBand(ratePercent: number): number {
  const abs = Math.abs(ratePercent);
  if (abs <= DEAD_ZONE_PERCENT) return 0;
  for (let i = 0; i < CHANGE_BANDS.length; i += 1) {
    if (abs <= CHANGE_BANDS[i]) return i + 1;
  }
  return CHANGE_BANDS.length;
}

export function playTrendTone(direction: 'up' | 'down', band: number) {
  const base = 320 + band * 55;
  if (direction === 'up') {
    playTone(base, 80, 'sine', 0.04);
    playTone(base + 180, 80, 'triangle', 0.04);
  } else {
    playTone(base, 80, 'square', 0.04);
    playTone(Math.max(120, base - 170), 80, 'sawtooth', 0.04);
  }
}

export async function playHeartbeat(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(40);
    return;
  }

  const ctx = getAudioContext();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  gain.gain.setValueAtTime(0.025, ctx.currentTime);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.1);
  return new Promise((resolve) => setTimeout(resolve, 120));
}

export function playSonificationTone(freq: number, durationMs = 140): Promise<void> {
  return new Promise((resolve) => {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
    osc.onended = () => resolve();
  });
}
