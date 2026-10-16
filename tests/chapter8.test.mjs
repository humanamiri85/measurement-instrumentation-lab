import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as m from "../assets/js/chapter8/models.mjs";
import { exercises } from "../assets/js/chapter8/practice.mjs";
import {
  defaults,
  presets,
  calculate,
} from "../assets/js/chapter8/activities.mjs";
const refs = JSON.parse(
    fs.readFileSync(
      new URL("./fixtures/chapter8-reference.json", import.meta.url),
    ),
  ),
  near = (a, b, t = 1e-10) =>
    assert.ok(
      Number.isFinite(a) && Math.abs(a - b) <= t * Math.max(1, Math.abs(b)),
      `${a} differs from independent reference ${b}`,
    );
test("Reference components, conversions and exact time evaluations", () => {
  near(m.hzToRad(0.075), 0.15 * Math.PI);
  near(m.radToHz(Math.PI), 0.5);
  assert.deepEqual(
    m.referenceComponents.map((c) => c.f),
    [0.075, 0.125],
  );
  assert.equal(m.signalInfo(1, m.referenceComponents).bandwidth, 0.125);
  assert.equal(m.signalInfo(1, m.referenceComponents).period, 40);
  assert.equal(m.signalInfo(1, m.compoundComponents).period, 16);
  assert.equal(m.signalInfo(1, m.compoundComponents).fundamental, 1 / 16);
  assert.equal(m.signalInfo(1, m.compoundComponents).bandwidth, 0.5);
  assert.equal(
    m.signalInfo(0, [
      { a: 1, f: 1, p: 0 },
      { a: 1, f: Math.SQRT2, p: 0 },
    ]).period,
    null,
  );
  for (const [t, reference, compound] of refs.signals) {
    near(m.signalAt(t, 1, m.referenceComponents), reference);
    near(m.signalAt(t, 1, m.compoundComponents), compound);
  }
});
test("Acquisition times include exact k/fs, independently of drawing grid", () => {
  assert.deepEqual(m.sampleTimes(6, 1), [
    0,
    1 / 6,
    2 / 6,
    3 / 6,
    4 / 6,
    5 / 6,
    1,
  ]);
  const ts = m.drawingTimes(2, 8);
  assert.ok(ts.length >= 641);
  assert.equal(ts.at(-1), 2);
  assert.throws(() => m.sampleTimes(1, 1e6));
  assert.throws(() => m.drawingTimes(100, 100));
});
for (const f of [0, 2, 3, 4, 8, 12, 17, 37])
  for (const phase of [0, 0.3, Math.PI / 2])
    test(`Signed alias equality f=${f}, phase=${phase}`, () => {
      const r = m.sampleSignal({ f, fs: 6, p: phase, duration: 2 });
      r.values.forEach((v, i) => near(v, r.compatible[i]));
      assert.ok(r.frequency <= 3);
      near(r.times[5], 5 / 6);
      if (f === 4) {
        near(r.signed, -2);
        near(r.phase, Math.PI - phase);
      }
      if (f === 8) near(r.frequency, 2);
      if (f === 12) {
        near(r.frequency, 0);
        r.values.forEach((v) => near(v, Math.sin(phase)));
      }
    });
test("Nyquist boundary is phase dependent and not a robust design", () => {
  const zero = m.sampleSignal({ f: 3, fs: 6, p: 0 }),
    quadrature = m.sampleSignal({ f: 3, fs: 6, p: Math.PI / 2 });
  zero.values.forEach((v) => near(v, 0));
  quadrature.values.forEach((v, i) => near(v, (-1) ** i));
  assert.equal(zero.boundary, true);
  near(zero.nyquistRate, 6);
  near(zero.nyquistFrequency, 3);
});
for (const bits of [1, 2, 3, 8, 12])
  test(`${bits}-bit mid-rise codebook, ties and endpoints`, () => {
    const levels = 2 ** bits,
      delta = 20 / levels,
      codes = new Set();
    for (let i = 0; i < levels; i++) {
      const q = m.quantizer(-10 + (i + 0.5) * delta, bits, -10, 10);
      assert.equal(q.code, i);
      codes.add(q.code);
      near(q.error, 0);
      assert.equal(m.quantizer(-10 + i * delta, bits, -10, 10).code, i);
    }
    assert.equal(codes.size, levels);
    const low = m.quantizer(-10, bits, -10, 10),
      high = m.quantizer(10, bits, -10, 10);
    assert.equal(low.code, 0);
    assert.equal(high.code, levels - 1);
    near(low.error, delta / 2);
    near(high.error, -delta / 2);
    assert.equal(high.clipped, false);
    assert.equal(m.quantizer(11, bits, -10, 10).clipped, true);
    for (let i = 0; i < 100; i++)
      assert.ok(
        Math.abs(m.quantizer(-10 + (20 * i) / 99, bits, -10, 10).error) <=
          delta / 2 + 1e-12,
      );
  });
test("Textbook quantizer values and minimum bit depth", () => {
  near(m.quantizer(0, 12, -10, 10).delta, 0.0048828125);
  near(m.quantizer(0, 14, -10, 10).half, 0.0006103515625);
  assert.equal(m.minimumBits(20, 0.005), 12);
  assert.ok(20 / 2048 > 0.005);
  assert.throws(() => m.quantizer(0, 12, 1, 1));
  assert.throws(() => m.quantizer(0, 1.5, -1, 1));
  assert.throws(() => m.quantizer(NaN, 8, -1, 1));
});
for (const r of refs.rc)
  test(`Independent complex-impedance ${r.kind} at f=${r.f}`, () => {
    const h = m.response(r.kind, r.f, r.R, r.C);
    near(h.mag, r.mag);
    near(h.phase, r.phase);
    near(h.db, r.db);
  });
test("DC limits and analytic step landmarks", () => {
  const R = 10000,
    C = 1e-5;
  near(m.rc(R, C).tau, 0.1);
  near(m.rc(R, C).wc, 10);
  near(m.rc(R, C).fc, 1.5915494309189535);
  near(m.rcStep("lp", 0.1, R, C), 0.6321205588285577);
  near(m.rcStep("hp", 0.1, R, C), 0.36787944117144233);
  assert.equal(m.response("hp", 0, R, C).phase, null);
  assert.equal(m.response("hp", 0, R, C).db, -Infinity);
  assert.equal(m.response("hp", 0, R, C).mag, 0);
  assert.equal(m.response("lp", 0, R, C).mag, 1);
  assert.equal(m.rcStep("lp", -1, R, C), 0);
});
for (const kind of ["lp", "hp"])
  test(`${kind} zero-state sine satisfies independent differential equation`, () => {
    const R = 10000,
      C = 1e-5,
      tau = 0.1,
      a = 2,
      f = 1.5,
      p = 0.4,
      h = 1e-6;
    near(
      m.zeroStateSine(kind, 0, R, C, a, f, p),
      kind === "lp" ? 0 : a * Math.sin(p),
    );
    for (const t of [0.01, 0.1, 0.3]) {
      const y = m.zeroStateSine(kind, t, R, C, a, f, p),
        dy =
          (m.zeroStateSine(kind, t + h, R, C, a, f, p) -
            m.zeroStateSine(kind, t - h, R, C, a, f, p)) /
          (2 * h),
        input = a * Math.sin(2 * Math.PI * f * t + p),
        derivative = a * 2 * Math.PI * f * Math.cos(2 * Math.PI * f * t + p);
      near(tau * dy + y, kind === "lp" ? input : tau * derivative, 1e-7);
    }
  });
test("Loading agrees with independently calculated parallel complex impedance", () => {
  for (const r of refs.loaded) {
    const h = m.loadedLP(r.f, 10000, 1e-5, 5000, 20000);
    near(h.mag, r.mag);
    near(h.phase, r.phase);
  }
  near(m.loadedLP(0, 10000, 1e-5, 5000, 20000).dcGain, 4 / 7);
});
test("Analog filtering is evaluated before sampling at original frequencies", () => {
  const s = {
      f: 2,
      a: 1,
      interference: 32,
      interferenceA: 0.4,
      fc: 5,
      fs: 20,
      duration: 1,
    },
    r = m.conditioning(s);
  near(r.residual, 0.4 / Math.sqrt(1 + (32 / 5) ** 2));
  near(r.usefulGain, 1 / Math.sqrt(1 + (2 / 5) ** 2));
  assert.notEqual(r.residual, 0.4 / Math.sqrt(1 + (8 / 5) ** 2));
  for (const t of r.times) {
    const expected =
      Math.sin(2 * Math.PI * 2 * t - Math.atan(2 / 5)) /
        Math.sqrt(1 + (2 / 5) ** 2) +
      (0.4 * Math.sin(2 * Math.PI * 32 * t + 0.4 - Math.atan(32 / 5))) /
        Math.sqrt(1 + (32 / 5) ** 2);
    near(r.filtered[r.times.indexOf(t)], expected);
  }
  assert.equal(r.fold.signed, -8);
});
test("Gain preserves existing SNR and may overload", () => {
  const a = m.sensorRun({ gain: 1 }),
    b = m.sensorRun({ gain: 100 }),
    over = m.sensorRun({ gain: 1000 });
  near(a.snr, b.snr);
  a.raw.forEach((v, i) => near(b.conditioned[i], v * 100));
  assert.ok(over.clipping > 0);
  assert.deepEqual(m.sensorRun({ seed: 7 }), m.sensorRun({ seed: 7 }));
  assert.notDeepEqual(
    m.sensorRun({ seed: 7 }).raw,
    m.sensorRun({ seed: 8 }).raw,
  );
});
test("Estimated Hann-window spectrum agrees with independent NumPy FFT", () => {
  const fs = 100,
    n = 100,
    values = Array.from(
      { length: n },
      (_, i) => 2 + Math.sin((2 * Math.PI * 10 * i) / fs),
    ),
    r = m.estimateSpectrum(values, fs);
  near(r.dc, refs.spectrum.dc);
  near(r.resolution, 1);
  near(r.bins[10][1], refs.spectrum.peakAmplitude);
  near(r.bins.at(-1)[1], refs.spectrum.nyquistAmplitude);
  near(r.recordDuration, 1);
});
test("Preferred resistor selection uses achieved cutoff and correct capacitor units", () => {
  for (const r of refs.resistors) {
    const d = m.resistorDesign(r.target, 1e-8, "E24");
    near(d.ideal, r.ideal);
    assert.equal(d.selected, r.selected);
    near(d.achieved, r.achieved);
    near(d.deviation, r.deviation);
  }
  assert.equal(m.resistorDesign(100, 1e-8, "E12").selected, 150000);
  assert.throws(() => m.resistorDesign(100, 0));
  assert.throws(() => m.resistorDesign(100, 1e-8, "E48"));
});
test("Engineering acceptance, infeasibility and independent validation", () => {
  const d = m.challengeDefaults;
  assert.equal(m.challenge(d).pass, true);
  assert.equal(m.challenge({ ...d, interference: 12 }).feasible, false);
  assert.equal(m.challenge({ ...d, bits: 8 }).checks.resolution, false);
  assert.equal(m.challenge({ ...d, lo: -0.5, hi: 0.5 }).checks.clipping, false);
  assert.equal(m.challenge({ ...d, fs: 10 }).checks.bandwidth, false);
  assert.equal(m.challenge({ ...d, fc: 100 }).checks.interference, false);
  assert.equal(m.challenge({ ...d, fc: 1 }).checks.useful, false);
  assert.equal(m.validateChallenge(d).pass, true);
  assert.throws(() =>
    m.validateChallenge({ ...d, validationF: d.useful, validationA: d.a }),
  );
});
test("Invalid domains fail explicitly", () => {
  for (const fn of [
    () => m.alias(1, 0),
    () => m.rc(0, 1),
    () => m.rc(1, Infinity),
    () => m.response("wrong", 1, 1, 1),
    () => m.sampleTimes(0, 1),
    () => m.minimumBits(20, 0),
    () => m.sensorRun({ gain: 0 }),
    () => m.sensorRun({ seed: 0.5 }),
    () => m.sensorRun({ f: 100 }),
    () => m.challenge({ ...m.challengeDefaults, maxLoss: 100 }),
  ])
    assert.throws(fn);
});
test("Every guided exercise uses correct source IDs and independently checked values", () => {
  assert.deepEqual(
    exercises.map((e) => e.id),
    Array.from({ length: 7 }, (_, i) => "exercise-8-" + (i + 1)),
  );
  const s = { series: "E24", phase: 90 };
  near(exercises[0].values(s).unitAmplitudeDCAlias, 1);
  near(exercises[1].values(s).firstSignedAliasHz, -2000);
  assert.deepEqual(exercises[2].values(s), {});
  near(exercises[3].values(s).maxInRangeErrorV, 0.0006103515625);
  assert.equal(exercises[4].values(s).minimumBits, 12);
  near(exercises[5].values(s).idealOhm, 318309.8861837907);
  near(exercises[6].values(s).selectedOhm, 160000);
});
test("All authored scenarios produce finite view data without placeholders", () => {
  for (const [k, list] of Object.entries(presets))
    for (const [, s] of list) {
      const r = calculate(k, structuredClone(s));
      assert.ok(r.html.length > 100);
      assert.ok(!/\bNaN\b|>undefined</.test(r.html), k);
      assert.ok(r.data);
    }
  assert.throws(() =>
    calculate("chain", {
      ...defaults.chain,
      spectrum: "estimate",
      fs: 0.025,
      duration: 40,
    }),
  );
});

test("Decimal threshold ties do not slip into the lower code", () => {
  for (const bits of [2, 4, 8]) {
    const delta = 0.3 / 2 ** bits;
    for (let k = 1; k < 2 ** bits; k++)
      assert.equal(m.quantizer(0.1 + k * delta, bits, 0.1, 0.4).code, k);
  }
  assert.equal(m.sensorRun({ noise: 0 }).snr, Infinity);
  assert.equal(m.sensorRun({ noise: 0, a: 0 }).snr, null);
});

test("Coincident frequencies combine as phasors rather than duplicate spectral lines", () => {
  const pair = [
      { a: 1, f: 2, p: 0 },
      { a: 1, f: 2, p: Math.PI / 2 },
    ],
    c = m.componentSpectrum(1, pair);
  assert.equal(c.components.length, 1);
  near(c.components[0].a, Math.SQRT2);
  near(c.components[0].p, Math.PI / 4);
  for (const t of [0, 0.123, 0.7])
    near(m.signalAt(t, 1, pair), m.signalAt(t, c.dc, c.components));
  const cancel = [
    { a: 1, f: 2, p: 0 },
    { a: 1, f: 2, p: Math.PI },
  ];
  assert.equal(m.componentSpectrum(0, cancel).components.length, 0);
  assert.equal(m.signalInfo(0, cancel).bandwidth, 0);
  near(m.componentSpectrum(1, [{ a: 2, f: 0, p: Math.PI / 2 }]).dc, 3);
});
