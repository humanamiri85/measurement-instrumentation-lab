import * as m from "./models.mjs";
export function solve(e) {
  const a = e.args;
  switch (e.type) {
    case "stats":
      return m.describe(a.data);
    case "multiStats":
      return a.sets.map(m.describe);
    case "hist":
      return m.histogram(
        a.center ? a.data.map((v) => v - m.describe(a.data).mean) : a.data,
        a.bins,
        a.start,
        a.width,
      );
    case "histCompare":
      return a.bins.map((b) => m.histogram(a.data, b));
    case "normal":
      return a.ranges.map(([lo, hi]) => {
        let p = m.gaussianProbability(
          a.mu,
          a.sigma,
          lo ?? -Infinity,
          hi ?? Infinity,
        );
        if (a.outside) p = 1 - p;
        return { probability: p, expectedCount: a.count ? p * a.count : null };
      });
    case "normalQuantile":
      return {
        central: m.normalQuantile((1 + a.level) / 2),
        oneSided: m.normalQuantile(a.level),
      };
    case "meanData": {
      const d = m.describe(a.data);
      return {
        summary: d,
        intervals: a.levels.map((c) => m.meanInterval(d.mean, d.sd, d.n, c)),
      };
    }
    case "mean":
      return a.levels.map((c) => ({
        ...m.meanInterval(a.mean, a.sd, a.n, c),
        zComparison: m.meanInterval(a.mean, a.sd, a.n, c, true),
      }));
    case "singleSummary":
      return m.singleReading(
        a.reading,
        a.mean,
        a.reference,
        a.sd,
        a.n,
        a.level,
      );
    case "singleData": {
      const d = m.describe(a.data);
      return {
        summary: d,
        ...m.singleReading(a.reading, d.mean, a.reference, d.sd, d.n, a.level),
      };
    }
    case "variance":
      return a.levels.map((c) => m.varianceInterval(a.variance, a.n, c));
    case "chiQuantile":
      return {
        leftCDFProbability: 1 - a.rightTail,
        critical: m.chiQuantile(1 - a.rightTail, a.df),
      };
    case "tQuantile":
      return {
        oneSided: m.tQuantile(a.level, a.df),
        central: m.tQuantile((1 + a.level) / 2, a.df),
      };
    case "gof":
      return m.goodnessOfFit(
        a.counts ?? m.groupedCounts(a.data, a.cuts),
        a.cuts,
      );
    case "flags":
      return m.outlierFlags(a.data, a.mean, a.sd);
    case "referenceFlags": {
      const d = m.describe(a.referenceData);
      return { reference: d, flags: m.outlierFlags(a.data, d.mean, d.sd) };
    }
    case "outlierStudy":
      return {
        original: m.describe(a.data),
        provisional: m.describe(a.data.filter((_, i) => i !== a.index)),
      };
    case "prop":
      return {
        ...m.propagate(a.model, a.values, a.errors),
        rectangularU: m.propagate(
          a.model,
          a.values,
          a.errors.map((v) => v / Math.sqrt(3)),
        ).u,
      };
    case "relativeProp":
      return {
        firstOrderBound: a.errors.reduce((s, v) => s + Math.abs(v), 0),
        conditionalU: Math.hypot(...a.errors),
        rectangularU: Math.hypot(...a.errors) / Math.sqrt(3),
        exactUpper:
          a.operation === "product"
            ? a.errors.reduce((p, v) => p * (1 + v), 1) - 1
            : a.operation === "quotient" && a.errors.length === 2
              ? (1 + a.errors[0]) / (1 - a.errors[1]) - 1
              : null,
      };
    case "modelCounts": {
      const d = m.describe(a.data);
      return a.ranges.map(([lo, hi]) => ({
        actual: a.data.filter(
          (v) => v >= (lo ?? -Infinity) && v < (hi ?? Infinity),
        ).length,
        expected:
          a.data.length *
          m.gaussianProbability(
            a.mu ?? d.mean,
            a.sigma ?? d.sd,
            lo ?? -Infinity,
            hi ?? Infinity,
          ),
      }));
    }
    case "tankRect": {
      const v = (a.h2 - a.h1) * a.l * a.w,
        g = [-a.l * a.w, a.l * a.w, (a.h2 - a.h1) * a.w, (a.h2 - a.h1) * a.l],
        u = [a.h1, a.h2, a.l, a.w].map((v, i) => v * a.fractions[i]);
      return {
        value: v,
        gradient: g,
        worstLinear: g.reduce((s, v, i) => s + Math.abs(v) * u[i], 0),
        conditionalU: Math.hypot(...g.map((v, i) => v * u[i])),
        rectangularU: Math.hypot(...g.map((v, i) => v * u[i])) / Math.sqrt(3),
      };
    }
    case "heat": {
      const delta = a.inside - a.outside,
        components = [
          (a.inside * a.temperatureFractions[0]) / delta,
          (a.outside * a.temperatureFractions[1]) / delta,
          ...a.dimensionFractions,
        ];
      return {
        delta,
        firstOrderRelativeBound: components.reduce(
          (s, v) => s + Math.abs(v),
          0,
        ),
        conditionalRelativeU: Math.hypot(...components),
        rectangularRelativeU: Math.hypot(...components) / Math.sqrt(3),
      };
    }
    case "concept":
      return {
        explanation:
          "A normal density is symmetric, integrates to one and is specified by its mean and standard deviation. A histogram is empirical and bin dependent. Assess the model using a probability plot and a properly calibrated test; neither symmetry nor non-rejection proves normality.",
      };
    default:
      throw new Error("Unimplemented recipe: " + e.type);
  }
}
export const methods = {
  stats: [
    "Sort the readings and compare mean with median.",
    "Compute squared deviations about the actual mean; divide by n for descriptive variance or n−1 for sample variance.",
  ],
  normal: [
    "Convert limits to z=(x−μ)/σ.",
    "Subtract left-tail CDF values. Multiply by production count only for an expected count.",
  ],
  gof: [
    "Cover both tails and fit μ,σ by grouped multinomial maximum likelihood.",
    "Merge adjacent bins with expected frequency below 5, refit, then use Σ(O−E)²/E and df=k−3. Sparse bins or nonpositive df invalidate the p-value.",
  ],
  prop: [
    "Write the physical equation and calculate each sensitivity ∂f/∂x.",
    "A bounded first-order limit sums |sensitivity|×limit; standard uncertainty uses covariance, not a maximum-error label.",
  ],
  default: [
    "Identify the requested quantity, its units and the assumptions in the source note.",
    "Use the relevant lab to reproduce the calculation. Keep tail probabilities, confidence coverage and uncertainty interpretation separate.",
  ],
};
export function hints(e) {
  return (
    methods[e.type] ??
    (e.type.includes("Prop")
      ? methods.prop
      : explanation(e)
          .split(/(?<=\.)\s+/)
          .slice(0, 2))
  );
}
export function explanation(e) {
  const a = e.args;
  const descriptions = {
    stats:
      "Calculate the arithmetic mean from the sum and count; sort once to find the median. Center every squared deviation on the unrounded mean. The sample SD describes individual scatter; SEM=s/√n describes an independent sample mean.",
    multiStats:
      "Apply the same calculations separately to A, B and C. Compare both scatter and sample size: a larger sample need not have less scatter, although it can estimate the center more precisely. Do not reuse rounded printed means.",
    hist: "Assign each observation to exactly one bin using the stated edges. The final upper boundary is included. For error-band histograms first subtract the sample mean; count omitted observations explicitly.",
    histCompare:
      "Construct both specified bin counts from the same original readings. Compare changes in apparent shape without changing the data; Sturges is a suggestion, not a normality test.",
    normal:
      "Standardize each limit using z=(x−μ)/σ and subtract left-tail Gaussian probabilities. For an outside region subtract from one. Expected manufactured count is N times probability, with binomial batch variability still present.",
    normalQuantile:
      "For central coverage c, each tail has (1−c)/2; therefore use Φ⁻¹((1+c)/2). A one-sided percentile instead uses Φ⁻¹(c).",
    meanData:
      "Compute n, sample mean and sample SD from the statement readings. The central mean interval is mean ± t((1+c)/2,n−1)s/√n under independent normal sampling. This is different from multiplying SEM by one, two or three and assigning exact finite-sample Gaussian coverage.",
    mean: "Use the specified estimated SD and sample size. At the same coverage compare the Student-t interval with the hypothetical known-σ z interval. They use different assumptions, rather than a universal sample-size threshold.",
    singleSummary:
      "Distinguish the spread of one reading from estimation of the reference mean. Subtract the estimated bias; under the transferable normal model a new-reading prediction half-width is t s√(1+1/n). The textbook addition heuristic is displayed separately.",
    singleData:
      "Use the reference dataset to estimate scatter and bias. Apply the bias correction to the new indication only under a stable, transferable calibration model. A prediction interval includes the new reading and uncertainty in the reference mean.",
    variance:
      "The pivot is (n−1)s²/σ². Divide the numerator by the upper χ² quantile for the lower variance endpoint, and by the lower quantile for the upper endpoint. Square roots give SD in the original unit.",
    chiQuantile:
      "The source table uses right-tail area α. The numerical inverse CDF uses left-tail probability 1−α with df=n−1. State the convention explicitly before lookup.",
    tQuantile:
      "A right-tail table column α corresponds to a one-sided cumulative percentile 1−α. Central coverage c uses right-tail (1−c)/2. Both values are reported so the source wording cannot silently change the interval.",
    gof: "Extend the two end bins to infinity while preserving observed counts. Estimate μ and σ by grouped multinomial maximum likelihood, merge inadequate expected bins and refit. Compute Σ(O−E)²/E and use df=k−3; report p only when the fit converges, df is positive and every expected count is at least 5. Range-dependent bins make this an illustrative asymptotic diagnostic.",
    flags:
      "Compare each reading with a separate reference mean ±3 SD. Flagging is an invitation to investigate, not an automatic deletion decision. Retain index and value for every observation.",
    referenceFlags:
      "Estimate reference mean and SD from the initial run, then screen the new run against that fixed reference. Screening the same sample used to estimate scatter can mask a candidate; a new process regime may also be real.",
    outlierStudy:
      "Compare the unchanged original dataset with a clearly provisional leave-one-candidate-out summary. Explain how a large value changes the mean and SD. A smaller SD alone cannot justify exclusion.",
    prop: "Write the physical equation and its sensitivity vector. Add absolute sensitivity times bounded limits for the first-order worst case. Sum squared sensitivity times standard uncertainty for independent RSS. If the quoted limits instead represent independent uniform errors, divide each by √3 before combining.",
    relativeProp:
      "First-order multiplicative relative bounds add in magnitude, whereas independent relative standard uncertainties combine by RSS. For a uniform-tolerance interpretation divide by √3. Exact two-factor product or quotient bounds differ from the first-order approximation.",
    modelCounts:
      "Compare actual interval counts with n times the fitted normal-region probability. This is a descriptive model comparison; reusing estimated parameters and overlapping regions does not produce independent tests.",
    tankRect:
      "With elapsed time fixed at one minute, q=(h₂−h₁)lw. Sensitivities are −lw, +lw, (h₂−h₁)w and (h₂−h₁)l. The uncertainty in a small level difference can dominate even when each level has a small percentage error.",
    heat: "For Q=U A(Tinside−Toutside), take U as exact because no uncertainty is supplied. Convert percentage reading errors into absolute temperature errors before dividing by the temperature difference; combine these with the two relative dimension contributions.",
    concept:
      "Explain the Gaussian model through symmetry, normalized area and its two population parameters. An empirical frequency plot depends on bins and sampling. Use shape as evidence to investigate, not proof.",
  };
  return descriptions[e.type];
}
