import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import * as m from "../assets/js/chapter4/models.mjs";
import { solve } from "../assets/js/chapter4/bank-solver.mjs";
const json = (p) => JSON.parse(fs.readFileSync(new URL(p, import.meta.url)));
const bank = json("../assets/js/chapter4/bank.json"),
  answers = json("./fixtures/chapter4-bank.json"),
  refs = json("./fixtures/chapter4-distributions.json");
function compare(actual, expected, path = "") {
  if (typeof expected === "number")
    assert.ok(
      Number.isFinite(actual) &&
        Math.abs(actual - expected) <= 3e-6 * Math.max(1, Math.abs(expected)),
      `${path}: ${actual} vs ${expected}`,
    );
  else if (expected && typeof expected === "object") {
    for (const k of Object.keys(expected))
      compare(actual[k], expected[k], path + "." + k);
  } else assert.equal(actual, expected, path);
}
for (const e of bank)
  test(`${e.id}: independent SciPy/NumPy answer audit`, () => {
    if (e.type === "concept") {
      assert.match(solve(e).explanation, /neither/);
      return;
    }
    compare(solve(e), answers[e.id], e.id);
    assert.ok(e.page >= (e.kind === "problem" ? 121 : 75) && e.page <= 132);
  });
test("Independent distribution references", () => {
  for (const [x, p] of refs.normal) compare(m.normalCDF(x), p);
  for (const [x, d, p] of refs.t) compare(m.tCDF(x, d), p);
  for (const [x, d, p] of refs.chi) compare(m.chiCDF(x, d), p);
  for (const [d, p, t, c] of refs.quantiles) {
    compare(m.tQuantile(p, d), t);
    compare(m.chiQuantile(p, d), c);
  }
});
test("Histogram boundaries and omitted values", () => {
  assert.deepEqual(m.histogram([-1, 0, 1, 2, 3], 2, 0, 1).counts, [1, 2]);
  assert.equal(m.histogram([-1, 0, 1, 2, 3], 2, 0, 1).outside, 2);
});
test("Data and degenerate cases", () => {
  for (const s of ["", "NaN", "1,Infinity", "1 kg"])
    assert.throws(() => m.parseData(s));
  assert.equal(m.describe([2]).sd, null);
  assert.equal(m.describe([2, 2]).sd, 0);
  assert.throws(() => m.normalPlot([2, 2]));
  assert.throws(() => m.meanInterval(1, 1, 1));
  assert.throws(() => m.propagate("quotient", [1, 0], [1, 1]));
  assert.throws(() => m.normalPDF(1, 0, 0));
  assert.throws(() => m.histogram([1], 0));
});
test("Covariance, sensitivity and near-zero protection", () => {
  assert.equal(m.propagate("difference", [10, 10], [1, 1], { rho: 1 }).u, 0);
  compare(m.propagate("sum", [10, 10], [1, 1], { rho: 1 }).u, 2);
  const p = m.propagate("tank", [2, 3, 2, 10], [0, 0, 0.1, 0]);
  compare(p.u, Math.PI * 0.01);
  assert.equal(m.propagate("difference", [10, 10], [0.1, 0.1]).relative, null);
});
test("GOF guards, tail totals, known versus fitted parameters", () => {
  const g = m.goodnessOfFit([10, 20, 40, 20, 10], [-2, -1, 1, 2], {
    fit: false,
    merge: false,
  });
  assert.equal(g.df, 4);
  compare(
    g.expected.reduce((s, v) => s + v, 0),
    100,
  );
  assert.equal(m.goodnessOfFit([1, 1], [0]).p, null);
  assert.throws(() => m.goodnessOfFit([1, 2], [0, 0]));
  assert.throws(() => m.groupedFit([1, -1], [0]));
});
test("Seeded sampling and correlation affect SEM", () => {
  assert.deepEqual(m.sampleRun({ seed: 12 }), m.sampleRun({ seed: 12 }));
  compare(m.sampleRun({ n: 25, sigma: 2 }).theoreticalSEM, 0.4);
  assert.ok(
    m.sampleRun({ n: 25, rho: 0.8 }).theoreticalSEM >
      m.sampleRun({ n: 25 }).theoreticalSEM,
  );
});

test("Finite interval outputs and quotient bound crossing", () => {
  assert.throws(() => m.meanInterval(1e308, 1e308, 2));
  assert.throws(() => m.varianceInterval(1e308, 20));
  assert.equal(
    m.propagate("quotient", [10, 1], [0.1, 0.1], { bounds: [0.1, 2] })
      .boundCrossesZero,
    true,
  );
});
test("Practice inventory retains numbering and original data", () => {
  for (const [k, n] of [
    ["example", 22],
    ["problem", 60],
  ])
    assert.deepEqual(
      bank.filter((e) => e.kind === k).map((e) => e.number),
      Array.from({ length: n }, (_, i) => "4." + (i + 1)),
    );
  assert.equal(
    bank
      .find((e) => e.id === "problem-4-28")
      .args.counts.reduce((a, b) => a + b),
    150,
  );
  assert.equal(
    bank
      .find((e) => e.id === "problem-4-56")
      .args.counts.reduce((a, b) => a + b),
    120,
  );
});
