import {
  $,
  range,
  fmt,
  metrics,
  plot,
  wireControls,
  question,
  wireQuestions,
} from "./ui.mjs";
import { calibration } from "./models.mjs";
export function calibrationLab(root) {
  root.innerHTML = `<span class="eyebrow">2.5 / Calibration lab</span><h1>Compare. Adjust.<br>Verify across the range.</h1><p class="lead">After months of service, a 0–10 bar transmitter has an offset and a span error. Your reference standard supplies known pressures. Restore agreement, then check intermediate points.</p><div class="scenario"><strong>Your acceptance criterion</strong><p>Every verification point must be within ±0.05 bar of the reference. The reference has a stated ±0.01 bar bound; this exercise reports indication differences and does not calculate a complete uncertainty budget.</p></div>${question("cal-predict", "If the zero reading is corrected, are all other readings necessarily correct?", ["Yes: zero sets the whole scale", "No: the slope may still be wrong"], 1, "A zero adjustment addresses offset. A sensitivity error changes the slope, so several reference points are needed to reveal it. Nonlinearity and hysteresis may require more than zero and span adjustments.")}<div class="bench"><div class="bench-head"><h2>Reference-standard comparison</h2><span>REFERENCE / INSTRUMENT UNDER TEST</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${range("cal-reference", "Reference pressure", 0, 10, 0.1, 0, "bar")}${range("cal-zero", "Zero correction (before gain)", -1, 1, 0.01, 0, "bar")}${range("cal-gain", "Gain multiplier", 0.8, 1.1, 0.001, 1, "")}<div class="actions"><button id="record-point" type="button">Record comparison</button><button id="verify-calibration" class="primary" type="button">Verify five points</button><button id="reset-calibration" type="button">Reset adjustments</button></div><p class="note">Tip: compare at zero first. Then use 10 bar to adjust gain. Check 2.5, 5, and 7.5 bar after that.</p></div><div id="calibration-result"></div></div><div id="verification-result" aria-live="polite"></div><h3 style="margin-top:25px">Your comparison log</h3><p id="log-status" class="note" aria-live="polite">No points recorded yet. Record a reference comparison before and after adjustment.</p><div class="data-table"><table><caption class="sr-only">Recorded calibration comparisons</caption><thead><tr><th>Point</th><th>Reference / bar</th><th>IUT / bar</th><th>Difference / bar</th><th>Zero / gain</th></tr></thead><tbody id="cal-log"></tbody></table></div></div></div><details class="explain"><summary>Explain calibration, adjustment, and traceability</summary><p><strong>Calibration</strong> establishes the relationship between a reference quantity and instrument indication, including relevant uncertainties. <strong>Adjustment</strong> changes the instrument to improve that relationship. They are related activities, but calibration is not synonymous with turning an adjustment knob.</p><p>This instrument starts with y = 1.08p + 0.40 bar. The correction model is y<sub>corrected</sub> = gain × (y + zero). Reference points at zero and full scale reveal these two errors; intermediate points verify the response. A real calibration should also consider reference traceability, environmental conditions, uncertainty, repeat runs, and loading/unloading where relevant.</p><p>Wear, contamination, aging, and changing environments can move characteristics away from the original specification. Calibration intervals depend on use, risk, and historical stability; one universal interval is not appropriate.</p></details>`;
  let log = 0;
  const values = () => ({
    p: +$("#cal-reference", root).value,
    z: +$("#cal-zero", root).value,
    g: +$("#cal-gain", root).value,
  });
  function update() {
    const { p, z, g } = values(),
      out = calibration(p, z, g);
    $("#calibration-result", root).innerHTML =
      plot({
        title: "Nominal, before adjustment, and current characteristic",
        xLabel: "Reference pressure / bar",
        yLabel: "IUT indication / bar",
        yMin: -1,
        yMax: 12,
        curves: [
          { name: "Nominal / reference", fn: (x) => x, dashed: true },
          { name: "Before adjustment", fn: (x) => calibration(x, 0, 1) },
          { name: "After your adjustment", fn: (x) => calibration(x, z, g) },
        ],
        points: [{ x: p, y: out }],
      }) +
      metrics([
        ["Reference standard", `${fmt(p)} bar`],
        ["IUT indication", `${fmt(out, 3)} bar`],
        ["Current difference", `${fmt(out - p, 3)} bar`],
        ["Unadjusted difference", `${fmt(calibration(p, 0, 1) - p, 3)} bar`],
      ]) +
      `<p class="observation">${Math.abs(out - p) <= 0.05 ? "This point meets the ±0.05 bar difference criterion." : "This point is outside the ±0.05 bar difference criterion."} One passing point does not establish agreement across the range.</p>`;
    $("#verification-result", root).innerHTML = "";
  }
  wireControls(root, update);
  wireQuestions(root);
  $("#record-point", root).addEventListener("click", () => {
    const { p, z, g } = values(),
      out = calibration(p, z, g);
    log++;
    $("#cal-log", root).insertAdjacentHTML(
      "beforeend",
      `<tr><td>${log}</td><td>${fmt(p)}</td><td>${fmt(out, 3)}</td><td>${fmt(out - p, 3)}</td><td>${fmt(z)} / ${fmt(g, 3)}</td></tr>`,
    );
    $("#log-status", root).textContent =
      `${log} comparison${log === 1 ? "" : "s"} recorded. Each row retains the adjustments used at that time.`;
  });
  $("#verify-calibration", root).addEventListener("click", () => {
    const { z, g } = values(),
      points = [0, 2.5, 5, 7.5, 10],
      errors = points.map((p) => calibration(p, z, g) - p),
      pass = errors.every((e) => Math.abs(e) <= 0.05),
      max = Math.max(...errors.map(Math.abs));
    $("#verification-result", root).innerHTML =
      `<div class="observation"><strong>${pass ? "PASS: all five comparison points meet the criterion." : "NOT YET: one or more points exceed the criterion."}</strong><p style="margin:8px 0 0">Maximum difference ${fmt(max, 3)} bar; unadjusted maximum difference 1.200 bar. ${pass ? "Your zero/span adjustment restores this linear teaching model. Real verification also needs uncertainty and repeatability evidence." : "Compare the zero and high-end errors. Adjust zero first, then gain, and verify again."}</p></div><div class="data-table"><table><caption>Five-point verification / current adjustments</caption><thead><tr><th>Reference / bar</th><th>Difference / bar</th><th>Result</th></tr></thead><tbody>${points.map((p, i) => `<tr><td>${fmt(p, 1)}</td><td>${fmt(errors[i], 3)}</td><td>${Math.abs(errors[i]) <= 0.05 ? "Pass" : "Outside tolerance"}</td></tr>`).join("")}</tbody></table></div>`;
  });
  $("#reset-calibration", root).addEventListener("click", () => {
    $("#cal-zero", root).value = 0;
    $("#cal-gain", root).value = 1;
    $("#cal-zero", root).dispatchEvent(new Event("input", { bubbles: true }));
  });
}
