export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [
  ...root.querySelectorAll(selector),
];
export const fmt = (x, digits = 2) => Number(x).toFixed(digits);
export function range(id, label, min, max, step, value, unit = "") {
  return `<label class="control" for="${id}"><span>${label}<output id="${id}-value" for="${id}">${value} ${unit}</output></span><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-unit="${unit}"></label>`;
}
export function select(id, label, options) {
  return `<label class="control" for="${id}"><span>${label}</span><select id="${id}">${options.map(([value, text]) => `<option value="${value}">${text}</option>`).join("")}</select></label>`;
}
export function metrics(items) {
  return `<div class="metrics">${items.map(([name, value]) => `<div><span>${name}</span><strong>${value}</strong></div>`).join("")}</div>`;
}
export function plot({
  title,
  xLabel,
  yLabel,
  xMax = 10,
  yMin = 0,
  yMax = 10,
  curves = [],
  points = [],
  markers = [],
}) {
  const W = 640,
    H = 330,
    L = 90,
    R = 24,
    T = 32,
    B = 64;
  const X = (x) => L + (x / xMax) * (W - L - R),
    Y = (y) => H - B - ((y - yMin) / (yMax - yMin)) * (H - T - B);
  let body = "";
  for (let i = 0; i <= 5; i++) {
    const x = (xMax * i) / 5,
      y = yMin + ((yMax - yMin) * i) / 5;
    body += `<path class="gridline" d="M${X(x)},${T}V${H - B} M${L},${Y(y)}H${W - R}"/><text x="${X(x)}" y="${H - B + 22}" text-anchor="middle">${+x.toFixed(2)}</text><text x="${L - 9}" y="${Y(y) + 4}" text-anchor="end">${+y.toFixed(2)}</text>`;
  }
  const legend = curves
    .map(
      (c, i) =>
        `<span><i style="--legend-color:var(--curve-${i % 4});background:var(--curve-${i % 4})" class="${c.dashed ? "dashed" : i > 0 ? "pattern-" + i : ""}"></i>${c.name}</span>`,
    )
    .join("");
  curves.forEach((curve, i) => {
    const values =
      curve.values ||
      Array.from({ length: 201 }, (_, n) => {
        const x = (xMax * n) / 200;
        return [x, curve.fn(x)];
      });
    body += `<path class="curve curve-${i % 4}" ${curve.dashed ? 'stroke-dasharray="7 5"' : i > 0 ? `stroke-dasharray="${i === 1 ? "4 2" : i === 2 ? "2 3" : "8 3 2 3"}"` : ""} d="${values.map(([x, y], n) => `${n ? "L" : "M"}${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(" ")}"/>`;
  });
  points.forEach((p) => {
    body += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="${p.color || "var(--accent)"}" stroke="white" stroke-width="1.5"/>`;
  });
  markers.forEach((m) => {
    body += `<path class="marker" d="M${X(m.x)},${T}V${H - B}"/><text class="annotation" x="${Math.min(X(m.x) + 7, W - 140)}" y="${T + 15}">${m.label}</text>`;
  });
  return `<figure class="plot"><figcaption>${title}</figcaption><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}. Horizontal axis: ${xLabel}; vertical axis: ${yLabel}. Read the numerical results and explanation below the plot.">${body}<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">${xLabel}</text><text transform="translate(16,${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${yLabel}</text></svg><div class="legend">${legend}</div></figure>`;
}
export function gauge(value, max = 10, label = "Pressure") {
  const angle = -135 + Math.min(1, Math.max(0, value / max)) * 270;
  return `<figure class="gauge"><svg viewBox="0 0 240 185" role="img" aria-label="${label}: ${fmt(value)} of ${max}"><circle cx="120" cy="100" r="77" class="gauge-face"/><path d="M66 154 A77 77 0 1 1 174 154" class="gauge-arc"/><g transform="rotate(${angle},120,100)"><path d="M120 110 V38" class="needle"/></g><circle cx="120" cy="100" r="7" fill="var(--ink)"/><text x="55" y="164">0</text><text x="169" y="164">${max}</text><text x="120" y="130" text-anchor="middle">${label}</text></svg><figcaption>${fmt(value)} bar</figcaption></figure>`;
}
export function wireControls(root, update) {
  const refresh = () => {
    $$("input[type=range]", root).forEach((input) => {
      const output = $(`#${input.id}-value`, root);
      if (output)
        output.textContent = `${input.value} ${input.dataset.unit || ""}`;
    });
    update();
  };
  $$("input, select", root).forEach((input) =>
    input.addEventListener("input", refresh),
  );
  refresh();
}
export function question(id, prompt, choices, correct, explanation) {
  return `<fieldset class="question" data-question="${id}" data-correct="${correct}"><legend>${prompt}</legend><div class="choices">${choices.map((text, i) => `<button type="button" data-choice="${i}" aria-pressed="false">${text}</button>`).join("")}</div><p class="feedback" aria-live="polite" data-explanation="${explanation}">Choose an answer, then compare it with your observations.</p></fieldset>`;
}
export function wireQuestions(root) {
  $$("[data-question]", root).forEach((field) =>
    $$("[data-choice]", field).forEach((button) =>
      button.addEventListener("click", () => {
        $$("[data-choice]", field).forEach((b) =>
          b.setAttribute("aria-pressed", String(b === button)),
        );
        const correct = button.dataset.choice === field.dataset.correct;
        $(".feedback", field).textContent =
          `${correct ? "Correct." : "Reconsider."} ${$(".feedback", field).dataset.explanation}`;
        field.dataset.answered = String(correct);
      }),
    ),
  );
}
