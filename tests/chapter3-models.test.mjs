import test from "node:test";
import assert from "node:assert/strict";
import {
  reading,
  rng,
  normal,
  errorMetrics,
  correction,
  budget,
  standardUncertainty,
  repeated,
  correlatedSEM,
  histogram,
  rms,
  snr,
  signalRun,
  spectrum,
  condition,
  fidelity,
  aircraft,
  diagnosis,
} from "../assets/js/chapter3-models.mjs";
const near = (a, b, t = 1e-9) => assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("zero error, signed bias, gain slope, environment, drift, and bow are additive", () => {
  near(reading(75).measured, 75);
  near(reading(0, { offset: 2 }).error, 2);
  near(reading(100, { gain: 0.03 }).measured, 103);
  near(reading(50, { temp: 40, coefficient: 0.1, drift: 1, bow: 2 }).error, 5);
  const r = reading(50, { offset: 2, gain: 0.02 }, -0.5);
  near(r.error, 2.5);
  near(
    Object.values(r.contributions).reduce((s, x) => s + x, 0),
    r.error,
  );
});
test("two-point correction exactly restores affine model at separate validation points", () => {
  const p = { offset: 2, gain: 0.04 };
  const rows = [0, 20, 40, 60, 80, 100].map((x) => reading(x, p)),
    f = correction(rows, "linear");
  const v = [10, 30, 50, 70, 90].map((x) => ({
    reference: x,
    measured: f.apply(reading(x, p).measured),
  }));
  near(errorMetrics(v).max, 0);
  assert.ok(errorMetrics([10, 30].map((x) => reading(x, p))).max > 2);
  near(correction(rows, "offset").apply(reading(50, p).measured) - 50, 2);
});
test("multipoint inverse improves nonlinear validation without claiming exactness", () => {
  const p = { offset: 2, gain: 0.04, bow: 5 };
  const train = [0, 20, 40, 60, 80, 100].map((x) => reading(x, p)),
    f = correction(train, "multipoint"),
    linear = correction(train, "linear");
  const score = (fn) =>
    errorMetrics(
      [10, 30, 50, 70, 90].map((x) => ({
        reference: x,
        measured: fn(reading(x, p).measured),
      })),
    );
  assert.ok(score(f.apply).rmse < score(linear.apply).rmse);
  assert.ok(score(f.apply).max > 0);
});
test("error metrics preserve sign and correct full-scale normalization", () => {
  const m = errorMetrics(
    [
      { reference: 0, measured: -2 },
      { reference: 10, measured: 12 },
    ],
    100,
  );
  near(m.mean, 0);
  near(m.max, 2);
  near(m.rmse, 2);
  near(m.percentFS, 2);
});
test("worst-case limits and corrected residuals differ from conditional uncertainty", () => {
  const s = [
    { name: "sensor", bias: 0.4, bound: 0.2 },
    { name: "conditioner", bias: -0.2, bound: 0.1 },
    { name: "DAQ", bias: 0.1, bound: 0.05 },
  ];
  near(budget(s).bias, 0.3);
  near(budget(s).worst, 0.65);
  near(budget(s, true).worst, 0.35);
  assert.equal(budget(s).dominant, "sensor");
  near(standardUncertainty([0.2, 0.1, 0.05]), Math.sqrt(0.0525 / 3));
});
test("seeded draws reproducible; sample standard deviation uses N minus one", () => {
  const a = repeated({ seed: 9 }),
    b = repeated({ seed: 9 });
  assert.deepEqual(a, b);
  assert.notDeepEqual(a.values, repeated({ seed: 10 }).values);
  const mean = a.values.reduce((s, v) => s + v, 0) / 20;
  near(a.sd, Math.sqrt(a.values.reduce((s, v) => s + (v - mean) ** 2, 0) / 19));
  near(a.naiveSEM, a.sd / Math.sqrt(20));
  near(a.half, 2.093024054 * a.naiveSEM);
});
test("averaging precision scales as square root N but bias persists", () => {
  const a = repeated({ bias: 3, sigma: 0, n: 500 });
  near(a.mean, 53);
  near(a.sd, 0);
  near(a.half, 0);
  near(correlatedSEM(2, 500, 0) / correlatedSEM(2, 5, 0), 0.1);
  // Independent ensemble verifies empirical mean variability, not one fortuitous run.
  const means = (n) =>
    Array.from(
      { length: 200 },
      (_, i) => repeated({ sigma: 2, bias: 3, n, seed: i + 1 }).mean,
    );
  const spread = (xs) => {
    const m = xs.reduce((s, v) => s + v, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, v) => s + (v - m) ** 2, 0) / xs.length);
  };
  const ratio = spread(means(500)) / spread(means(5));
  assert.ok(ratio > 0.07 && ratio < 0.14);
  near(means(500).reduce((s, v) => s + v, 0) / 200, 53, 0.03);
});
test("correlated stationary Gaussian mean variance includes covariances", () => {
  assert.ok(correlatedSEM(1, 100, 0.9) > 3 / Math.sqrt(100));
  const r = repeated({ rho: 0.9, n: 100 });
  near(r.half, 1.959963985 * r.modelSEM);
  assert.equal(repeated({ distribution: "uniform", n: 20 }).interval, null);
  assert.ok(repeated({ distribution: "uniform", n: 100 }).interval);
});
test("histogram counts every observation including flat and endpoint cases", () => {
  const h = histogram([0, 0, 1, 2, 3], 3);
  assert.equal(
    h.counts.reduce((s, v) => s + v, 0),
    5,
  );
  assert.equal(histogram([2, 2], 2).counts[0], 2);
});
test("RMS and amplitude/power SNR convention agree including zero conditions", () => {
  near(rms([3, 4]), Math.sqrt(12.5));
  near(snr([2, -2], [1, -1]), 20 * Math.log10(2));
  assert.equal(snr([1], [0]), Infinity);
  assert.equal(snr([0], [1]), null);
});
test("noise generation is reproducible and zero-noise signal is exact", () => {
  const p = { sigma: 0, line: 0, drift: 0 };
  const r = signalRun(p);
  assert.deepEqual(r.measured, r.clean);
  assert.deepEqual(signalRun(), signalRun());
  assert.equal(r.t.length, 500);
});
test("Hann amplitude spectrum finds a known line with correct Hz and amplitude", () => {
  const fs = 500,
    n = 500,
    a = 1.5,
    v = Array.from(
      { length: n },
      (_, i) => a * Math.sin((2 * Math.PI * 50 * i) / fs),
    );
  const s = spectrum(v, fs),
    peak = s.reduce((a, b) => (b[1] > a[1] ? b : a));
  near(peak[0], 50);
  near(peak[1], 1.5, 0.001);
  near(s.at(-1)[0], 250);
});
test("moving average and low pass obey causal step response and unity steady gain", () => {
  assert.deepEqual(
    condition([1, 1, 1, 1], 100, { method: "moving", window: 2 }),
    [0.5, 1, 1, 1],
  );
  const y = condition(Array(1000).fill(1), 500, {
    method: "lowpass",
    cutoff: 10,
  });
  near(y[0], 1 - Math.exp((-2 * Math.PI * 10) / 500));
  near(y.at(-1), 1);
  const f = fidelity(500, { method: "moving", window: 51 });
  near(f.delay, 0.05, 1e-5);
});
test("notch rejects line pickup and slow filtering attenuates the useful signal", () => {
  const line = Array.from({ length: 2000 }, (_, i) =>
    Math.sin((2 * Math.PI * 50 * i) / 500),
  );
  const out = condition(line, 500, { method: "notch", frequency: 50 });
  assert.ok(rms(out.slice(1000)) < 1e-10);
  const fast = fidelity(500, { method: "lowpass", cutoff: 10 }),
    slow = fidelity(500, { method: "lowpass", cutoff: 0.5 });
  assert.ok(slow.amplitude < 0.25);
  assert.ok(fast.amplitude > 0.95);
  assert.ok(slow.delay > fast.delay);
  const dc = condition(Array(2000).fill(1), 500, {
    method: "notch",
    frequency: 50,
  });
  near(dc.at(-1), 1);
});
test("aircraft reference relations and matched corrections preserve dimensional meaning", () => {
  const corrected = aircraft(0, true, "static", 40);
  corrected.forEach((r) => {
    near(r.altitude, r.referenceAltitude, 1e-8);
    near(r.speed, r.referenceSpeed, 1e-8);
  });
  aircraft(1, true, "pitot").forEach((r) => {
    near(r.altitude, r.referenceAltitude, 1e-8);
    near(r.speed, r.referenceSpeed, 1e-8);
  });
  const before = aircraft(3, true),
    after = aircraft(3, true, "shield");
  assert.ok(
    Math.abs(after[0].measuredStatic - after[0].ps) <
      Math.abs(before[0].measuredStatic - before[0].ps),
  );
  assert.deepEqual(aircraft(2, true, "average"), aircraft(2, true, "average"));
  assert.ok(
    aircraft(2, true, "average").reduce(
      (s, r) => s + Math.abs(r.measuredStatic - r.ps),
      0,
    ) <
      aircraft(2, true).reduce(
        (s, r) => s + Math.abs(r.measuredStatic - r.ps),
        0,
      ),
  );
});
test("diagnosis rewards collected evidence, matched action, and validation rather than agreement", () => {
  assert.equal(diagnosis(0, 0, [], "static", true).state, "additional");
  assert.equal(
    diagnosis(0, 1, ["reference"], "static", true).state,
    "incorrect",
  );
  assert.equal(diagnosis(0, 0, ["reference"], "none", false).state, "partial");
  assert.equal(
    diagnosis(0, 0, ["reference"], "static", true).state,
    "supported",
  );
});
test("invalid and boundary inputs fail explicitly instead of producing nonfinite results", () => {
  for (const fn of [
    () => reading(NaN),
    () => repeated({ sigma: -1 }),
    () => repeated({ n: 1 }),
    () => repeated({ rho: 1 }),
    () => repeated({ distribution: "uniform", rho: 0.5 }),
    () => rms([]),
    () => signalRun({ fs: 100 }),
    () => signalRun({ duration: 10 }),
    () =>
      correction([
        { reference: 0, measured: 1 },
        { reference: 10, measured: 1 },
      ]),
    () => budget([{ name: "a", bias: 0, bound: -1 }]),
    () => standardUncertainty([-1]),
    () => condition([1], 500, { method: "lowpass", cutoff: 500 }),
    () => condition([1], 500, { method: "moving", window: 0 }),
    () => aircraft(9),
  ])
    assert.throws(fn, RangeError);
  near(fidelity(500, { method: "none" }).amplitude, 1);
  near(fidelity(500, { method: "none" }).delay, 0);
});
test("digital low-pass probe matches the independently derived transfer function", () => {
  const fs = 500,
    cutoff = 10,
    w = (2 * Math.PI * 2) / fs,
    a = 1 - Math.exp((-2 * Math.PI * cutoff) / fs),
    pole = 1 - a;
  const magnitude = a / Math.sqrt(1 + pole * pole - 2 * pole * Math.cos(w));
  const phase = -Math.atan2(pole * Math.sin(w), 1 - pole * Math.cos(w));
  const f = fidelity(fs, { method: "lowpass", cutoff });
  near(f.amplitude, magnitude, 1e-10);
  near(f.delay, -phase / (2 * Math.PI * 2), 1e-10);
});
test("temperature correction before inversion prevents independent-validation bias", () => {
  const p = { offset: 2, gain: 0.04, coefficient: 0.05 },
    fit = correction([0, 100].map((x) => reading(x, p)));
  const raw = reading(70, { ...p, temp: 40 }).measured;
  near(fit.apply(raw) - 70, 1 / 1.04);
  near(fit.apply(raw - 0.05 * 20), 70);
});
test("physical coupling mitigation retains intrinsic broadband disturbance", () => {
  const p = { amplitude: 1, sigma: 0.15, line: 0.6, drift: 0.15 },
    a = signalRun(p),
    b = signalRun({ ...p, coupling: 0 });
  const expected = signalRun({ ...p, line: 0 });
  assert.deepEqual(b, expected);
  assert.ok(rms(b.noise) > 0);
  assert.ok(rms(a.noise) > rms(b.noise));
});
