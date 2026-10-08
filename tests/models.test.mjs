import test from "node:test";
import assert from "node:assert/strict";
import {
  rangeMetrics,
  quantize,
  thresholdOutput,
  firstOrder,
  secondOrder,
  overshoot,
  drift,
  nonlinearity,
  hysteresis,
  backlash,
  calibration,
  samples,
  statistics,
  settlingTime,
} from "../assets/js/models.mjs";
const close = (a, b, t = 1e-9) =>
  assert.ok(Math.abs(a - b) < t, `${a} != ${b}`);
test("full-scale error, zero relative error, and out-of-range operation", () => {
  const m = rangeMetrics(10, 1, 1);
  close(m.absolute, 0.1);
  close(m.relative, 10);
  close(m.utilization, 10);
  assert.equal(m.inRange, true);
  assert.equal(rangeMetrics(10, 1, 0).relative, null);
  assert.equal(rangeMetrics(2, 1, 3).inRange, false);
});
test("digital quantization boundaries and threshold onset", () => {
  close(quantize(0.249, 0.1), 0.2);
  close(quantize(0.251, 0.1), 0.3);
  assert.equal(thresholdOutput(0.299, 0.3, 0.1), 0);
  close(thresholdOutput(0.3, 0.3, 0.1), 0.3);
  for (let i = 0; i <= 1000; i++) {
    const x = i / 100;
    assert.ok(Math.abs(quantize(x, 0.1) - x) <= 0.050000001);
  }
});
test("first order: initial condition, 63.2%, 95%, and settling", () => {
  assert.equal(firstOrder(0, 1), 0);
  close(firstOrder(2, 2), 1 - Math.exp(-1));
  close(firstOrder(6, 2), 0.950212931632136);
  close(firstOrder(-Math.log(0.02), 1), 0.98);
  close(
    settlingTime((t) => firstOrder(t, 1)),
    3.92,
    0.02,
  );
});
test("second order: analytic regimes, overshoot, and long-term behavior", () => {
  close(secondOrder(Math.PI / 3, 0, 3), 2);
  close(secondOrder((2 * Math.PI) / 3, 0, 3), 0);
  close(secondOrder(1, 1, 2), 1 - 3 * Math.exp(-2));
  close(overshoot(0.707), 4.325, 0.01);
  assert.equal(overshoot(1), 0);
  for (const z of [0.2, 0.707, 1, 1.5, 2]) {
    assert.equal(secondOrder(0, z, 3), 0);
    close(secondOrder(100, z, 3), 1, 1e-8);
  }
  for (const z of [1, 1.5, 2]) {
    let prev = 0;
    for (let i = 0; i <= 1000; i++) {
      const y = secondOrder(i / 100, z, 3);
      assert.ok(y >= prev - 1e-10 && y <= 1);
      prev = y;
    }
  }
  assert.equal(
    settlingTime((t) => secondOrder(t, 0, 3)),
    null,
  );
  const peakTime = Math.PI / (3 * Math.sqrt(1 - 0.2 ** 2));
  close(100 * (secondOrder(peakTime, 0.2, 3) - 1), overshoot(0.2));
});
test("drift: independent offset and slope effects", () => {
  close(drift(0, 40, "zero").output, 0.5);
  close(drift(10, 40, "zero").output, 10.5);
  close(drift(0, 40, "gain").output, 0);
  close(drift(10, 40, "gain").output, 10.6);
  close(drift(10, 40, "combined").output, 11.1);
  close(drift(10, 20, "combined").output, 10);
});
test("linearity reference and hysteresis branch limits", () => {
  close(nonlinearity(0, 0.4), 0);
  close(nonlinearity(10, 0.4), 10);
  close(nonlinearity(5, 0.4), 5.4);
  close(hysteresis(5, 0.6, "down") - hysteresis(5, 0.6, "up"), 0.6);
  close(hysteresis(0, 0.6, "down"), 0);
  close(hysteresis(10, 0.6, "up"), 10);
});
test("backlash retains history and crosses total reversal clearance", () => {
  let y = 5;
  y = backlash(6, y, 0.5);
  close(y, 5.5);
  y = backlash(5.8, y, 0.5);
  close(y, 5.5);
  y = backlash(5, y, 0.5);
  close(y, 5.5);
  y = backlash(4.9, y, 0.5);
  close(y, 5.4);
  close(backlash(3, 5, 0), 3);
});
test("calibration correction meets all points and exposes span error", () => {
  close(calibration(0, 0, 1), 0.4);
  close(calibration(10, 0, 1) - 10, 1.2);
  close(calibration(10, -0.4, 1) - 10, 0.8);
  for (const p of [0, 2.5, 5, 7.5, 10])
    close(calibration(p, -0.4, 1 / 1.08), p);
});
test("repeatability scatter and reproducibility shift are separate", () => {
  const a = statistics(samples(0, 0.08)),
    b = statistics(samples(0.8, 0.08)),
    c = statistics(samples(0, 0.08, 0.3));
  close(b.mean - a.mean, 0.8);
  close(a.sd, b.sd);
  close(c.mean - a.mean, 0.3);
});
test("final challenge has a demanding, feasible choice", () => {
  const total = (span, acc, res, tau, d) =>
    rangeMetrics(span, acc, 1).absolute +
    d * 20 +
    res / 2 +
    0.4 * (1 - firstOrder(0.5, tau));
  close(total(2, 1, 0.01, 0.15, 0.0005), 0.04926959733890096);
  assert.ok(total(10, 1, 0.2, 0.05, 0.005) > 0.05);
  assert.ok(total(5, 0.1, 0.001, 1.2, 0.0001) > 0.05);
});

// Enrichment models are isolated to Chapter 2; established models above remain unchanged.
import {
  instrumentSpan,
  scaledStep,
  sampledSignal,
  calibrationReading,
  standardPressure,
  pressureAltitude,
  airData,
  aiDataset,
  fitLine,
} from "../assets/js/chapter2-models.mjs";
test("range interval and span remain distinct with negative endpoints", () => {
  close(instrumentSpan(-50, 150), 200);
  close(instrumentSpan(-100, 50), 150);
});
test("step amplitude and gain change final output but not the time constant", () => {
  close(scaledStep(0, 1, 60, 1), 20);
  close(scaledStep(2, 2, 40, 1.5), 20 + 60 * (1 - Math.exp(-1)));
  close(scaledStep(100, 1, 10, 0.5), 25);
});
test("sampling and quantization are separate and preserve nearest-step bounds", () => {
  const a = sampledSignal(0.25, 0.1);
  assert.equal(a.samples.length, 17);
  assert.deepEqual(a.held.slice(0, 3), [
    [0, 5],
    [0.25, 5],
    [0.25, 6.4],
  ]);
  for (const s of a.samples)
    assert.ok(Math.abs(s.digital - s.analog) <= 0.05000001);
  const b = sampledSignal(1, 0.1);
  for (const s of b.samples) close(s.analog, 5);
  assert.ok(a.samples.some((s) => Math.abs(s.analog - 5) > 1));
});
test("calibration effects can be isolated without changing established adjustment model", () => {
  close(calibrationReading(5, { offset: 0, scale: 0, noise: 0, bow: 0 }), 5);
  close(calibrationReading(0, { offset: 0.4, scale: 0 }), 0.4);
  close(calibrationReading(10, { offset: 0, scale: 0.08 }), 10.8);
  close(calibrationReading(5, { offset: 0, scale: 0, bow: 0.4 }), 5.4);
  assert.notEqual(
    calibrationReading(5, { offset: 0, scale: 0, noise: 0.08 }, 0),
    calibrationReading(5, { offset: 0, scale: 0, noise: 0.08 }, 1),
  );
});
test("standard-atmosphere conversion roundtrips and is explicitly pressure altitude", () => {
  close(standardPressure(0), 101325);
  close(standardPressure(1000), 89874.57, 0.1);
  for (const h of [0, 1000, 3000])
    close(pressureAltitude(standardPressure(h)), h, 1e-7);
});
test("static-channel bias affects both pressure altitude and equivalent speed", () => {
  const ps = standardPressure(1000),
    pt = ps + 0.5 * 1.225 * 60 ** 2;
  const ideal = airData(ps, pt),
    biased = airData(ps + 200, pt);
  close(ideal.altitude, 1000, 1e-7);
  close(ideal.equivalentSpeed, 60);
  assert.ok(biased.altitude < 1000 && biased.equivalentSpeed < 60);
  assert.equal(airData(ps + 100, ps).equivalentSpeed, null);
});
test("AI dataset supports an affine diagnosis and preserves residual evidence", () => {
  const fit = fitLine(aiDataset);
  close(fit.slope, 7139 / 7000);
  close(fit.offset, 1.990476190476194, 1e-8);
  assert.ok(Math.max(...fit.residuals.map(Math.abs)) < 0.13);
  close(
    fitLine([
      { reference: 0, measured: 2 },
      { reference: 10, measured: 12 },
    ]).slope,
    1,
  );
});

// Final polish classifications do not change instrument models.
import {
  acceptance,
  reviewEvidence,
  faultDiagnosis,
} from "../assets/js/chapter2-polish.mjs";
test("acceptance distinguishes marginal compliance, robust margin, and failure", () => {
  assert.equal(acceptance(0.0492695973389, 0.05).label, "PASS — MARGINAL");
  assert.equal(acceptance(0.04, 0.05).label, "MEETS LIMIT");
  assert.equal(acceptance(0.051, 0.05).label, "DOES NOT MEET LIMIT");
  assert.equal(acceptance(0.05, 0.05).marginal, true);
});
test("evidence matrix distinguishes supported effects from untested hypotheses", () => {
  assert.ok(
    reviewEvidence({
      offset: "supported",
      scale: "supported",
      hysteresis: "additional",
      lag: "additional",
    }).every((h) => h.correct),
  );
  const review = reviewEvidence({
    offset: "supported",
    scale: "supported",
    hysteresis: "unsupported",
    lag: "supported",
  });
  assert.equal(review[2].correct, false);
  assert.equal(review[3].correct, false);
  assert.match(review[2].reason, /decreasing/);
  assert.match(review[3].reason, /time-resolved/);
});
test("fault diagnoses connect static, pitot, and lag symptoms to the right channel", () => {
  for (const s of ["static", "pitot", "dynamic"]) {
    assert.equal(faultDiagnosis(s, s).correct, true);
    assert.equal(
      faultDiagnosis(s, s === "static" ? "pitot" : "static").correct,
      false,
    );
  }
  assert.match(
    faultDiagnosis("pitot", "pitot").reason,
    /not directly affected/,
  );
  assert.match(
    faultDiagnosis("dynamic", "dynamic").reason,
    /steady-state calibration is correct/,
  );
});
