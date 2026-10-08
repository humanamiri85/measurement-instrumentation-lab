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
import { calibrationReading } from "./chapter2-models.mjs";
export function calibrationErrors(root) {
  root.innerHTML = `<div class="bench"><div class="bench-head"><h2>Characterize errors before adjusting</h2><span>D2 / CALIBRATION CURVE</span></div><div class="bench-body"><p>Toggle individual effects, then compare known pressure points with indicated pressure. This characterizes a different teaching instrument; it does not change your adjustments above.</p><div class="check-list"><label><input id="error-offset" type="checkbox" checked>Zero offset: +0.40 bar</label><label><input id="error-scale" type="checkbox" checked>Scale-factor error: +8%</label><label><input id="error-noise" type="checkbox">Illustrative varying noise: scale 0.08 bar</label><label><input id="error-bow" type="checkbox">Nonlinearity: +0.40 bar maximum bow</label></div>${range("error-reference", "Reference point to inspect", 0, 10, 0.5, 5, "bar")}<button id="error-resample" type="button">Take another comparison run</button><div id="error-plot"></div><p class="note">Noise patterns are deterministic illustrative variations. Each recorded curve represents one run, not a confidence interval.</p></div></div>${question("error-uncertainty", "Measured − reference is +0.12 bar. This number is…", ["An observed error relative to the reference", "The complete measurement uncertainty"], 0, "Error is the difference between indication and a reference/true value. Uncertainty describes the dispersion of values reasonably attributable to the measurand; it also needs reference and other evidence. A single error is not an uncertainty budget.")}`;
  let run = 0;
  function update() {
    const settings = {
        offset: $("#error-offset", root).checked ? 0.4 : 0,
        scale: $("#error-scale", root).checked ? 0.08 : 0,
        noise: $("#error-noise", root).checked ? 0.08 : 0,
        bow: $("#error-bow", root).checked ? 0.4 : 0,
      },
      x = +$("#error-reference", root).value,
      points = [0, 2, 4, 6, 8, 10].map((p, i) => ({
        x: p,
        y: calibrationReading(p, settings, i + run),
      })),
      reading = calibrationReading(x, settings, run);
    $("#error-plot", root).innerHTML =
      plot({
        title: "Reference points and an error-bearing characteristic",
        xLabel: "Reference pressure / bar",
        yLabel: "Indication / bar",
        yMin: -1,
        yMax: 12,
        curves: [
          { name: "Nominal", fn: (p) => p, dashed: true },
          {
            name: "Systematic characteristic (without noise)",
            fn: (p) => calibrationReading(p, { ...settings, noise: 0 }),
          },
        ],
        points,
      }) +
      metrics([
        ["Reference", `${fmt(x)} bar`],
        ["Measured", `${fmt(reading, 3)} bar`],
        ["Error = measured − reference", `${fmt(reading - x, 3)} bar`],
        ["Run", `${run + 1}`],
      ]) +
      `<p class="observation">${settings.bow ? "Even if endpoint offsets are corrected, the intermediate curve may remain bowed." : settings.scale ? "Error grows with input because of the scale-factor effect." : settings.offset ? "The characteristic shifts upward in parallel because of zero offset." : "With systematic effects off, any remaining point variation is the selected noise model."} A zero-only correction cannot remove slope or nonlinear errors.</p>`;
  }
  wireControls(root, update);
  wireQuestions(root);
  $("#error-resample", root).addEventListener("click", () => {
    run++;
    update();
  });
}
