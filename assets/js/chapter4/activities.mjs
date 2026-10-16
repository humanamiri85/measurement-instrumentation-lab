import * as m from "./models.mjs";
import { escape as esc, table, num } from "../chapter3-ui.mjs";
import { standardPressure, airData } from "../chapter2-models.mjs";
export { esc, table, num };
export const sections = [
  ["4.1", "Introduction", "data"],
  ["4.2", "Mean and median values", "data"],
  ["4.3", "Standard deviation and variance", "data"],
  ["4.4", "Frequency distributions", "data"],
  ["4.5", "Gaussian distribution", "normal"],
  ["4.6", "Standard Gaussian tables", "normal"],
  ["4.7", "Standard error of the mean", "sampling"],
  ["4.8", "Random error in a single measurement", "single"],
  ["4.9", "Manufacturing tolerances", "normal"],
  ["4.10", "Chi-squared distribution", "chi"],
  ["4.11", "Goodness of fit", "fit"],
  ["4.11.1", "Inspecting histogram shape", "fit"],
  ["4.11.2", "Normal probability plots", "fit"],
  ["4.11.3", "Chi-squared goodness-of-fit test", "fit"],
  ["4.12", "Rogue data points / outliers", "outlier"],
  ["4.13", "Student t distribution", "student"],
  ["4.14", "Aggregation of system errors", "prop"],
  ["4.14.1", "Systematic and random contributions", "prop"],
  ["4.14.2", "Separate arithmetic components", "prop"],
  ["4.14.3", "Combining multiple measurements", "prop"],
  ["4.15", "Summary: choose a defensible method", "summary"],
  ["4.16", "Examples and problems", "bank"],
  ["pressure", "Pressure-measurement investigation", "pressure"],
  ["ai", "Optional evidence-based AI investigations", "ai"],
];
const data = "49.8, 50.1, 49.9, 50.2, 49.7, 50.3, 49.8, 50.1, 50.0, 53.5";
export const defaults = {
  data: { data, unit: "units", bins: 6, start: 49.5, width: 0.75 },
  normal: {
    mu: 50,
    sigma: 2,
    lower: 48,
    upper: 52,
    count: 1000,
    region: "inside",
    z: 1.96,
  },
  sampling: {
    n: 20,
    runs: 100,
    seed: 42,
    mu: 50,
    sigma: 1,
    bias: 0,
    rho: 0,
    shape: "normal",
  },
  single: {
    reading: 49.5,
    reference: 50,
    mean: 50.2,
    sd: 0.5,
    n: 20,
    level: 0.95,
  },
  chi: { n: 20, variance: 4, level: 0.95, x: 20 },
  fit: {
    data: m
      .sampleRun({ n: 100, runs: 1, seed: 42, mu: 50, sigma: 1 })
      .samples.map((v) => v.toFixed(4))
      .join(", "),
    unit: "units",
    cuts: "48, 49, 50, 51, 52",
    counts: "",
    fit: "yes",
    merge: "yes",
    mu: 50,
    sigma: 1,
  },
  outlier: {
    data,
    unit: "units",
    mean: 50,
    sd: 0.3,
    multiple: 3,
    index: 9,
    exclude: "no",
    reason: "",
  },
  student: { mean: 50, sd: 2, n: 8, level: 0.95, x: 2 },
  prop: {
    model: "difference",
    values: "10, 9.5",
    uncertainties: ".01, .0095",
    bounds: ".01, .0095",
    rho: 0,
    correction: 0,
  },
  summary: { method: "mean", data, unit: "units", level: 0.95 },
  pressure: {
    data: "100470, 100500, 100485, 100510, 100490, 100505, 100480, 100500",
    unit: "Pa",
    static: 100000,
    staticU: 10,
    bias: 5,
    validation: 495,
    tolerance: 15,
    decision: "",
    evidence: "",
  },
  ai: { claim: "mean", response: "", evidence: "" },
};
const field = (id, label, value, type = "number", step = "any") =>
  `<label class="control" for="${id}"><span>${label}</span><input id="${id}" name="${id}" type="${type}" value="${esc(value)}" ${type === "number" ? `step="${step}"` : ""}></label>`;
const area = (id, label, value) =>
  `<label class="control" for="${id}"><span>${label}</span><textarea id="${id}" name="${id}" rows="4">${esc(value)}</textarea></label>`;
const select = (id, label, value, options) =>
  `<label class="control" for="${id}"><span>${label}</span><select id="${id}" name="${id}">${options.map(([v, t]) => `<option value="${v}" ${v === value ? "selected" : ""}>${t}</option>`).join("")}</select></label>`;
const nums = (s, labels) =>
  Object.entries(labels)
    .map(([k, v]) => field(k, v, s[k]))
    .join("");
export function controls(kind, s) {
  switch (kind) {
    case "data":
      return (
        area("data", "Editable readings", s.data) +
        field("unit", "Reading unit", s.unit, "text") +
        nums(s, {
          bins: "Number of bins (1–50)",
          start: "First lower boundary",
          width: "Bin width",
        })
      );
    case "normal":
      return (
        nums(s, {
          mu: "Population mean μ",
          sigma: "Population SD σ (>0)",
          lower: "Lower tolerance / region bound",
          upper: "Upper tolerance / region bound",
          count: "Production count",
          z: "Table z value",
        }) +
        select("region", "Probability region", s.region, [
          ["inside", "Between bounds"],
          ["outside", "Outside bounds"],
          ["above", "Above lower bound"],
          ["below", "Below upper bound"],
        ])
      );
    case "sampling":
      return (
        nums(s, {
          n: "Readings per run (2–500)",
          runs: "Repeated runs (1–500)",
          seed: "Reproducible seed",
          mu: "Population reference mean",
          sigma: "Innovation SD",
          bias: "Persistent bias",
          rho: "Adjacent correlation (−1 < ρ < 1)",
        }) +
        select("shape", "Innovation distribution", s.shape, [
          ["normal", "Gaussian"],
          ["skew", "Skewed exponential"],
          ["mixture", "Contaminated mixture"],
        ])
      );
    case "single":
      return nums(s, {
        reading: "New single reading",
        reference: "Certified reference value",
        mean: "Reference run mean",
        sd: "Reference run sample SD",
        n: "Reference run size",
        level: "Central confidence (0–1)",
      });
    case "chi":
      return nums(s, {
        n: "Sample size n",
        variance: "Sample variance s² (unit²)",
        level: "Confidence (0–1)",
        x: "χ² location / left-tail lookup",
      });
    case "fit":
      return (
        area(
          "data",
          "Editable raw readings (used if grouped counts are empty)",
          s.data,
        ) +
        area(
          "cuts",
          "Finite internal cutpoints; end bins extend to ±∞",
          s.cuts,
        ) +
        area(
          "counts",
          "Optional grouped counts (one more than cutpoints)",
          s.counts,
        ) +
        select("fit", "Parameter estimation", s.fit, [
          ["yes", "Grouped maximum likelihood (2 parameters)"],
          ["no", "Known μ and σ (0 fitted parameters)"],
        ]) +
        select("merge", "Sparse expected counts", s.merge, [
          ["yes", "Merge adjacent bins and refit"],
          ["no", "Inspect without merging"],
        ]) +
        nums(s, { mu: "Known population μ", sigma: "Known population σ" })
      );
    case "outlier":
      return (
        area(
          "data",
          "Original readings (never overwritten by exclusion)",
          s.data,
        ) +
        nums(s, {
          mean: "Separate reference mean",
          sd: "Separate reference SD",
          multiple: "Screening multiplier",
          index: "Candidate index (zero-based)",
        }) +
        select("exclude", "Provisional comparison", s.exclude, [
          ["no", "Retain every reading"],
          ["yes", "Exclude candidate provisionally"],
        ]) +
        area("reason", "Investigation / exclusion reason", s.reason)
      );
    case "student":
      return nums(s, {
        mean: "Sample mean",
        sd: "Sample SD",
        n: "Sample size n",
        level: "Confidence / one-sided percentile (0–1)",
        x: "t location",
      });
    case "prop":
      return (
        select("model", "Physical equation", s.model, [
          ["sum", "a+b"],
          ["difference", "a−b"],
          ["product", "a×b"],
          ["quotient", "a/b"],
          ["density", "m/(length×width×height)"],
          ["tank", "πd²(h₂−h₁)/(4t)"],
        ]) +
        area("values", "Input values, in equation order", s.values) +
        area(
          "uncertainties",
          "Input standard uncertainties, same order",
          s.uncertainties,
        ) +
        area("bounds", "Separate bounded limits, same order", s.bounds) +
        nums(s, {
          rho: "Correlation between first two inputs (−1 to 1)",
          correction: "Signed known output correction",
        })
      );
    case "summary":
      return (
        area("data", "Evidence dataset", s.data) +
        select("method", "Question being answered", s.method, [
          ["mean", "Precision of a mean"],
          ["single", "A future single reading"],
          ["variance", "Population scatter"],
          ["shape", "Is Gaussian modeling defensible?"],
        ]) +
        field("level", "Confidence (0–1)", s.level)
      );
    case "pressure":
      return (
        area("data", "Repeated total-pressure readings (Pa)", s.data) +
        nums(s, {
          static: "Static pressure (Pa)",
          staticU: "Static-pressure standard uncertainty (Pa)",
          bias: "Known total-pressure bias (Pa; subtract)",
          validation: "Independent differential-pressure validation (Pa)",
          tolerance: "Acceptance tolerance against validation (Pa)",
        }) +
        area("decision", "Engineering decision and justification", s.decision) +
        area(
          "evidence",
          "Statistical evidence and independent validation",
          s.evidence,
        )
      );
    case "ai":
      return (
        select("claim", "Offline authored claim to critique", s.claim, [
          ["mean", "The mean is always best"],
          ["gaussian", "A bell-shaped histogram proves Gaussian errors"],
          ["budget", "RSS is the maximum error"],
        ]) +
        area(
          "response",
          "Your critique / optionally paste an AI response",
          s.response,
        ) +
        area(
          "evidence",
          "Numerical evidence, assumptions and independent check",
          s.evidence,
        )
      );
  }
}
const metric = (label, value, unit = "") =>
  `<div class="metric"><span>${esc(label)}</span><strong>${typeof value === "number" ? num(value, 5) : esc(value ?? "Undefined")}</strong><small>${esc(unit)}</small></div>`;
const metrics = (items) =>
  `<div class="metrics">${items.map((i) => metric(...i)).join("")}</div>`;
export function chart(title, xlabel, ylabel, series) {
  const pts = series
    .flatMap((s) => s.points)
    .filter((p) => p.every(Number.isFinite));
  if (!pts.length) return "<p>No finite plot available.</p>";
  let xmin = Math.min(...pts.map((p) => p[0])),
    xmax = Math.max(...pts.map((p) => p[0])),
    ymin = Math.min(...pts.map((p) => p[1])),
    ymax = Math.max(...pts.map((p) => p[1]));
  if (xmax === xmin) xmax = xmin + 1;
  if (ymax === ymin) ymax = ymin + 1;
  const X = (x) => 70 + ((x - xmin) / (xmax - xmin)) * 540,
    Y = (y) => 285 - ((y - ymin) / (ymax - ymin)) * 230;
  return `<figure class="plot"><svg viewBox="0 0 640 340" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><path d="M70 40V285H610" fill="none" stroke="currentColor"/>${series
    .map(
      (s, i) =>
        `<polyline points="${s.points
          .filter((p) => p.every(Number.isFinite))
          .map(([x, y]) => `${X(x)},${Y(y)}`)
          .join(
            " ",
          )}" fill="none" stroke="${["#147d92", "#d66d20", "#7550a8"][i % 3]}" stroke-width="3"/>`,
    )
    .join(
      "",
    )}<text x="70" y="310">${num(xmin, 2)}</text><text x="545" y="310">${num(xmax, 2)}</text><text x="8" y="55">${num(ymax, 2)}</text><text x="8" y="285">${num(ymin, 2)}</text><text x="220" y="335">${esc(xlabel)}</text></svg><figcaption>${esc(title)} · ${esc(ylabel)}. ${series.map((s) => esc(s.name)).join(" / ")}</figcaption></figure>`;
}
const histPlot = (h, title = "Frequency distribution") =>
  chart(title, "Reading", "Count", [
    {
      name: "Observed count",
      points: h.counts.flatMap((v, i) => [
        [h.edges[i], 0],
        [h.edges[i], v],
        [h.edges[i + 1], v],
        [h.edges[i + 1], 0],
      ]),
    },
  ]);
const note = (t) => `<p class="note">${t}</p>`;
export const teaching = {
  data: [
    "How will a single extreme reading change the mean and median?",
    "Mean uses every magnitude; median uses rank. Sample variance divides squared deviations by n−1, while descriptive population variance divides by n. Neither statistic establishes accuracy.",
    "Are mean and median necessarily equally affected by an extreme value?",
    "No",
    "The median is often more resistant; the preferred summary depends on the measurement question.",
  ],
  normal: [
    "Predict the yield if σ doubles while tolerances stay fixed.",
    "A Gaussian population model needs justification. The CDF is a left-tail probability; central coverage subtracts two CDF values. Expected yield is not a guaranteed batch outcome.",
    "Does a 95% central region have 5% in each tail?",
    "No",
    "It has 2.5% in each tail.",
  ],
  sampling: [
    "Will increasing n remove persistent bias or correlated drift?",
    "Independent stationary readings reduce SEM as σ/√n, not the spread of individual readings. Positive serial correlation slows the improvement; a mixture can also shift the mean.",
    "Does averaging remove a fixed bias?",
    "No",
    "Bias remains even when SEM becomes small.",
  ],
  single: [
    "Which is wider: a mean interval or a future-reading prediction interval?",
    "Subtract a transferable known bias. A single-reading spread, an estimated-mean interval and a finite-sample prediction interval answer different questions. Normality and stable scatter are assumptions.",
    "Can SEM be used as the SD of one new reading?",
    "No",
    "SEM describes a sample mean. A future reading includes its own scatter.",
  ],
  chi: [
    "How does interval asymmetry change with sample size?",
    "For independent normal observations, (n−1)s²/σ² follows χ² with n−1 degrees of freedom. Divide by the reversed quantile endpoints, then square-root for SD.",
    "Are the variance and SD interval endpoints numerically identical?",
    "No",
    "SD endpoints are square roots and use the original reading unit.",
  ],
  fit: [
    "Will changing bins change your conclusion?",
    "Histogram shape is suggestive; normal probability plots expose tails and curvature. Pearson testing needs complete tails, adequate expected counts and the right estimation-dependent degrees of freedom. Here grouped MLE gives df=k−3.",
    "Does p>0.05 prove a Gaussian population?",
    "No",
    "It means this test did not reject; power, bin choice and sampling design still matter.",
  ],
  outlier: [
    "Can a flagged reading be a legitimate process change?",
    "A separate reference avoids masking. A 3s flag is a screening rule, not an automatic rejection test. Multiple screening and nonnormal tails can increase false flags. Preserve the original observations.",
    "Should every 3s flag be deleted automatically?",
    "No",
    "Investigate transcription, instrument state and real events; record the reason.",
  ],
  student: [
    "Predict how the t interval compares with z at the same coverage.",
    "Use t when estimating normal-population scatter from data. There is no universal n=30 switch. One-sided percentile c differs from the critical value for central coverage c.",
    "Is the central 95% critical value the 95th percentile?",
    "No",
    "It is the 97.5th percentile.",
  ],
  prop: [
    "Will positive correlation increase uncertainty of a difference?",
    "Known corrections carry signs. Bounded first-order errors sum absolute sensitivity contributions. Standard uncertainty is sqrt(gᵀΣg); RSS assumes independence and is not a maximum. Large errors can invalidate linearization.",
    "Is RSS a guaranteed maximum error?",
    "No",
    "RSS describes standard uncertainty under the covariance model, not a worst-case bound.",
  ],
  summary: [
    "Choose a method based on the question, before calculating.",
    "Match evidence to the estimand: center, future indication, population scatter or distribution shape. Accuracy also needs traceability and bias validation.",
    "Can one small SEM certify the instrument is accurate?",
    "No",
    "It establishes precision under assumptions; bias and reference uncertainty remain.",
  ],
  pressure: [
    "Can excellent repeatability conceal a bad engineering decision?",
    "Use corrected total-pressure mean minus static pressure. Propagate SEM and static uncertainty, compare with an independent differential-pressure measurement, then justify acceptance. Equivalent airspeed uses the existing low-speed incompressible model.",
    "Is relative uncertainty reliable when differential pressure approaches zero?",
    "No",
    "Absolute uncertainty remains useful; division by a near-zero value and square-root linearization become unstable.",
  ],
  ai: [
    "Choose a claim, reproduce a counterexample, and document an independent check.",
    "Offline claims: “The mean is always best”; “A bell-shaped histogram proves Gaussian errors”; “RSS is a guaranteed maximum.” No AI service is called, and agreement is never graded.",
    "Is agreeing with an AI response evidence?",
    "No",
    "Use data, assumptions and an independent analytical or numerical check.",
  ],
};
export function results(kind, s) {
  switch (kind) {
    case "data": {
      const d = m.describe(m.parseData(s.data)),
        h = m.histogram(d.sorted, s.bins, s.start, s.width);
      return (
        metrics([
          ["n", d.n],
          ["Mean", d.mean, s.unit],
          ["Median", d.median, s.unit],
          ["Population variance (÷n)", d.populationVariance, s.unit + "²"],
          ["Sample variance (÷n−1)", d.sampleVariance, s.unit + "²"],
          ["Sample SD", d.sd, s.unit],
          ["SEM (independent)", d.sem, s.unit],
        ]) +
        histPlot(h) +
        table(
          "Bin counts",
          ["Interval", "Count"],
          h.counts.map((v, i) => [
            `[${num(h.edges[i])}, ${num(h.edges[i + 1])}${i === h.counts.length - 1 ? "]" : ")"}`,
            v,
          ]),
        ) +
        note(
          `Outside selected bins: ${h.outside}. Left edges included; right edges excluded except the final upper edge. Sturges suggestion: ${h.sturges} bins. Zero dispersion is descriptive, not proof of zero measurement uncertainty.`,
        )
      );
    }
    case "normal": {
      if (!Number.isInteger(s.count) || s.count < 1)
        throw new RangeError("Production count must be a positive integer.");
      const p = m.gaussianProbability(
          s.mu,
          s.sigma,
          s.region === "below" ? -Infinity : s.lower,
          s.region === "above" ? Infinity : s.upper,
        ),
        prob = s.region === "outside" ? 1 - p : p;
      return (
        metrics([
          ["Probability / expected yield", prob],
          ["Expected accepted units", prob * s.count],
          ["Lower z", (s.lower - s.mu) / s.sigma],
          ["Upper z", (s.upper - s.mu) / s.sigma],
          ["Φ(z): left tail", m.normalCDF(s.z)],
          ["Area from 0 to |z|", m.normalCDF(Math.abs(s.z)) - 0.5],
          ["Right tail", 1 - m.normalCDF(s.z)],
        ]) +
        chart(
          "Gaussian density and selected region",
          "Reading",
          "Probability density",
          [
            {
              name: "PDF",
              points: Array.from({ length: 161 }, (_, i) => {
                const x = s.mu + s.sigma * (-4 + i / 20);
                return [x, m.normalPDF(x, s.mu, s.sigma)];
              }),
            },
            {
              name: "Selected region (orange)",
              points: Array.from({ length: 161 }, (_, i) => {
                const x = s.mu + s.sigma * (-4 + i / 20),
                  inside =
                    (s.region === "above" || x <= s.upper) &&
                    (s.region === "below" || x >= s.lower);
                return [
                  x,
                  (s.region === "outside" ? !inside : inside)
                    ? m.normalPDF(x, s.mu, s.sigma)
                    : 0,
                ];
              }),
            },
          ],
        ) +
        note(
          "σ is the population SD here. Tolerance limits are engineering specifications; they are not confidence intervals. Fractional expected counts are valid expectations.",
        )
      );
    }
    case "sampling": {
      const r = m.sampleRun(s),
        d = m.describe(r.samples),
        means = m.describe(r.means);
      return (
        metrics([
          ["First run SD", d.sd],
          ["First run SEM assuming independence", d.sem],
          ["Empirical SD of run means", means.sd],
          ["Mean of run means", means.mean],
          ["AR(1) theoretical SEM, Gaussian only", r.theoreticalSEM],
        ]) +
        histPlot(
          m.histogram(r.samples, 10),
          "Individual readings (first run)",
        ) +
        histPlot(m.histogram(r.means, 10), "Repeated sample means") +
        note(
          "For Gaussian innovations, the AR(1) initial draw is stationary; correlated SEM uses all lag covariances. For nonnormal innovations no Gaussian coverage is asserted. The contaminated mixture has a shifted center.",
        )
      );
    }
    case "single": {
      const r = m.singleReading(
        s.reading,
        s.mean,
        s.reference,
        s.sd,
        s.n,
        s.level,
      );
      return (
        metrics([
          ["Estimated bias", r.bias],
          ["Corrected new reading", r.corrected],
          ["Single half-width if σ known (z)", r.singleHalf],
          ["Estimated mean half-width (t)", r.meanHalf],
          ["Future-reading prediction half-width (t)", r.predictionHalf],
          ["Textbook 1.96(s+SEM) heuristic", r.textbookHeuristic],
        ]) +
        note(
          "The textbook heuristic is displayed for comparison, not as an exact confidence or prediction interval. The 1.96 factor is fixed at approximately 95%, whereas the proper intervals follow your selected coverage. Estimated bias has uncertainty; transfer to another operating point needs validation.",
        )
      );
    }
    case "chi": {
      const r = m.varianceInterval(s.variance, s.n, s.level),
        df = s.n - 1;
      return (
        metrics([
          ["Degrees of freedom", df],
          ["Variance lower", r.lower, "unit²"],
          ["Variance upper", r.upper, "unit²"],
          ["SD lower", r.sdLower, "unit"],
          ["SD upper", r.sdUpper, "unit"],
          ["Left-tail CDF", m.chiCDF(s.x, df)],
          ["Right-tail probability", m.chiSF(s.x, df)],
        ]) +
        chart("Chi-square density", "χ²", "Density", [
          {
            name: `df=${df}`,
            points: Array.from({ length: 151 }, (_, i) => {
              const x = 0.001 + (i * Math.max(20, df * 2)) / 150;
              return [x, m.chiPDF(x, df)];
            }),
          },
        ]) +
        note(
          "PDF plots start above zero because χ² density is singular at zero for df<2. Confidence intervals require independent Gaussian readings; confidence is long-run interval coverage, not a probability assigned to the fixed parameter.",
        )
      );
    }
    case "fit": {
      const cuts = m.parseData(s.cuts),
        raw = s.counts.trim() ? null : m.parseData(s.data),
        counts = raw ? m.groupedCounts(raw, cuts) : m.parseData(s.counts),
        r = m.goodnessOfFit(counts, cuts, {
          fit: s.fit === "yes",
          merge: s.merge === "yes",
          mu: s.mu,
          sigma: s.sigma,
        });
      const edges = [-Infinity, ...r.cuts, Infinity];
      let qq = "";
      if (raw) {
        try {
          const p = m.normalPlot(raw);
          qq = chart(
            "Normal probability plot",
            "Theoretical normal z",
            "Reading",
            [
              {
                name: "Ordered observations",
                points: p.map((v) => [v.z, v.value]),
              },
              {
                name: "Reference line μ+s z",
                points: p.map((v) => [v.z, v.reference]),
              },
            ],
          );
        } catch (e) {
          qq = note(esc(e.message));
        }
      }
      return (
        metrics([
          ["Grouped mean / known μ", r.mu],
          ["Grouped SD / known σ", r.sigma],
          ["Pearson statistic", r.statistic],
          ["df = k−1−p", r.df],
          ["p-value (when valid)", r.p],
          ["Merged bins", r.merged],
        ]) +
        (raw ? histPlot(m.histogram(raw, 8)) : "") +
        qq +
        table(
          "Tail-complete Pearson audit",
          ["Bin", "Observed", "Expected", "Contribution"],
          r.counts.map((v, i) => [
            `${num(edges[i])} to ${num(edges[i + 1])}`,
            v,
            num(r.expected[i], 5),
            num((v - r.expected[i]) ** 2 / r.expected[i], 5),
          ]),
        ) +
        note(
          r.valid
            ? "Asymptotic diagnostic: p below your predeclared α rejects this model; otherwise do not claim proof of normality. Data-dependent cutpoints/merging affect calibration: prefer a predeclared grouping or bootstrap for formal inference."
            : "No valid p-value: expected counts ≥5, positive df and converged grouped fit are required. Use more data or a defensible grouping; do not interpret this as rejection.",
        ) +
        note(
          "Raw-data probability plots use (i+0.5)/n ranks. Bins cover (−∞, first cut), successive left-inclusive intervals, and the final right tail. Known parameters use df=k−1; grouped-MLE parameters use df=k−3.",
        )
      );
    }
    case "outlier": {
      const original = m.parseData(s.data),
        flags = m.outlierFlags(original, s.mean, s.sd, s.multiple);
      if (
        !Number.isInteger(s.index) ||
        s.index < 0 ||
        s.index >= original.length
      )
        throw new RangeError(
          "Candidate index must identify an original reading.",
        );
      if (s.exclude === "yes" && !s.reason.trim())
        throw new RangeError(
          "Record an investigation reason before provisional exclusion.",
        );
      const retained = original.filter(
          (_, i) => s.exclude !== "yes" || i !== s.index,
        ),
        a = m.describe(original),
        b = m.describe(retained);
      return (
        table(
          "Original data and screening flags",
          ["Index", "Reading", "Flag", "Provisional status"],
          flags.map((v) => [
            v.index,
            v.value,
            v.flag ? "Investigate" : "Within reference band",
            s.exclude === "yes" && v.index === s.index
              ? "Excluded for comparison only"
              : "Retained",
          ]),
        ) +
        metrics([
          ["Original mean", a.mean],
          ["Original median", a.median],
          ["Original SD", a.sd],
          ["Comparison mean", b.mean],
          ["Comparison SD", b.sd],
        ]) +
        note(
          "Original data remain intact in the editor and export. Record instrument checks or a genuine event; do not turn a convenient improvement in SD into a deletion reason.",
        )
      );
    }
    case "student": {
      const r = m.meanInterval(s.mean, s.sd, s.n, s.level),
        z = m.meanInterval(s.mean, s.sd, s.n, s.level, true),
        df = s.n - 1;
      return (
        metrics([
          ["Central critical t", r.critical],
          ["One-sided percentile t", m.tQuantile(s.level, df)],
          ["Mean interval lower", r.lower],
          ["Mean interval upper", r.upper],
          ["t half-width", r.half],
          ["z comparison, same coverage", z.half],
          ["Left-tail t CDF", m.tCDF(s.x, df)],
        ]) +
        chart(
          "Student t compared with standard Gaussian",
          "Standardized value",
          "Density",
          [
            {
              name: "t",
              points: Array.from({ length: 161 }, (_, i) => [
                -4 + i / 20,
                m.tPDF(-4 + i / 20, df),
              ]),
            },
            {
              name: "Gaussian",
              points: Array.from({ length: 161 }, (_, i) => [
                -4 + i / 20,
                m.normalPDF(-4 + i / 20),
              ]),
            },
          ],
        ) +
        note(
          "t is exact for independent normal samples with estimated SD. z comparison assumes known population σ; it is not justified just because n exceeds 30.",
        )
      );
    }
    case "prop": {
      const v = m.parseData(s.values),
        u = m.parseData(s.uncertainties),
        b = m.parseData(s.bounds),
        r = m.propagate(s.model, v, u, { rho: s.rho, bounds: b });
      m.finite(s.correction);
      return (
        metrics([
          ["Nominal output", r.value],
          ["Corrected output", r.value + s.correction],
          ["Combined standard uncertainty u", r.u],
          ["First-order bounded limit", r.worstLinear],
          ["Relative standard uncertainty", r.relative],
          ["Covariance contribution", r.covariance],
        ]) +
        table(
          "Sensitivity budget",
          [
            "Input",
            "Value",
            "Standard u",
            "Bound",
            "∂f/∂x",
            "Variance contribution",
          ],
          v.map((x, i) => [
            i + 1,
            x,
            u[i],
            b[i],
            num(r.gradient[i], 6),
            num(r.contributions[i], 6),
          ]),
        ) +
        note(
          `${r.nearZero ? "Near zero: relative measures are unstable; retain absolute uncertainty. " : ""}${r.denominatorUnsafe ? "Denominator is within 3 standard uncertainties of zero: quotient linearization is unsafe. " : ""}${r.boundCrossesZero ? "The stated denominator bound crosses zero: no finite exact quotient bound exists. " : ""}Consistent input units are required; output units follow the equation. Diameter squared is one repeated variable with sensitivity 2f/d. Positive correlation cancels some difference uncertainty but adds to a sum. Bounds are first-order approximations, not exact nonlinear limits. A rectangular bound a corresponds to standard uncertainty a/√3 only under that distribution model.`,
        )
      );
    }
    case "summary": {
      const d = m.describe(m.parseData(s.data));
      let r;
      if (s.method === "mean") r = m.meanInterval(d.mean, d.sd, d.n, s.level);
      else if (s.method === "single")
        r = {
          half:
            m.tQuantile((1 + s.level) / 2, d.n - 1) *
            d.sd *
            Math.sqrt(1 + 1 / d.n),
        };
      else if (s.method === "variance")
        r = m.varianceInterval(d.sampleVariance, d.n, s.level);
      else
        return (
          histPlot(m.histogram(d.sorted, 6)) +
          note(
            "Inspect the shape, then use 4.11.2 and 4.11.3. A histogram alone cannot decide normality. Check sampling design before any statistical test.",
          )
        );
      return (
        objectTable(r, "Selected method result") +
        note(
          "Explain why this method answers the selected question. Independence and Gaussian assumptions apply to these exact intervals. A single datum is insufficient for estimating scatter.",
        )
      );
    }
    case "pressure": {
      const d = m.describe(m.parseData(s.data));
      if (d.n < 2)
        throw new RangeError("At least two pressure readings required.");
      m.finite(s.static, s.staticU, s.bias, s.validation, s.tolerance);
      if (s.static <= 0)
        throw new RangeError("Static pressure must be positive.");
      if (s.staticU < 0 || s.tolerance <= 0)
        throw new RangeError(
          "Use nonnegative static uncertainty and positive acceptance tolerance.",
        );
      const q = d.mean - s.bias - s.static,
        r = m.propagate(
          "difference",
          [d.mean - s.bias, s.static],
          [d.sem, s.staticU],
        ),
        delta = q - s.validation,
        pass = Math.abs(delta) + 2 * r.u <= s.tolerance;
      const speed =
        q > 0 && s.static > 0
          ? airData(s.static, d.mean - s.bias).equivalentSpeed
          : null;
      return (
        metrics([
          ["Mean total pressure", d.mean, "Pa"],
          ["Total sample SD", d.sd, "Pa"],
          ["Mean SEM (independent)", d.sem, "Pa"],
          ["Corrected differential q", q, "Pa"],
          ["Combined standard u(q)", r.u, "Pa"],
          ["Difference from independent validation", delta, "Pa"],
          ["Low-speed equivalent airspeed", speed, "m/s"],
          ["ISA sea-level reference", standardPressure(0), "Pa"],
        ]) +
        note(
          `Conservative illustrative decision rule |q−q_validation|+2u(q) ≤ tolerance: ${pass ? "passes" : "does not pass"}. This is a predeclared engineering guard band, not a calibrated confidence claim. Validation uncertainty and bias uncertainty are omitted here and must be supplied for a real acceptance decision. ${r.nearZero || q <= 0 ? "Near-zero/nonpositive differential: relative uncertainty and airspeed linearization are unsafe. " : "For speed v, sensitivity ∂v/∂q=1/(1.225v); validate low-speed assumptions before conversion. "}Assumes stationary independent readings and exact known correction. Required written evidence: summary statistics, interval/uncertainty interpretation, decision rule, independent validation and model limits.`,
        ) +
        chart("Repeated total-pressure observations", "Reading index", "Pa", [
          {
            name: "Raw total pressure",
            points: m.parseData(s.data).map((v, i) => [i + 1, v]),
          },
        ])
      );
    }
    case "ai":
      return (
        note(
          "Offline authored response: " +
            {
              mean: "The mean always gives the most accurate center; discard any point that makes it worse.",
              gaussian:
                "The histogram looks like a bell, so the errors are Gaussian with 95% confidence.",
              budget:
                "Square the component maximum errors, sum them and take the square root to get the guaranteed maximum.",
            }[s.claim],
        ) +
        table(
          "Evidence rubric (self / instructor reviewed)",
          ["Task", "Required evidence"],
          [
            [
              "Mean versus median",
              "Compare a clean sample and a contaminated sample; define the estimand.",
            ],
            [
              "Gaussian model",
              "Show histogram/bin sensitivity, QQ plot and a valid test; state limits of non-rejection.",
            ],
            [
              "Budget audit",
              "Separate signed correction, bounds and standard u; show sensitivities, covariance and independent arithmetic.",
            ],
          ],
        ) +
        note(
          `Related evidence bench: <a href="#${{ mean: "4.2", gaussian: "4.11", budget: "4.14" }[s.claim]}">Open the relevant lab</a>. Optional prompts and responses remain in this browser and exported notes. Nothing is transmitted. A written critique is not automatically graded.`,
        )
      );
  }
}
export function objectTable(obj, caption = "Calculated answer", prefix = "") {
  const rows = [];
  function visit(v, key) {
    if (v && typeof v === "object") {
      for (const [k, x] of Object.entries(v)) visit(x, key ? key + "." + k : k);
    } else rows.push([key, typeof v === "number" ? num(v, 7) : String(v)]);
  }
  visit(obj, prefix);
  return table(caption, ["Quantity / index", "Value"], rows);
}
