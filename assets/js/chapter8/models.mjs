// SI units internally: seconds, volts, hertz, ohms, farads, radians.
import { firstOrder } from "../models.mjs";
import { rng, normal, rms, spectrum } from "../chapter3-models.mjs";
export { rms };
export function finite(...xs) {
  if (xs.some((x) => !Number.isFinite(x)))
    throw new RangeError("Enter finite numerical values.");
}
export function positive(...xs) {
  finite(...xs);
  if (xs.some((x) => x <= 0))
    throw new RangeError("Positive values are required.");
}
const nonnegative = (...xs) => {
  finite(...xs);
  if (xs.some((x) => x < 0))
    throw new RangeError("Amplitudes and frequencies must be nonnegative.");
};
export const hzToRad = (f) => {
  finite(f);
  return 2 * Math.PI * f;
};
export const radToHz = (w) => {
  finite(w);
  return w / (2 * Math.PI);
};
export const radians = (deg) => {
  finite(deg);
  return (deg * Math.PI) / 180;
};
export function validateSignal(dc, components) {
  finite(dc);
  if (
    !Array.isArray(components) ||
    components.length < 1 ||
    components.length > 8
  )
    throw new RangeError("Use 1–8 sinusoidal components.");
  components.forEach((c) => {
    nonnegative(c.a, c.f);
    finite(c.p);
  });
}
export function signalAt(t, dc, components) {
  finite(t);
  validateSignal(dc, components);
  const value =
    dc +
    components.reduce((v, c) => v + c.a * Math.sin(hzToRad(c.f) * t + c.p), 0);
  finite(value);
  return value;
}
export const referenceComponents = [
  { a: 1, f: 0.075, p: 0 },
  { a: 0.5, f: 0.125, p: 0 },
];
export const compoundComponents = [
  { a: 1, f: 1 / 16, p: 0 },
  { a: 0.5, f: 1 / 8, p: 0 },
  { a: 0.25, f: 1 / 4, p: 0 },
  { a: 0.125, f: 1 / 2, p: 0 },
];
export function componentSpectrum(dc, components) {
  validateSignal(dc, components);
  const groups = new Map();
  let offset = dc;
  for (const c of components) {
    if (c.f === 0) {
      offset += c.a * Math.sin(c.p);
      continue;
    }
    const g = groups.get(c.f) ?? { re: 0, im: 0, scale: 0 };
    g.re += c.a * Math.cos(c.p);
    g.im += c.a * Math.sin(c.p);
    g.scale += c.a;
    groups.set(c.f, g);
  }
  const combined = [...groups]
    .map(([f, g]) => ({
      f,
      a: Math.hypot(g.re, g.im),
      p: Math.atan2(g.im, g.re),
      scale: g.scale,
    }))
    .filter((c) => c.a > 16 * Number.EPSILON * c.scale)
    .sort((a, b) => a.f - b.f)
    .map(({ f, a, p }) => ({ f, a, p }));
  return { dc: offset, components: combined };
}
export function signalInfo(dc, components) {
  const combined = componentSpectrum(dc, components),
    active = combined.components,
    freqs = active.map((c) => c.f);
  let period = null,
    fundamental = null;
  const matches = (ref) =>
    freqs.length === ref.length &&
    freqs.every((f, i) => Math.abs(f - ref[i].f) < 1e-14);
  if (freqs.length === 1) {
    fundamental = freqs[0];
    period = 1 / fundamental;
  } else if (matches(referenceComponents)) {
    fundamental = 0.025;
    period = 40;
  } else if (matches(compoundComponents)) {
    fundamental = 1 / 16;
    period = 16;
  }
  return {
    bandwidth: Math.max(0, ...freqs),
    period,
    fundamental,
    dc: combined.dc,
  };
}
export function sampleTimes(fs, duration) {
  positive(fs, duration);
  const count = Math.floor(fs * duration + 1e-10) + 1;
  if (count > 2001 || count < 2)
    throw new RangeError("Choose a record with 2–2001 samples, including t=0.");
  return Array.from({ length: count }, (_, k) => k / fs);
}
export function drawingTimes(duration, fmax) {
  positive(duration);
  nonnegative(fmax);
  const n = Math.max(200, Math.ceil(duration * fmax * 40));
  if (n > 24000)
    throw new RangeError(
      "Shorten the observation window or reduce the highest frequency (drawing limit: 600 cycles).",
    );
  return Array.from({ length: n + 1 }, (_, i) => (duration * i) / n);
}
export function alias(f, fs, phase = 0) {
  nonnegative(f);
  positive(fs);
  finite(phase);
  let signed = f - fs * Math.floor(f / fs + 0.5);
  if (Math.abs(signed) < 1e-12 * fs) signed = 0;
  const frequency = Math.abs(signed),
    positivePhase = signed < 0 ? Math.PI - phase : phase;
  return {
    signed,
    frequency,
    phase: positivePhase,
    dcValue: signed === 0 ? Math.sin(phase) : null,
    normalized: f / fs,
    digitalRadians: (2 * Math.PI * f) / fs,
    nyquistFrequency: fs / 2,
    nyquistRate: 2 * f,
    boundary: Math.abs(frequency - fs / 2) < 1e-12 * fs,
  };
}
export function sampleSignal({
  f = 8,
  fs = 6,
  a = 1,
  p = 0,
  duration = 2,
} = {}) {
  nonnegative(f, a);
  finite(p);
  const times = sampleTimes(fs, duration),
    fold = alias(f, fs, p),
    values = times.map((t) => a * Math.sin(hzToRad(f) * t + p)),
    compatible = times.map(
      (t) => a * Math.sin(hzToRad(fold.frequency) * t + fold.phase),
    );
  return { times, values, compatible, ...fold };
}
export function quantizer(x, bits, lo, hi) {
  finite(x, lo, hi, bits);
  if (!Number.isInteger(bits) || bits < 1 || bits > 20 || hi <= lo)
    throw new RangeError(
      "Use 1–20 bits and upper voltage above lower voltage.",
    );
  const levels = 2 ** bits,
    delta = (hi - lo) / levels;
  positive(delta);
  if (lo + delta === lo || hi - delta === hi)
    throw new RangeError(
      "The chosen code spacing is below floating-point precision at these range limits.",
    );
  const scaled = (x - lo) / delta,
    nearest = Math.round(scaled);
  // Arithmetic at a threshold can differ by a few ULPs: resolve such ties upwards.
  const candidate =
    Math.abs(scaled - nearest) <=
    8 * Number.EPSILON * Math.max(1, Math.abs(nearest), Math.abs(lo / delta))
      ? nearest
      : Math.floor(scaled);
  const code = Math.max(0, Math.min(levels - 1, candidate)),
    value = lo + (code + 0.5) * delta;
  finite(value, value - x);
  return {
    code,
    value,
    error: value - x,
    clipped: x < lo || x > hi,
    delta,
    levels,
    half: delta / 2,
  };
}
export function minimumBits(span, resolution) {
  positive(span, resolution);
  const bits = Math.max(1, Math.ceil(Math.log2(span / resolution)));
  finite(bits);
  return bits;
}
export function rc(R, C) {
  positive(R, C);
  const tau = R * C;
  positive(tau);
  const wc = 1 / tau,
    fc = wc / (2 * Math.PI);
  finite(wc, fc);
  return { R, C, tau, wc, fc };
}
export function response(kind, f, R, C) {
  if (!["lp", "hp"].includes(kind))
    throw new RangeError("Unknown passive filter topology.");
  nonnegative(f);
  const { tau, fc } = rc(R, C),
    z = hzToRad(f) * tau;
  finite(z);
  const mag = kind === "lp" ? 1 / Math.hypot(1, z) : z / Math.hypot(1, z),
    phase =
      f === 0 && kind === "hp"
        ? null
        : kind === "lp"
          ? -Math.atan(z)
          : Math.PI / 2 - Math.atan(z);
  return { mag, phase, db: mag === 0 ? -Infinity : 20 * Math.log10(mag), fc };
}
export function filteredComponents(kind, dc, components, R, C) {
  validateSignal(dc, components);
  rc(R, C);
  return {
    dc: kind === "lp" ? dc : 0,
    components: components.map((c) => {
      if (c.f === 0) return { a: kind === "lp" ? c.a : 0, f: 0, p: c.p };
      const h = response(kind, c.f, R, C);
      return { ...c, a: c.a * h.mag, p: c.p + h.phase };
    }),
  };
}
export function rcStep(kind, t, R, C, amplitude = 1) {
  finite(t, amplitude);
  if (t < 0) return 0;
  const { tau } = rc(R, C);
  if (!["lp", "hp"].includes(kind))
    throw new RangeError("Unknown filter topology.");
  return amplitude * (kind === "lp" ? firstOrder(t, tau) : Math.exp(-t / tau));
}
export function zeroStateSine(kind, t, R, C, a = 1, f = 1, p = 0) {
  nonnegative(t, a, f);
  finite(p);
  const { tau } = rc(R, C),
    h = response(kind, f, R, C);
  if (f === 0) return rcStep(kind, t, R, C, a * Math.sin(p));
  const steady = a * h.mag * Math.sin(hzToRad(f) * t + p + h.phase),
    initial = kind === "lp" ? 0 : a * Math.sin(p),
    steady0 = a * h.mag * Math.sin(p + h.phase);
  return steady + (initial - steady0) * Math.exp(-t / tau);
}
// Source Rs in series with R, load RL in parallel with shunt C.
export function loadedLP(f, R, C, Rs, RL) {
  nonnegative(f, Rs);
  positive(RL);
  rc(R, C);
  const series = R + Rs,
    k = RL / (series + RL),
    tau = ((series * RL) / (series + RL)) * C,
    z = hzToRad(f) * tau;
  return {
    dcGain: k,
    tau,
    fc: 1 / (2 * Math.PI * tau),
    mag: k / Math.hypot(1, z),
    phase: -Math.atan(z),
  };
}
export const E12 = [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82];
export const E24 = [
  10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56,
  62, 68, 75, 82, 91,
];
export function resistorDesign(target, C, series = "E24") {
  positive(target, C);
  const list = series === "E12" ? E12 : series === "E24" ? E24 : null;
  if (!list) throw new RangeError("Select E12 or E24.");
  const ideal = 1 / (2 * Math.PI * target * C);
  positive(ideal);
  const decade = Math.floor(Math.log10(ideal)) - 1,
    candidates = [-1, 0, 1].flatMap((d) =>
      list.map((v) => v * 10 ** (decade + d)),
    );
  const selected = candidates.reduce((a, b) =>
      Math.abs(1 / (2 * Math.PI * a * C) - target) <=
      Math.abs(1 / (2 * Math.PI * b * C) - target)
        ? a
        : b,
    ),
    achieved = rc(selected, C).fc;
  return {
    ideal,
    selected,
    achieved,
    deviation: (100 * (achieved - target)) / target,
    series,
  };
}
export function sensorRun({
  a = 0.002,
  offset = 0.003,
  noise = 0.0005,
  gain = 100,
  f = 2,
  seed = 42,
  lo = -1,
  hi = 1,
} = {}) {
  nonnegative(a, noise, f);
  positive(gain);
  finite(offset, seed, lo, hi);
  if (hi <= lo)
    throw new RangeError("ADC upper range must exceed lower range.");
  if (!Number.isInteger(seed)) throw new RangeError("Use an integer seed.");
  if (f >= 100)
    throw new RangeError(
      "This illustrative 200 samples/s sensor snapshot requires a useful frequency below 100 Hz; use the aliasing lab for faster inputs.",
    );
  const random = rng(seed),
    times = sampleTimes(200, 1),
    useful = times.map((t) => a * Math.sin(hzToRad(f) * t)),
    disturbance = times.map(() => noise * normal(random)),
    raw = times.map((_, i) => offset + useful[i] + disturbance[i]),
    conditioned = raw.map((x) => x * gain),
    clipped = conditioned.map((x) => Math.max(lo, Math.min(hi, x))),
    signalRMS = rms(useful),
    noiseRMS = rms(disturbance),
    snr =
      noiseRMS === 0
        ? signalRMS === 0
          ? null
          : Infinity
        : signalRMS === 0
          ? -Infinity
          : 20 * Math.log10(signalRMS / noiseRMS);
  conditioned.forEach((x) => finite(x));
  return {
    times,
    useful,
    raw,
    conditioned,
    clipped,
    signalRMS,
    noiseRMS,
    snr,
    inputBound: Math.max(...raw.map(Math.abs)),
    outputBound: Math.max(...conditioned.map(Math.abs)),
    clipping: conditioned.filter((x) => x < lo || x > hi).length,
  };
}
export function estimateSpectrum(values, fs) {
  const bins = spectrum(values, fs);
  return {
    bins,
    fs,
    n: values.length,
    recordDuration: values.length / fs,
    resolution: fs / values.length,
    dc: values.reduce((s, v) => s + v, 0) / values.length,
  };
}
export function conditioning({
  f = 2,
  a = 1,
  interference = 32,
  interferenceA = 0.4,
  fc = 5,
  fs = 20,
  duration = 1,
} = {}) {
  nonnegative(f, a, interference, interferenceA);
  positive(fc);
  const R = 1 / (2 * Math.PI * fc),
    C = 1,
    components = [
      { a, f, p: 0 },
      { a: interferenceA, f: interference, p: 0.4 },
    ],
    out = filteredComponents("lp", 0, components, R, C),
    times = sampleTimes(fs, duration);
  return {
    components,
    out,
    times,
    raw: times.map((t) => signalAt(t, 0, components)),
    filtered: times.map((t) => signalAt(t, out.dc, out.components)),
    usefulGain: response("lp", f, R, C).mag,
    residual: interferenceA * response("lp", interference, R, C).mag,
    fold: alias(interference, fs, 0.4),
  };
}
export const challengeDefaults = {
  useful: 5,
  a: 1,
  interference: 190,
  interferenceA: 0.5,
  fc: 20,
  fs: 100,
  bits: 12,
  lo: -2,
  hi: 2,
  offset: 0.1,
  maxLoss: 5,
  maxResidual: 0.06,
  maxDelta: 0.002,
  validationF: 4,
  validationA: 0.8,
};
export function challenge(s) {
  const {
    useful,
    a,
    interference,
    interferenceA,
    fc,
    fs,
    bits,
    lo,
    hi,
    offset,
    maxLoss,
    maxResidual,
    maxDelta,
  } = s;
  nonnegative(useful, a, interference, interferenceA);
  positive(useful, fc, fs, maxResidual, maxDelta);
  finite(lo, hi, offset, maxLoss);
  if (maxLoss <= 0 || maxLoss >= 100)
    throw new RangeError(
      "Useful-signal loss limit must be between 0 and 100%.",
    );
  const adc = quantizer(0, bits, lo, hi),
    R = 1 / (2 * Math.PI * fc),
    gain = response("lp", useful, R, 1).mag,
    residual = interferenceA * response("lp", interference, R, 1).mag,
    bound = Math.abs(offset) + a * gain + residual,
    headroom = Math.min(hi - offset, offset - lo),
    checks = {
      bandwidth: fs > 2 * useful,
      useful: 100 * (1 - gain) <= maxLoss,
      interference: residual <= maxResidual,
      clipping: a * gain + residual <= headroom,
      resolution: adc.delta <= maxDelta,
    };
  const fcMin = useful / Math.sqrt((1 - maxLoss / 100) ** -2 - 1),
    fcMax =
      interferenceA <= maxResidual
        ? Infinity
        : interference / Math.sqrt((interferenceA / maxResidual) ** 2 - 1);
  return {
    gain,
    residual,
    bound,
    delta: adc.delta,
    checks,
    pass: Object.values(checks).every(Boolean),
    fcMin,
    fcMax,
    feasible: fcMin <= fcMax,
    alias: alias(interference, fs),
  };
}
export function validateChallenge(s) {
  positive(s.validationF);
  nonnegative(s.validationA);
  if (s.validationF === s.useful && s.validationA === s.a)
    throw new RangeError(
      "Validate with a different useful frequency or amplitude.",
    );
  return challenge({ ...s, useful: s.validationF, a: s.validationA });
}
