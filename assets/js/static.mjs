import {
  $,
  $$,
  range,
  select,
  fmt,
  metrics,
  plot,
  wireControls,
  question,
  wireQuestions,
} from "./ui.mjs";
import {
  rangeMetrics,
  thresholdOutput,
  samples,
  statistics,
  drift,
  nonlinearity,
  hysteresis,
  backlash,
} from "./models.mjs";
const experiments = [
  ["range", "Range & accuracy"],
  ["scatter", "Accuracy & precision"],
  ["repeat", "Repeatability"],
  ["threshold", "Threshold & resolution"],
  ["sensitivity", "Sensitivity"],
  ["linearity", "Linearity"],
  ["drift", "Environmental drift"],
  ["hysteresis", "Hysteresis"],
  ["dead", "Dead space"],
];
const bench = (title, controls) =>
  `<div class="bench"><div class="bench-head"><h2>${title}</h2><span>STATIC / STEADY STATE</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${controls}</div><div id="static-result"></div></div></div></div>`;
export function staticLab(root) {
  root.innerHTML = `<span class="eyebrow">2.3 / Static performance lab</span><h1>What does the reading hide?</h1><p class="lead">Let the instrument settle, then investigate its limits. Each bench isolates one characteristic so you can see its effect before combining it with others.</p><div class="tabs" role="group" aria-label="Static experiments">${experiments.map(([id, label], i) => `<button data-static="${id}" aria-pressed="${i === 0}">${label}</button>`).join("")}</div><div id="static-panel"></div>`;
  const panel = $("#static-panel", root);
  function show(mode) {
    $$("[data-static]", root).forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.static === mode)),
    );
    let update;
    if (mode === "range") {
      panel.innerHTML = `<div class="scenario"><strong>You are measuring only 1 bar.</strong><p>Predict the largest allowed error of a 0–10 bar instrument rated ±1% full scale. Then shrink the range while keeping the same specification.</p></div>${bench("Pressure range selection", `${range("span", "Full-scale range (0 to…)", 1, 20, 0.5, 10, "bar")}${range("fs-accuracy", "Accuracy limit", 0.1, 3, 0.1, 1, "%FS")}${range("actual-pressure", "Actual pressure", 0, 20, 0.1, 1, "bar")}`)}${question("range-q", "At 1 bar, a 0–10 bar gauge rated ±1% FS has a relative error limit of…", ["±1%", "±10%", "±0.1%"], 1, "1% of 10 bar is 0.1 bar. Relative to 1 bar, 0.1 / 1 × 100 = 10%. Full-scale accuracy is referenced to the span, not the present reading.")}<details class="explain"><summary>Explain the error limit, span, and tolerance</summary><p>For this zero-based range: <strong>absolute error limit = span × %FS / 100</strong>. Relative error = absolute limit / |reading| × 100; at zero it is undefined. A nonzero-based range has span = upper limit − lower limit.</p><p>Accuracy describes closeness to a reference value. An accuracy specification often states a maximum permissible error under specified conditions. <strong>Tolerance</strong> is an allowed departure from a nominal or required value; a process tolerance is not the same as an instrument error limit. A fine resolution cannot compensate for a large error limit.</p></details>`;
      update = () => {
        const span = +$("#span", panel).value,
          a = +$("#fs-accuracy", panel).value,
          p = +$("#actual-pressure", panel).value,
          m = rangeMetrics(span, a, p);
        $("#static-result", panel).innerHTML =
          plot({
            title: "Allowed reading band around the true pressure",
            xLabel: "True pressure / bar",
            yLabel: "Indicated pressure / bar",
            xMax: 20,
            yMin: -1,
            yMax: 21,
            curves: [
              { name: "Ideal", fn: (x) => x, dashed: true },
              { name: "Upper error limit", fn: (x) => x + m.absolute },
              { name: "Lower error limit", fn: (x) => x - m.absolute },
            ],
            points: [{ x: p, y: p }],
            markers: [{ x: span, label: "Range limit" }],
          }) +
          metrics([
            ["Maximum absolute error", `±${fmt(m.absolute, 3)} bar`],
            [
              "Relative error limit",
              m.relative === null
                ? "Undefined at zero"
                : `±${fmt(m.relative, 1)}%`,
            ],
            ["Range utilization", `${fmt(m.utilization, 1)}%`],
          ]) +
          `<p class="observation ${m.inRange ? "" : "warning"}">${m.inRange ? `The ${fmt(p, 1)} bar reading can be anywhere from ${fmt(p - m.absolute, 3)} to ${fmt(p + m.absolute, 3)} bar within the stated error limit. The actual error is not known from this specification alone.` : "OUT OF RANGE: the error specification no longer applies. Choose a range that covers the pressure and required headroom."}</p>`;
      };
    }
    if (mode === "scatter" || mode === "repeat") {
      const repeat = mode === "repeat";
      panel.innerHTML = `<div class="scenario"><strong>${repeat ? "A second operator repeats your measurement." : "Ten readings agree with each other. Are they correct?"}</strong><p>${repeat ? "Predict whether a changed setup can shift a tight group of readings. Compare repeated readings under the same conditions, then change operator or environment." : "Predict the effect of bias versus scatter. Move each control separately and compare the sample mean with the reference."}</p></div>${bench(
        repeat
          ? "Same conditions, then changed conditions"
          : "Bias and random scatter",
        `${range("bias", "Systematic bias", -1.5, 1.5, 0.05, repeat ? 0 : 0.8, "bar")}${range("scatter", "Random scatter scale", 0.02, 0.6, 0.02, 0.08, "bar")}${
          repeat
            ? select("conditions", "Measurement conditions", [
                ["same", "Same operator, instrument, environment"],
                ["operator", "Different operator (+0.30 bar setup shift)"],
                ["temperature", "Changed environment (−0.40 bar shift)"],
              ])
            : ""
        }<button id="sample-again" type="button">Repeat ten measurements</button><p class="note">Deterministic sample patterns make comparisons repeatable; these are illustrative samples, not a noise uncertainty estimate.</p>`,
      )}${question("precision-q", repeat ? "A tight group obtained under identical conditions demonstrates…" : "High precision always guarantees high accuracy. ", repeat ? ["Repeatability; changed conditions still need evaluation", "Reproducibility in all environments"] : ["True", "False"], repeat ? 0 : 1, repeat ? "Repeatability concerns successive measurements under the same conditions. Reproducibility examines agreement when specified conditions change. Report which conditions were varied." : "Tight clustering shows low scatter. A tightly clustered group can still be displaced from the reference by systematic bias.")}<details class="explain"><summary>${repeat ? "Explain repeatability and reproducibility" : "Explain accuracy and precision"}</summary><p>${repeat ? "Same-condition agreement is repeatability. A different operator, instrument, laboratory, or environment can introduce an additional shift. Reproducibility assesses agreement across those specified changes; it is not established by one repeat run." : "Accuracy is closeness to a reference; precision is agreement among repeated readings. The sample mean error and sample standard deviation shown here help separate offset from scatter. Mean error alone is not a complete measure of individual-reading accuracy or uncertainty."}</p></details>`;
      let run = 0;
      update = () => {
        const bias = +$("#bias", panel).value,
          scatter = +$("#scatter", panel).value,
          c = repeat ? $("#conditions", panel).value : "same",
          shift = c === "operator" ? 0.3 : c === "temperature" ? -0.4 : 0,
          a = samples(bias, scatter, 0, run),
          b = samples(bias, scatter, shift, run + 3),
          s = statistics(a),
          s2 = statistics(b);
        $("#static-result", panel).innerHTML =
          plot({
            title: repeat
              ? "Repeated readings before and after changing conditions"
              : "Repeated readings vs a 5 bar reference",
            xLabel: "Measurement number",
            yLabel: "Reading / bar",
            xMax: 10,
            yMin: 2,
            yMax: 8,
            curves: [{ name: "Reference 5 bar", fn: () => 5, dashed: true }],
            points: [
              ...a.map((y, i) => ({ x: i + 1, y })),
              ...(repeat
                ? b.map((y, i) => ({ x: i + 1, y, color: "var(--curve-1)" }))
                : []),
            ],
          }) +
          (repeat
            ? '<div class="legend"><span>● Green: original conditions</span><span>● Orange: selected conditions</span></div>'
            : "") +
          metrics([
            ["Mean error", `${fmt(s.mean - 5, 3)} bar`],
            ["Sample standard deviation", `${fmt(s.sd, 3)} bar`],
            ...(repeat
              ? [
                  ["Changed-condition mean", `${fmt(s2.mean, 3)} bar`],
                  ["Shift of sample means", `${fmt(s2.mean - s.mean, 3)} bar`],
                ]
              : []),
          ]) +
          `<p class="observation">${repeat ? (shift === 0 ? "The means agree under the same conditions. Changing conditions can introduce a shift without increasing within-run scatter." : "Both groups can be tightly clustered while disagreeing with each other: good repeatability alone does not establish good reproducibility.") : Math.abs(s.mean - 5) > 0.3 && s.sd < 0.2 ? "A tight cluster away from the reference: high precision, poor closeness to the reference." : "Compare the mean error with the spread. Bias moves the cluster; scatter broadens it."}</p>`;
      };
      $("#sample-again", panel).addEventListener("click", () => {
        run++;
        update();
        $("#sample-again", panel).textContent =
          `Repeat ten measurements · run ${run + 1}`;
      });
    }
    if (mode === "threshold") {
      panel.innerHTML = `<div class="scenario"><strong>A weak force produces no visible response.</strong><p>Start at zero and raise the input slowly. Predict when the instrument will first respond and when its next digital step will appear.</p></div>${bench(
        "Initial threshold and digital steps",
        `${range("threshold-input", "Input", 0, 2, 0.01, 0.1, "N")}${range("threshold", "Initial response threshold", 0, 1, 0.05, 0.3, "N")}${select(
          "resolution",
          "Output resolution",
          [
            ["0.1", "0.10 N"],
            ["0.05", "0.05 N"],
            ["0.01", "0.01 N"],
          ],
        )}`,
      )}<details class="explain"><summary>Explain the two limits</summary><p><strong>Threshold</strong> is the minimum input needed to produce a detectable response starting from zero. <strong>Resolution</strong> is the smallest distinguishable change in indicated output. This simplified model suppresses input below threshold, then rounds the response to a digital step. The abrupt activation is a teaching model; actual response onset depends on the instrument.</p></details>`;
      update = () => {
        const input = +$("#threshold-input", panel).value,
          threshold = +$("#threshold", panel).value,
          step = +$("#resolution", panel).value,
          out = thresholdOutput(input, threshold, step);
        $("#static-result", panel).innerHTML =
          plot({
            title: "No initial response, then quantized indication",
            xLabel: "Input / N",
            yLabel: "Indication / N",
            xMax: 2,
            yMax: 2,
            curves: [
              { name: "Ideal input", fn: (x) => x, dashed: true },
              {
                name: "Instrument response",
                fn: (x) => thresholdOutput(x, threshold, step),
              },
            ],
            points: [{ x: input, y: out }],
            markers: [{ x: threshold, label: "Threshold" }],
          }) +
          metrics([
            ["Input", `${fmt(input)} N`],
            ["Indication", `${fmt(out)} N`],
            ["Smallest output step", `${fmt(step)} N`],
          ]) +
          `<p class="observation">${input < threshold ? "Below the initial threshold: output remains zero." : "The threshold has been crossed. Further small input changes may still round to the same displayed value."}</p>`;
      };
    }
    if (mode === "sensitivity") {
      panel.innerHTML = `<div class="scenario"><strong>Your pressure sensor drives a voltage recorder.</strong><p>Predict how much the voltage changes when pressure rises by 1 bar. Increase the slope, then check whether the recorder can still accept the full range.</p></div>${bench("Input–output sensitivity", `${range("slope", "Sensitivity", 0.1, 2, 0.1, 0.5, "V/bar")}${range("sensitivity-input", "Pressure", 0, 10, 0.1, 4, "bar")}`)}<details class="explain"><summary>Explain slope and useful sensitivity</summary><p><strong>Sensitivity = change in output / change in input</strong>, the slope of the characteristic. Here V = S × p. High sensitivity makes a small pressure change produce a larger voltage change, but does not guarantee low error. The recorder accepts 0–5 V; excessive slope causes saturation.</p></details>`;
      update = () => {
        const s = +$("#slope", panel).value,
          p = +$("#sensitivity-input", panel).value;
        $("#static-result", panel).innerHTML =
          plot({
            title: "Sensor slope and recorder ceiling",
            xLabel: "Pressure / bar",
            yLabel: "Voltage / V",
            yMax: 20,
            curves: [
              { name: "Sensor voltage", fn: (x) => s * x },
              { name: "Recorder ceiling", fn: () => 5, dashed: true },
            ],
            points: [{ x: p, y: s * p }],
          }) +
          metrics([
            ["Ideal sensor voltage", `${fmt(s * p)} V`],
            ["Recorder indication", `${fmt(Math.min(5, s * p))} V`],
            ["Change per 1 bar", `${fmt(s)} V`],
          ]) +
          `<p class="observation">${s * p > 5 ? "Recorder saturation: additional pressure is hidden above the 5 V limit." : "The current reading is within the recorder range."} The largest unsaturated pressure is ${fmt(5 / s)} bar.</p>`;
      };
    }
    if (mode === "linearity") {
      panel.innerHTML = `<div class="scenario"><strong>The zero and full-scale checks pass, but midrange readings do not.</strong><p>Predict whether a two-point adjustment can remove a bowed response. Add curvature and inspect the midpoint.</p></div>${bench("Deviation from the endpoint straight line", `${range("curve-amount", "Maximum bow", -1, 1, 0.05, 0.4, "bar")}${range("linearity-input", "Reference pressure", 0, 10, 0.1, 5, "bar")}`)}<details class="explain"><summary>Explain the reference line</summary><p>Linearity error is departure from a specified straight line. Here the reference is the line joining the endpoints, not a least-squares best fit. The model is y = x + 4a(x/10)(1 − x/10); its maximum absolute departure is |a| at 5 bar. A different reference-line convention gives a different number and must be stated.</p></details>`;
      update = () => {
        const a = +$("#curve-amount", panel).value,
          x = +$("#linearity-input", panel).value;
        $("#static-result", panel).innerHTML =
          plot({
            title: "Endpoint reference vs bowed characteristic",
            xLabel: "Reference pressure / bar",
            yLabel: "Indication / bar",
            yMin: -1,
            yMax: 11,
            curves: [
              { name: "Endpoint straight line", fn: (x) => x, dashed: true },
              { name: "Actual characteristic", fn: (x) => nonlinearity(x, a) },
            ],
            points: [{ x, y: nonlinearity(x, a) }],
          }) +
          metrics([
            ["Maximum deviation", `${fmt(Math.abs(a))} bar`],
            ["Deviation / span", `${fmt(Math.abs(a) * 10, 1)}%`],
            ["Current error", `${fmt(nonlinearity(x, a) - x)} bar`],
          ]) +
          `<p class="observation">The endpoints remain correct even with curvature. Check intermediate points; a zero/span adjustment cannot remove this nonlinear shape.</p>`;
      };
    }
    if (mode === "drift") {
      panel.innerHTML = `<div class="scenario"><strong>A gauge calibrated at 20°C moves into a warmer room.</strong><p>Predict whether a zero adjustment can fix every pressure reading. Compare an offset with a slope change.</p></div>${bench(
        "Disturbance sensitivity and calibration lines",
        `${select("drift-mode", "Drift mechanism", [
          ["none", "No drift"],
          ["zero", "Zero drift / bias"],
          ["gain", "Sensitivity drift"],
          ["combined", "Combined drift"],
        ])}${range("temperature", "Ambient temperature", 0, 60, 1, 40, "°C")}${range("drift-pressure", "Reference pressure", 0, 10, 0.1, 5, "bar")}`,
      )}<details class="explain"><summary>Explain disturbance sensitivity</summary><p>Pressure is the measurand; ambient temperature is a disturbance. This model has a zero coefficient of 0.025 bar/°C and a relative sensitivity coefficient of 0.003/°C. <strong>Zero drift</strong> shifts the line vertically; <strong>sensitivity drift</strong> changes its slope. A zero adjustment removes an offset, while a slope change needs a span adjustment too. Other disturbances include vibration, supply variation, and humidity.</p></details>`;
      update = () => {
        const mode = $("#drift-mode", panel).value,
          t = +$("#temperature", panel).value,
          p = +$("#drift-pressure", panel).value,
          d = drift(p, t, mode);
        $("#static-result", panel).innerHTML =
          plot({
            title: "Characteristic at calibration and operating temperatures",
            xLabel: "Reference pressure / bar",
            yLabel: "Indication / bar",
            yMin: -2,
            yMax: 13,
            curves: [
              { name: "Nominal at 20°C", fn: (x) => x, dashed: true },
              {
                name: `Operating at ${t}°C`,
                fn: (x) => drift(x, t, mode).output,
              },
            ],
            points: [{ x: p, y: d.output }],
          }) +
          metrics([
            ["Zero offset", `${fmt(d.offset)} bar`],
            ["Slope", `${fmt(d.gain, 3)} bar/bar`],
            ["Current indication", `${fmt(d.output)} bar`],
            ["Current error", `${fmt(d.output - p)} bar`],
          ]) +
          `<p class="observation">${mode === "none" ? "This ideal instrument has no response to the selected temperature disturbance." : mode === "zero" ? "The error is constant across the pressure range." : mode === "gain" ? "The error grows with pressure; zero can look correct while span is wrong." : "Both offset and slope change. One-point correction will not restore the complete line."}</p>`;
      };
    }
    if (mode === "hysteresis") {
      panel.innerHTML = `<div class="scenario"><strong>The same pressure gives two readings.</strong><p>Predict which reading you will get after increasing versus decreasing pressure. Select an approach direction at the same input.</p></div>${bench(
        "Loading and unloading paths",
        `${range("hysteresis-input", "Pressure", 0, 10, 0.1, 5, "bar")}${range("hysteresis-width", "Maximum branch separation", 0, 1, 0.05, 0.6, "bar")}${select(
          "direction",
          "Approach history",
          [
            ["up", "Loading: approach from lower pressure"],
            ["down", "Unloading: approach from higher pressure"],
          ],
        )}`,
      )}<details class="explain"><summary>Explain history dependence</summary><p>Hysteresis means the indication at an input depends on the previous path. This quasi-static model uses separate loading and unloading curves that meet at the endpoints. Their maximum separation is the selected width at midrange. It models direction dependence, not a speed-dependent lag.</p></details>`;
      update = () => {
        const x = +$("#hysteresis-input", panel).value,
          w = +$("#hysteresis-width", panel).value,
          d = $("#direction", panel).value,
          out = hysteresis(x, w, d);
        $("#static-result", panel).innerHTML =
          plot({
            title: "Different readings at the same pressure",
            xLabel: "Pressure / bar",
            yLabel: "Indication / bar",
            curves: [
              { name: "Loading ↑", fn: (x) => hysteresis(x, w, "up") },
              { name: "Unloading ↓", fn: (x) => hysteresis(x, w, "down") },
              { name: "Ideal", fn: (x) => x, dashed: true },
            ],
            points: [{ x, y: out }],
          }) +
          metrics([
            ["Selected branch", d === "up" ? "Loading ↑" : "Unloading ↓"],
            ["Indication", `${fmt(out)} bar`],
            ["Separation here", `${fmt(w * Math.sin((Math.PI * x) / 10))} bar`],
          ]) +
          `<p class="observation">At ${fmt(x, 1)} bar, loading reads ${fmt(hysteresis(x, w, "up"))} bar and unloading reads ${fmt(hysteresis(x, w, "down"))} bar. A single increasing-input calibration can miss this difference.</p>`;
      };
    }
    if (mode === "dead") {
      panel.innerHTML = `<div class="scenario"><strong>You reverse a mechanical drive, but the pointer stays still.</strong><p>First increase input to engage one flank. Reverse in small increments and watch the pointer wait while the clearance is taken up.</p></div>${bench("Mechanical backlash / dead space", `${range("dead-input", "Drive input", 0, 10, 0.1, 5, "mm")}${range("clearance", "Total reversal clearance", 0, 2, 0.1, 1, "mm")}<div class="actions"><button id="dead-minus" type="button">−0.1 mm</button><button id="dead-plus" type="button">+0.1 mm</button><button id="dead-reset" type="button">Reset mechanism</button></div><p class="note">Output initially equals the input. Changing clearance resets the centered engagement state.</p>`)}<details class="explain"><summary>Explain dead space vs threshold</summary><p>Dead space is an input interval over which output does not respond. Mechanical clearance creates a dead region on reversal: movement must reach the opposite flank before transmission resumes. Unlike the initial threshold near zero, this dead region can occur anywhere along the range. Backlash is one source of hysteresis.</p></details>`;
      let output = 5,
        previous = 5,
        lastWidth = 1,
        trail = [[5, 5]];
      update = () => {
        const x = +$("#dead-input", panel).value,
          w = +$("#clearance", panel).value;
        if (w !== lastWidth) {
          output = x;
          previous = x;
          trail = [[x, x]];
          lastWidth = w;
        }
        const old = output;
        output = backlash(x, output, w / 2);
        if (x !== previous) {
          trail.push([x, output]);
          trail = trail.slice(-100);
        }
        const moved = Math.abs(output - old) > 1e-8;
        previous = x;
        $("#static-result", panel).innerHTML =
          plot({
            title: "History of drive input and transmitted output",
            xLabel: "Drive input / mm",
            yLabel: "Pointer output / mm",
            curves: [
              { name: "Ideal no clearance", fn: (x) => x, dashed: true },
              { name: "Your movement history", values: trail },
            ],
            points: [{ x, y: output }],
          }) +
          metrics([
            ["Drive input", `${fmt(x, 1)} mm`],
            ["Pointer output", `${fmt(output, 2)} mm`],
            ["Reversal dead space", `${fmt(w, 1)} mm`],
          ]) +
          `<p class="observation">${moved ? "The flank is engaged: output follows input." : "Pointer unchanged: input is within the mechanical clearance (or has not changed)."} The path records your actual sequence of input movements.</p>`;
      };
      for (const [id, sign] of [
        ["dead-minus", -1],
        ["dead-plus", 1],
      ])
        $("#" + id, panel).addEventListener("click", () => {
          const input = $("#dead-input", panel);
          input.value = +input.value + sign * 0.1;
          input.dispatchEvent(new Event("input", { bubbles: true }));
        });
      $("#dead-reset", panel).addEventListener("click", () => {
        output = 5;
        previous = 5;
        trail = [[5, 5]];
        $("#dead-input", panel).value = 5;
        $("#dead-input", panel).dispatchEvent(
          new Event("input", { bubbles: true }),
        );
      });
    }
    wireControls(panel, update);
    wireQuestions(panel);
  }
  $$("[data-static]", root).forEach((b) =>
    b.addEventListener("click", () => show(b.dataset.static)),
  );
  show("range");
}
