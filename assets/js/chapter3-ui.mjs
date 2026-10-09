import {
  $,
  $$,
  metrics,
  plot,
  question,
  wireQuestions,
  wireControls,
} from "./ui.mjs";
export const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export const num = (x, d = 3) =>
  x === null
    ? "Undefined"
    : x === Infinity
      ? "∞"
      : Number(Math.abs(x) < 0.5 * 10 ** -d ? 0 : x).toFixed(d);
export const get = (id, root = document) => +$("#" + id, root).value;
export function table(caption, headers, rows) {
  return `<div class="data-table" tabindex="0" role="region" aria-label="${escape(caption)}"><table><caption>${escape(caption)}</caption><thead><tr>${headers.map((h) => `<th scope="col">${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${escape(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}
export function graph(title, xLabel, yLabel, series) {
  const all = series.flatMap((s) => s.values.map((v) => v[1])),
    lo = Math.min(...all),
    hi = Math.max(...all),
    pad = Math.max((hi - lo) * 0.1, 0.1);
  return plot({
    title,
    xLabel,
    yLabel,
    xMax: Math.max(...series.flatMap((s) => s.values.map((v) => v[0])), 1),
    yMin: lo - pad,
    yMax: hi + pad,
    curves: series,
  });
}
export function header(section, title, learn, task) {
  return `<span class="eyebrow">Chapter 3 / ${section} · LEARN → EXPERIMENT → ANALYZE → AI CHALLENGE → VERIFY</span><h1>${title}</h1><p class="lead">${learn}</p><div class="scenario"><strong>Reference scenario / predict first</strong><p>${task}</p></div>`;
}
export function bench(title, controls) {
  return `<div class="bench"><div class="bench-head"><h2>${title} <small class="learning-badge core">CORE</small></h2><span>REFERENCE → EVIDENCE</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${controls}<div class="actions"><button id="lab-reset" type="button">Reset to defaults</button></div></div><div id="lab-results"></div></div></div></div>`;
}
export function ai(title, problem, checks, reflection) {
  return `<details class="explain ai-investigation"><summary>AI investigation / ${title} <small class="learning-badge explore">EXPLORE</small></summary><div class="ai-problem">${problem}</div><button type="button" id="ai-prepare">Prepare evidence prompt</button><label class="control" for="ai-prompt"><span>Optional prompt / works with any assistant</span><textarea id="ai-prompt" readonly>Prepare the prompt after inspecting the experiment.</textarea></label><p>No external AI service is called. You may instead critique this authored claim: “More averaging and stronger filtering always eliminate measurement error.”</p>${table(
    "Verification criteria",
    ["Required check", "Assessment criterion"],
    checks.map((c) => [
      c,
      "Support with a numerical result and physical assumptions.",
    ]),
  )}<label class="control" for="ai-suggestion"><span>AI suggestion or your own candidate explanation</span><textarea id="ai-suggestion"></textarea></label><label class="control" for="ai-evidence"><span>Verified numerical evidence / supporting and contradicting results</span><textarea id="ai-evidence"></textarea></label><label class="control" for="ai-reflection"><span>${reflection}</span><textarea id="ai-reflection"></textarea></label><button type="button" id="ai-notes">Download investigation notes</button><p class="note">Assessment is evidence-based. Free text is not automatically graded; agreement with an AI answer earns no credit. Notes reset when you leave this stage.</p></details>`;
}
export function finish(root, render, prompt) {
  const defaults = $$("input,select,textarea", root).map((el) => [
    el,
    el.value,
    el.checked,
  ]);
  $("#lab-reset", root).addEventListener("click", () => {
    defaults.forEach(([el, v, c]) => {
      el.value = v;
      el.checked = c;
    });
    $(".bench", root).dispatchEvent(new Event("labreset"));
    $("input", root)?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  wireControls($(".bench", root), render);
  wireQuestions(root);
  $("#ai-prepare", root).addEventListener("click", () => {
    $("#ai-prompt", root).value = `${prompt}\n\nCurrent controls:\n${$$(
      ".bench input,.bench select",
      root,
    )
      .map(
        (el) => `${el.id}: ${el.type === "checkbox" ? el.checked : el.value}`,
      )
      .join(
        "\n",
      )}\n\nNumerical evidence:\n${$("#lab-results", root).innerText}\n${$("#case-evidence", root)?.innerText || ""}\n\nSeparate plausible mechanisms from demonstrated causes. State units, model limits, and additional experiments. Do not equate error with uncertainty.`;
  });
  $("#ai-notes", root).addEventListener("click", () => {
    const text = ["ai-prompt", "ai-suggestion", "ai-evidence", "ai-reflection"]
      .map((id) => id + ":\n" + $("#" + id, root).value)
      .join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "chapter-03-investigation.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
export const check = (id, label, checked = true) =>
  `<label class="toggle" for="${id}"><input id="${id}" type="checkbox" ${checked ? "checked" : ""}>${label}</label>`;
export { metrics, question };
