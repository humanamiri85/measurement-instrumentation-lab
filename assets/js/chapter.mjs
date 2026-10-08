import { $, $$ } from "./ui.mjs";
import { introduction, instrumentTypes } from "./types.mjs";
import { staticLab } from "./static.mjs";
import { dynamicLab } from "./dynamic.mjs";
import { calibrationLab } from "./calibration.mjs";
import { challenge } from "./challenge.mjs";
const stages = [
  [
    "intro",
    "Why performance matters",
    "Start with a pressure-monitoring decision.",
    introduction,
  ],
  [
    "types",
    "Instrument types",
    "Follow energy, balance, representation, and signal paths.",
    instrumentTypes,
  ],
  [
    "static",
    "Static performance",
    "Operate nine benches to investigate steady readings.",
    staticLab,
  ],
  [
    "dynamic",
    "Dynamic response",
    "Compare ideal step responses and their consequences.",
    dynamicLab,
  ],
  [
    "calibration",
    "Calibration",
    "Compare against a reference, adjust, and verify.",
    calibrationLab,
  ],
  [
    "challenge",
    "Engineering challenge",
    "Combine the evidence into an instrument selection.",
    challenge,
  ],
];
const key = "mi-lab-chapter-02-v1";
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
        `<li class="${completed.has(id) ? "completed" : ""}"><a href="#${id}" ${location.hash === "#" + id ? 'aria-current="step"' : ""}><span class="step-num" aria-hidden="true">${completed.has(id) ? "✓" : String(i + 1).padStart(2, "0")}</span><span>${label}${completed.has(id) ? '<span class="sr-only">, completed</span>' : ""}</span></a></li>`,
    )
    .join("");
  $("#progress-text").textContent = `${completed.size} of 6 stages completed`;
  $(".progress-fill").style.width = `${(completed.size / 6) * 100}%`;
  $("[role=progressbar]").setAttribute("aria-valuenow", completed.size);
  $("#storage-note").textContent = storage
    ? "Progress stays in this browser. Completion is self-recorded, not a grade."
    : "Saved progress is unavailable. All experiments work; completion is tracked for this visit.";
}
function render(focus = false) {
  const id = location.hash.slice(1) || "overview",
    index = stages.findIndex((s) => s[0] === id),
    root = $("#workspace");
  if (index < 0) {
    root.innerHTML = `<span class="eyebrow">Chapter 2 / Workstation overview</span><h1>Instrument types &amp;<br>performance characteristics.</h1><p class="lead">Six connected stages take you from a plausible reading to a defensible engineering decision. Work in order, or revisit any bench.</p><div class="scenario"><strong>How to use this lab</strong><p>Make a prediction, change a control, read the evidence, open the explanation, and decide. Select “Mark stage complete” when you have explored a stage; progress is optional and can be reset.</p></div><div class="overview-grid">${stages.map(([id, label, description], i) => `<a href="#${id}"><span class="eyebrow">${String(i + 1).padStart(2, "0")} ${completed.has(id) ? "· Completed" : ""}</span><h2 style="font-size:1.1rem;margin-top:12px">${label}</h2><p>${description}</p></a>`).join("")}</div><a class="button primary" href="#intro">Begin the learning journey →</a><p class="note" style="margin-top:20px">Allow around 60–90 minutes for a thorough first pass, or use individual benches in a lecture. Changing stages resets experiment controls, but retains stage completion.</p>`;
    document.title = "Chapter 2 overview · Interactive Lab";
  } else {
    stages[index][3](root);
    document.title = `${stages[index][1]} · Chapter 2 Interactive Lab`;
    root.insertAdjacentHTML(
      "beforeend",
      `<div class="chapter-bottom"><div class="group">${index > 0 ? `<a class="button" href="#${stages[index - 1][0]}">← Previous</a>` : '<a class="button" href="#overview">← Overview</a>'}<button id="mark-complete" type="button" aria-pressed="${completed.has(id)}">${completed.has(id) ? "Stage completed ✓" : "Mark stage complete"}</button></div><a class="button primary" href="#${index < 5 ? stages[index + 1][0] : "overview"}">${index < 5 ? "Next: " + stages[index + 1][1] + " →" : "Return to overview →"}</a></div>`,
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
    "Completion reset. Your current experiment was restarted; all six stages remain available.";
});
window.addEventListener("hashchange", () => render(true));
render();
