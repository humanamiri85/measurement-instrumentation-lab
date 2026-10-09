import { aiDataset } from "./chapter2-models.mjs";
import { $, range, select } from "./ui.mjs";
import {
  reading,
  rng,
  normal,
  correction,
  errorMetrics,
  budget,
  standardUncertainty,
  repeated,
  histogram,
  signalRun,
  rms,
  snr,
  spectrum,
  condition,
  fidelity,
} from "./chapter3-models.mjs";
import {
  get,
  num,
  table,
  graph,
  header,
  bench,
  ai,
  finish,
  check,
  metrics,
  question,
} from "./chapter3-ui.mjs";
const curve = (fn) => Array.from({ length: 101 }, (_, x) => [x, fn(x)]);
const enabled = (root, id, value) =>
  $("#use-" + id, root).checked ? value : 0;
export function sources(root) {
  const fields = [
    ["offset", "Zero offset", -5, 5, 0.1, 2, "kPa"],
    ["gain", "Relative gain error", -0.1, 0.1, 0.005, 0.02, "kPa/kPa"],
    ["coefficient", "Temperature coefficient", -0.2, 0.2, 0.01, 0.05, "kPa/°C"],
    ["drift", "Accumulated drift", -3, 3, 0.1, 0, "kPa"],
    ["bow", "Nonlinear bow at midrange", -5, 5, 0.1, 0, "kPa"],
    ["noise", "Random noise standard deviation", 0, 2, 0.1, 0, "kPa"],
  ];
  root.innerHTML =
    header(
      "3.1 / LO1, LO2",
      "Where does the error enter?",
      "A pressure transducer directly measures pressure; any altitude derived from it inherits pressure error. Systematic effects can have predictable signs or depend on operating conditions. Random variation is characterized statistically, not corrected from a single sample.",
      "A 0–100 kPa sensor reads high. Predict whether zero offset or gain error makes the error grow with input. Switch each source off to isolate its effect.",
    ) +
    `<p class="equation">y = (1 + g)x + b + k<sub>T</sub>(T − 20°C) + d + 4a(x/100)(1 − x/100) + ε</p><p class="note">Illustrative pressure model only. Drift is an accumulated offset at the current observation time; ε is a seeded Gaussian disturbance. Error = indication − reference; uncertainty describes doubt about the measurement result.</p>` +
    bench(
      "Sensor Error Explorer",
      range("reference", "Reference input", 0, 100, 1, 50, "kPa") +
        range("temp", "Ambient temperature", 0, 50, 1, 20, "°C") +
        fields
          .map(
            ([id, label, ...args]) =>
              check("use-" + id, "Enable " + label) + range(id, label, ...args),
          )
          .join(""),
    ) +
    `<details class="explain"><summary>Other systematic mechanisms / engineering controls</summary>${table(
      "Mechanisms beyond the additive model",
      ["Mechanism", "Cause and useful check"],
      [
        [
          "Connecting leads / wear",
          "Lead resistance can add voltage drops or corrupt resistance readings; use appropriate four-wire sensing where needed. Mechanical wear can shift response or increase play; monitor references over time.",
        ],
        [
          "Hysteresis",
          "History-dependent response: compare increasing and decreasing reference runs.",
        ],
        [
          "Loading / installation",
          "The act of measurement can alter the measurand: a voltmeter loads a source, or a probe draws heat from a small sample. Check input impedance, mounting, leaks, and pressure tapping location.",
        ],
        [
          "Procedure / observation",
          "Parallax, incorrect units, warmup, or reference use; follow a controlled procedure.",
        ],
        [
          "Environment / drift",
          "Record temperature and repeated reference checks over time; select a suitable instrument.",
        ],
      ],
    )}</details>` +
    question(
      "source-predict",
      "Which error vanishes at zero input but grows proportionally with input?",
      ["Gain error", "Constant zero offset", "All random errors"],
      0,
      "Gain contribution is gx; offset remains at x = 0.",
    ) +
    ai(
      "A — identify the error source",
      `Use this unknown increasing-pressure dataset, reused from Chapter 2. Propose offset, gain, environment, or scatter hypotheses. Use the explorer to test plausible mechanisms, then identify which additional run would distinguish them. ${table(
        "Unknown sensor dataset / AI Investigation A",
        ["Reference / kPa", "Indication / kPa"],
        aiDataset.map((r) => [r.reference, num(r.measured, 1)]),
      )}`,
      [
        "Zero-input error",
        "Change in error across range",
        "Same-seed comparison with a source disabled",
      ],
      "Which additional run would separate two plausible causes?",
    );
  const render = () => {
    const p = Object.fromEntries(
      fields
        .filter((f) => f[0] !== "noise")
        .map(([id]) => [id, enabled(root, id, get(id, root))]),
    );
    p.temp = get("temp", root);
    const disturbance =
      enabled(root, "noise", get("noise", root)) * normal(rng(42));
    const r = reading(get("reference", root), p, disturbance);
    $("#lab-results", root).innerHTML =
      metrics([
        ["Reference", num(r.reference) + " kPa"],
        ["Indication", num(r.measured) + " kPa"],
        ["Signed error", num(r.error) + " kPa"],
      ]) +
      graph(
        "Reference and systematic calibration curves",
        "Reference / kPa",
        "Indication / kPa",
        [
          { name: "Reference", values: curve((x) => x) },
          {
            name: "Systematic indication",
            values: curve((x) => reading(x, p).measured),
          },
        ],
      ) +
      graph("Systematic error across input", "Reference / kPa", "Error / kPa", [
        { name: "Systematic error", values: curve((x) => reading(x, p).error) },
      ]) +
      table(
        "Error contribution breakdown",
        ["Source", "Signed contribution / kPa"],
        Object.entries(r.contributions).map(([k, v]) => [k, num(v)]),
      ) +
      `<p class="observation">The plotted curve excludes random disturbance; the current indication includes one reproducible draw. A single noisy reading does not establish a bias. Reference uncertainty is not modeled here.</p>`;
  };
  finish(
    root,
    render,
    `Identify plausible sources in this unknown increasing-pressure dataset (reference_kPa, measured_kPa):\n${aiDataset.map((r) => r.reference + "," + r.measured).join("\n")}\nUse the pressure explorer as a separate mechanism experiment. Do not infer hysteresis or dynamic lag from steady increasing readings.`,
  );
}
export function corrections(root) {
  root.innerHTML =
    header(
      "3.2 / LO3",
      "Correct it. Then test it elsewhere.",
      "Calibration compares indication against reference under stated conditions. Correction changes the reported value; adjustment changes the instrument. Neither guarantees removal of noise, reference uncertainty, drift, or untested history effects.",
      "Collect 0, 20, 40, 60, 80, 100 kPa points at 20°C. Predict which method fixes affine error and which needs more points for a bowed response.",
    ) +
    bench(
      "Calibration Correction Workshop",
      range("offset", "Instrument offset", -5, 5, 0.1, 2, "kPa") +
        range(
          "gain",
          "Relative gain error",
          -0.1,
          0.1,
          0.005,
          0.04,
          "kPa/kPa",
        ) +
        range("bow", "Nonlinear bow", 0, 6, 0.5, 0, "kPa") +
        range(
          "coefficient",
          "Temperature coefficient",
          0,
          0.2,
          0.01,
          0.05,
          "kPa/°C",
        ) +
        range("validation-temp", "Validation temperature", 0, 50, 1, 20, "°C") +
        select("strategy", "Correction strategy", [
          ["offset", "Offset correction"],
          ["linear", "Two-point linear correction"],
          ["multipoint", "Multipoint piecewise inverse"],
        ]) +
        range("subtract", "Applied offset subtraction", -8, 8, 0.01, 0, "kPa") +
        range(
          "divisor",
          "Applied slope divisor",
          0.8,
          1.2,
          0.001,
          1,
          "kPa/kPa",
        ) +
        check("compensate", "Apply known temperature compensation", false) +
        `<div class="actions"><button id="collect">Collect calibration points</button><button id="fit">Estimate coefficients</button><button id="apply">Apply and validate</button></div>`,
    ) +
    `<details class="explain"><summary>Reduction techniques and limits</summary><p>Zero adjustment targets offset; span adjustment targets sensitivity. Use reference-based correction and validate at separate pressures. Temperature correction requires a characterized coefficient. Good installation, controlled conditions, instrument selection, and drift monitoring prevent errors that one fitted curve cannot resolve. Multipoint correction is appropriate only for a stable monotone response with sufficient reference points; it can overfit noisy data.</p></details>` +
    question(
      "correction-check",
      "Which evidence independently verifies a fitted correction?",
      [
        "Reusing only fitting points",
        "Testing separate pressures and relevant conditions",
        "Reporting more display digits",
      ],
      1,
      "Validation points here are 10, 30, 50, 70, 90 kPa and never enter the fit.",
    ) +
    ai(
      "B — design a correction",
      "Ask for a correction strategy, then compare residuals at independent pressures and a changed temperature.",
      [
        "Fitting versus validation points",
        "Maximum error, signed mean, and RMSE",
        "Effect of changed temperature and compensation",
      ],
      "What remained uncorrected, and why?",
    );
  let collected = null,
    applied = false;
  const params = () => ({
    offset: get("offset", root),
    gain: get("gain", root),
    bow: get("bow", root),
    coefficient: get("coefficient", root),
  });
  const render = () => {
    const p = params(),
      refs = [10, 30, 50, 70, 90],
      raw = refs.map((x) =>
        reading(x, { ...p, temp: get("validation-temp", root) }),
      );
    let corrected = null,
      description = "Collect points, estimate coefficients, then apply.";
    if (applied && collected) {
      const method = $("#strategy", root).value,
        model = correction(collected, method);
      description =
        method === "multipoint"
          ? model.description
          : `x̂ = (y − ${num(get("subtract", root))}) / ${num(method === "offset" ? 1 : get("divisor", root), 5)}`;
      corrected = raw.map((r) => {
        let y = r.measured;
        if ($("#compensate", root).checked)
          y -= p.coefficient * (get("validation-temp", root) - 20);
        return {
          reference: r.reference,
          measured:
            method === "multipoint"
              ? model.apply(y)
              : (y - get("subtract", root)) /
                (method === "offset" ? 1 : get("divisor", root)),
        };
      });
    }
    const m = errorMetrics(raw),
      c = corrected ? errorMetrics(corrected) : null;
    $("#lab-results", root).innerHTML =
      `<p id="correction-state" class="observation">${description}</p>` +
      metrics([
        ["Raw maximum |error|", num(m.max) + " kPa"],
        ["Raw RMSE", num(m.rmse) + " kPa"],
        ["Corrected maximum", c ? num(c.max) + " kPa" : "Not applied"],
        ["Corrected signed mean", c ? num(c.mean) + " kPa" : "Not applied"],
        ["Corrected RMSE", c ? num(c.rmse) + " kPa" : "Not applied"],
        ["Corrected max / FS", c ? num(c.percentFS) + " %" : "Not applied"],
      ]) +
      graph(
        "Independent validation residuals",
        "Reference / kPa",
        "Signed error / kPa",
        [
          { name: "Raw error", values: raw.map((r) => [r.reference, r.error]) },
          ...(corrected
            ? [
                {
                  name: "Corrected error",
                  values: corrected.map((r) => [
                    r.reference,
                    r.measured - r.reference,
                  ]),
                },
              ]
            : []),
        ],
      ) +
      table(
        "Collected calibration points at 20°C",
        ["Reference / kPa", "Indication / kPa"],
        collected
          ? collected.map((r) => [r.reference, num(r.measured)])
          : [["—", "Not collected"]],
      ) +
      table(
        "Independent validation points",
        ["Reference / kPa", "Raw / kPa", "Corrected / kPa"],
        raw.map((r, i) => [
          r.reference,
          num(r.measured),
          corrected ? num(corrected[i].measured) : "Not applied",
        ]),
      ) +
      `<p class="note">Known deterministic temperature compensation precedes inverse calibration. It does not establish the uncertainty in the temperature coefficient. Data are synthetic and noiseless so the correction mechanism is isolated.</p>`;
  };
  ["offset", "gain", "bow", "coefficient"].forEach((id) =>
    $("#" + id, root).addEventListener("input", () => {
      collected = null;
      applied = false;
    }),
  );
  $("#strategy", root).addEventListener("input", () => {
    applied = false;
  });
  $(".bench", root).addEventListener("labreset", () => {
    collected = null;
    applied = false;
  });
  $("#collect", root).addEventListener("click", () => {
    collected = [0, 20, 40, 60, 80, 100].map((x) =>
      reading(x, { ...params(), temp: 20 }),
    );
    applied = false;
    render();
  });
  $("#fit", root).addEventListener("click", () => {
    if (!collected) {
      $("#correction-state", root).textContent =
        "Collect calibration points first.";
      return;
    }
    const a = collected[0],
      b = collected.at(-1);
    $("#subtract", root).value = a.measured;
    $("#divisor", root).value = (b.measured - a.measured) / 100;
    $("#subtract", root).dispatchEvent(new Event("input", { bubbles: true }));
  });
  $("#apply", root).addEventListener("click", () => {
    if (!collected) {
      $("#correction-state", root).textContent =
        "Collect calibration points first.";
      return;
    }
    applied = true;
    render();
  });
  finish(
    root,
    render,
    "Design a calibration correction. Validate it at separate pressures and temperatures; distinguish calibration, correction, and adjustment.",
  );
}
export function budgets(root) {
  const names = ["Sensor", "Conditioner", "DAQ"];
  root.innerHTML =
    header(
      "3.3 / LO2, LO5",
      "A limit is not a standard deviation.",
      "Express every contribution in pressure units at the chain output using its sensitivity. Known signed biases add algebraically. Unknown bounded residual errors add conservatively in a worst-case budget; they need not be independent random variables.",
      "At 50 kPa, biases +0.4, −0.2, +0.1 kPa sum to +0.3 kPa. Residual bounds ±0.2, ±0.1, ±0.05 kPa sum to ±0.35 kPa. Before correction the maximum magnitude is 0.65 kPa; after exact bias correction it is 0.35 kPa.",
    ) +
    bench(
      "Measurement Error Budget",
      range("reference", "Reference pressure", 0, 100, 1, 50, "kPa") +
        names
          .map(
            (n, i) =>
              range(
                "bias-" + i,
                n + " known bias",
                -1,
                1,
                0.05,
                [0.4, -0.2, 0.1][i],
                "kPa",
              ) +
              range(
                "bound-" + i,
                n + " residual limit",
                0,
                1,
                0.05,
                [0.2, 0.1, 0.05][i],
                "kPa",
              ),
          )
          .join("") +
        check("correct", "Subtract known combined bias", false) +
        check(
          "statistical",
          "EXPLORE: assume independent rectangular residuals",
          false,
        ),
    ) +
    `<p class="equation">Known correction: x̂ = y − Σbᵢ. Worst-case residual: ±Σaᵢ. Under independent zero-mean rectangular models only: u<sub>c</sub> = √Σ(aᵢ²/3).</p><p>Accuracy specifications and tolerances usually describe allowed limits, not realized error. A correction coefficient may itself be uncertain. For a derived result f(x), small known errors propagate with Σ(∂f/∂xᵢ)eᵢ; statistical covariance propagation uses a different calculation.</p>` +
    question(
      "budget-check",
      "Can signed bias cancellation eliminate the unknown residual limits?",
      ["Yes, every error cancels", "No, the residual signs remain unknown"],
      1,
      "Bias cancellation does not cancel worst-case residual bounds. Statistical combination needs distribution and covariance assumptions.",
    ) +
    ai(
      "Evaluate a budget claim",
      "Critique an assistant that uses RSS directly on all tolerance limits without stating distributions or correlations.",
      [
        "Signed sum versus worst-case bound",
        "Input-referred units",
        "Assumptions for rectangular standard uncertainty",
      ],
      "What extra information would justify a statistical combination?",
    );
  const render = () => {
    const s = names.map((name, i) => ({
        name,
        bias: get("bias-" + i, root),
        bound: get("bound-" + i, root),
      })),
      correct = $("#correct", root).checked,
      b = budget(s, correct),
      x = get("reference", root),
      signed = s.reduce((a, v) => a + v.bias, 0);
    $("#lab-results", root).innerHTML =
      metrics([
        ["Combined signed bias", num(signed) + " kPa"],
        ["Reported residual bias", num(b.bias) + " kPa"],
        ["Worst-case |error|", num(b.worst) + " kPa"],
        [
          "Relative worst-case",
          x === 0 ? "Undefined at zero" : num((100 * b.worst) / x) + " %",
        ],
        ["Full-scale bound", num(b.worst) + " % FS"],
        ["Dominant residual source", b.dominant],
      ]) +
      graph(
        "Input-referred bias and remaining limits",
        "Stage index (1 sensor, 2 conditioner, 3 DAQ)",
        "Contribution / kPa",
        [
          {
            name: "Signed bias",
            values: s.map((v, i) => [i + 1, correct ? 0 : v.bias]),
          },
          {
            name: "Positive residual limit",
            values: s.map((v, i) => [i + 1, v.bound]),
          },
          {
            name: "Negative residual limit",
            values: s.map((v, i) => [i + 1, -v.bound]),
          },
        ],
      ) +
      table(
        "Stage error budget / all values input-referred",
        ["Stage", "Known bias / kPa", "Residual bound / kPa"],
        s.map((v) => [v.name, num(v.bias), "±" + num(v.bound)]),
      ) +
      `<p class="observation">Corrected indication for the nominal bias-only case: ${num(x + b.bias)} kPa. The remaining unknown residual can be anywhere within ±${num(b.residual)} kPa. This is an error limit, not a confidence interval.</p>` +
      ($("#statistical", root).checked
        ? `<p id="standard-u" class="observation">Conditional combined standard uncertainty: ${num(standardUncertainty(s.map((v) => v.bound)))} kPa. Assumes independent zero-mean rectangular residual distributions with half-widths equal to the limits. Biases are corrected separately; reference and correction uncertainty are omitted. No coverage interval is implied.</p>`
        : "");
  };
  finish(
    root,
    render,
    "Evaluate the measurement chain error budget. Compare deterministic signed corrections, worst-case bounds, and a conditional statistical model.",
  );
}
export function randomLab(root) {
  root.innerHTML =
    header(
      "3.4 / LO4, LO5",
      "More readings. Less scatter. Same bias.",
      "Repeated pressure readings reveal repeatability under the same conditions, not reproducibility across changed operators or environments. The sample standard deviation s uses N − 1. For independent observations the estimated standard error is s/√N; this relation can fail for correlated readings.",
      "Predict the effect of N = 5, 20, 100, 500 on the mean’s precision. Keep a +2 kPa bias and show why averaging cannot remove it.",
    ) +
    bench(
      "Repeated Measurement Experiment",
      range("reference", "True pressure", 0, 100, 1, 50, "kPa") +
        range("bias", "Systematic bias", -5, 5, 0.1, 2, "kPa") +
        range("sigma", "Random standard deviation", 0, 5, 0.1, 1, "kPa") +
        select("count", "Sample count", [
          [5, "5"],
          [20, "20"],
          [100, "100"],
          [500, "500"],
        ]) +
        range("seed", "Random seed", 1, 1000, 1, 42, "") +
        select("distribution", "Disturbance distribution", [
          ["normal", "Gaussian"],
          ["uniform", "Uniform / same standard deviation"],
        ]) +
        range(
          "rho",
          "Adjacent correlation ρ (Gaussian model)",
          0,
          0.9,
          0.1,
          0,
          "",
        ),
    ) +
    `<p class="equation">s² = Σ(yᵢ − ȳ)²/(N − 1); independent SEM = s/√N. Known-model correlated SEM² = σ²[N + 2Σ(N − k)ρᵏ]/N².</p><p class="note">Gaussian independent runs use a two-sided 95% Student-t interval for the biased population mean. Correlated Gaussian runs use the known simulation σ and ρ for a model-based normal interval. Uniform runs use an approximate large-sample interval only for N ≥ 100. None includes bias or reference uncertainty; these are not intervals for the true measurand.</p><details class="explain"><summary>Outliers and non-Gaussian observations</summary><p>Do not discard points merely because they look unusual. Investigate acquisition faults, record a justified rule, and assess sensitivity. Physical distributions may be skewed or bounded; a Gaussian model is one choice. Uniform mode disables correlation because that alternative is independent here.</p></details>` +
    question(
      "random-check",
      "What remains after averaging independent zero-mean disturbances?",
      ["The constant bias", "No error or uncertainty of any kind"],
      0,
      "The expected sample mean remains reference plus bias. Precision improves; accuracy does not automatically improve.",
    ) +
    ai(
      "Check the statistical explanation",
      "Ask why the mean misses the reference even when its repeatability interval is narrow.",
      [
        "Sample SD versus SEM",
        "Interval target and assumptions",
        "Correlation and sample-size scaling",
      ],
      "Which check would identify systematic bias independently?",
    );
  const render = () => {
    const uniform = $("#distribution", root).value === "uniform";
    $("#rho", root).disabled = uniform;
    if (uniform) {
      $("#rho", root).value = 0;
      $("#rho-value", root).textContent = "0";
    }
    const p = {
        reference: get("reference", root),
        bias: get("bias", root),
        sigma: get("sigma", root),
        n: get("count", root),
        seed: get("seed", root),
        rho: get("rho", root),
        distribution: $("#distribution", root).value,
      },
      r = repeated(p),
      h = histogram(r.values),
      comparisons = [5, 20, 100, 500].map((n) => {
        const a = repeated({ ...p, n });
        return [n, num(a.mean - p.reference), num(a.naiveSEM), num(a.modelSEM)];
      });
    $("#lab-results", root).innerHTML =
      metrics([
        ["Sample mean", num(r.mean) + " kPa"],
        ["Sample SD (N − 1)", num(r.sd) + " kPa"],
        ["Naive independent SEM", num(r.naiveSEM) + " kPa"],
        ["Known-model SEM", num(r.modelSEM) + " kPa"],
        ["Mean − reference", num(r.mean - p.reference) + " kPa"],
        [
          "95% mean interval",
          r.interval
            ? r.interval.map((v) => num(v)).join(" to ") + " kPa"
            : "Not offered at small N",
        ],
      ]) +
      graph("Individual repeated readings", "Sample index", "Pressure / kPa", [
        { name: "Readings", values: r.values.map((v, i) => [i, v]) },
        {
          name: "True reference",
          values: [
            [0, p.reference],
            [p.n - 1, p.reference],
          ],
        },
        {
          name: "Biased expectation",
          values: [
            [0, p.reference + p.bias],
            [p.n - 1, p.reference + p.bias],
          ],
        },
      ]) +
      graph(
        "Histogram / bin numbers, not pressure coordinates",
        "Bin index (0–11)",
        "Count",
        [
          {
            name: "Bin count",
            values: h.counts.flatMap((v, i) => [
              [i, v],
              [i + 0.9, v],
            ]),
          },
        ],
      ) +
      `<p class="note">Bins begin at ${num(h.min)} kPa with width ${num(h.width)} kPa. Histogram counts sum to N; connecting lines indicate counts, not a continuous density.</p>` +
      table(
        "Sample-size comparison / same seed",
        [
          "N",
          "Mean − reference / kPa",
          "Naive SEM / kPa",
          "Known-model SEM / kPa",
        ],
        comparisons,
      ) +
      table(
        "Individual readings / first 20 shown",
        ["Index", "Pressure / kPa"],
        r.values.slice(0, 20).map((v, i) => [i + 1, num(v)]),
      ) +
      `<p class="observation">${p.rho > 0 ? "Correlated observations carry overlapping information; the naive independent SEM can overstate precision." : "Expected mean = reference + bias. Individual runs need not improve monotonically as N grows."} Statistical uncertainty from repeatability is only one contribution to measurement uncertainty.</p>`;
  };
  finish(
    root,
    render,
    "Characterize repeated measurements. Verify estimator, confidence interval target, bias, distribution, and correlation assumptions.",
  );
}
function electrical(root, reduction) {
  const topic = reduction ? "3.6 / LO7, LO8" : "3.5 / LO6",
    title = reduction
      ? "Quiet is not always faithful."
      : "Interference enters through a physical path.";
  root.innerHTML =
    header(
      topic,
      title,
      "A bridge or thermocouple chain directly measures a small voltage; strain or temperature is inferred using sensitivity and calibration. This illustrative output is a 2 Hz voltage signal with broadband Gaussian noise, 50/60 Hz pickup, 0.5 Hz drift, and an optional switching transient.",
      "Start with a 1 mV useful signal and 0.6 mV line pickup. Predict whether shielding or a very slow low-pass filter better preserves a changing signal.",
    ) +
    bench(
      reduction ? "Noise Reduction Challenge" : "Noisy Sensor Signal",
      (reduction
        ? select("method", "Mitigation strategy", [
            ["none", "Unconditioned baseline"],
            ["moving", "Causal moving average"],
            ["lowpass", "First-order low-pass"],
            ["notch", "Line-frequency notch"],
            ["differential", "Differential / common-mode rejection"],
            ["shield", "Improved shielding scenario"],
            ["wiring", "Improved twisted-pair / routing scenario"],
          ]) +
          select("window", "Moving-average window", [
            [15, "15 samples"],
            [1, "1 sample / identity"],
            [51, "51 samples"],
            [101, "101 samples"],
          ]) +
          range("cutoff", "Low-pass cutoff", 0.5, 40, 0.5, 10, "Hz")
        : "") +
        range("amplitude", "Useful signal peak amplitude", 0, 2, 0.1, 1, "mV") +
        range(
          "sigma",
          "Broadband noise standard deviation",
          0,
          0.5,
          0.05,
          0.15,
          "mV",
        ) +
        range("line", "Induced line peak amplitude", 0, 1.5, 0.1, 0.6, "mV") +
        select("frequency", "Line interference frequency", [
          [50, "50 Hz"],
          [60, "60 Hz"],
        ]) +
        range(
          "drift",
          "Low-frequency drift amplitude",
          0,
          0.5,
          0.05,
          0.15,
          "mV",
        ) +
        check("transient", "Include switching transient", false) +
        select("fs", "Sampling rate", [
          [500, "500 samples/s"],
          [200, "200 samples/s"],
          [1000, "1000 samples/s"],
        ]) +
        select("duration", "Observation duration", [
          [1, "1 s"],
          [0.5, "0.5 s"],
          [2, "2 s"],
        ]),
    ) +
    `<p class="equation">SNR = 20 log₁₀(RMS useful signal / RMS disturbance) = 10 log₁₀(P<sub>signal</sub>/P<sub>noise</sub>) for the same impedance.</p><p class="note">RMS disturbance is relative to the clean voltage and includes drift and pickup, without subtracting its mean. A zero useful signal has undefined SNR; zero disturbance with nonzero signal has infinite SNR. Illustrative voltages are not a sensor specification.</p><details class="explain"><summary>${reduction ? "Mitigation assumptions and trade-offs" : "Coupling mechanisms / design an isolating test"}</summary>${table(
      reduction
        ? "Mitigation is mechanism-dependent"
        : "Plausible induced-noise sources",
      ["Mechanism or technique", "Physical reasoning and limits"],
      reduction
        ? [
            [
              "Shielding",
              "Scenario reduces induced line/transient coupling to 10%; broadband sensor noise and drift remain. This selected factor is illustrative, not guaranteed hardware performance.",
            ],
            [
              "Twisted pair / routing",
              "Scenario reduces induced line/transient coupling to 30%; decreases loop area and exposure. Cannot correct sensor bias.",
            ],
            [
              "Differential measurement",
              "80% of pickup assumed common-mode, attenuated by 60 dB amplitude CMRR; 20% is differential and remains. Assumes linear range, matched paths, and no saturation.",
            ],
            [
              "Grounding / isolation",
              "Break unintended return paths safely and control shield termination; no universal one-end grounding rule. Ground-loop noise cannot always be removed in software.",
            ],
            [
              "Instrumentation amplifier / excitation",
              "Preserve small differential signals, common-mode range, stable excitation, and power quality; gain alone does not improve input SNR.",
            ],
            [
              "Filters",
              "Causal moving average uses a fixed-length zero-padded startup. Low-pass uses α = 1 − exp(−2πfc/fs), zero initial state. Notch has line-frequency zeros, pole radius 0.95, and unity DC gain.",
            ],
            [
              "Limits",
              "Analog bandwidth and anti-alias filtering must precede sampling; digital filtering cannot undo clipping or aliasing. Detailed ADC theory belongs to a future chapter.",
            ],
          ]
        : [
            [
              "Capacitive coupling",
              "Electric-field coupling from voltage changes; vary cable proximity or shielding.",
            ],
            [
              "Inductive coupling",
              "Magnetic coupling through loop area; twist wires and separate power cables.",
            ],
            [
              "Power-line / ground loops",
              "50/60 Hz pickup may reflect several paths; inspect grounding and common-mode voltage.",
            ],
            [
              "Common-mode / excitation",
              "Finite common-mode rejection, unequal impedances, or unstable sensor excitation can convert interference into measurement error.",
            ],
            [
              "Internal potentials / shot noise",
              "Temperature differences at dissimilar-metal junctions can create thermoelectric offsets; electrochemical junctions can create parasitic potentials. Discrete charge transport can generate shot noise. Distinguish these from external pickup and control the relevant path.",
            ],
            [
              "Switching equipment",
              "Fast transients and broadband components; check supply, routing, isolation, and acquisition range.",
            ],
          ],
    )}</details>` +
    question(
      reduction ? "filter-check" : "noise-check",
      reduction
        ? "Which evidence would reject an overly aggressive filter?"
        : "Does a 50 Hz peak uniquely prove a ground loop?",
      reduction
        ? ["Lower noise alone", "Large useful-signal attenuation or delay"]
        : [
            "Yes, frequency identifies the wiring fault",
            "No, test plausible coupling paths",
          ],
      1,
      reduction
        ? "Evaluate total tracking error and useful-signal dynamics as well as residual disturbance."
        : "Frequency identifies periodic content, not the unique physical coupling mechanism.",
    ) +
    ai(
      reduction
        ? "C — reduce noise without destroying the signal"
        : "Investigate a noise source",
      reduction
        ? "Ask for a conditioning method. Compare the baseline, notch, and a 0.5 Hz low-pass on the 2 Hz signal; document which requirement each meets."
        : "Ask for plausible mechanisms for the line-frequency peak. Choose a cable, grounding, or shielding experiment to distinguish them.",
      reduction
        ? [
            "Residual disturbance RMS and SNR",
            "Useful 2 Hz amplitude and phase delay",
            "Total tracking error including startup distortion",
          ]
        : [
            "Time and frequency evidence",
            "RMS and defined SNR",
            "Experiment that isolates a physical path",
          ],
      reduction
        ? "When is a quieter indication a worse measurement?"
        : "What physical source remains uncertain from the waveform alone?",
    );
  const render = () => {
    const method = reduction ? $("#method", root).value : "none",
      coupling =
        method === "shield"
          ? 0.1
          : method === "wiring"
            ? 0.3
            : method === "differential"
              ? 0.2 + 0.8 / 1000
              : 1;
    const p = {
      amplitude: get("amplitude", root),
      sigma: get("sigma", root),
      line: get("line", root),
      frequency: get("frequency", root),
      fs: get("fs", root),
      duration: get("duration", root),
      drift: get("drift", root),
      transient: $("#transient", root).checked,
    };
    const baseline = signalRun(p),
      run = signalRun({ ...p, coupling }),
      filter = {
        method: ["moving", "lowpass", "notch"].includes(method)
          ? method
          : "none",
        window: reduction ? get("window", root) : 15,
        cutoff: reduction ? get("cutoff", root) : 10,
        frequency: p.frequency,
      },
      out = condition(run.measured, p.fs, filter),
      useful = condition(run.clean, p.fs, filter),
      residual = out.map((v, i) => v - useful[i]),
      error = out.map((v, i) => v - run.clean[i]),
      f = fidelity(p.fs, filter);
    const display = (x) =>
      x === null ? "Undefined" : x === Infinity ? "∞ dB" : num(x, 2) + " dB";
    const series = [
      {
        name: "Clean reference",
        values: run.t.map((t, i) => [t, run.clean[i]]),
      },
      {
        name: reduction ? "Unconditioned baseline" : "Noisy indication",
        values: run.t.map((t, i) => [t, baseline.measured[i]]),
      },
    ];
    if (reduction)
      series.push({
        name: "Conditioned indication",
        values: run.t.map((t, i) => [t, out[i]]),
      });
    let plots = graph(
      "Voltage versus time",
      "Time / s",
      "Voltage / mV",
      series,
    );
    if (!reduction) {
      const spec = spectrum(run.measured, p.fs);
      plots +=
        graph(
          "One-sided Hann-window amplitude spectrum",
          "Frequency / Hz",
          "Peak amplitude / mV",
          [{ name: "Mean-removed record", values: spec }],
        ) +
        `<p class="note">DFT bins: f = k fs/N; spacing ${num(p.fs / run.t.length)} Hz. Mean removed; symmetric Hann window; coherent-gain corrected one-sided peak amplitudes (DC and Nyquist not doubled). This is not a power spectral density. Off-bin tones leak; a short record may merge peaks.</p>`;
    }
    $("#lab-results", root).innerHTML =
      metrics([
        ["Baseline disturbance RMS", num(rms(baseline.noise)) + " mV"],
        ["Baseline SNR", display(snr(baseline.clean, baseline.noise))],
        ...(reduction
          ? [
              ["Residual disturbance RMS", num(rms(residual)) + " mV"],
              ["Conditioned SNR", display(snr(useful, residual))],
              ["Useful amplitude / input", num(f.amplitude * 100, 1) + " %"],
              ["2 Hz phase delay", num(1000 * f.delay, 1) + " ms"],
              ["Total tracking RMSE", num(rms(error)) + " mV"],
              [
                "Useful distortion RMS",
                num(rms(useful.map((v, i) => v - run.clean[i]))) + " mV",
              ],
            ]
          : []),
      ]) +
      plots +
      table(
        "Voltage samples / first 12",
        ["Time / s", "Clean / mV", "Indicated / mV"],
        run.t
          .slice(0, 12)
          .map((t, i) => [num(t), num(run.clean[i]), num(out[i])]),
      ) +
      `<p class="observation">${reduction ? "Conditioned SNR compares the filtered useful component with residual disturbance; total tracking RMSE compares indication with the original clean signal and includes attenuation, delay, and startup. Phase delay is a steady-state 2 Hz measurement, not a universal step delay. Try cutoff 0.5 Hz: a quieter output may destroy the useful signal." : "A peak or fluctuation does not identify its physical source. Use controlled coupling-path experiments. All selectable sampling rates exceed twice the line frequency, but the Gaussian noise here is a discrete sampled process, not an analog anti-aliasing model."}</p>`;
  };
  finish(
    root,
    render,
    reduction
      ? "Recommend noise mitigation using measured residual RMS, SNR, useful amplitude, delay, and total tracking error. State physical assumptions."
      : "Diagnose plausible induced voltage noise mechanisms; quantify spectral and time-domain evidence before attributing a physical cause.",
  );
}
export const noiseLab = (root) => electrical(root, false);
export const reductionLab = (root) => electrical(root, true);
