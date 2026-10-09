// Chapter 3 illustrative models. Pressure: kPa; electrical signals: mV; time: s.
import { statistics } from "./models.mjs";
import { fitLine, standardPressure, airData } from "./chapter2-models.mjs";
function finite(...xs) {
  if (xs.some((x) => !Number.isFinite(x)))
    throw new RangeError("Finite inputs required");
}
function positive(x) {
  finite(x);
  if (x <= 0) throw new RangeError("Positive input required");
}
export function rng(seed) {
  finite(seed);
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return (state + 0.5) / 4294967296;
  };
}
export function normal(random) {
  return Math.sqrt(-2 * Math.log(random())) * Math.cos(2 * Math.PI * random());
}
export function reading(
  x,
  { offset = 0, gain = 0, temp = 20, coefficient = 0, drift = 0, bow = 0 } = {},
  disturbance = 0,
) {
  finite(x, offset, gain, temp, coefficient, drift, bow, disturbance);
  const contributions = {
    offset,
    gain: gain * x,
    temperature: coefficient * (temp - 20),
    drift,
    nonlinearity: bow * 4 * (x / 100) * (1 - x / 100),
    random: disturbance,
  };
  const error = Object.values(contributions).reduce((a, b) => a + b, 0);
  return { reference: x, measured: x + error, error, contributions };
}
export function errorMetrics(rows, fullScale = 100) {
  positive(fullScale);
  if (!rows.length) throw new RangeError("Measurements required");
  const errors = rows.map((r) => {
    finite(r.reference, r.measured);
    return r.measured - r.reference;
  });
  const mean = errors.reduce((a, b) => a + b, 0) / errors.length;
  const max = Math.max(...errors.map(Math.abs));
  return {
    mean,
    max,
    rmse: Math.sqrt(errors.reduce((s, e) => s + e * e, 0) / errors.length),
    percentFS: (100 * max) / fullScale,
  };
}
export function correction(rows, method = "linear") {
  if (rows.length < 2)
    throw new RangeError("At least two calibration points required");
  rows.forEach((r) => finite(r.reference, r.measured));
  if (method === "offset") {
    const b = rows[0].measured - rows[0].reference;
    return { description: `Subtract ${b.toFixed(3)} kPa`, apply: (y) => y - b };
  }
  if (method === "linear") {
    const { slope, offset } = fitLine([rows[0], rows.at(-1)]);
    if (!Number.isFinite(slope) || slope <= 0)
      throw new RangeError("Invertible increasing response required");
    return {
      description: `x̂ = (y − ${offset.toFixed(3)}) / ${slope.toFixed(5)}`,
      apply: (y) => (y - offset) / slope,
    };
  }
  if (method !== "multipoint") throw new RangeError("Unknown correction");
  const sorted = [...rows].sort((a, b) => a.measured - b.measured);
  if (
    sorted.some(
      (r, i) =>
        i &&
        (r.measured <= sorted[i - 1].measured ||
          r.reference <= sorted[i - 1].reference),
    )
  )
    throw new RangeError("Monotone calibration required");
  return {
    description:
      "Piecewise-linear inverse between measured calibration knots; endpoint extrapolation only for validation near range ends.",
    apply: (y) => {
      let i = sorted.findIndex((r) => r.measured >= y);
      i = i <= 0 ? 1 : i < 0 ? sorted.length - 1 : i;
      const a = sorted[i - 1],
        b = sorted[i];
      return (
        a.reference +
        ((y - a.measured) * (b.reference - a.reference)) /
          (b.measured - a.measured)
      );
    },
  };
}
export function budget(stages, correct = false) {
  if (!stages.length) throw new RangeError("Stages required");
  stages.forEach((s) => {
    finite(s.bias, s.bound);
    if (s.bound < 0)
      throw new RangeError("Nonnegative residual bound required");
  });
  const bias = correct ? 0 : stages.reduce((a, s) => a + s.bias, 0),
    residual = stages.reduce((a, s) => a + s.bound, 0);
  return {
    bias,
    residual,
    worst: Math.abs(bias) + residual,
    dominant: stages.reduce((a, b) => (b.bound > a.bound ? b : a)).name,
  };
}
export function standardUncertainty(bounds) {
  if (!bounds.length || bounds.some((b) => !Number.isFinite(b) || b < 0))
    throw new RangeError("Nonnegative bounds required");
  // ONLY independent, zero-mean rectangular residual contributions; NOT arbitrary systematic limits.
  return Math.sqrt(bounds.reduce((s, b) => s + (b * b) / 3, 0));
}
export function correlatedSEM(sigma, n, rho) {
  finite(sigma, n, rho);
  if (sigma < 0 || n < 2 || !Number.isInteger(n) || Math.abs(rho) >= 1)
    throw new RangeError("Invalid repeat experiment");
  let factor = n;
  for (let k = 1; k < n; k++) factor += 2 * (n - k) * rho ** k;
  return (sigma * Math.sqrt(factor)) / n;
}
const t95 = {
  5: 2.776445105,
  20: 2.093024054,
  100: 1.984216952,
  500: 1.96472939,
};
export function repeated({
  reference = 50,
  bias = 2,
  sigma = 1,
  n = 20,
  seed = 42,
  rho = 0,
  distribution = "normal",
} = {}) {
  finite(reference, bias, sigma, seed, rho);
  if (!(n in t95) || sigma < 0 || Math.abs(rho) >= 1)
    throw new RangeError("Invalid repeat experiment");
  if (!["normal", "uniform"].includes(distribution))
    throw new RangeError("Unknown distribution");
  const random = rng(seed),
    innovation = () =>
      distribution === "normal"
        ? normal(random)
        : Math.sqrt(3) * (2 * random() - 1);
  if (distribution === "uniform" && rho !== 0)
    throw new RangeError("Correlated example uses Gaussian innovations");
  let e = sigma * innovation();
  const values = Array.from({ length: n }, (_, i) => {
    if (i) e = rho * e + sigma * Math.sqrt(1 - rho * rho) * innovation();
    return reference + bias + e;
  });
  const { mean, sd } = statistics(values),
    naiveSEM = sd / Math.sqrt(n),
    modelSEM = correlatedSEM(sigma, n, rho);
  const half =
    rho !== 0
      ? 1.959963985 * modelSEM
      : distribution === "normal"
        ? t95[n] * naiveSEM
        : n >= 100
          ? 1.959963985 * naiveSEM
          : null;
  return {
    values,
    mean,
    sd,
    naiveSEM,
    modelSEM,
    half,
    interval: half === null ? null : [mean - half, mean + half],
  };
}
export function histogram(values, bins = 12) {
  if (values.length < 2 || !Number.isInteger(bins) || bins < 1)
    throw new RangeError("Invalid histogram");
  values.forEach((x) => finite(x));
  const min = Math.min(...values),
    max = Math.max(...values),
    width = (max - min || 1) / bins,
    counts = Array(bins).fill(0);
  values.forEach(
    (v) => counts[Math.min(bins - 1, Math.floor((v - min) / width))]++,
  );
  return { min, width, counts };
}
export function rms(values) {
  if (!values.length) throw new RangeError("Samples required");
  values.forEach((x) => finite(x));
  return Math.sqrt(values.reduce((s, x) => s + x * x, 0) / values.length);
}
export function snr(signal, noise) {
  const s = rms(signal),
    n = rms(noise);
  return s === 0 ? null : n === 0 ? Infinity : 20 * Math.log10(s / n);
}
export function signalRun({
  amplitude = 1,
  sigma = 0.15,
  line = 0.6,
  frequency = 50,
  fs = 500,
  duration = 1,
  drift = 0.15,
  transient = false,
  seed = 42,
  coupling = 1,
} = {}) {
  finite(
    amplitude,
    sigma,
    line,
    frequency,
    fs,
    duration,
    drift,
    seed,
    coupling,
  );
  if (
    amplitude < 0 ||
    sigma < 0 ||
    line < 0 ||
    drift < 0 ||
    coupling < 0 ||
    frequency <= 0 ||
    fs <= 2 * frequency ||
    duration <= 0 ||
    Math.round(fs * duration) > 2000 ||
    Math.round(fs * duration) < 8
  )
    throw new RangeError("Invalid signal conditions");
  const random = rng(seed),
    n = Math.round(fs * duration),
    t = Array.from({ length: n }, (_, i) => i / fs);
  const clean = t.map((v) => amplitude * Math.sin(2 * Math.PI * 2 * v));
  const noise = t.map(
    (v) =>
      sigma * normal(random) +
      coupling * line * Math.sin(2 * Math.PI * frequency * v) +
      drift * Math.sin(2 * Math.PI * 0.5 * v) +
      (transient && v > 0.35 && v < 0.37 ? coupling * 2 : 0),
  );
  return { t, clean, noise, measured: clean.map((v, i) => v + noise[i]), fs };
}
export function spectrum(values, fs) {
  positive(fs);
  if (values.length < 8 || values.length > 2000)
    throw new RangeError("Spectrum length 8–2000");
  values.forEach((v) => finite(v));
  const n = values.length,
    mean = statistics(values).mean;
  const window = values.map(
    (v, i) => (v - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))),
  );
  const gain = Array.from(
    { length: n },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)),
  ).reduce((a, b) => a + b, 0);
  return Array.from({ length: Math.floor(n / 2) + 1 }, (_, k) => {
    let re = 0,
      im = 0;
    for (let i = 0; i < n; i++) {
      const angle = (2 * Math.PI * k * i) / n;
      re += window[i] * Math.cos(angle);
      im -= window[i] * Math.sin(angle);
    }
    return [
      (k * fs) / n,
      (Math.hypot(re, im) / gain) * (k === 0 || 2 * k === n ? 1 : 2),
    ];
  });
}
export function condition(
  values,
  fs,
  { method = "none", window = 15, cutoff = 10, frequency = 50 } = {},
) {
  positive(fs);
  if (!values.length) throw new RangeError("Samples required");
  values.forEach((x) => finite(x));
  if (method === "none") return [...values];
  if (method === "moving") {
    if (!Number.isInteger(window) || window < 1 || window > 500)
      throw new RangeError("Invalid window");
    let sum = 0;
    return values.map((v, i) => {
      sum += v;
      if (i >= window) sum -= values[i - window];
      return sum / window;
    });
  }
  if (method === "lowpass") {
    positive(cutoff);
    if (cutoff >= fs / 2) throw new RangeError("Cutoff below Nyquist");
    const a = -Math.expm1((-2 * Math.PI * cutoff) / fs);
    let y = 0;
    return values.map((v) => (y += a * (v - y)));
  }
  if (method === "notch") {
    if (frequency <= 0 || frequency >= fs / 2)
      throw new RangeError("Notch below Nyquist");
    const c = Math.cos((2 * Math.PI * frequency) / fs),
      r = 0.95,
      g = (1 - 2 * r * c + r * r) / (2 - 2 * c);
    let x1 = 0,
      x2 = 0,
      y1 = 0,
      y2 = 0;
    return values.map((x) => {
      const y = g * (x - 2 * c * x1 + x2) + 2 * r * c * y1 - r * r * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    });
  }
  throw new RangeError("Unknown filter");
}
export function fidelity(
  fs,
  { method = "none", window = 15, cutoff = 10, frequency = 50 } = {},
) {
  // Probe the implemented filter at useful-signal frequency after two seconds of warmup.
  positive(fs);
  const f = 2,
    n = Math.round(fs * 4),
    clean = Array.from({ length: n }, (_, i) =>
      Math.sin((2 * Math.PI * f * i) / fs),
    );
  const out = condition(clean, fs, { method, window, cutoff, frequency });
  let sine = 0,
    cosine = 0;
  for (let i = n / 2; i < n; i++) {
    sine += out[i] * Math.sin((2 * Math.PI * f * i) / fs);
    cosine += out[i] * Math.cos((2 * Math.PI * f * i) / fs);
  }
  sine *= 4 / n;
  cosine *= 4 / n;
  return {
    amplitude: Math.hypot(sine, cosine),
    delay: -Math.atan2(cosine, sine) / (2 * Math.PI * f),
  };
}
export const hypotheses = [
  "Static pressure offset",
  "Pitot pressure gain error",
  "Random sensor noise",
  "Electrical interference",
];
export function aircraft(
  caseId = 0,
  validation = false,
  action = "none",
  temperature = 20,
) {
  if (!Number.isInteger(caseId) || caseId < 0 || caseId > 3)
    throw new RangeError("Unknown case");
  finite(temperature);
  const heights = validation ? [650, 1350, 2150] : [500, 1000, 2000],
    speeds = validation ? [35, 55, 75] : [40, 60, 80];
  const random = rng(validation ? 2026 : 71);
  return heights.map((h, i) => {
    const ps = standardPressure(h),
      pt = ps + 0.5 * 1.225 * speeds[i] ** 2;
    let staticError = caseId === 0 ? 120 + 3 * (temperature - 20) : 0,
      totalError = caseId === 1 ? 0.003 * pt : 0;
    if (caseId === 2) {
      staticError += 25 * normal(random);
      totalError += 25 * normal(random);
    }
    if (caseId === 3) {
      staticError += 80 * Math.sin((2 * Math.PI * 50 * (i + 0.2)) / 137);
      totalError += 80 * Math.sin((2 * Math.PI * 50 * (i + 0.4)) / 137);
    }
    if (action === "static") staticError -= 120 + 3 * (temperature - 20);
    if (action === "pitot") totalError = (pt + totalError) / 1.003 - pt;
    if (action === "average") {
      // Average 100 actual independent repeated channel disturbances; systematic terms remain.
      let a = 0,
        b = 0;
      for (let j = 0; j < 100; j++) {
        if (caseId === 2) {
          a += 25 * normal(random);
          b += 25 * normal(random);
        }
      }
      if (caseId === 2) {
        staticError = a / 100;
        totalError = b / 100;
      }
    }
    if (action === "shield" && caseId === 3) {
      staticError *= 0.1;
      totalError *= 0.1;
    }
    const data = airData(ps + staticError, pt + totalError);
    return {
      referenceAltitude: h,
      referenceSpeed: speeds[i],
      ps,
      pt,
      measuredStatic: ps + staticError,
      measuredTotal: pt + totalError,
      altitude: data.altitude,
      speed: data.equivalentSpeed,
    };
  });
}
export function diagnosis(caseId, selected, experiments, action, validated) {
  const needed = ["reference", "sweep", "repeat", "spectrum"][caseId],
    actions = ["static", "pitot", "average", "shield"];
  if (!experiments.includes(needed))
    return {
      state: "additional",
      message:
        "Additional experiment required. The initial indications alone do not isolate this mechanism.",
    };
  if (selected !== caseId)
    return {
      state: "incorrect",
      message:
        "Reconsider: the diagnostic evidence contradicts this mechanism as the dominant source in this simplified case.",
    };
  if (action !== actions[caseId] || !validated)
    return {
      state: "partial",
      message:
        "Partially supported diagnosis. Apply a matching corrective action and test independent validation conditions.",
    };
  return {
    state: "supported",
    message:
      "Supported by collected diagnostic and validation evidence under this model. Document assumptions and check for other faults in a real system.",
  };
}
