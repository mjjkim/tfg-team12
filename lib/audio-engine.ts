import { CHANGE_BANDS, DEAD_ZONE_PERCENT } from './stocks';

type AudioContextStateSafe = AudioContext['state'];
type TrendDirection = 'up' | 'down';

type TrendToneState = {
  upCarrier: OscillatorNode;
  upHarmonic: OscillatorNode;
  upHarmonicGain: GainNode;
  upLfo: OscillatorNode;
  upLfoGain: GainNode;
  upFilter: BiquadFilterNode;

  downCarrier: OscillatorNode;
  downSub: OscillatorNode;
  downSubGain: GainNode;
  downLfo: OscillatorNode;
  downLfoGain: GainNode;
  downShaper: WaveShaperNode;
  downFilter: BiquadFilterNode;
  downNoiseSource: AudioBufferSourceNode;
  downNoiseFilter: BiquadFilterNode;

  upGain: GainNode;
  downGain: GainNode;
  downNoiseGain: GainNode;
  outputGain: GainNode;

  direction: TrendDirection;
  band: number;
  openPrice: number;
  currentPrice: number;
  lastFrequency: number;
};

const TREND_SOUND = {
  baseHz: 520,
  hzPerPercentUnderOne: 900,
  hzPerPercentOverOne: 180,
  maxPercentForTone: 120,
  minHz: 120,
  maxHz: 4800,

  pitchGlideSec: 0.06,

  up: {
    volume: 0.026,
    volumeByBand: 0.0045,
    cutoff: 7200,
    q: 0.28,
    harmonicRatio: 2.01,
    harmonicLevel: 0.16,
    lfoRateBase: 4.8,
    lfoBandScale: 0.12,
    lfoDepthBase: 3.5,
    lfoBandScaleDepth: 0.16
  },

  down: {
    pitchRatio: 0.34,
    volume: 0.046,
    volumeByBand: 0.006,
    subLevel: 0.24,
    cutoff: 720,
    q: 1.7,
    lfoRateBase: 5.2,
    lfoBandScale: 0.18,
    lfoDepthBase: 18,
    lfoBandScaleDepth: 1.5,
    noiseByBand: 0.0013
  },

  distortionAmount: 48,
  crossfadeSec: 0.08
};

let audioCtx: AudioContext | null = null;
let resumePromise: Promise<void> | null = null;
let trendTone: TrendToneState | null = null;
let noiseBufferCache: AudioBuffer | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as any;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

async function ensureAudioContextRunning(): Promise<boolean> {
  const ctx = getAudioContext();
  if (ctx.state === 'running') return true;
  if (ctx.state === 'suspended' || (ctx.state as AudioContextStateSafe) === 'interrupted') {
    if (!resumePromise) {
      resumePromise = ctx
        .resume()
        .catch(() => {})
        .then(() => {})
        .finally(() => {
          resumePromise = null;
        });
    }
    await resumePromise;
    return (ctx.state as AudioContextStateSafe) === 'running';
  }
  return false;
}

function killAudioNode(node: AudioNode | null) {
  if (!node) return;
  try {
    node.disconnect();
  } catch {
    // ignore
  }
  const maybeStop = node as OscillatorNode;
  if (typeof (maybeStop as any).stop === 'function') {
    try {
      maybeStop.stop();
    } catch {
      // ignore
    }
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function makeDistortionCurve(amount: number): Float32Array<ArrayBuffer> {
  const nSamples = 44100;
  const curve = new Float32Array(
    new ArrayBuffer(nSamples * Float32Array.BYTES_PER_ELEMENT)
  );
  for (let i = 0; i < nSamples; i += 1) {
    const x = (i * 2) / nSamples - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  return curve;
}

function makeNoiseBuffer(ctx: AudioContext): AudioBuffer {
  if (noiseBufferCache) return noiseBufferCache;
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) {
    data[i] = Math.random() * 2 - 1;
  }
  noiseBufferCache = buffer;
  return buffer;
}

function bandToLevel(band: number): number {
  if (band <= 0) return 1;
  return clampNumber(band, 1, CHANGE_BANDS.length);
}

function percentChange(openPrice: number, currentPrice: number): number {
  if (!openPrice || openPrice <= 0 || !Number.isFinite(openPrice) || !Number.isFinite(currentPrice)) return 0;
  return Math.abs((currentPrice - openPrice) / openPrice) * 100;
}

function frequencyFromChange(percent: number): number {
  const bounded = clampNumber(percent, 0, TREND_SOUND.maxPercentForTone);
  const mapped =
    bounded <= 1
      ? bounded * TREND_SOUND.hzPerPercentUnderOne
      : TREND_SOUND.hzPerPercentUnderOne + (bounded - 1) * TREND_SOUND.hzPerPercentOverOne;
  const raw = TREND_SOUND.baseHz + mapped;
  return clampNumber(raw, TREND_SOUND.minHz, TREND_SOUND.maxHz);
}

function createTrendTone(): TrendToneState {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const noiseBuffer = makeNoiseBuffer(ctx);

  const upCarrier = ctx.createOscillator();
  const upHarmonic = ctx.createOscillator();
  const upHarmonicGain = ctx.createGain();
  const upLfo = ctx.createOscillator();
  const upLfoGain = ctx.createGain();
  const upFilter = ctx.createBiquadFilter();
  const upGain = ctx.createGain();

  const downCarrier = ctx.createOscillator();
  const downSub = ctx.createOscillator();
  const downSubGain = ctx.createGain();
  const downLfo = ctx.createOscillator();
  const downLfoGain = ctx.createGain();
  const downGain = ctx.createGain();
  const downShaper = ctx.createWaveShaper();
  const downFilter = ctx.createBiquadFilter();
  const downNoiseSource = ctx.createBufferSource();
  const downNoiseFilter = ctx.createBiquadFilter();
  const downNoiseGain = ctx.createGain();

  const outputGain = ctx.createGain();

  upCarrier.type = 'sine';
  upCarrier.frequency.setValueAtTime(TREND_SOUND.baseHz, now);
  upCarrier.detune.setValueAtTime(0, now);

  upHarmonic.type = 'triangle';
  upHarmonic.frequency.setValueAtTime(TREND_SOUND.baseHz * TREND_SOUND.up.harmonicRatio, now);
  upHarmonic.detune.setValueAtTime(3, now);

  upLfo.type = 'sine';
  upLfo.frequency.setValueAtTime(TREND_SOUND.up.lfoRateBase, now);
  upLfoGain.gain.setValueAtTime(TREND_SOUND.up.lfoDepthBase, now);

  upFilter.type = 'lowpass';
  upFilter.frequency.setValueAtTime(TREND_SOUND.up.cutoff, now);
  upFilter.Q.setValueAtTime(TREND_SOUND.up.q, now);

  downCarrier.type = 'sawtooth';
  downCarrier.frequency.setValueAtTime(TREND_SOUND.baseHz * TREND_SOUND.down.pitchRatio, now);
  downCarrier.detune.setValueAtTime(-7, now);

  downSub.type = 'square';
  downSub.frequency.setValueAtTime(TREND_SOUND.baseHz * TREND_SOUND.down.pitchRatio * 0.505, now);
  downSub.detune.setValueAtTime(-16, now);
  downSubGain.gain.setValueAtTime(TREND_SOUND.down.subLevel, now);

  downLfo.type = 'sine';
  downLfo.frequency.setValueAtTime(TREND_SOUND.down.lfoRateBase, now);
  downLfoGain.gain.setValueAtTime(TREND_SOUND.down.lfoDepthBase, now);

  downShaper.curve = makeDistortionCurve(TREND_SOUND.distortionAmount);
  downShaper.oversample = '4x';

  downFilter.type = 'lowpass';
  downFilter.frequency.setValueAtTime(TREND_SOUND.down.cutoff, now);
  downFilter.Q.setValueAtTime(TREND_SOUND.down.q, now);

  downNoiseSource.buffer = noiseBuffer;
  downNoiseSource.loop = true;
  downNoiseSource.start(now);
  downNoiseFilter.type = 'bandpass';
  downNoiseFilter.frequency.setValueAtTime(340, now);
  downNoiseFilter.Q.setValueAtTime(0.75, now);

  upLfo.connect(upLfoGain);
  upLfoGain.connect(upCarrier.frequency);

  upCarrier.connect(upFilter);
  upHarmonic.connect(upHarmonicGain);
  upHarmonicGain.connect(upFilter);
  upFilter.connect(upGain);

  downLfo.connect(downLfoGain);
  downLfoGain.connect(downCarrier.detune);
  downLfoGain.connect(downSub.detune);

  downCarrier.connect(downShaper);
  downShaper.connect(downFilter);
  downSub.connect(downSubGain);
  downSubGain.connect(downFilter);
  downFilter.connect(downGain);

  downNoiseSource.connect(downNoiseFilter);
  downNoiseFilter.connect(downNoiseGain);

  upGain.connect(outputGain);
  downGain.connect(outputGain);
  downNoiseGain.connect(outputGain);
  outputGain.connect(ctx.destination);

  upGain.gain.setValueAtTime(0.0001, now);
  downGain.gain.setValueAtTime(0.0001, now);
  downNoiseGain.gain.setValueAtTime(0.00001, now);
  upHarmonicGain.gain.setValueAtTime(TREND_SOUND.up.harmonicLevel * 0.0015, now);
  outputGain.gain.setValueAtTime(0.86, now);

  upCarrier.start(now);
  upHarmonic.start(now);
  upLfo.start(now);
  downCarrier.start(now);
  downSub.start(now);
  downLfo.start(now);

  return {
    upCarrier,
    upHarmonic,
    upHarmonicGain,
    upLfo,
    upLfoGain,
    upFilter,
    downCarrier,
    downSub,
    downSubGain,
    downLfo,
    downLfoGain,
    downShaper,
    downFilter,
    downNoiseSource,
    downNoiseFilter,
    upGain,
    downGain,
    downNoiseGain,
    outputGain,
    direction: 'up',
    band: 0,
    openPrice: 0,
    currentPrice: 0,
    lastFrequency: TREND_SOUND.baseHz
  };
}

function applyTrendProfile(direction: TrendDirection, band: number, openPrice: number, currentPrice: number) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  if (!trendTone) return;

  const normalizedBand = bandToLevel(band);
  const isUp = direction === 'up';
  const changeRate = percentChange(openPrice, currentPrice);
  const targetFrequency = frequencyFromChange(changeRate);
  const downTargetFrequency = clampNumber(
    targetFrequency * TREND_SOUND.down.pitchRatio,
    80,
    1500
  );

  trendTone.direction = direction;
  trendTone.band = normalizedBand;
  trendTone.openPrice = openPrice;
  trendTone.currentPrice = currentPrice;

  const upTarget = clampNumber(
    TREND_SOUND.up.volume + normalizedBand * TREND_SOUND.up.volumeByBand,
    0.004,
    0.14
  );
  const downTarget = clampNumber(
    TREND_SOUND.down.volume + normalizedBand * TREND_SOUND.down.volumeByBand,
    0.004,
    0.22
  );
  const downNoiseTarget = isUp
    ? 0.00001
    : clampNumber(TREND_SOUND.down.noiseByBand * normalizedBand, 0.001, 0.009);
  const upHarmonicTarget = clampNumber(
    upTarget * TREND_SOUND.up.harmonicLevel,
    0.001,
    0.06
  );

  trendTone.upGain.gain.cancelScheduledValues(now);
  trendTone.upGain.gain.setValueAtTime(trendTone.upGain.gain.value, now);

  trendTone.downGain.gain.cancelScheduledValues(now);
  trendTone.downGain.gain.setValueAtTime(trendTone.downGain.gain.value, now);

  trendTone.downNoiseGain.gain.cancelScheduledValues(now);
  trendTone.downNoiseGain.gain.setValueAtTime(trendTone.downNoiseGain.gain.value, now);

  trendTone.upHarmonicGain.gain.cancelScheduledValues(now);
  trendTone.upHarmonicGain.gain.setValueAtTime(trendTone.upHarmonicGain.gain.value, now);

  if (isUp) {
    trendTone.upGain.gain.linearRampToValueAtTime(upTarget, now + TREND_SOUND.crossfadeSec);
    trendTone.upHarmonicGain.gain.linearRampToValueAtTime(upHarmonicTarget, now + TREND_SOUND.crossfadeSec);
    trendTone.downGain.gain.linearRampToValueAtTime(0.00001, now + TREND_SOUND.crossfadeSec);
    trendTone.downNoiseGain.gain.linearRampToValueAtTime(0.00001, now + TREND_SOUND.crossfadeSec);

    trendTone.upFilter.frequency.setValueAtTime(
      Math.min(TREND_SOUND.up.cutoff, 3200 + targetFrequency * 1.2),
      now
    );
    trendTone.upFilter.Q.setValueAtTime(TREND_SOUND.up.q, now);
    trendTone.upLfo.frequency.setValueAtTime(
      TREND_SOUND.up.lfoRateBase + normalizedBand * TREND_SOUND.up.lfoBandScale,
      now
    );
    trendTone.upLfoGain.gain.setValueAtTime(
      TREND_SOUND.up.lfoDepthBase + normalizedBand * TREND_SOUND.up.lfoBandScaleDepth,
      now
    );

  } else {
    trendTone.upGain.gain.linearRampToValueAtTime(0.00001, now + TREND_SOUND.crossfadeSec);
    trendTone.upHarmonicGain.gain.linearRampToValueAtTime(0.00001, now + TREND_SOUND.crossfadeSec);
    trendTone.downGain.gain.linearRampToValueAtTime(downTarget, now + TREND_SOUND.crossfadeSec);
    trendTone.downNoiseGain.gain.linearRampToValueAtTime(downNoiseTarget, now + TREND_SOUND.crossfadeSec);

    trendTone.downFilter.frequency.setValueAtTime(
      TREND_SOUND.down.cutoff + normalizedBand * 55,
      now
    );
    trendTone.downFilter.Q.setValueAtTime(
      TREND_SOUND.down.q + normalizedBand * 0.22,
      now
    );
    trendTone.downLfo.frequency.setValueAtTime(
      TREND_SOUND.down.lfoRateBase + normalizedBand * TREND_SOUND.down.lfoBandScale,
      now
    );
    trendTone.downLfoGain.gain.setValueAtTime(
      TREND_SOUND.down.lfoDepthBase + normalizedBand * TREND_SOUND.down.lfoBandScaleDepth,
      now
    );
    trendTone.downNoiseFilter.frequency.setValueAtTime(
      280 + normalizedBand * 45,
      now
    );
    trendTone.downNoiseFilter.Q.setValueAtTime(0.7 + normalizedBand * 0.04, now);
  }

  trendTone.upCarrier.frequency.cancelScheduledValues(now);
  trendTone.upCarrier.frequency.setValueAtTime(trendTone.lastFrequency, now);
  trendTone.upCarrier.frequency.linearRampToValueAtTime(targetFrequency, now + TREND_SOUND.pitchGlideSec);

  trendTone.upHarmonic.frequency.cancelScheduledValues(now);
  trendTone.upHarmonic.frequency.setValueAtTime(
    trendTone.lastFrequency * TREND_SOUND.up.harmonicRatio,
    now
  );
  trendTone.upHarmonic.frequency.linearRampToValueAtTime(
    targetFrequency * TREND_SOUND.up.harmonicRatio,
    now + TREND_SOUND.pitchGlideSec * 1.1
  );

  trendTone.downCarrier.frequency.cancelScheduledValues(now);
  trendTone.downCarrier.frequency.setValueAtTime(
    trendTone.lastFrequency * TREND_SOUND.down.pitchRatio,
    now
  );
  trendTone.downCarrier.frequency.linearRampToValueAtTime(
    downTargetFrequency,
    now + TREND_SOUND.pitchGlideSec
  );

  trendTone.downSub.frequency.cancelScheduledValues(now);
  trendTone.downSub.frequency.setValueAtTime(
    trendTone.lastFrequency * TREND_SOUND.down.pitchRatio * 0.505,
    now
  );
  trendTone.downSub.frequency.linearRampToValueAtTime(
    downTargetFrequency * 0.505,
    now + TREND_SOUND.pitchGlideSec * 1.2
  );

  trendTone.lastFrequency = targetFrequency;
}

export function startTrendTone(direction: TrendDirection, band = 1, openPrice = 0, currentPrice = 0) {
  void ensureAudioContextRunning().then(() => {
    if (!trendTone) {
      trendTone = createTrendTone();
    }

    const resolvedOpen = openPrice > 0 ? openPrice : trendTone.openPrice;
    const resolvedCurrent = currentPrice > 0 ? currentPrice : trendTone.currentPrice;
    applyTrendProfile(direction, band, resolvedOpen, resolvedCurrent);
  });
}

export function stopTrendTone() {
  if (!trendTone) return;

  const now = getAudioContext().currentTime;
  try {
    [trendTone.upGain, trendTone.downGain, trendTone.downNoiseGain, trendTone.outputGain].forEach((node) => {
      node.gain.cancelScheduledValues(now);
      node.gain.setValueAtTime(node.gain.value, now);
      node.gain.linearRampToValueAtTime(0.0001, now + 0.07);
    });

    const nodes: Array<AudioNode | null> = [
      trendTone.upCarrier,
      trendTone.upHarmonic,
      trendTone.upLfo,
      trendTone.upLfoGain,
      trendTone.upFilter,
      trendTone.downCarrier,
      trendTone.downSub,
      trendTone.downSubGain,
      trendTone.downLfo,
      trendTone.downLfoGain,
      trendTone.downShaper,
      trendTone.downFilter,
      trendTone.downNoiseSource,
      trendTone.downNoiseFilter,
      trendTone.upGain,
      trendTone.downGain,
      trendTone.downNoiseGain,
      trendTone.outputGain,
      trendTone.upHarmonicGain
    ];
    nodes.forEach((node) => killAudioNode(node));

    const stopAt = now + 0.12;
    try {
      trendTone.downNoiseSource.stop(stopAt);
    } catch {
      // ignore
    }
    try {
      trendTone.upCarrier.stop(stopAt);
    } catch {
      // ignore
    }
    try {
      trendTone.upHarmonic.stop(stopAt);
    } catch {
      // ignore
    }
    try {
      trendTone.downCarrier.stop(stopAt);
    } catch {
      // ignore
    }
    try {
      trendTone.downSub.stop(stopAt);
    } catch {
      // ignore
    }
    try {
      trendTone.upLfo.stop(stopAt);
    } catch {
      // ignore
    }
    try {
      trendTone.downLfo.stop(stopAt);
    } catch {
      // ignore
    }
  } finally {
    trendTone = null;
  }
}

function normalizeBand(ratePercent: number): number {
  const abs = Math.abs(ratePercent);
  if (abs <= DEAD_ZONE_PERCENT) return 0;
  for (let i = 0; i < CHANGE_BANDS.length; i += 1) {
    if (abs <= CHANGE_BANDS[i]) return i + 1;
  }
  return CHANGE_BANDS.length;
}

export function calculateChangeBand(ratePercent: number): number {
  return normalizeBand(ratePercent);
}

export function playTrendTone(direction: TrendDirection, band: number) {
  startTrendTone(direction, band);
  setTimeout(() => {
    stopTrendTone();
  }, 260);
}

export async function playHeartbeat(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(40);
    return;
  }

  const ready = await ensureAudioContextRunning();
  if (!ready) return;

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

export async function playSonificationTone(freq: number, durationMs = 140): Promise<void> {
  const ready = await ensureAudioContextRunning();
  if (!ready) return;

  const ctx = getAudioContext();
  return new Promise((resolve) => {
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

export async function primeAudioEngine(): Promise<void> {
  await ensureAudioContextRunning();
}







