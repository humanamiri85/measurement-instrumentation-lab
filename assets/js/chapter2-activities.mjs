import {
  badge,
  tagBench,
  failureDiagnosis,
  evidenceHypotheses,
  evidenceOptions,
  reviewEvidence,
} from "./chapter2-polish.mjs";
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
import {
  standardPressure,
  pressureAltitude,
  airData,
  aiDataset,
  fitLine,
} from "./chapter2-models.mjs";
export function measurementBridge(root) {
  const steps = [
    [
      "Atmospheric state",
      "Desired information",
      "Altitude is the desired information. Pressure is the quantity directly sensed; deriving altitude requires an atmospheric model and a pressure reference.",
    ],
    [
      "Static pressure",
      "Direct measurand",
      "The directly measured physical quantity is static pressure. The aircraft static port samples it. Installation or flow errors can affect the pressure before any electrical instrument sees it.",
    ],
    [
      "Sensing diaphragm",
      "Sensing element",
      "Pressure difference deforms a diaphragm. This mechanical response is the primary sensing action.",
    ],
    [
      "Powered bridge",
      "Transducer",
      "A strain-sensitive bridge converts diaphragm deformation into a voltage. An external supply provides the electrical output energy. Sensor and transducer functions may share one package.",
    ],
    [
      "Conditioning",
      "Signal conditioning",
      "Excitation, amplification, filtering, and protection prepare the small electrical signal for acquisition.",
    ],
    [
      "ADC + processor",
      "Acquisition and processing",
      "The ADC samples and quantizes voltage; the processor applies the pressure calibration. ADC resolution is one limit, not an accuracy guarantee.",
    ],
    [
      "Pressure-altitude calculation",
      "Inferred information",
      "A standard-atmosphere calculation infers pressure altitude from calibrated static pressure. Altitude is not directly sensed by this pressure instrument.",
    ],
    [
      "Cockpit display",
      "Output",
      "The result is displayed as pressure altitude. Pilots may instead use an altimeter setting to obtain indicated altitude; weather and temperature affect the relationship with true altitude.",
    ],
  ];
  root.innerHTML = `<section class="bench" aria-labelledby="bridge-title"><div class="bench-head"><h2 id="bridge-title">From physical quantity to information</h2><span>A1 / MEASUREMENT CHAIN</span></div><div class="bench-body"><p><strong>Desired information: altitude.</strong><br><strong>Directly measured physical quantity (direct measurand): static pressure.</strong></p><p>Some engineering quantities are inferred from a different directly measured quantity. A static-pressure instrument does not sense “altitude” directly. Follow the conversion from the atmosphere to a cockpit indication.</p>${range("bridge-altitude", "Standard-atmosphere altitude", 0, 3000, 100, 1000, "m")}<div class="chain-steps" role="group" aria-label="Explore measurement-chain elements">${steps.map(([name], i) => `<button data-chain-step="${i}" aria-pressed="${i === 0}">${i + 1}. ${name}</button>`).join("")}</div><div id="bridge-reading"></div><div class="observation" id="bridge-description" aria-live="polite"></div><p class="note">This compact conceptual bridge uses an ideal standard troposphere. It is not a navigation instrument or a weather correction model.</p><a class="button" href="#types/signal">Explore the existing Measurement Chain activity →</a></div></section>`;
  tagBench(root, "CORE");
  let selected = 0;
  function update() {
    const h = +$("#bridge-altitude", root).value,
      p = standardPressure(h);
    $("#bridge-reading", root).innerHTML = metrics([
      ["Atmospheric altitude", `${fmt(h, 0)} m`],
      ["Static pressure", `${fmt(p / 100, 2)} hPa`],
      ["Calculated pressure altitude", `${fmt(pressureAltitude(p), 0)} m`],
    ]);
    const s = steps[selected];
    $("#bridge-description", root).innerHTML =
      `<strong>${s[1]}</strong><br>${s[2]}`;
  }
  $$("[data-chain-step]", root).forEach((b) =>
    b.addEventListener("click", () => {
      selected = +b.dataset.chainStep;
      $$("[data-chain-step]", root).forEach((x) =>
        x.setAttribute("aria-pressed", String(x === b)),
      );
      update();
    }),
  );
  wireControls(root, update);
}
export function accuracyTarget(values, bias) {
  return `<figure class="target-sketch"><figcaption>Target sketch / reference at the center</figcaption><svg viewBox="0 0 320 220" role="img" aria-label="Repeated pressure readings relative to the reference. Bias moves the group away from center; scatter broadens it. Vertical spacing only separates readings."><g fill="none" stroke="var(--line)">${[25, 50, 75, 100].map((r) => `<circle cx="160" cy="105" r="${r}"/>`).join("")}<path d="M45 105H275 M160 5V205"/></g><circle cx="160" cy="105" r="4" fill="var(--ink)"/>${values.map((v, i) => `<circle cx="${160 + (v - 5) * 55}" cy="${90 + (i % 5) * 8}" r="4" fill="var(--accent)" stroke="white"/>`).join("")}<text x="160" y="218" text-anchor="middle">Horizontal displacement = pressure error</text></svg><p class="note">Vertical spacing separates readings; it is not another measured quantity. Bias: ${fmt(bias)} bar.</p></figure>`;
}
export function aerospaceCase(root) {
  root.innerHTML = `<span class="eyebrow">Aerospace integration / Pitot-static system</span><h2>One air-data chain, several failure modes.</h2><p>A pitot port samples total pressure; static ports sample ambient static pressure. A differential transducer measures impact pressure. The air-data computer turns calibrated signals into flight-deck information.</p><div class="chain"><span>Pitot + static ports</span><b aria-hidden="true">→</b><span>Pressure diaphragms + powered transducers</span><b aria-hidden="true">→</b><span>Conditioning + ADC</span><b aria-hidden="true">→</b><span>Air-data processor</span><b aria-hidden="true">→</b><span>Airspeed / altitude / VSI</span></div><div class="bench"><div class="bench-head"><h3>Investigate a static-pressure bias</h3><span>LOW-SPEED TEACHING CASE</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${range("air-altitude", "Standard pressure altitude", 0, 3000, 100, 1000, "m")}${range("air-speed", "Equivalent airspeed", 0, 100, 1, 60, "m/s")}${range("air-bias", "Static-channel zero bias", -300, 300, 10, 0, "Pa")}<p class="note">The total-pressure channel is unbiased. A bias added to the static channel affects both altitude and the pressure difference used for speed.</p></div><div id="air-result"></div></div></div></div>${question("air-sensor", "Where does the first physical sensing action occur?", ["At the port/pressure-sensitive diaphragm", "Inside the cockpit display", "Only in the AI processor"], 0, "The ports sample pressure; the diaphragm responds mechanically. The transducer converts that response to an electrical signal. Functions can be integrated in one sensor package.")}${question("air-resolution", "What sets the complete chain’s usable resolution?", ["Only the number of display digits", "Sensor noise, conditioning, ADC steps, and display/processing limits"], 1, "Several elements limit distinguishable input changes. ADC quantization is only one contributor; resolution does not establish accuracy.")}${question("air-dynamics", "A pressure channel responds too slowly during a rapid climb. What can happen?", ["Altitude and rate indications lag the actual change", "The static calibration automatically corrects all lag"], 0, "Even a correctly calibrated channel can lag a transient. VSI requires a time-dependent pressure/altitude estimate; filtering and differentiation introduce additional dynamic tradeoffs.")}${question("air-calibration", "Where should calibration and verification enter the chain?", ["Only check that the display powers on", "Compare applied reference pressures through the installed measurement chain"], 1, "Pressure-reference checks identify channel offset and scale errors. End-to-end verification also considers acquisition, processing, installation effects, and operating conditions.")}<details class="explain"><summary>Interpret airspeed, altitude, and vertical speed</summary><p>The displayed speed here is an ideal low-speed equivalent airspeed: V = √[2(pₜ − pₛ)/ρ₀], with ρ₀ = 1.225 kg/m³. It is not a compressible-flow true-airspeed model; true airspeed also depends on air density. Altitude uses a standard-atmosphere pressure relation with 101325 Pa as the datum.</p><p>VSI is derived from the rate of pressure/altitude change and needs time history. This steady-state case does not invent a VSI value from one sample. Block C supplies the response-lag experiment.</p></details><div class="actions"><a class="button" href="#types/signal">Open the existing Measurement Chain</a><a class="button" href="#dynamic">Investigate response lag</a></div>`;
  wireControls(root, () => {
    const h = +$("#air-altitude", root).value,
      v = +$("#air-speed", root).value,
      b = +$("#air-bias", root).value,
      ps = standardPressure(h),
      pt = ps + 0.5 * 1.225 * v * v,
      data = airData(ps + b, pt);
    $("#air-result", root).innerHTML =
      metrics([
        ["True static pressure", `${fmt(ps / 100, 2)} hPa`],
        ["Total pressure", `${fmt(pt / 100, 2)} hPa`],
        ["Measured impact pressure", `${fmt(data.impact, 1)} Pa`],
        ["Reported pressure altitude", `${fmt(data.altitude, 1)} m`],
        [
          "Reported equivalent speed",
          data.equivalentSpeed === null
            ? "Invalid: pₜ < pₛ"
            : `${fmt(data.equivalentSpeed, 1)} m/s`,
        ],
        [
          "Altitude indication error",
          `${fmt(Math.abs(data.altitude - h) < 1e-8 ? 0 : data.altitude - h, 1)} m`,
        ],
      ]) +
      `<p class="observation">${data.impact < 0 ? "The measured pressure difference is negative: this simplified physical model cannot infer a real speed. Investigate channel bias or a faulty pressure connection." : b === 0 ? "With no channel bias, the ideal pressure-altitude and speed values agree with the inputs." : b > 0 ? "A positive static-pressure bias makes calculated altitude lower and the inferred speed smaller." : "A negative static-pressure bias makes calculated altitude higher and the inferred speed larger."} Calibration should check both channels, not just the final display.</p>`;
  });
  tagBench(root, "CORE");
  root.insertAdjacentHTML("beforeend", '<div id="failure-diagnosis"></div>');
  failureDiagnosis($("#failure-diagnosis", root));
  wireQuestions(root);
}
export function aiChallenge(root) {
  root.innerHTML = `<span class="eyebrow">Independent evidence / AI Engineering Challenge</span><h2>AI is an assistant, not the measurement authority. ${badge("EXPLORE")}</h2><p>Inspect six synthetic steady-state pressure readings before consulting an AI assistant. Then challenge its explanation using numbers and physical reasoning. No external API or account is needed for the built-in review.</p><div class="data-table" tabindex="0" role="region" aria-label="Synthetic calibration dataset"><table><caption>Synthetic calibration data / one increasing-pressure run</caption><thead><tr><th>Reference / kPa</th><th>Measured / kPa</th><th>Error / kPa</th></tr></thead><tbody>${aiDataset.map((r) => `<tr><td>${r.reference}</td><td>${r.measured.toFixed(1)}</td><td>${fmt(r.measured - r.reference, 1)}</td></tr>`).join("")}</tbody></table></div>${plot({ title: "Inspect the data before fitting", xLabel: "Reference pressure / kPa", yLabel: "Measured pressure / kPa", xMax: 100, yMax: 110, curves: [{ name: "Ideal", fn: (x) => x, dashed: true }], points: aiDataset.map((r) => ({ x: r.reference, y: r.measured })) })}<label for="ai-prediction"><strong>1. Your independent diagnosis</strong></label><textarea id="ai-prediction" placeholder="Look at zero, high-end error, and scatter. What can and cannot be inferred?"></textarea><div class="actions"><button id="ai-copy" type="button">Prepare dataset prompt</button><button id="ai-reference" type="button">Reveal numerical reference analysis</button></div><label class="sr-only" for="ai-prompt">Prompt to use with an optional AI assistant</label><textarea id="ai-prompt" readonly hidden></textarea><p id="ai-prompt-status" class="note" aria-live="polite"></p><div id="ai-analysis" aria-live="polite"></div><h3 style="margin-top:24px">2. Critically evaluate an answer</h3><p class="note">Use an assistant of your choice, or inspect the deliberately flawed sample below. The sample is authored teaching material, not a live AI response.</p><blockquote class="observation">“The increasing error proves hysteresis. Subtracting exactly 2 kPa makes every reading accurate, and the sensor must respond slowly.”</blockquote><label for="ai-response"><strong>Optional: paste the AI answer you received</strong></label><textarea id="ai-response" placeholder="Pasted text stays in this page and is never submitted."></textarea><fieldset class="question"><legend>Evidence matrix / classify each hypothesis</legend><div class="evidence-matrix">${evidenceHypotheses.map((h) => select("ai-" + h.id, h.name, evidenceOptions)).join("")}</div><p class="note">Separate what the current data support from what still needs testing. Absence of evidence is not evidence of absence.</p></fieldset><label for="ai-conclusion"><strong>3. Your final evidence-based conclusion</strong></label><textarea id="ai-conclusion" placeholder="Quote a numerical estimate and propose the next measurement needed to test an uncertain claim."></textarea><div class="actions"><button class="primary" id="ai-review" type="button">Review the evidence</button><button id="ai-download" type="button">Download learning notes</button></div><div id="ai-feedback" aria-live="polite"></div>`;
  $("#ai-copy", root).addEventListener("click", () => {
    const text =
      "Independently analyze this synthetic steady-state calibration dataset (reference_kPa, measured_kPa):\n" +
      aiDataset.map((r) => `${r.reference},${r.measured}`).join("\n") +
      "\nEstimate zero offset and scale factor, inspect residuals, and distinguish supported findings from claims that require repeat, unloading, or timed data. Explain error versus uncertainty. Do not assume hysteresis or dynamics from a single increasing steady-state run.";
    const box = $("#ai-prompt", root);
    box.hidden = false;
    box.value = text;
    box.focus();
    box.select();
    $("#ai-prompt-status", root).textContent =
      "Prompt ready. Copy it if you want an independent AI analysis; the built-in review also works offline.";
  });
  $("#ai-reference", root).addEventListener("click", () => {
    const f = fitLine(aiDataset);
    $("#ai-analysis", root).innerHTML =
      metrics([
        ["Fitted zero offset", `${fmt(f.offset, 3)} kPa`],
        ["Fitted slope", `${fmt(f.slope, 5)} kPa/kPa`],
        ["Scale departure", `${fmt((f.slope - 1) * 100, 2)}%`],
        [
          "Maximum absolute residual",
          `${fmt(Math.max(...f.residuals.map(Math.abs)), 3)} kPa`,
        ],
      ]) +
      `<p class="observation">A line fit suggests offset and scale error. Residuals describe departure from that line; this one run cannot establish repeatability, uncertainty, hysteresis, or response speed. Zero-only correction leaves a high-end error.</p>`;
  });
  $("#ai-review", root).addEventListener("click", () => {
    const classifications = Object.fromEntries(
      evidenceHypotheses.map((h) => [h.id, $("#ai-" + h.id, root).value]),
    );
    const evidence = reviewEvidence(classifications),
      supported = evidence.every((h) => h.correct);
    const conclusion = $("#ai-conclusion", root).value.trim();
    $("#ai-feedback", root).innerHTML =
      `<div class="observation"><strong>${supported ? "Your selected evidence is consistent with the data." : "Revisit what these measurements can establish."}</strong><p>The reference fit gives about 2.0 kPa offset and 1.02 kPa/kPa slope. Estimating uncertainty also requires repeated observations and a reference assessment.</p><p>${conclusion.length >= 40 ? "Compare your conclusion with these numerical checks. Your writing is retained but is not automatically graded." : "Write a fuller conclusion with a numerical estimate and a proposed verification measurement."} An AI answer must earn trust through evidence, not fluent wording.</p><ul class="evidence-feedback">${evidence.map((h) => `<li><strong>${h.name}: ${h.correct ? "Correct classification" : "Revisit classification"}.</strong> ${h.reason}</li>`).join("")}</ul><p><strong>Absence of evidence is not evidence of absence.</strong> Additional measurements are needed before concluding that hysteresis or lag is absent.</p></div>`;
  });
  $("#ai-download", root).addEventListener("click", () => {
    const text = `AI Engineering Challenge\n\nDataset (reference_kPa,measured_kPa)\n${aiDataset.map((r) => `${r.reference},${r.measured}`).join("\n")}\n\nIndependent diagnosis:\n${$("#ai-prediction", root).value}\n\nAI answer:\n${$("#ai-response", root).value}\n\nEvidence matrix:\n${evidenceHypotheses.map((h) => h.name + ": " + $("#ai-" + h.id, root).selectedOptions[0].textContent).join("\n")}\n\nFinal conclusion:\n${$("#ai-conclusion", root).value}\n`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" })),
      a = document.createElement("a");
    a.href = url;
    a.download = "chapter-02-ai-evidence.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}
