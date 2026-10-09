import { $, $$ } from "./ui.mjs";
import {
  sources,
  corrections,
  budgets,
  randomLab,
  noiseLab,
  reductionLab,
} from "./chapter3-labs.mjs";
import { aircraftCase } from "./chapter3-case.mjs";
const stages = [
  [
    "sources",
    "3.1 Systematic sources",
    "Identify offset, gain, temperature, drift, nonlinearity, and random disturbance.",
    sources,
  ],
  [
    "correction",
    "3.2 Error reduction",
    "Collect, correct, and independently validate a pressure calibration.",
    corrections,
  ],
  [
    "budget",
    "3.3 Error quantification",
    "Compare signed bias, worst-case bounds, and conditional standard uncertainty.",
    budgets,
  ],
  [
    "random",
    "3.4 Random variation",
    "Compare repeated readings, distributions, sample sizes, and correlation.",
    randomLab,
  ],
  [
    "noise",
    "3.5 Induced noise",
    "Inspect voltage disturbances in time and frequency; test physical hypotheses.",
    noiseLab,
  ],
  [
    "reduction",
    "3.6 Noise mitigation",
    "Compare noise reduction with attenuation, distortion, and delay.",
    reductionLab,
  ],
  [
    "case",
    "Aircraft investigation",
    "Collect diagnostic evidence and validate a pitot-static corrective action.",
    aircraftCase,
  ],
];
const key = "mi-lab-chapter-03-v1";
let completed = new Set(),
  storage = true;
try {
  const stored = JSON.parse(localStorage.getItem(key) || "[]");
  if (Array.isArray(stored))
    completed = new Set(stored.filter((id) => stages.some((s) => s[0] === id)));
} catch {
  storage = false;
}
function save() {
  try {
    localStorage.setItem(key, JSON.stringify([...completed]));
  } catch {
    storage = false;
  }
  updateNavigation();
}
function updateNavigation() {
  $("#stage-nav").innerHTML = stages
    .map(
      ([id, label], i) =>
        `<li class="${completed.has(id) ? "completed" : ""}"><a href="#${id}" ${location.hash.split("/")[0] === "#" + id ? 'aria-current="step"' : ""}><span class="step-num" aria-hidden="true">${completed.has(id) ? "✓" : String(i + 1).padStart(2, "0")}</span><span>${label}${completed.has(id) ? '<span class="sr-only">, completed</span>' : ""}</span></a></li>`,
    )
    .join("");
  $("#progress-text").textContent = `${completed.size} of 7 stages completed`;
  $(".progress-fill").style.width = `${(completed.size / 7) * 100}%`;
  $("[role=progressbar]").setAttribute("aria-valuenow", completed.size);
  $("#storage-note").textContent = storage
    ? "Progress stays in this browser. Completion is self-recorded, not a grade."
    : "Saved progress is unavailable. All experiments work; completion is tracked for this visit.";
}
function render(focus = false) {
  const id = location.hash.slice(1).split("/")[0] || "overview",
    index = stages.findIndex((s) => s[0] === id),
    root = $("#workspace");
  if (index < 0) {
    root.innerHTML = `<span class="eyebrow">Chapter 3 / Workstation overview</span><h1>Measurement Errors,<br>Uncertainty &amp; Noise.</h1><p class="lead">Learn why a reading can be wrong, quantify what you know, validate a correction, and preserve useful signals while reducing interference. Six textbook topics lead into a pressure-chain investigation.</p><p class="note"><strong>CORE</strong> benches form the essential learning path. <strong>EXPLORE</strong> AI investigations and extended distribution, correlation, and uncertainty controls deepen it. All activities remain accessible.</p><div class="scenario"><strong>LEARN → EXPERIMENT → ANALYZE → AI CHALLENGE → VERIFY</strong><p>Predict before changing controls. Read numerical and graphical evidence, test assumptions, and record a conclusion. AI is optional and never substitutes for verification. Reset restores each reference scenario. Save notes before changing stages; only voluntary completion persists.</p></div><div class="overview-grid">${stages.map(([id, label, description], i) => `<a href="#${id}"><span class="eyebrow">${String(i + 1).padStart(2, "0")}</span><h2 style="font-size:1.1rem;margin-top:12px">${label}</h2><p>${description}</p></a>`).join("")}</div><h2>Learning outcomes</h2><p>Identify systematic and induced-noise sources; quantify error; design and validate corrections; characterize random variation and appropriate statistics; select mitigation with signal-fidelity trade-offs; critically evaluate AI; support engineering conclusions with evidence.</p><a class="button primary" href="#sources">Begin Chapter 3 →</a><p class="note" style="margin-top:20px">Prerequisite: <a href="../chapter-02/index.html#overview">Chapter 2 instrument performance</a>. Error is a signed comparison with a reference; uncertainty expresses doubt in a result. This is an introductory laboratory, not a complete VIM/GUM or certification treatment.</p>`;
    document.title = "Chapter 3 overview · Interactive Lab";
  } else {
    stages[index][3](root);
    document.title = `${stages[index][1]} · Chapter 3 Interactive Lab`;
    root.insertAdjacentHTML(
      "beforeend",
      `<div class="chapter-bottom"><div class="group">${index > 0 ? `<a class="button" href="#${stages[index - 1][0]}">← Previous</a>` : '<a class="button" href="#overview">← Overview</a>'}<button id="mark-complete" type="button" aria-pressed="${completed.has(id)}">${completed.has(id) ? "Stage completed ✓" : "Mark stage complete"}</button></div><a class="button primary" href="#${index < 6 ? stages[index + 1][0] : "overview"}">${index < 6 ? "Next: " + stages[index + 1][1] + " →" : "Return to overview →"}</a></div>`,
    );
    $("#mark-complete").addEventListener("click", () => {
      if (completed.has(id)) completed.delete(id);
      else completed.add(id);
      save();
      const b = $("#mark-complete");
      b.textContent = completed.has(id)
        ? "Stage completed ✓"
        : "Mark stage complete";
      b.setAttribute("aria-pressed", completed.has(id));
    });
  }
  updateNavigation();
  if (focus) {
    root.focus();
    window.scrollTo(0, 0);
  }
}
$("#reset-progress").addEventListener("click", () => {
  completed.clear();
  save();
  render();
  $("#storage-note").textContent =
    "Completion reset. Your current experiment was restarted; all seven stages and their experiments remain available.";
});
window.addEventListener("hashchange", () => render(true));
render();
