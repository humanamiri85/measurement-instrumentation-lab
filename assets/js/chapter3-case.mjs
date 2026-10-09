import { $, $$, range, select } from "./ui.mjs";
import {
  aircraft,
  hypotheses,
  diagnosis,
  signalRun,
  spectrum,
  repeated,
  rng,
} from "./chapter3-models.mjs";
import { statistics } from "./models.mjs";
import {
  num,
  get,
  table,
  graph,
  header,
  bench,
  ai,
  finish,
  metrics,
  question,
} from "./chapter3-ui.mjs";
export function aircraftCase(root) {
  root.innerHTML =
    header(
      "Integrated investigation / LO1–LO10",
      "Pressure evidence before cockpit conclusions.",
      "Static and pitot transducers measure pressure directly. Pressure altitude and equivalent airspeed are inferred using standard-atmosphere and low-speed incompressible assumptions. Several faults can produce overlapping indication changes; select diagnostic experiments before choosing a correction.",
      "Four unknown synthetic cases contain one dominant mechanism each. Initial readings alone are incomplete evidence. Collect channel-reference checks, pressure sweeps, repeated readings, and a spectrum; then test a correction at separate flight conditions.",
    ) +
    `<div class="chain"><span>Static / total pressure</span>→<span>Sensor + temperature effects</span>→<span>Signal chain + interference</span>→<span>Derived altitude / equivalent airspeed</span></div>` +
    bench(
      "Aircraft Pitot-Static Error Investigation",
      select("case", "Unknown data run", [
        [0, "Run A"],
        [1, "Run B"],
        [2, "Run C"],
        [3, "Run D"],
      ]) +
        range("temperature", "Channel temperature", 20, 40, 1, 20, "°C") +
        select("experiment", "Diagnostic experiment", [
          ["reference", "Channel reference / temperature check"],
          ["sweep", "Multi-pressure calibration sweep"],
          ["repeat", "Repeated constant-pressure readings"],
          ["spectrum", "Time record and frequency spectrum"],
        ]) +
        `<div class="actions"><button id="collect-evidence">Collect diagnostic evidence</button></div>` +
        select(
          "hypothesis",
          "Most likely dominant mechanism",
          hypotheses.map((h, i) => [i, h]),
        ) +
        select("action", "Corrective action", [
          ["none", "No correction"],
          ["static", "Static offset + characterized temperature correction"],
          ["pitot", "Inverse pitot gain calibration"],
          ["average", "Average 100 independent readings"],
          ["shield", "Reduce induced coupling / shielding scenario"],
        ]) +
        `<div class="actions"><button id="validate">Test independent validation data</button><button id="review-case">Review diagnosis</button></div><p id="case-feedback" class="status" aria-live="polite">Collect evidence before identifying a cause.</p>`,
    ) +
    `<section id="case-evidence" aria-label="Collected diagnostic evidence"></section><h2>AI evidence matrix</h2><p>Record support, contradiction, and the experiment needed for every candidate. AI suggestions are unverified until checked. Absence of evidence is not evidence of absence.</p><div class="data-table evidence-table" role="region" aria-label="Aircraft hypothesis evidence matrix" tabindex="0"><table><caption>Student evidence matrix / scroll horizontally for all fields</caption><thead><tr>${["Hypothesis", "Supporting evidence", "Contradicting evidence", "Additional experiment", "AI suggestion", "Verified result", "Final decision"].map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead><tbody>${hypotheses.map((h, i) => `<tr><th scope="row">H${i + 1} · ${h}</th>${["support", "contradict", "additional", "ai"].map((k) => `<td><label class="sr-only" for="h${i}-${k}">${h}: ${k}</label><textarea id="h${i}-${k}"></textarea></td>`).join("")}<td id="verified-${i}">Additional experiment required</td><td><label class="sr-only" for="decision-${i}">${h}: final decision</label><select id="decision-${i}"><option value="additional">Additional experiment required</option><option value="supported">Supported</option><option value="unsupported">Not supported as dominant cause</option></select></td></tr>`).join("")}</tbody></table></div><label class="control" for="case-conclusion"><span>Your final engineering conclusion / quote data, assumptions, and remaining uncertainty</span><textarea id="case-conclusion"></textarea></label><button id="case-download">Download case evidence</button><p class="note">Written conclusions and matrix reasoning are for instructor/self review; they are not automatically graded. Other real-world faults may coexist.</p>` +
    question(
      "case-check",
      "Which quantity is directly sensed by these transducers?",
      [
        "Altitude",
        "Static and total pressure",
        "True weather-corrected altitude",
      ],
      1,
      "Altitude and equivalent speed are inferred from pressure using model assumptions.",
    ) +
    ai(
      "Synthesis — challenge the recommendation",
      "Use the offline evidence matrix, or ask an assistant which mechanism is most plausible. A recommendation without a discriminating experiment is incomplete.",
      [
        "Channel pressure evidence",
        "Matching corrective action",
        "Independent altitude/speed validation and residual limits",
      ],
      "Which alternative mechanism is still possible in a real aircraft?",
    );
  let experiments = [],
    validated = false,
    records = [];
  const reset = () => {
    experiments = [];
    validated = false;
    records = [];
    $("#case-evidence", root).innerHTML = "";
    $$("[id^=verified-]", root).forEach(
      (el) => (el.textContent = "Additional experiment required"),
    );
    $("#case-feedback", root).textContent =
      "Collect evidence before identifying a cause.";
    delete $("#case-feedback", root).dataset.state;
  };
  const render = () => {
    const c = get("case", root),
      rows = aircraft(c, false, "none", get("temperature", root)),
      validation = validated
        ? aircraft(c, true, $("#action", root).value, get("temperature", root))
        : null;
    $("#lab-results", root).innerHTML =
      table(
        "Initial investigation data / pressures in Pa",
        [
          "Reference altitude / m",
          "Reference speed / m/s",
          "Static indication / Pa",
          "Total indication / Pa",
          "Derived altitude / m",
          "Equivalent speed / m/s",
        ],
        rows.map((r) => [
          r.referenceAltitude,
          r.referenceSpeed,
          num(r.measuredStatic, 1),
          num(r.measuredTotal, 1),
          num(r.altitude, 1),
          r.speed === null ? "Invalid impact pressure" : num(r.speed, 2),
        ]),
      ) +
      graph(
        "Derived altitude error / initial conditions",
        "Condition index",
        "Altitude error / m",
        [
          {
            name: "Initial",
            values: rows.map((r, i) => [
              i + 1,
              r.altitude - r.referenceAltitude,
            ]),
          },
        ],
      ) +
      `<p class="note">Pressure altitude uses the standard troposphere; speed uses √(2(pt − ps)/1.225) in m/s. These low-speed equivalent-speed cases omit compressibility, weather, installation aerodynamics, and certification limits. Negative impact pressure is invalid. A single static sample cannot give VSI.</p>` +
      (validation
        ? table(
            "Independent corrected validation / separate heights and speeds",
            [
              "Reference altitude / m",
              "Reported altitude / m",
              "Altitude error / m",
              "Reference speed / m/s",
              "Reported speed / m/s",
              "Speed error / m/s",
            ],
            validation.map((r) => [
              r.referenceAltitude,
              num(r.altitude, 2),
              num(r.altitude - r.referenceAltitude, 2),
              r.referenceSpeed,
              r.speed === null ? "Invalid" : num(r.speed, 3),
              r.speed === null ? "Invalid" : num(r.speed - r.referenceSpeed, 3),
            ]),
          ) +
          metrics([
            [
              "Max validation altitude error",
              num(
                Math.max(
                  ...validation.map((r) =>
                    Math.abs(r.altitude - r.referenceAltitude),
                  ),
                ),
                2,
              ) + " m",
            ],
            [
              "Max validation speed error",
              validation.some((r) => r.speed === null)
                ? "Invalid pressure"
                : num(
                    Math.max(
                      ...validation.map((r) =>
                        Math.abs(r.speed - r.referenceSpeed),
                      ),
                    ),
                    3,
                  ) + " m/s",
            ],
          ]) +
          `<p class="observation">Validation uses heights 650, 1350, 2150 m and speeds 35, 55, 75 m/s, never used for diagnosis. Averaging uses 100 actual seeded independent draws and retains bias. Shielding uses an illustrative 90% coupling reduction; a remaining disturbance is expected.</p>`
        : "");
  };
  $("#case", root).addEventListener("input", reset);
  $("#temperature", root).addEventListener("input", reset);
  $("#action", root).addEventListener("input", () => {
    validated = false;
  });
  $(".bench", root).addEventListener("labreset", reset);
  $("#collect-evidence", root).addEventListener("click", () => {
    const c = get("case", root),
      e = $("#experiment", root).value,
      temp = get("temperature", root);
    if (!experiments.includes(e)) experiments.push(e);
    let content = "";
    if (e === "reference") {
      const offset = c === 0 ? 120 + 3 * (temp - 20) : 0;
      content =
        table(
          "Controlled static reference checks",
          ["Reference / Pa", "Mean indication / Pa", "Mean error / Pa"],
          [80000, 90000, 100000].map((x) => [
            x,
            num(x + offset, 1),
            num(offset, 1),
          ]),
        ) +
        `<p>Static zero check at 20°C: ${c === 0 ? "120" : "0"} Pa mean offset; at 40°C: ${c === 0 ? "180" : "0"} Pa. These synthetic mean checks suppress random pickup over repeated/cycle-balanced readings; finite real checks have uncertainty.</p>`;
    }
    if (e === "sweep")
      content =
        table(
          "Pitot channel / reference pressure sweep",
          ["Reference / Pa", "Mean indication / Pa", "Error / Pa"],
          [80000, 90000, 100000].map((x) => [
            x,
            num(x * (c === 1 ? 1.003 : 1), 1),
            num(c === 1 ? 0.003 * x : 0, 1),
          ]),
        ) +
        `<p>Endpoint slope: ${c === 1 ? "1.003" : "1.000"} Pa/Pa. Use multiple pressures to distinguish gain from offset; mean checks suppress random disturbance under this controlled model.</p>`;
    if (e === "repeat") {
      const sigma = c === 2 ? 25 : 0,
        r = repeated({
          reference: 90000,
          bias: c === 0 ? 120 + 3 * (temp - 20) : 0,
          sigma,
          n: 100,
          seed: 71,
        });
      if (c === 3) {
        const random = rng(71);
        r.values = Array.from(
          { length: 100 },
          () => 90000 + 80 * Math.sin(2 * Math.PI * random()),
        );
        Object.assign(r, statistics(r.values));
      }
      content =
        metrics([
          ["Static repeat mean", num(r.mean, 1) + " Pa"],
          ["Static sample SD", num(r.sd, 2) + " Pa"],
        ]) +
        graph(
          "Constant-pressure residual record",
          "Sample index",
          "Pressure residual / Pa",
          [
            {
              name: "Residual",
              values: r.values.map((v, i) => [i, v - 90000]),
            },
          ],
        ) +
        `<p>${c === 3 ? "These exploratory repetitions randomize pickup phase; they show scatter but do not distinguish electrical pickup from intrinsic random noise. Collect a timed spectrum." : "The repeated reference experiment reveals variability, not its unique physical cause. A timed record is needed to test periodic interference."}</p>`;
    }
    if (e === "spectrum") {
      const r = signalRun({
          amplitude: 0,
          sigma: c === 2 ? 25 : c === 3 ? 2 : 0,
          line: c === 3 ? 80 : 0,
          drift: 0,
          fs: 500,
          duration: 1,
        }),
        s = spectrum(r.measured, 500);
      content =
        graph(
          "Static-channel timed residual spectrum",
          "Frequency / Hz",
          "Peak pressure amplitude / Pa",
          [{ name: "Mean-removed Hann spectrum", values: s }],
        ) +
        `<p>One-second record at 500 samples/s, 1 Hz bins, Hann coherent-gain corrected peak amplitude. ${c === 3 ? "A strong ≈80 Pa peak at 50 Hz supports periodic interference; reducing induced coupling is a discriminating intervention." : "No coherent 50 Hz component is built into this run. Broadband scatter, if present, does not uniquely identify its physical source."} A missing peak does not rule out all electrical noise.</p>`;
    }
    const record = `<div class="observation"><h3>${$("#experiment", root).selectedOptions[0].textContent}</h3>${content}</div>`;
    records.push(record);
    $("#case-evidence", root).innerHTML = records.join("");
    const needed = ["reference", "sweep", "repeat", "spectrum"];
    needed.forEach((ex, i) => {
      $("#verified-" + i, root).textContent = experiments.includes(ex)
        ? i === c
          ? i === 2 && !experiments.includes("spectrum")
            ? "Scatter supported; timed spectrum still needed to exclude periodic pickup."
            : "Diagnostic evidence supports this mechanism in the synthetic case."
          : "Diagnostic evidence does not support this as the dominant modeled cause."
        : "Additional experiment required";
    });
    render();
  });
  $("#validate", root).addEventListener("click", () => {
    validated = true;
    render();
  });
  $("#review-case", root).addEventListener("click", () => {
    const c = get("case", root);
    const needed =
      c === 2
        ? [
            ...experiments.filter((e) => e !== "repeat"),
            ...(experiments.includes("repeat") &&
            experiments.includes("spectrum")
              ? ["repeat"]
              : []),
          ]
        : experiments;
    const r = diagnosis(
      c,
      get("hypothesis", root),
      needed,
      $("#action", root).value,
      validated,
    );
    $("#case-feedback", root).textContent = r.message;
    $("#case-feedback", root).dataset.state = r.state;
  });
  $("#case-download", root).addEventListener("click", () => {
    const text = `Aircraft investigation\nRun ${get("case", root) + 1}\nTemperature ${get("temperature", root)} °C\nExperiments: ${experiments.join(", ")}\n${$("#case-evidence", root).innerText}\n${$("#lab-results", root).innerText}\nEvidence matrix:\n${hypotheses.map((h, i) => h + "\n" + ["support", "contradict", "additional", "ai"].map((k) => k + ": " + $("#h" + i + "-" + k, root).value).join("\n") + "\nVerified: " + $("#verified-" + i, root).textContent + "\nDecision: " + $("#decision-" + i, root).selectedOptions[0].textContent).join("\n\n")}\nConclusion: ${$("#case-conclusion", root).value}`;
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "chapter-03-aircraft-evidence.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  finish(
    root,
    render,
    "Investigate the pressure chain using the collected aircraft diagnostic evidence and matrix. Do not recommend a correction solely from initial cockpit symptoms.",
  );
}
