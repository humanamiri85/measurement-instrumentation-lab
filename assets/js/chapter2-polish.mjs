// Chapter-only teaching guidance. No instrument calculations are changed.
import { $, select } from "./ui.mjs";
export const badge = (level) =>
  `<small class="learning-badge ${level.toLowerCase()}">${level}</small>`;
export function tagBench(root, level) {
  const heading = $(".bench-head h2, .bench-head h3", root);
  if (heading && !$(".learning-badge", heading))
    heading.insertAdjacentHTML("beforeend", ` ${badge(level)}`);
}
export function acceptance(bound, limit) {
  if (bound > limit) return { label: "DOES NOT MEET LIMIT", marginal: false };
  const marginal = limit - bound <= 0.05 * limit;
  return { label: marginal ? "PASS — MARGINAL" : "MEETS LIMIT", marginal };
}
export const evidenceHypotheses = [
  {
    id: "offset",
    name: "Zero bias",
    expected: "supported",
    reason:
      "The zero-point reading is +2.0 kPa; this supports a zero offset relative to the reference.",
  },
  {
    id: "scale",
    name: "Scale-factor error",
    expected: "supported",
    reason:
      "Error grows from +2.0 to +3.9 kPa across the range, supporting a scale-factor effect in addition to offset.",
  },
  {
    id: "hysteresis",
    name: "Hysteresis",
    expected: "additional",
    reason:
      "A single increasing-pressure run cannot establish or rule out hysteresis. Add a decreasing/unloading run at the same reference points.",
  },
  {
    id: "lag",
    name: "Dynamic lag",
    expected: "additional",
    reason:
      "Steady-state pairs cannot establish or rule out a time constant. Collect time-resolved input and output during a known change.",
  },
];
export const evidenceOptions = [
  ["", "Choose classification"],
  ["supported", "Supported by current data"],
  ["unsupported", "Not supported by current data"],
  ["additional", "Additional experiment required"],
];
export function reviewEvidence(classifications) {
  return evidenceHypotheses.map((h) => ({
    ...h,
    correct: classifications[h.id] === h.expected,
  }));
}
export const faultScenarios = [
  {
    id: "static",
    title: "A · Coupled indication shifts",
    symptoms:
      "After an offset is introduced in one pressure channel, both pressure altitude and airspeed shift at unchanged flight conditions.",
    reason:
      "Static-channel bias / zero drift affects calculated altitude and the total-minus-static pressure difference used for airspeed. A static-derived VSI can also be affected when conditions or bias change; a fixed offset need not produce a false climb indication in steady flight. Check the static measurement chain against pressure references.",
  },
  {
    id: "pitot",
    title: "B · Speed error only",
    symptoms:
      "Pressure altitude looks normal in steady flight, but airspeed is consistently high. Assume the display and processing are healthy and choose among the three faults below.",
    reason:
      "A positive pitot/total-pressure bias raises the inferred airspeed. Pressure altitude and a static-derived VSI are not directly affected by this pitot-only bias. Compare the total-pressure channel against a reference; this is a bias/calibration issue within the measurement chain.",
  },
  {
    id: "dynamic",
    title: "C · Correct final value, late response",
    symptoms:
      "Final values agree with reference readings after several seconds, but pressure indications lag rapid changes.",
    reason:
      "Slow pressure-channel dynamics cause transient lag even when steady-state calibration is correct. A static calibration cannot establish response speed; use a timed step-response check and relate the result to the time constant in Block C.",
  },
];
export function faultDiagnosis(scenario, choice) {
  const fault = faultScenarios.find((f) => f.id === scenario);
  return { correct: choice === scenario, reason: fault.reason };
}
export function failureDiagnosis(root) {
  root.innerHTML = `<details class="explain" open><summary>Failure diagnosis / connect the symptoms to Chapter 2</summary><div class="fault-activity">${select(
    "fault-scenario",
    "Select a symptom set",
    faultScenarios.map((f) => [f.id, f.title]),
  )}<p class="scenario" id="fault-symptoms"></p><fieldset class="question"><legend>Which is the most likely fault under these assumptions?</legend><div class="choices"><button data-fault="static" aria-pressed="false">Static-channel bias</button><button data-fault="pitot" aria-pressed="false">Pitot / total-pressure bias</button><button data-fault="dynamic" aria-pressed="false">Slow pressure-channel dynamics</button></div><p class="feedback" id="fault-feedback" aria-live="polite">Select a diagnosis to see the measurement-chain reasoning.</p></fieldset><p class="note">These are qualitative teaching cases, not an exhaustive aircraft fault-isolation procedure.</p></div></details>`;
  function show() {
    const s = $("#fault-scenario", root).value;
    $("#fault-symptoms", root).textContent = faultScenarios.find(
      (f) => f.id === s,
    ).symptoms;
    root
      .querySelectorAll("[data-fault]")
      .forEach((b) => b.setAttribute("aria-pressed", "false"));
    $("#fault-feedback", root).textContent =
      "Select a diagnosis to see the measurement-chain reasoning.";
  }
  $("#fault-scenario", root).addEventListener("change", show);
  root.querySelectorAll("[data-fault]").forEach((button) =>
    button.addEventListener("click", () => {
      root
        .querySelectorAll("[data-fault]")
        .forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
      const result = faultDiagnosis(
        $("#fault-scenario", root).value,
        button.dataset.fault,
      );
      $("#fault-feedback", root).textContent =
        `${result.correct ? "Correct." : "Reconsider."} ${result.reason}`;
    }),
  );
  show();
}
