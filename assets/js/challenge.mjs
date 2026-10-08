import { aerospaceCase, aiChallenge } from "./chapter2-activities.mjs";
import { $, $$, fmt, metrics } from "./ui.mjs";
import { rangeMetrics, firstOrder } from "./models.mjs";
const candidates = [
  {
    id: "a",
    name: "A / Mechanical gauge",
    range: 10,
    accuracy: 1,
    resolution: 0.2,
    tau: 0.05,
    drift: 0.005,
    type: "Passive · analog · deflection · local indication",
    cost: "$45 · no power · easy local use",
  },
  {
    id: "b",
    name: "B / Compact smart transmitter",
    range: 2,
    accuracy: 1,
    resolution: 0.01,
    tau: 0.15,
    drift: 0.0005,
    type: "Active · digital · signal output + display · compensated",
    cost: "$180 · 24 V supply · periodic verification",
  },
  {
    id: "c",
    name: "C / Precision transmitter",
    range: 5,
    accuracy: 0.1,
    resolution: 0.001,
    tau: 1.2,
    drift: 0.0001,
    type: "Active · digital · signal output · compensated",
    cost: "$420 · 24 V supply · excellent steady readings",
  },
];
export function instrumentSelection(root) {
  root.innerHTML = `<span class="eyebrow">Chapter synthesis / Engineering challenge</span><h1>Make the engineering call.</h1><p class="lead">The instrument with the best-looking accuracy number is not automatically the right instrument. Build a decision from static limits, environment, and response speed.</p><div class="scenario"><strong>Application: pressure control for a small filtration line</strong><p>Normal pressure is 0.8–1.2 bar; startup may reach 1.6 bar. The controller must distinguish a 0.04 bar change and read within ±0.05 bar of the final pressure 0.5 s after a 0.4 bar step. The enclosure can warm by 20°C. You need automatic logging. Budget: $250.</p><p class="note">For this exercise, add bounded static error, worst-case temperature drift, half a resolution step, and first-order residual lag conservatively. Treat the response and drift specifications as valid over this operating range.</p></div><div class="candidates">${candidates.map((c) => `<article class="candidate" id="candidate-${c.id}"><h2 style="font-size:1.1rem">${c.name}</h2><dl><dt>Range</dt><dd>0–${c.range} bar</dd><dt>Accuracy bound</dt><dd>±${c.accuracy}% FS</dd><dt>Resolution</dt><dd>${c.resolution} bar</dd><dt>First-order τ</dt><dd>${c.tau} s</dd><dt>Residual zero-drift bound</dt><dd>±${c.drift} bar/°C</dd><dt>Type / interface</dt><dd>${c.type}</dd><dt>Cost / operation</dt><dd>${c.cost}</dd></dl><button data-candidate="${c.id}" type="button" aria-pressed="false">Evaluate instrument ${c.id.toUpperCase()}</button></article>`).join("")}</div><div class="bench"><div class="bench-head"><h2>Decision worksheet</h2><span>SPECIFICATION → EVIDENCE</span></div><div class="bench-body"><div id="candidate-analysis"><p>Select a candidate to compute its error budget and inspect the tradeoffs.</p></div><fieldset class="question"><legend>Which evidence supports your recommendation? Select all that apply.</legend><div class="check-list"><label><input type="checkbox" id="reason-range">The range covers startup pressure with useful headroom.</label><label><input type="checkbox" id="reason-total">The combined error bound at 0.5 s meets ±0.05 bar.</label><label><input type="checkbox" id="reason-resolution">Resolution is fine enough to distinguish a 0.04 bar change.</label><label><input type="checkbox" id="reason-interface">The output supports automatic logging within the budget.</label><label><input type="checkbox" id="reason-digits">The most displayed digits guarantee the best accuracy.</label></div></fieldset><label for="justification"><strong>Your engineering justification</strong></label><p class="note" id="justification-help">Mention at least one numerical limit and one tradeoff. Your text stays in this page; it is not sent anywhere or automatically graded.</p><textarea id="justification" aria-describedby="justification-help" placeholder="I recommend … because … . I would verify … before commissioning."></textarea><div class="actions"><button id="submit-decision" class="primary" type="button">Review my decision</button><button id="export-decision" type="button">Download decision notes</button></div><div id="decision-feedback" aria-live="polite"></div></div></div><details class="explain"><summary>Explain what still needs checking in a real purchase</summary><p>Confirm overload rating, media compatibility, installation effects, environmental limits, power and interfaces, reference traceability, and calibration status. The specifications here intentionally simplify procurement. A worst-case bound is not a statistical uncertainty estimate, and response time is not the same as sampling rate.</p></details>`;
  let chosen = null;
  $$("[data-candidate]", root).forEach((button) =>
    button.addEventListener("click", () => {
      chosen = candidates.find((c) => c.id === button.dataset.candidate);
      $$("[data-candidate]", root).forEach((b) =>
        b.setAttribute("aria-pressed", String(b === button)),
      );
      $$(".candidate", root).forEach((c) =>
        c.classList.toggle("selected", c.id === `candidate-${chosen.id}`),
      );
      const absolute = rangeMetrics(chosen.range, chosen.accuracy, 1).absolute,
        drift = chosen.drift * 20,
        round = chosen.resolution / 2,
        lag = 0.4 * (1 - firstOrder(0.5, chosen.tau)),
        total = absolute + drift + round + lag;
      $("#candidate-analysis", root).innerHTML =
        `<h3>${chosen.name} / conservative bound</h3>${metrics([
          ["Static accuracy bound", `${fmt(absolute, 3)} bar`],
          ["20°C drift bound", `${fmt(drift, 3)} bar`],
          ["Half-step rounding", `${fmt(round, 4)} bar`],
          ["Residual lag at 0.5 s", `${fmt(lag, 4)} bar`],
          ["Combined bound", `${fmt(total, 4)} bar`],
          ["Allowed bound", "0.0500 bar"],
        ])}<p class="observation"><strong>${total <= 0.05 ? "Meets the combined error criterion." : "Exceeds the combined error criterion."}</strong> ${chosen.id === "a" ? "The wide range and coarse scale dominate even though the response is fast. There is also no controller signal." : chosen.id === "b" ? "Its static error is larger than C’s, but its faster response makes the total bound smaller at the required observation time." : "Excellent steady-state accuracy is outweighed by response lag at 0.5 s. It also exceeds the budget."}</p>`;
      $("#decision-feedback", root).innerHTML = "";
    }),
  );
  $("#submit-decision", root).addEventListener("click", () => {
    const feedback = $("#decision-feedback", root);
    if (!chosen) {
      feedback.textContent =
        "Select a candidate before reviewing your decision.";
      return;
    }
    const evidence = ["range", "total", "resolution", "interface"].filter(
        (k) => $("#reason-" + k, root).checked,
      ),
      misconception = $("#reason-digits", root).checked,
      justification = $("#justification", root).value.trim();
    feedback.innerHTML = `<div class="observation"><strong>${chosen.id === "b" ? "B is the strongest fit under these assumptions." : `${chosen.id.toUpperCase()} is not the strongest fit for the stated requirements.`}</strong><p style="margin:10px 0">B’s combined bound is about 0.0493 bar. C’s is about 0.2712 bar because of lag, despite superior steady-state accuracy. A’s static and drift limits alone already exceed tolerance.</p><p style="margin:10px 0">${evidence.length === 4 && !misconception ? "Your selected evidence covers range, error, resolution, and interface/cost." : "Revisit your evidence: all four application criteria matter."} ${misconception ? "More digits indicate finer representation, not guaranteed accuracy." : ""} ${justification.length < 30 ? "Add a fuller justification with a numerical limit and a tradeoff." : "Your written justification is retained below; compare it critically with the computed bounds."}</p><p style="margin:0">B has very little error margin. Before commissioning, verify the stated bounds and calibration in the actual enclosure. If they cannot be assured, seek a faster or more stable alternative rather than accepting a borderline specification.</p></div>`;
  });
  $("#export-decision", root).addEventListener("click", () => {
    const text = `Chapter 2 — Engineering decision\nCandidate: ${chosen ? chosen.name : "Not selected"}\n\nJustification:\n${$("#justification", root).value}\n\nEvidence selected:\n${["range", "total", "resolution", "interface", "digits"].filter((k) => $("#reason-" + k, root).checked).join(", ")}\n\nTeaching scenario only; verify real-device specifications and calibration.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" })),
      a = document.createElement("a");
    a.href = url;
    a.download = "chapter-02-decision.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

export function challenge(root, initialPanel = "aircraft") {
  root.innerHTML = `<span class="eyebrow">Chapter synthesis / Aerospace and evidence</span><h1>From the bench to the flight deck.</h1><p class="lead">Apply blocks A–D to an aircraft measurement chain, make an instrument-selection decision, then critically inspect an AI-assisted data analysis.</p><div class="tabs" role="group" aria-label="Integrated engineering activities"><button data-synthesis="aircraft" aria-pressed="true">Pitot-static case</button><button data-synthesis="selection" aria-pressed="false">Instrument selection</button><button data-synthesis="ai" aria-pressed="false">AI Engineering Challenge</button></div><div id="synthesis-panel"></div>`;
  const panel = $("#synthesis-panel", root);
  function show(mode) {
    $$("[data-synthesis]", root).forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.synthesis === mode)),
    );
    if (mode === "aircraft") aerospaceCase(panel);
    else if (mode === "ai") aiChallenge(panel);
    else {
      instrumentSelection(panel);
      const heading = $("h1", panel);
      heading.outerHTML = "<h2>" + heading.innerHTML + "</h2>";
    }
  }
  $$("[data-synthesis]", root).forEach((b) =>
    b.addEventListener("click", () => show(b.dataset.synthesis)),
  );
  show(
    ["aircraft", "selection", "ai"].includes(initialPanel)
      ? initialPanel
      : "aircraft",
  );
}
