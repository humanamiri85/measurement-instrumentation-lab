import { statistics } from "../models.mjs";
import { rng, normal } from "../chapter3-models.mjs";
export const finite = (...xs) => {
  if (xs.some((x) => !Number.isFinite(x)))
    throw new RangeError("Use finite numerical values.");
};
const positive = (x) => {
  finite(x);
  if (x <= 0) throw new RangeError("A positive value is required.");
};
const confidence = (c) => {
  finite(c);
  if (c <= 0 || c >= 1)
    throw new RangeError("Confidence must lie strictly between 0 and 1.");
};
export function validateData(values, min = 1) {
  if (!Array.isArray(values) || values.length < min || values.length > 2000)
    throw new RangeError(`Provide ${min}–2000 readings.`);
  values.forEach((x) => {
    finite(x);
    if (Math.abs(x) > 1e12)
      throw new RangeError("Readings must have magnitude ≤ 10¹².");
  });
  return values;
}
export function parseData(text) {
  if (!String(text).trim()) throw new RangeError("Enter a dataset first.");
  const tokens = String(text)
    .trim()
    .split(/[\s,;]+/);
  if (tokens.some((t) => !/^[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?$/i.test(t)))
    throw new RangeError(
      "Use numbers separated by spaces, commas or newlines; do not include units in the dataset.",
    );
  return validateData(tokens.map(Number));
}
export function describe(values) {
  validateData(values);
  const n = values.length,
    sorted = [...values].sort((a, b) => a - b),
    mean = values.reduce((s, v) => s + v, 0) / n,
    ss = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return {
    n,
    mean,
    median:
      n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2,
    populationVariance: ss / n,
    sampleVariance: n > 1 ? ss / (n - 1) : null,
    sd: n > 1 ? statistics(values).sd : null,
    sem: n > 1 ? Math.sqrt(ss / (n - 1) / n) : null,
    min: sorted[0],
    max: sorted.at(-1),
    sorted,
  };
}
export function histogram(values, bins = 6, start = null, width = null) {
  validateData(values);
  if (!Number.isInteger(bins) || bins < 1 || bins > 50)
    throw new RangeError("Use 1–50 bins.");
  const d = describe(values);
  start = start ?? d.min;
  width = width ?? (d.max - d.min || 1) / bins;
  finite(start);
  positive(width);
  finite(start + width * bins);
  const counts = Array(bins).fill(0);
  let outside = 0;
  for (const v of values) {
    const i =
      v === start + width * bins ? bins - 1 : Math.floor((v - start) / width);
    if (i < 0 || i >= bins) outside++;
    else counts[i]++;
  }
  return {
    start,
    width,
    counts,
    outside,
    edges: Array.from({ length: bins + 1 }, (_, i) => start + i * width),
    sturges: Math.ceil(1 + Math.log2(values.length)),
  };
}
// Lanczos log-gamma, converged series/continued fractions. No distribution library at runtime.
export function logGamma(z) {
  positive(z);
  const p = [
    676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  z--;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) x += p[i] / (z + i + 1);
  const t = z + 7.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}
export function gammaPQ(a, x) {
  positive(a);
  if (x === Infinity) return [1, 0];
  finite(x);
  if (x < 0) throw new RangeError("Nonnegative gamma argument required.");
  if (x === 0) return [0, 1];
  const scale = Math.exp(a * Math.log(x) - x - logGamma(a)),
    tiny = 1e-300,
    eps = 2e-14;
  if (x < a + 1) {
    let sum = 1 / a,
      term = sum;
    for (let n = 1; n < 10000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * eps) {
        const p = Math.min(1, sum * scale);
        return [p, Math.max(0, 1 - p)];
      }
    }
  } else {
    let b = x + 1 - a,
      c = 1 / tiny,
      d = 1 / b,
      h = d;
    for (let n = 1; n < 10000; n++) {
      const an = -n * (n - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < tiny) d = tiny;
      c = b + an / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (Math.abs(delta - 1) < eps) {
        const q = Math.min(1, Math.max(0, scale * h));
        return [1 - q, q];
      }
    }
  }
  throw new RangeError("Gamma calculation did not converge.");
}
function betaCF(a, b, x) {
  const tiny = 1e-300;
  let c = 1,
    d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < tiny) d = tiny;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 10000; m++) {
    for (const aa of [
      (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m)),
      (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1)),
    ]) {
      d = 1 + aa * d;
      if (Math.abs(d) < tiny) d = tiny;
      c = 1 + aa / c;
      if (Math.abs(c) < tiny) c = tiny;
      d = 1 / d;
      const delta = d * c;
      h *= delta;
      if (aa < 0 && Math.abs(delta - 1) < 2e-14) return h;
    }
  }
  throw new RangeError("Beta calculation did not converge.");
}
export function betaI(x, a, b) {
  positive(a);
  positive(b);
  finite(x);
  if (x < 0 || x > 1) throw new RangeError("Beta argument must lie in [0,1].");
  if (x === 0 || x === 1) return x;
  const scale = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (scale * betaCF(a, b, x)) / a
    : 1 - (scale * betaCF(b, a, 1 - x)) / b;
}
export function normalCDF(x) {
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  finite(x);
  if (x === 0) return 0.5;
  const q = gammaPQ(0.5, (x * x) / 2)[1];
  return x < 0 ? q / 2 : 1 - q / 2;
}
export function normalPDF(x, mu = 0, sigma = 1) {
  finite(x, mu);
  positive(sigma);
  return (
    Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI))
  );
}
export function tCDF(x, df) {
  positive(df);
  if (x === Infinity) return 1;
  if (x === -Infinity) return 0;
  finite(x);
  const tail = 0.5 * betaI(df / (df + x * x), df / 2, 0.5);
  return x >= 0 ? 1 - tail : tail;
}
export function tPDF(x, df) {
  positive(df);
  finite(x);
  return Math.exp(
    logGamma((df + 1) / 2) -
      logGamma(df / 2) -
      0.5 * Math.log(df * Math.PI) -
      ((df + 1) / 2) * Math.log1p((x * x) / df),
  );
}
export function chiCDF(x, df) {
  positive(df);
  if (x < 0) return 0;
  return gammaPQ(df / 2, x / 2)[0];
}
export function chiSF(x, df) {
  positive(df);
  if (x < 0) return 1;
  return gammaPQ(df / 2, x / 2)[1];
}
export function chiPDF(x, df) {
  positive(df);
  finite(x);
  if (x <= 0) return x === 0 && df === 2 ? 0.5 : 0;
  return Math.exp(
    (df / 2 - 1) * Math.log(x) -
      x / 2 -
      (df / 2) * Math.log(2) -
      logGamma(df / 2),
  );
}
function quantile(p, cdf, lo, hi) {
  finite(p);
  if (p < 0 || p > 1) throw new RangeError("Probability must lie in [0,1].");
  if (p === 0) return lo === 0 ? 0 : -Infinity;
  if (p === 1) return Infinity;
  while (cdf(lo) > p) lo = lo === 0 ? 0 : lo * 2;
  while (cdf(hi) < p) {
    hi *= 2;
    if (hi > 1e15)
      throw new RangeError("Quantile is outside supported numerical range.");
  }
  for (let i = 0; i < 160; i++) {
    const m = lo + (hi - lo) / 2;
    if (cdf(m) < p) lo = m;
    else hi = m;
  }
  return lo + (hi - lo) / 2;
}
export const normalQuantile = (p) => quantile(p, normalCDF, -8, 8);
export const tQuantile = (p, df) => {
  positive(df);
  return quantile(p, (x) => tCDF(x, df), -8, 8);
};
export const chiQuantile = (p, df) => {
  positive(df);
  return quantile(p, (x) => chiCDF(x, df), 0, Math.max(8, df * 2));
};
export function gaussianProbability(mu, sigma, lower, upper) {
  finite(mu);
  positive(sigma);
  if (Number.isNaN(lower) || Number.isNaN(upper) || lower > upper)
    throw new RangeError("Lower bound must not exceed upper bound.");
  return Math.max(
    0,
    normalCDF((upper - mu) / sigma) - normalCDF((lower - mu) / sigma),
  );
}
export function meanInterval(mean, sd, n, level = 0.95, knownSigma = false) {
  finite(mean, sd, n);
  confidence(level);
  if (!Number.isInteger(n) || n < 2 || sd < 0)
    throw new RangeError(
      "Mean interval needs n ≥ 2 and nonnegative dispersion.",
    );
  const critical = knownSigma
      ? normalQuantile((1 + level) / 2)
      : tQuantile((1 + level) / 2, n - 1),
    half = (critical * sd) / Math.sqrt(n);
  finite(critical, half, mean - half, mean + half);
  return { critical, half, lower: mean - half, upper: mean + half };
}
export function varianceInterval(variance, n, level = 0.95) {
  finite(variance, n);
  confidence(level);
  if (variance < 0 || !Number.isInteger(n) || n < 2)
    throw new RangeError(
      "Variance interval needs n ≥ 2 and nonnegative sample variance.",
    );
  const df = n - 1,
    alpha = 1 - level,
    lower = (df * variance) / chiQuantile(1 - alpha / 2, df),
    upper = (df * variance) / chiQuantile(alpha / 2, df);
  finite(lower, upper);
  return { lower, upper, sdLower: Math.sqrt(lower), sdUpper: Math.sqrt(upper) };
}
export function singleReading(
  readingValue,
  referenceMean,
  referenceValue,
  sd,
  n,
  level = 0.95,
) {
  finite(readingValue, referenceMean, referenceValue, sd, n);
  const ci = meanInterval(0, sd, n, level),
    prediction = tQuantile((1 + level) / 2, n - 1) * sd * Math.sqrt(1 + 1 / n);
  return {
    bias: referenceMean - referenceValue,
    corrected: readingValue - (referenceMean - referenceValue),
    singleHalf: normalQuantile((1 + level) / 2) * sd,
    meanHalf: ci.half,
    predictionHalf: prediction,
    textbookHeuristic: 1.96 * (sd + sd / Math.sqrt(n)),
  };
}
export function sampleRun({
  n = 20,
  runs = 100,
  seed = 42,
  mu = 50,
  sigma = 1,
  bias = 0,
  rho = 0,
  shape = "normal",
} = {}) {
  finite(n, runs, seed, mu, sigma, bias, rho);
  if (
    !Number.isInteger(n) ||
    n < 2 ||
    n > 500 ||
    !Number.isInteger(runs) ||
    runs < 1 ||
    runs > 500 ||
    sigma < 0 ||
    Math.abs(rho) >= 1 ||
    !["normal", "skew", "mixture"].includes(shape)
  )
    throw new RangeError("Invalid sampling settings.");
  const random = rng(seed),
    draw = () =>
      shape === "normal"
        ? normal(random)
        : shape === "skew"
          ? -Math.log(random()) - 1
          : normal(random) + (random() < 0.15 ? 4 : 0);
  const samples = [],
    means = [];
  for (let j = 0; j < runs; j++) {
    let e = sigma * draw();
    const row = Array.from({ length: n }, (_, i) => {
      if (i) e = rho * e + sigma * Math.sqrt(1 - rho * rho) * draw();
      return mu + bias + e;
    });
    if (j === 0) samples.push(...row);
    means.push(describe(row).mean);
  }
  let factor = n;
  for (let k = 1; k < n; k++) factor += 2 * (n - k) * rho ** k;
  return {
    samples,
    means,
    theoreticalSEM: shape === "normal" ? (sigma * Math.sqrt(factor)) / n : null,
  };
}
export function normalPlot(values) {
  const d = describe(values);
  if (d.n < 2 || d.sd === 0)
    throw new RangeError(
      "Probability plot needs at least two distinct readings.",
    );
  return d.sorted.map((v, i) => ({
    z: normalQuantile((i + 0.5) / d.n),
    value: v,
    reference: d.mean + d.sd * normalQuantile((i + 0.5) / d.n),
  }));
}
export function groupedCounts(values, cuts) {
  validateData(values);
  validateCuts(cuts);
  const counts = Array(cuts.length + 1).fill(0);
  for (const v of values) {
    let i = cuts.findIndex((c) => v < c);
    if (i < 0) i = cuts.length;
    counts[i]++;
  }
  return counts;
}
function validateCuts(cuts) {
  if (!Array.isArray(cuts) || cuts.length < 1 || cuts.length > 30)
    throw new RangeError("Supply 1–30 finite internal cutpoints.");
  cuts.forEach((x) => finite(x));
  if (cuts.some((c, i) => i && c <= cuts[i - 1]))
    throw new RangeError("Cutpoints must increase strictly.");
}
function expectedProb(cuts, mu, sigma) {
  const edges = [-Infinity, ...cuts, Infinity];
  return edges
    .slice(1)
    .map((hi, i) => gaussianProbability(mu, sigma, edges[i], hi));
}
// Two-parameter grouped multinomial maximum-likelihood fit using Nelder–Mead.
export function groupedFit(counts, cuts, initialMean = null, initialSD = null) {
  validateCuts(cuts);
  if (
    counts.length !== cuts.length + 1 ||
    counts.some((c) => !Number.isInteger(c) || c < 0) ||
    counts.reduce((s, c) => s + c, 0) < 2
  )
    throw new RangeError("Invalid grouped counts.");
  const n = counts.reduce((s, c) => s + c, 0),
    span = cuts.at(-1) - cuts[0] || 1;
  let mu = initialMean ?? cuts.reduce((s, c) => s + c, 0) / cuts.length,
    sd = initialSD ?? span / 3;
  if (sd <= 0) sd = 1;
  const objective = (p) => {
    const sigma = Math.exp(p[1]);
    if (!Number.isFinite(sigma) || sigma < 1e-10) return 1e100;
    const probs = expectedProb(cuts, p[0], sigma);
    return -counts.reduce(
      (s, c, i) => s + (c ? c * Math.log(Math.max(probs[i], 1e-300)) : 0),
      0,
    );
  };
  let simplex = [
    [mu, Math.log(sd)],
    [mu + 0.05 * sd, Math.log(sd)],
    [mu, Math.log(sd) + 0.05],
  ].map((p) => ({ p, f: objective(p) }));
  let converged = false;
  const add = (p) => ({ p, f: objective(p) });
  for (let step = 0; step < 600; step++) {
    simplex.sort((a, b) => a.f - b.f);
    if (
      Math.max(...simplex.map((s) => Math.abs(s.f - simplex[0].f))) < 1e-10 &&
      Math.max(
        ...simplex.map(
          (s) =>
            Math.abs(s.p[0] - simplex[0].p[0]) / sd +
            Math.abs(s.p[1] - simplex[0].p[1]),
        ),
      ) < 1e-7
    ) {
      converged = true;
      break;
    }
    const center = simplex[0].p.map((v, i) => (v + simplex[1].p[i]) / 2),
      worst = simplex[2],
      reflect = add(center.map((v, i) => 2 * v - worst.p[i]));
    if (reflect.f < simplex[0].f) {
      const expand = add(center.map((v, i) => v + 2 * (reflect.p[i] - v)));
      simplex[2] = expand.f < reflect.f ? expand : reflect;
    } else if (reflect.f < simplex[1].f) simplex[2] = reflect;
    else {
      const outside = reflect.f < worst.f,
        target = outside ? reflect : worst,
        contract = add(center.map((v, i) => v + 0.5 * (target.p[i] - v)));
      if (contract.f < target.f) simplex[2] = contract;
      else
        simplex = simplex.map((s, i) =>
          i ? add(s.p.map((v, k) => (v + simplex[0].p[k]) / 2)) : s,
        );
    }
  }
  simplex.sort((a, b) => a.f - b.f);
  return {
    mu: simplex[0].p[0],
    sigma: Math.exp(simplex[0].p[1]),
    converged,
    n,
  };
}
export function goodnessOfFit(
  counts,
  cuts,
  { fit = true, mu = 0, sigma = 1, merge = true } = {},
) {
  validateCuts(cuts);
  if (
    counts.length !== cuts.length + 1 ||
    counts.some((c) => !Number.isInteger(c) || c < 0)
  )
    throw new RangeError(
      "One nonnegative integer count per tail-complete bin is required.",
    );
  positive(sigma);
  finite(mu);
  let obs = [...counts],
    edges = [...cuts];
  const n = obs.reduce((s, c) => s + c, 0);
  if (n < 2) throw new RangeError("At least two counts required.");
  let fitted = { mu, sigma, converged: true },
    expected = [];
  for (let round = 0; round < 30; round++) {
    if (fit) fitted = groupedFit(obs, edges);
    expected = expectedProb(edges, fitted.mu, fitted.sigma).map((p) => n * p);
    const bad = expected.findIndex((e) => e < 5);
    if (!merge || bad < 0 || obs.length <= 2) break;
    const i = bad === obs.length - 1 ? bad - 1 : bad;
    obs.splice(i, 2, obs[i] + obs[i + 1]);
    edges.splice(i, 1);
  }
  const df = obs.length - 1 - (fit ? 2 : 0),
    valid = df > 0 && expected.every((e) => e >= 5) && fitted.converged;
  const statistic = expected.some((e) => e <= 0)
    ? null
    : obs.reduce((s, o, i) => s + (o - expected[i]) ** 2 / expected[i], 0);
  return {
    counts: obs,
    cuts: edges,
    expected,
    n,
    df,
    statistic,
    p: valid && statistic !== null ? chiSF(statistic, df) : null,
    valid,
    mu: fitted.mu,
    sigma: fitted.sigma,
    converged: fitted.converged,
    merged: counts.length - obs.length,
  };
}
export function outlierFlags(values, referenceMean, referenceSD, multiple = 3) {
  validateData(values);
  finite(referenceMean, referenceSD, multiple);
  if (referenceSD <= 0 || multiple <= 0)
    throw new RangeError(
      "Screening requires positive reference SD and threshold multiplier.",
    );
  return values.map((v, i) => ({
    index: i,
    value: v,
    flag: Math.abs(v - referenceMean) > multiple * referenceSD,
  }));
}
export function propagate(
  model,
  values,
  uncertainties,
  { rho = 0, bounds = uncertainties } = {},
) {
  validateData(values, 2);
  finite(rho);
  if (Math.abs(rho) > 1)
    throw new RangeError("Correlation must lie in [−1,1].");
  if (
    uncertainties.length !== values.length ||
    bounds.length !== values.length ||
    [...uncertainties, ...bounds].some((u) => !Number.isFinite(u) || u < 0)
  )
    throw new RangeError(
      "Nonnegative uncertainty and limit per input required.",
    );
  let value, gradient;
  const [a, b, c, d, e] = values;
  switch (model) {
    case "sum":
      value = a + b;
      gradient = [1, 1];
      break;
    case "difference":
      value = a - b;
      gradient = [1, -1];
      break;
    case "product":
      value = a * b;
      gradient = [b, a];
      break;
    case "quotient":
      if (b === 0) throw new RangeError("Denominator is zero.");
      value = a / b;
      gradient = [1 / b, -a / (b * b)];
      break;
    case "density":
      if ([b, c, d].some((v) => v <= 0))
        throw new RangeError("Density needs positive dimensions.");
      value = a / (b * c * d);
      gradient = [1 / (b * c * d), -value / b, -value / c, -value / d];
      break;
    case "tank":
      if (c <= 0 || d <= 0)
        throw new RangeError(
          "Tank diameter and elapsed time must be positive.",
        );
      value = (Math.PI * c * c * (b - a)) / (4 * d);
      gradient = [
        (-Math.PI * c * c) / (4 * d),
        (Math.PI * c * c) / (4 * d),
        (Math.PI * c * (b - a)) / (2 * d),
        -value / d,
      ];
      break;
    default:
      throw new RangeError("Unknown model.");
  }
  if (values.length !== gradient.length)
    throw new RangeError("Wrong number of model inputs.");
  const contributions = gradient.map((g, i) => (g * uncertainties[i]) ** 2),
    covariance =
      2 * gradient[0] * gradient[1] * rho * uncertainties[0] * uncertainties[1],
    variance = Math.max(
      0,
      contributions.reduce((s, v) => s + v, 0) + covariance,
    ),
    u = Math.sqrt(variance),
    worstLinear = gradient.reduce((s, g, i) => s + Math.abs(g) * bounds[i], 0),
    nearZero = Math.abs(value) <= 3 * u;
  finite(value, ...gradient, u, worstLinear);
  return {
    value,
    gradient,
    contributions,
    covariance,
    u,
    worstLinear,
    relative: value === 0 ? null : u / Math.abs(value),
    nearZero,
    boundCrossesZero: model === "quotient" && Math.abs(b) <= bounds[1],
    denominatorUnsafe:
      model === "quotient" && Math.abs(b) <= 3 * uncertainties[1],
  };
}
