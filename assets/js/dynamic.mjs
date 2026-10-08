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
import { firstOrder, secondOrder, overshoot, settlingTime } from "./models.mjs";
export function dynamicLab(root) {
  root.innerHTML = `<span class="eyebrow">2.4 / Dynamic response lab</span><h1>A correct reading.<br>But when?</h1><p class="lead">A temperature probe moves from a 20°C bath into an 80°C bath. Compare how three idealized instruments react to the same step at t = 0.</p><div class="scenario"><strong>Predict before applying the step</strong><p>Will a slow sensor reach the final temperature correctly? Will a sensor that reacts quickly always give a trustworthy peak reading?</p></div>${question("dynamic-prediction", "At one time constant, a first-order sensor has completed approximately…", ["37% of the change", "63% of the change", "100% of the change"], 1, "The fraction is 1 − exp(−1) = 0.632. The remaining error is 36.8% of the temperature change; the output is not 63% of the absolute temperature.")}<div class="bench"><div class="bench-head"><h2>Step-response workstation</h2><span>20°C → 80°C</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${range("tau", "First-order time constant τ", 0.1, 4, 0.1, 1, "s")}${range("zeta", "Second-order damping ζ", 0, 2, 0.001, 0.7, "")}${range("omega", "Natural frequency ωₙ", 0.5, 8, 0.1, 3, "rad/s")}${select(
    "response-focus",
    "Compare responses",
    [
      ["all", "Zero-, first-, and second-order"],
      ["first", "First-order only"],
      ["second", "Second-order only"],
    ],
  )}<div class="actions"><button class="primary" id="apply-step" type="button">Apply step</button><button id="reset-step" type="button">Reset experiment</button></div><p class="note">Apply step to reveal the full response. Scrub the time cursor to inspect readings; there is no required animation.</p></div><div id="dynamic-result"></div></div><div id="cursor-controls">${range("time-cursor", "Observation time", 0, 12, 0.01, 1, "s")}</div><p id="dynamic-status" class="status" aria-live="polite">Ready: all sensors are initially at 20°C.</p></div></div><div class="actions" role="group" aria-label="Damping presets"><button data-damping="0">Undamped · 0</button><button data-damping="0.2">Lightly damped · 0.2</button><button data-damping="0.707">Underdamped / well damped · 0.707</button><button data-damping="1">Critically damped · 1</button><button data-damping="1.5">Overdamped · 1.5</button></div><p class="observation"><strong>Terminology note:</strong> In the assigned textbook (Morris &amp; Langari, 3rd edition, Chapter 2), ζ = 0.707 is described as the critically damped target for a step response. In standard second-order system terminology, critical damping occurs at ζ = 1. A damping ratio of ζ ≈ 0.707 is underdamped and gives a small overshoot (about 4.3%). In this lab, the standard terminology is used, while the textbook wording is shown here so the two are not confused.</p><div id="dynamic-explanation"></div>${question("dynamic-choice", "A process changes substantially within 0.2 s. Would a sensor with τ = 2 s follow it closely?", ["Yes: the final temperature is correct", "No: its response lag hides the rapid change"], 1, "After 0.2 s, this first-order sensor completes only 1 − exp(−0.2/2) ≈ 9.5% of a step. Static accuracy does not establish dynamic suitability.")}<details class="explain"><summary>Explain the three models and their limitations</summary><p><strong>Zero order:</strong> output follows input immediately with a fixed sensitivity in the ideal model. A potentiometer can approximate this over a limited operating bandwidth; no physical device is infinitely fast.</p><p><strong>First order:</strong> Δoutput / Δinput = 1 − e<sup>−t/τ</sup>. At τ, 63.2% of the change is complete; at 3τ, 95.0%; at 5τ, 99.3%. A temperature probe with thermal storage often approximates this behavior.</p><p><strong>Second order:</strong> energy storage and damping can produce overshoot and ringing. ζ = 0 is undamped; 0 &lt; ζ &lt; 1 is underdamped; ζ = 1 is critically damped; ζ &gt; 1 is overdamped. At fixed natural frequency, critical damping is the fastest nonoscillatory response. ζ ≈ 0.707 remains underdamped, with about 4.3% overshoot.</p><p>The model assumes unit steady-state gain, zero initial deviation, and a positive ideal step. Natural frequency is in rad/s, not Hz. Real sensors also have sampling delays, noise, bandwidth limits, and operating constraints.</p></details>`;
  let applied = false;
  function update() {
    const tau = +$("#tau", root).value,
      z = +$("#zeta", root).value,
      w = +$("#omega", root).value,
      t = +$("#time-cursor", root).value,
      focus = $("#response-focus", root).value;
    const temp = (f) => 20 + 60 * f;
    const curves = [
      {
        name: "Input step / zero-order",
        fn: () => (applied ? 80 : 20),
        dashed: true,
      },
    ];
    if (focus !== "second")
      curves.push({
        name: "First-order",
        fn: (x) => temp(applied ? firstOrder(x, tau) : 0),
      });
    if (focus !== "first")
      curves.push({
        name: "Second-order",
        fn: (x) => temp(applied ? secondOrder(x, z, w) : 0),
      });
    const st = settlingTime((x) => secondOrder(x, z, w), 60);
    $("#dynamic-result", root).innerHTML =
      plot({
        title: applied
          ? "Response after the step at t = 0"
          : "Initial equilibrium: no step applied",
        xLabel: "Time after step / s",
        yLabel: "Temperature / °C",
        xMax: 12,
        yMin: 0,
        yMax: 145,
        curves,
        markers: applied
          ? [
              {
                x: t,
                label:
                  Math.abs(t - tau) < 0.15 && focus !== "second"
                    ? `Cursor at τ: 63.2%`
                    : `Cursor ${fmt(t)} s`,
              },
              ...(focus !== "second" && Math.abs(t - tau) >= 0.15
                ? [{ x: tau, label: "τ: 63.2% change" }]
                : []),
            ]
          : [],
      }) +
      metrics([
        ["Zero-order at cursor", `${fmt(applied ? 80 : 20, 1)}°C`],
        [
          "First-order at cursor",
          `${fmt(temp(applied ? firstOrder(t, tau) : 0), 1)}°C`,
        ],
        [
          "Second-order at cursor",
          `${fmt(temp(applied ? secondOrder(t, z, w) : 0), 1)}°C`,
        ],
        ["First-order at τ", applied ? "57.9°C (63.2%)" : "20.0°C"],
      ]) +
      metrics([
        ["Second-order overshoot", `${fmt(overshoot(z), 1)}% of step`],
        [
          "Second-order 2% settling",
          z === 0
            ? "Does not settle"
            : st === null
              ? ">60 s"
              : `${fmt(st, 2)} s`,
        ],
        ["First-order 2% settling", `${fmt(-tau * Math.log(0.02), 2)} s`],
      ]);
    const regime =
      z === 0
        ? "Undamped"
        : z < 1
          ? "Underdamped"
          : z === 1
            ? "Critically damped"
            : "Overdamped";
    $("#dynamic-explanation", root).innerHTML =
      `<div class="observation"><strong>${regime} / ζ = ${z}</strong><br>${z === 0 ? "Oscillations persist indefinitely; a peak reading can be twice the size of the true change." : z < 1 ? "The response overshoots and may ring. A quick initial response can misrepresent a transient peak." : z === 1 ? "The response approaches the target without overshoot, at the boundary between oscillatory and nonoscillatory behavior." : "No overshoot, but the slow mode can take a long time to approach the target."} ${applied ? `At ${fmt(t)} s, the first-order sensor has completed ${fmt(100 * firstOrder(t, tau), 1)}% of the 60°C change.` : "Apply the step to inspect the responses."}</div>`;
    $("#time-cursor", root).disabled = !applied;
  }
  wireControls(root, update);
  wireQuestions(root);
  $("#apply-step", root).addEventListener("click", () => {
    applied = true;
    update();
    $("#dynamic-status", root).textContent =
      "Step applied at t = 0. Change the time cursor to inspect all responses.";
  });
  $("#reset-step", root).addEventListener("click", () => {
    applied = false;
    update();
    $("#dynamic-status", root).textContent =
      "Reset: all sensors are back at 20°C. Parameters are retained.";
  });
  $$("[data-damping]", root).forEach((b) =>
    b.addEventListener("click", () => {
      const input = $("#zeta", root);
      input.value = b.dataset.damping;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }),
  );
}
