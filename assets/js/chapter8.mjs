import {
  sections,
  defaults,
  presets,
  teaching,
  controls,
  calculate,
} from "./chapter8/activities.mjs";
import { exercises } from "./chapter8/practice.mjs";
import { esc, fmt, table, note, select, field, area } from "./chapter8/ui.mjs";
import * as m from "./chapter8/models.mjs";
const $ = (q) => document.querySelector(q),
  storageKey = "measurement-lab-chapter8-v1";
let state = { states: {}, done: [], notes: "", exercise: "exercise-8-1" },
  storage = true,
  currentData = null,
  section,
  kind;
try {
  const p = JSON.parse(localStorage.getItem(storageKey));
  if (
    p &&
    typeof p.states === "object" &&
    p.states !== null &&
    Array.isArray(p.done)
  )
    state = { ...state, ...p };
} catch {
  storage = false;
}
function persist() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    storage = false;
  }
  $("#storage-note").textContent = storage
    ? "Chapter 8 progress, settings and notes remain in this browser. Completion is self-recorded, not a grade."
    : "Storage unavailable: working in session memory. Export your settings, data and notes before leaving.";
}
function progress() {
  const n = state.done.filter((id) => sections.some((s) => s[0] === id)).length;
  $("#progress-text").textContent =
    `${n} of ${sections.length} activities completed`;
  $(".progress-fill").style.width = (100 * n) / sections.length + "%";
  $(".progress-track").setAttribute("aria-valuenow", n);
}
function exportData() {
  const content = {
      chapter: 8,
      scope: "Sections 8.1–8.7.3; exercises 8.1–8.7",
      exportedAt: new Date().toISOString(),
      ...state,
      currentActivity: section[0],
      currentData,
    },
    a = document.createElement("a"),
    blob = new Blob(
      [
        JSON.stringify(
          content,
          (_key, value) =>
            typeof value === "number" && !Number.isFinite(value)
              ? String(value)
              : value,
          2,
        ),
      ],
      {
        type: "application/json",
      },
    );
  a.href = URL.createObjectURL(blob);
  a.download = "chapter8-daq-evidence.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  $("#export-status").textContent =
    "Settings, notes and current numerical data exported.";
}
function readControls(s) {
  for (const e of $("#controls").elements)
    if (e.name)
      s[e.name] =
        e.type === "number"
          ? e.value.trim() === ""
            ? NaN
            : Number(e.value)
          : e.value;
}
function render() {
  const hash = decodeURIComponent(location.hash.slice(1)) || "8.1";
  section = sections.find((s) => s[0] === hash) || sections[0];
  kind = section[2];
  currentData = null;
  const [id, title] = section,
    t = teaching[kind];
  state.states[kind] ??= structuredClone(defaults[kind]);
  const s = state.states[kind];
  document.title = `${id} ${title} · Chapter 8`;
  document.querySelectorAll("#stage-nav a").forEach((a) => {
    if (a.hash === "#" + id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("#workspace").innerHTML =
    `<span class="eyebrow">Chapter 8 · Selected scope 8.1–8.7.3 · Learn → Predict → Experiment → Analyze → Verify</span><h1>${esc(title)}</h1><p class="lead">${t[0]}</p><div class="scenario"><strong>Predict first</strong><p>${t[1]}</p></div><p>${t[2]}</p><div class="bench"><div class="bench-head"><h2>Interactive evidence bench</h2></div><div class="bench-body"><div class="bench-grid"><form id="controls" class="controls">${kind === "practice" ? practiceControls(s) : kind === "ai" ? aiControls(s) : controls(kind, s)}${presets[kind] ? select("preset", "Reproducible scenario", "custom", [["custom", "Choose a preset…"], ...presets[kind].map(([label], i) => [String(i), label])]) + '<button id="apply-preset" type="button">Apply selected preset</button>' : ""}<div class="actions"><button id="calculate" class="primary" type="submit">Calculate / run</button><button id="lab-reset" type="button">Reset to defaults</button></div></form><div id="result-column"><div id="error" role="alert"></div><div id="lab-results" aria-live="polite"></div></div></div></div></div><section class="explain"><h2>Verify your reasoning</h2><p>${t[3]}</p><button class="concept" data-answer="yes" type="button">Yes</button> <button class="concept" data-answer="no" type="button">No</button><p id="concept-feedback" role="status"></p></section><section class="explain"><h2>Evidence notebook</h2><label for="notes">Record your prediction, numerical evidence, assumptions and independent checks</label><textarea id="notes" rows="5">${esc(state.notes)}</textarea><div class="actions"><button id="complete" type="button">Record activity complete</button><button id="export" type="button">Export data and notes</button></div><p id="completion-status" role="status"></p><p id="export-status" role="status"></p></section>${note("Scope: printed pp211–226 through 8.7.3; exercises 8.1–8.7 on pp238–239. Active filters (8.8) and digital filters (8.9) are outside this delivery. Original teaching diagrams and explanations; textbook figures are not reproduced.")}<p class="note"><a href="#practice">Guided exercises</a> · <a href="#design">Integrated DAQ investigation</a> · <a href="#ai">Optional offline AI critique</a></p>`;
  let lastInputs = null;
  function update() {
    const snapshot = JSON.stringify(
      Array.from($("#controls").elements)
        .filter((e) => e.name)
        .map((e) => [e.name, e.value]),
    );
    readControls(s);
    if (kind === "ai") {
      s.responses ??= {};
      s.responses[s.topic] = { critique: s.critique, evidence: s.evidence };
    }
    persist();
    if (snapshot === lastInputs) return;
    lastInputs = snapshot;
    try {
      const r =
        kind === "practice"
          ? practiceResult(s)
          : kind === "ai"
            ? aiResult(s)
            : calculate(kind, s);
      $("#lab-results").innerHTML = r.html;
      currentData = r.data;
      $("#error").textContent = "";
      if (kind === "practice") wirePractice(s);
      if (kind === "ai")
        $("#copy-prompt").onclick = async () => {
          const prompt = $("#ai-prompt");
          try {
            await Promise.race([
              navigator.clipboard.writeText(prompt.value),
              new Promise((_, reject) =>
                setTimeout(
                  () => reject(new Error("Clipboard unavailable")),
                  1500,
                ),
              ),
            ]);
            $("#copy-status").textContent =
              "Prompt copied. No AI request was sent.";
          } catch {
            prompt.focus();
            prompt.select();
            $("#copy-status").textContent =
              "Select and copy the prompt manually. No AI request was sent.";
          }
        };
    } catch (e) {
      $("#error").textContent = e.message;
      $("#lab-results").innerHTML =
        "<p>Correct the settings to calculate. No result is reported for invalid inputs.</p>";
      currentData = null;
    }
  }
  $("#controls").onsubmit = (e) => {
    e.preventDefault();
    update();
  };
  if (kind === "practice")
    $("#controls").addEventListener("input", (e) => {
      if (e.target.id === "phase") update();
    });
  $("#controls").addEventListener("change", (e) => {
    if (kind === "ai" && ["critique", "evidence"].includes(e.target.id)) {
      readControls(s);
      s.responses ??= {};
      s.responses[s.topic] = { critique: s.critique, evidence: s.evidence };
      persist();
      return;
    }
    if (kind === "ai" && e.target.id === "topic") {
      s.responses ??= {};
      s.responses[s.topic] = { critique: s.critique, evidence: s.evidence };
      const next = s.responses[e.target.value] ?? {
        critique: "",
        evidence: "",
      };
      $("#critique").value = next.critique;
      $("#evidence").value = next.evidence;
    }
    update();
  });
  $("#notes").addEventListener("input", (e) => {
    state.notes = e.target.value;
    persist();
  });
  $("#lab-reset").onclick = () => {
    state.states[kind] = structuredClone(defaults[kind]);
    persist();
    render();
  };
  if ($("#apply-preset"))
    $("#apply-preset").onclick = () => {
      const p = presets[kind][Number($("#preset").value)];
      if (!p) {
        $("#error").textContent = "Select a scenario first.";
        return;
      }
      state.states[kind] = structuredClone(p[1]);
      persist();
      render();
    };
  document.querySelectorAll(".concept").forEach(
    (b) =>
      (b.onclick = () => {
        $("#concept-feedback").textContent =
          (b.dataset.answer === "no" ? "Correct. " : "Reconsider. ") + t[4];
      }),
  );
  $("#complete").onclick = () => {
    readControls(s);
    if (!currentData) {
      $("#completion-status").textContent =
        "Correct the inputs before recording completion.";
      return;
    }
    if (
      kind === "design" &&
      (!s.explanation.trim() || !s.evidence.trim() || !currentData.validation)
    ) {
      $("#completion-status").textContent =
        "Record an engineering explanation and independent validation evidence, and choose a different validation frequency or amplitude.";
      return;
    }
    if (kind === "ai" && (!s.critique.trim() || !s.evidence.trim())) {
      $("#completion-status").textContent =
        "Record a critique and numerical evidence with an independent check.";
      return;
    }
    if (!state.done.includes(id)) state.done.push(id);
    persist();
    progress();
    $("#completion-status").textContent =
      "Completion recorded. Written reasoning remains self/instructor reviewed.";
  };
  $("#export").onclick = exportData;
  update();
  persist();
  progress();
  $("#workspace").focus({ preventScroll: true });
}
function practiceControls(s) {
  return (
    select(
      "exercise",
      "Exercise ID (distinct from section numbering)",
      s.exercise,
      exercises.map((e) => [
        e.id,
        `Exercise ${e.number} · p${e.page} · ${e.title}`,
      ]),
    ) +
    field("phase", "Sine phase for aliases", s.phase, "degrees") +
    select("series", "Preferred resistor series", s.series, [
      ["E12", "E12 nominal values"],
      ["E24", "E24 nominal values"],
    ])
  );
}
function practiceResult(s) {
  m.finite(s.phase);
  const e = exercises.find((e) => e.id === s.exercise);
  if (!e) throw new RangeError("Choose an available exercise.");
  const values = e.values(s);
  let plots = "";
  if (e.number === "8.6" || e.number === "8.7") {
    const d = m.resistorDesign(e.number === "8.6" ? 50 : 100, 1e-8, s.series),
      top = e.number === "8.6" ? "lp" : "hp",
      workbench = calculate(top, {
        ...defaults[top],
        R: d.selected / 1000,
        C: 0.01,
        f: d.achieved,
      });
    plots = `<details><summary>Achieved design: circuit and browser Bode plots</summary>${workbench.html}</details>`;
  }
  const rows = Object.entries(values);
  return {
    html: `<h2>Exercise ${e.number}: ${esc(e.title)}</h2><p class="note">Source ID ${e.id}; printed p${e.page}. <a href="#${e.lab}">Related section ${e.lab}</a></p><p>${esc(e.learn)}</p>${e.hints.map((h, i) => `<details><summary>Hint ${i + 1}</summary><p>${esc(h)}</p></details>`).join("")}<label class="control" for="check-quantity"><span>Quantity to check (unit is included in its name)</span><select id="check-quantity">${rows.map(([key], i) => `<option value="${i}">${key}</option>`).join("")}</select></label><label class="control" for="exercise-answer"><span>Your numerical answer</span><input type="number" id="exercise-answer" step="any"></label><button id="exercise-check" type="button">Check calculation</button><p id="exercise-feedback" role="status"></p><details><summary>Reveal independently checked solution</summary>${
      rows.length
        ? table(
            "Numerical reference",
            ["Quantity / unit", "Value"],
            rows.map(([k, v]) => [k, fmt(v, 9)]),
          )
        : note(e.learn)
    }${note("The source does not specify a resistor series: E12/E24 selection is explicit here. Preferred values are chosen by minimum achieved-cutoff error. Nominal values omit tolerance. Aliases preserve phase; Nyquist equality is a boundary, not a recommended practical design.")}</details>${plots}`,
    data: { exercise: e.id, values, assumptions: e.learn },
  };
}
function wirePractice(s) {
  $("#exercise-check").onclick = () => {
    const e = exercises.find((e) => e.id === s.exercise),
      values = Object.values(e.values(s)),
      expected = values[Number($("#check-quantity").value)],
      text = $("#exercise-answer").value,
      value = Number(text);
    $("#exercise-feedback").textContent = !values.length
      ? "Conceptual exercise: explain the role of time sampling; use the authored analysis for self/instructor review."
      : !text.trim() || !Number.isFinite(value)
        ? "Enter a finite numerical value."
        : Math.abs(value - expected) <=
            Math.max(1e-10, Math.abs(expected) * 0.00005)
          ? "Numerical agreement. Explain the units and assumptions; this is not a prose grade."
          : "No numerical agreement yet. Check units, phase, full-scale span and the progressive hints.";
  };
}
function aiControls(s) {
  return (
    select("topic", "Offline investigation", s.topic, [
      ["alias", "Is this low-frequency signal real or an alias?"],
      ["bits", "Would more ADC bits solve this problem?"],
      ["filter", "Did filtering help or destroy information?"],
    ]) +
    area(
      "critique",
      "Critique the authored response or optionally paste an AI response",
      s.critique,
    ) +
    area(
      "evidence",
      "Current numerical evidence and independent validation",
      s.evidence,
    )
  );
}
function aiResult(s) {
  let evidence, claim, checklist, lab;
  if (s.topic === "alias") {
    const p = state.states.alias ?? defaults.alias,
      r = m.sampleSignal({ ...p, p: m.radians(p.p) });
    evidence = {
      inputHz: p.f,
      sampleRate: p.fs,
      signedAliasHz: r.signed,
      positiveAliasHz: r.frequency,
      positivePhaseDegrees: (r.phase * 180) / Math.PI,
      maxSampleDifference: Math.max(
        ...r.values.map((v, i) => Math.abs(v - r.compatible[i])),
      ),
    };
    claim =
      "The smooth low-frequency trace proves the sensor really oscillated at that frequency.";
    checklist = [
      "Calculate exact samples for both analog possibilities.",
      "Preserve signed folding and phase.",
      "Validate at a different sampling rate; explain why the original record is ambiguous.",
    ];
    lab = "8.4";
  } else if (s.topic === "bits") {
    const p = state.states.adc ?? defaults.adc,
      r = calculate("adc", p),
      q = r.data.quantized;
    evidence = {
      bits: p.bits,
      deltaV: q[0].delta,
      overloadSamples: q.filter((v) => v.clipped).length,
      sampleRate: p.fs,
      inputFrequency: p.f,
    };
    claim =
      "Increasing ADC bit depth always corrects clipping, aliasing and sensor bias.";
    checklist = [
      "Separate overload, quantizer step and time sampling.",
      "Compare the same signal at another bit depth and range.",
      "Check an input endpoint and one overloaded sample independently.",
    ];
    lab = "8.5";
  } else {
    const p = state.states.conditioning ?? defaults.conditioning,
      r = m.conditioning(p);
    evidence = {
      usefulHz: p.f,
      usefulRetainedPercent: 100 * r.usefulGain,
      residualInterfererV: r.residual,
      analogCutoffHz: p.fc,
      sampleRate: p.fs,
    };
    claim =
      "The output is smoother, so filtering improved every aspect of measurement accuracy.";
    checklist = [
      "Report useful amplitude/phase distortion and residual interference together.",
      "Try a different useful frequency or cutoff.",
      "Verify an analog component with |H(jω)| before sampling.",
    ];
    lab = "8.6";
  }
  const prompt = `Investigate this DAQ claim: ${claim}\nCurrent evidence: ${JSON.stringify(evidence, null, 2)}\nState assumptions, calculate independently, identify a counterexample, and propose one validation experiment. Do not treat a smooth graph or AI agreement as proof.`;
  return {
    html: `<h2>Offline claim to critique</h2><blockquote>${esc(claim)}</blockquote>${table(
      "Current numerical evidence from your related workbench",
      ["Quantity", "Value"],
      Object.entries(evidence).map(([k, v]) => [k, fmt(v, 8)]),
    )}<p><a href="#${lab}">Change the related experiment</a>, then return here; evidence updates from its saved settings.</p><label class="control" for="ai-prompt"><span>Optional copyable prompt</span><textarea id="ai-prompt" readonly rows="9">${esc(prompt)}</textarea></label><button id="copy-prompt" type="button">Copy prompt</button><p id="copy-status" role="status"></p>${table(
      "Verification checklist (self / instructor reviewed)",
      ["Check", "Evidence required"],
      checklist.map((x) => [
        x,
        "Numerical result, assumptions and independent validation.",
      ]),
    )}${note("No AI API, automatic external transmission or agreement-based grading. You can complete this entirely offline by critiquing the authored claim. Each topic retains its own critique and evidence.")}`,
    data: { topic: s.topic, claim, evidence, checklist, prompt },
  };
}
$("#stage-nav").innerHTML = sections
  .map(([id, title]) => `<li><a href="#${id}">${id} · ${esc(title)}</a></li>`)
  .join("");
$("#reset-progress").onclick = () => {
  state.done = [];
  persist();
  progress();
};
window.addEventListener("hashchange", render);
render();
