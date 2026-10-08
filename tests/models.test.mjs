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
