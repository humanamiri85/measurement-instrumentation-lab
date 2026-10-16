import {
  sections,
  defaults,
  controls,
  results,
  teaching,
  esc,
  objectTable,
} from "./chapter4/activities.mjs";
import { solve, hints, explanation } from "./chapter4/bank-solver.mjs";
const $ = (s) => document.querySelector(s),
  key = "measurement-lab-chapter4-v1";
let saved = { states: {}, done: [], notes: "", exercise: "" },
  storage = true,
  bank = [];
try {
  const raw = localStorage.getItem(key);
  if (raw) {
    const p = JSON.parse(raw);
    if (p && typeof p.states === "object" && Array.isArray(p.done))
      saved = { ...saved, ...p };
  }
} catch {
  storage = false;
}
function persist() {
  try {
    localStorage.setItem(key, JSON.stringify(saved));
  } catch {
    storage = false;
  }
  $("#storage-note").textContent = storage
    ? "Progress and notes stay in this browser. Completion is self-recorded, not a grade."
    : "Storage unavailable: session memory remains usable. Export your data and notes before leaving.";
}
function progress() {
  const n = saved.done.filter((x) => sections.some((s) => s[0] === x)).length;
  $("#progress-text").textContent =
    `${n} of ${sections.length} activities completed`;
  $(".progress-fill").style.width = (100 * n) / sections.length + "%";
  $(".progress-track").setAttribute("aria-valuenow", n);
}
function download() {
  const blob = new Blob(
      [
        JSON.stringify(
          { ...saved, chapter: 4, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "chapter4-evidence.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $("#export-status").textContent = "Data and notes exported.";
}
function route() {
  const id = decodeURIComponent(location.hash.slice(1)) || "4.1",
    section = sections.find((s) => s[0] === id) || sections[0],
    [number, title, kind] = section;
  document.title = `${number} ${title} · Chapter 4`;
  document.querySelectorAll("#stage-nav a").forEach((a) => {
    if (a.hash === "#" + number) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const t = teaching[kind];
  $("#workspace").innerHTML =
    `<span class="eyebrow">Chapter 4 / ${esc(number)} · Learn → Predict → Experiment → Analyze → Verify</span><h1>${esc(title)}</h1>${t ? `<p class="lead">${t[1]}</p><div class="scenario"><strong>Predict first</strong><p>${t[0]}</p></div>` : '<p class="lead">Work through a source-linked example or exercise. Hints precede the audited solution; clarify assumptions before comparing answers.</p>'}<div id="activity"></div><section class="explain"><h2>Evidence notebook</h2><label for="notes">Record predictions, numerical evidence, assumptions and independent checks</label><textarea id="notes" rows="5">${esc(saved.notes)}</textarea><div class="actions"><button id="complete" type="button">Record activity complete</button><button id="export" type="button">Export data and notes</button></div><p id="export-status" role="status"></p><p id="completion-status" role="status"></p></section>`;
  $("#notes").addEventListener("input", (e) => {
    saved.notes = e.target.value;
    persist();
  });
  $("#export").onclick = download;
  $("#complete").onclick = () => {
    const state = saved.states[kind];
    if (
      kind === "pressure" &&
      (!state?.decision?.trim() || !state?.evidence?.trim())
    ) {
      $("#completion-status").textContent =
        "Record an engineering decision and statistical evidence with an independent validation before recording completion.";
      return;
    }
    if (
      kind === "ai" &&
      (!state?.response?.trim() || !state?.evidence?.trim())
    ) {
      $("#completion-status").textContent =
        "Record your critique and numerical evidence with an independent check before recording completion.";
      return;
    }
    if ($("#error")?.textContent) {
      $("#completion-status").textContent =
        "Correct the activity inputs before recording completion.";
      return;
    }
    if (!saved.done.includes(number)) saved.done.push(number);
    persist();
    progress();
    $("#completion-status").textContent =
      "Completion recorded for " +
      number +
      ". Written reasoning remains self/instructor reviewed.";
  };
  if (kind === "bank") renderBank();
  else {
    const s = saved.states[kind] ?? structuredClone(defaults[kind]);
    saved.states[kind] = s;
    $("#activity").innerHTML =
      `<div class="bench"><div class="bench-head"><h2>Interactive evidence bench</h2></div><div class="bench-body"><div class="bench-grid"><form class="controls" id="controls">${controls(kind, s)}<div class="actions"><button id="calculate" type="submit">Calculate / run</button><button id="lab-reset" type="button">Reset to defaults</button></div></form><div><div id="error" role="alert"></div><div id="lab-results" aria-live="polite"></div></div></div></div></div><section class="explain"><h2>Verify your reasoning</h2><p>${t[2]}</p><button class="check" data-answer="Yes" type="button">Yes</button> <button class="check" data-answer="No" type="button">No</button><p id="check-feedback" role="status"></p></section><p class="note">Related textbook practice: <a href="#4.16">Browse independently audited examples and problems</a>. Source: Morris &amp; Langari, 3rd ed., Chapter 4, printed pp75–132.</p>`;
    const update = () => {
      for (const e of $("#controls").elements)
        if (e.name)
          s[e.name] =
            e.type === "number"
              ? e.value.trim() === ""
                ? NaN
                : Number(e.value)
              : e.value;
      if (kind === "ai") {
        s.investigations ??= {};
        s.investigations[s.claim] = {
          response: s.response,
          evidence: s.evidence,
        };
      }
      persist();
      try {
        $("#lab-results").innerHTML = results(kind, s);
        $("#error").textContent = "";
      } catch (e) {
        $("#error").textContent = e.message;
        $("#lab-results").innerHTML =
          "<p>Correct the inputs to calculate. No result is reported for invalid settings.</p>";
      }
    };
    $("#controls").onsubmit = (e) => {
      e.preventDefault();
      update();
    };
    $("#controls").addEventListener("change", (event) => {
      if (kind === "ai" && event.target.id === "claim") {
        s.investigations ??= {};
        s.investigations[s.claim] = {
          response: s.response,
          evidence: s.evidence,
        };
        const next = s.investigations[event.target.value] ?? {
          response: "",
          evidence: "",
        };
        $("#response").value = next.response;
        $("#evidence").value = next.evidence;
      }
      if (kind === "prop" && event.target.id === "model") {
        const presets = {
          sum: ["220,330", "4.4,6.6"],
          difference: ["10,9.5", ".01,.0095"],
          product: ["12,2", ".12,.04"],
          quotient: ["10,.214", ".1,.005"],
          density: ["20,.1,.2,.3", ".1,.001,.002,.003"],
          tank: ["2,3,2,10", ".02,.03,.02,0"],
        };
        const [v, u] = presets[event.target.value];
        $("#values").value = v;
        $("#uncertainties").value = u;
        $("#bounds").value = u;
      }
      update();
    });
    $("#lab-reset").onclick = () => {
      saved.states[kind] = structuredClone(defaults[kind]);
      persist();
      route();
    };
    document.querySelectorAll(".check").forEach(
      (b) =>
        (b.onclick = () => {
          $("#check-feedback").textContent =
            (b.dataset.answer === t[3] ? "Correct. " : "Reconsider. ") + t[4];
        }),
    );
    update();
  }
  persist();
  progress();
  $("#workspace").focus({ preventScroll: true });
}
function renderBank() {
  const selected = bank.find((e) => e.id === saved.exercise) || bank[0];
  $("#activity").innerHTML =
    `<div class="bench"><div class="bench-body"><label class="control" for="exercise-filter"><span>Search title, example/problem ID, topic or page</span><input id="exercise-filter" type="search"></label><label class="control" for="exercise"><span>22 examples and 60 problems (separate identifiers)</span><select id="exercise"></select></label><div id="exercise-body"></div></div></div>`;
  const options = (q = "") => {
    const list = bank.filter((e) =>
      JSON.stringify(e).toLowerCase().includes(q.toLowerCase()),
    );
    $("#exercise").innerHTML = list
      .map(
        (e) =>
          `<option value="${e.id}">${e.kind === "example" ? "Example" : "Problem"} ${e.number} · p${e.page} · ${esc(e.title)}</option>`,
      )
      .join("");
    if (list.some((e) => e.id === saved.exercise))
      $("#exercise").value = saved.exercise;
    if (list.length) show(bank.find((e) => e.id === $("#exercise").value));
    else
      $("#exercise-body").innerHTML =
        "<p>No matching exercise. Clear the search to restore the bank.</p>";
  };
  function show(e) {
    saved.exercise = e.id;
    persist();
    $("#exercise-body").innerHTML =
      `<h2>${e.kind === "example" ? "Example" : "Problem"} ${e.number}: ${esc(e.title)}</h2><p class="note">Source printed p${e.page}; related section ${e.section}; ID ${e.id}. Status: ${esc(e.status)}. ${esc(e.note)}</p><p>${esc(explanation(e))}</p><h3>Given data and explicit teaching assumptions</h3><pre tabindex="0" role="region" aria-label="Exercise given data">${esc(JSON.stringify(e.args, null, 2))}</pre><p>Units: ${esc(e.unit || "dimensionless / as specified by model")}. Variance has squared reading units. Probability is a fraction, not a percentage.</p><button id="load-data" type="button">Load source data into related lab</button><p id="load-status" role="status"></p>${hints(
        e,
      )
        .map(
          (h, i) =>
            `<details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`,
        )
        .join(
          "",
        )}<details id="solution"><summary>Reveal audited calculation and interpretation</summary>${objectTable(solve(e))}<p class="note">Method: ${esc(hints(e).join(" "))} ${esc(e.note)} Numeric results were compared with independent SciPy/NumPy calculations; conceptual tasks have an explanation rather than an invented numerical answer. All ambiguity labels refer to the stated adaptation, not a unique answer in the source.</p></details><label class="control" for="answer"><span>Check a chosen numerical quantity (optional)</span><input id="answer" type="number" step="any"></label><label class="control" for="quantity"><span>Which numerical result are you checking?</span><select id="quantity"></select></label><button id="answer-check" type="button">Check calculation</button><p id="answer-feedback" role="status"></p>`;
    const values = [];
    function scan(o, p = "") {
      if (typeof o === "number") values.push([p, o]);
      else if (o && typeof o === "object")
        for (const [k, v] of Object.entries(o)) scan(v, p ? p + "." + k : k);
    }
    scan(solve(e));
    $("#quantity").innerHTML = values
      .map(([p], i) => `<option value="${i}">${esc(p)}</option>`)
      .join("");
    $("#answer-check").onclick = () => {
      const text = $("#answer").value,
        v = Number(text),
        target = values[Number($("#quantity").value)];
      $("#answer-feedback").textContent = !target
        ? "This conceptual task requires a written explanation."
        : !text.trim() || !Number.isFinite(v)
          ? "Enter a finite numerical answer."
          : Math.abs(v - target[1]) <= 0.0005 * Math.max(1, Math.abs(target[1]))
            ? "Numerical agreement within display tolerance. Explain units and assumptions; this is not a grade."
            : "No numerical agreement yet. Review the progressive hints, units and selected quantity.";
    };
    $("#load-data").onclick = () => {
      let data = e.args.data ?? e.args.referenceData ?? e.args.sets?.[0];
      if (!data) {
        $("#load-status").textContent =
          "This summary-based exercise has no raw dataset. Use its given summary or uncertainty inputs in the related lab.";
        return;
      }
      for (const k of ["data", "fit", "outlier", "summary"])
        saved.states[k] = {
          ...structuredClone(defaults[k]),
          ...(saved.states[k] ?? {}),
          data: data.join(", "),
          unit: e.unit,
        };
      if (e.type === "gof")
        saved.states.fit = {
          ...saved.states.fit,
          cuts: e.args.cuts.join(", "),
          counts: "",
        };
      persist();
      $("#load-status").innerHTML =
        'Dataset preserved across related activities. <a href="#' +
        e.section +
        '">Open related lab →</a>';
    };
  }
  $("#exercise-filter").oninput = (e) => options(e.target.value);
  $("#exercise").onchange = () =>
    show(bank.find((e) => e.id === $("#exercise").value));
  saved.exercise = selected.id;
  options();
}
$("#stage-nav").innerHTML = sections
  .map(([id, title]) => `<li><a href="#${id}">${id} · ${esc(title)}</a></li>`)
  .join("");
$("#reset-progress").onclick = () => {
  saved.done = [];
  persist();
  progress();
};
window.addEventListener("hashchange", route);
try {
  const response = await fetch(
    new URL("./chapter4/bank.json", import.meta.url),
  );
  if (!response.ok) throw new Error("Exercise bank could not be loaded.");
  bank = await response.json();
  route();
} catch (e) {
  $("#workspace").innerHTML =
    `<h1>Chapter 4 could not start</h1><p role="alert">${esc(e.message)}</p><p>Reload the page using the site server.</p>`;
}
