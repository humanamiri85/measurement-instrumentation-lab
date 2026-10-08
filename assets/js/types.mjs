import {
  $,
  $$,
  range,
  select,
  metrics,
  fmt,
  plot,
  gauge,
  wireControls,
  question,
  wireQuestions,
} from "./ui.mjs";
import { quantize } from "./models.mjs";
import { sampledSignal } from "./chapter2-models.mjs";
import { measurementBridge } from "./chapter2-activities.mjs";
export function introduction(root) {
  root.innerHTML = `<span class="eyebrow">Block A / 2.1 · Physical quantity to information</span><h1>Two instruments.<br>One pressure line.</h1><p class="lead">A small process line normally runs at 1 bar. A display shows 1.00 bar. Is that enough evidence to trust the reading?</p><div id="intro-bridge"></div><div class="scenario"><strong>Your assignment</strong><p>Monitor pressures from 0.8 to 1.2 bar, detect a 0.04 bar change, and report a reading within 0.05 bar after a change. Choose what you would investigate first.</p></div><div class="two-col"><article class="info-card"><span class="eyebrow">Instrument A</span><h3 style="margin-top:12px">A rugged mechanical gauge</h3><p>0–10 bar · ±1% full scale · 0.2 bar scale divisions · local pointer · no external power</p></article><article class="info-card"><span class="eyebrow">Instrument B</span><h3 style="margin-top:12px">A process transmitter</h3><p>0–2 bar · ±1% full scale · 0.01 bar display step · powered signal output · time constant 0.15 s</p></article></div>${question("intro-choice", "Predict: which instrument deserves a closer look for this job?", ["A: a wide range makes it safer", "B: a closer range and finer steps", "Either: both measure pressure"], 1, "B is a better starting point: its full-scale error is ±0.02 bar, versus ±0.10 bar for A. You must still check speed, operating limits, drift, and calibration. A label saying “1%” is incomplete without its basis.")}<div class="observation"><strong>The question throughout this chapter:</strong> What does this instrument let you conclude, and what might it hide?</div><details class="explain"><summary>After your prediction: the two sides of instrument selection</summary><p><strong>Type</strong> tells you how energy enters, how the measurement is obtained, and how the result reaches the user or controller. <strong>Performance</strong> tells you how close, stable, fine, and fast that result can be. Static characteristics apply after settling; dynamic characteristics describe the journey to that reading.</p></details>`;
  measurementBridge($("#intro-bridge", root));
  wireQuestions(root);
}
const tabs = [
  ["energy", "Energy source"],
  ["balance", "Balance or deflect"],
  ["digital", "Analog & digital"],
  ["signal", "Indicate or transmit"],
  ["smart", "Smart instruments"],
];
export function instrumentTypes(root, initialMode = "energy") {
  root.innerHTML = `<span class="eyebrow">Block A / 2.2 · How instruments work</span><h1>Follow the measurement.</h1><p class="lead">A single instrument belongs to several classifications at once. Explore one distinction at a time; do not infer accuracy from a digital display or a “smart” label.</p><div class="tabs" role="group" aria-label="Instrument classification experiments">${tabs.map(([id, label], i) => `<button data-type="${id}" aria-pressed="${i === 0}">${label}</button>`).join("")}</div><div id="type-panel"></div>`;
  const panel = $("#type-panel", root);
  function show(mode) {
    $$("[data-type]", root).forEach((b) =>
      b.setAttribute("aria-pressed", String(b.dataset.type === mode)),
    );
    if (mode === "energy") {
      panel.innerHTML = `<div class="two-col"><article class="info-card"><h3>Active instrument</h3><p>The measurand modulates externally supplied energy. A fuel-tank float moves a powered potentiometer; the electrical output energy comes from its supply.</p></article><article class="info-card"><h3>Passive instrument</h3><p>The measured quantity supplies the output energy. Pressure deforms a Bourdon tube and moves a mechanical gauge pointer without an external supply.</p></article></div><div class="scenario"><strong>A remote tank needs a level measurement.</strong><p>Predict what happens to the electrical output if the supply is switched off. Then change the level and supply voltage.</p></div><div class="bench"><div class="bench-head"><h2>Energy-path bench</h2><span>PASSIVE / ACTIVE</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${range("level", "Tank level", 0, 100, 1, 50, "%")}${range("supply", "External supply", 0, 12, 0.5, 5, "V")}<p class="note">A float moves an ideal potentiometer; output voltage is supply × level fraction.</p></div><div id="energy-result"></div></div></div></div>${question("energy-q", "The powered float/potentiometer system is…", ["Active: level modulates external energy", "Passive: the float moves by itself"], 0, "Here the output signal energy comes from an external supply. A mechanical pressure gauge is passive in this chapter’s terminology because measurand energy moves its pointer. These terms can be reversed in other sensor conventions; always identify the energy path.")}<details class="explain"><summary>Explain the tradeoff</summary><p>Simple passive indicators often cost less and work without a power supply. External energy in an active instrument creates opportunities to amplify or condition small signals and improve usable resolution. More supply voltage does not grant unlimited resolution: noise, heating, safety limits, and conversion steps still matter.</p></details>`;
      wireControls(panel, () => {
        const level = +$("#level", panel).value,
          supply = +$("#supply", panel).value;
        $("#energy-result", panel).innerHTML =
          `<div class="chain"><span>Level: ${level}%</span><b aria-hidden="true">→</b><span>Float + potentiometer</span><b aria-hidden="true">→</b><span>${fmt((supply * level) / 100)} V output</span></div>${metrics(
            [
              ["External energy", `${fmt(supply, 1)} V`],
              ["Output", `${fmt((supply * level) / 100)} V`],
            ],
          )}<div class="observation">${supply === 0 ? "With no supply, every level produces 0 V: the electrical output cannot distinguish levels." : "Changing the level modulates the supply. Higher supply increases voltage change per unit level."}<br>A passive pressure gauge instead follows: <strong>fluid pressure → mechanical motion → pointer</strong>.</div>`;
      });
    }
    if (mode === "balance") {
      panel.innerHTML = `<div class="scenario"><strong>You need a pressure reference for calibration.</strong><p>A pointer is convenient. A balance takes more effort. Move the dead weights until the pressure force is balanced.</p></div><div class="bench"><div class="bench-head"><h2>Dead-weight balance</h2><span>F = pA = mg</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${range("balance-pressure", "Applied pressure", 0.5, 5, 0.1, 2, "bar")}${range("mass", "Added mass", 0, 6, 0.01, 1, "kg")}<p class="note">Piston area 1 cm². Standard gravity 9.81 m/s². Friction and buoyancy are omitted.</p></div><div id="balance-result"></div></div></div></div>${question("balance-q", "Which pairing is most sensible?", ["Deflection for calibration; null for routine monitoring", "Deflection for routine monitoring; null for calibration"], 1, "A deflection gauge gives a quick reading. A null measurement compares pressure force with known weights at balance and can provide high accuracy when the masses, piston area, and corrections are well characterized. Null does not guarantee perfect accuracy.")}<details class="explain"><summary>Explain what the null point means</summary><p>A null method restores a reference condition, such as zero net force. The unknown is inferred from the known balancing quantity. A deflection method infers the unknown from the movement it causes, relying on a calibrated response. Calibration standards reward careful balance; routine monitoring rewards convenience.</p></details>`;
      wireControls(panel, () => {
        const p = +$("#balance-pressure", panel).value,
          m = +$("#mass", panel).value,
          weight = m * 9.81,
          force = p * 10,
          diff = force - weight;
        $("#balance-result", panel).innerHTML =
          `<div class="two-col">${gauge(p, 5)}<div><h3>Null detector</h3><div class="digital">${Math.abs(diff) < 0.06 ? "BALANCED" : diff > 0 ? "↑ RISE" : "↓ FALL"}</div><p class="note">${Math.abs(diff) < 0.06 ? "Net force is within this display’s ±0.06 N balance window." : "Add or remove weights to reach balance."}</p></div></div>${metrics(
            [
              ["Pressure force", `${fmt(force)} N`],
              ["Weight force", `${fmt(weight)} N`],
              ["Net force", `${fmt(diff)} N`],
              ["Pressure from mass", `${fmt(weight / 10, 3)} bar`],
            ],
          )}<p class="observation">At balance, ${fmt((p * 10) / 9.81, 3)} kg is required. The pointer above is a direct deflection indication of the same pressure.</p>`;
      });
    }
    if (mode === "digital") {
      panel.innerHTML = `<div class="scenario"><strong>A stable process seems to jump between readings.</strong><p>Predict whether this is process noise or a digital step. Move the continuous input slowly across a rounding boundary.</p></div><div class="bench"><div class="bench-head"><h2>One input, two representations</h2><span>CONTINUOUS / DISCRETE</span></div><div class="bench-body"><div class="bench-grid"><div class="controls">${range("analog-input", "Continuous input", 0, 10, 0.01, 4.23, "bar")}${select(
        "digital-step",
        "Digital resolution",
        [
          ["1", "1 bar"],
          ["0.5", "0.5 bar"],
          ["0.1", "0.1 bar"],
          ["0.01", "0.01 bar"],
        ],
      )}${range("sample-interval", "Sampling interval", 0.1, 1, 0.05, 0.25, "s")}</div><div id="digital-result"></div></div></div></div><div id="sampling-result"></div><details class="explain"><summary>Explain why more digits are not more accuracy</summary><p>A digital output has discrete representable values. In this ideal nearest-step model, rounding error is at most half a step. An analog indication changes continuously, but a person can only resolve a finite number of pointer positions. Neither representation alone tells you the calibration error.</p></details>`;
      wireControls(panel, () => {
        const input = +$("#analog-input", panel).value,
          step = +$("#digital-step", panel).value,
          out = quantize(input, step);
        $("#digital-result", panel).innerHTML =
          `<div class="two-col">${gauge(input)}<div><h3>Digital indication</h3><div class="digital">${fmt(out, step >= 1 ? 0 : step >= 0.1 ? 1 : 2)} bar</div><p class="note">Input: ${fmt(input)} bar · rounding error: ${fmt(out - input, 3)} bar</p></div></div>${plot(
            {
              title: "Continuous input vs quantized output",
              xLabel: "Input / bar",
              yLabel: "Output / bar",
              curves: [
                { name: "Analog (ideal)", fn: (x) => x, dashed: true },
                { name: "Digital steps", fn: (x) => quantize(x, step) },
              ],
              points: [{ x: input, y: out }],
            },
          )}`;
        const interval = +$("#sample-interval", panel).value;
        const trace = sampledSignal(interval, step);
        $("#sampling-result", panel).innerHTML =
          plot({
            title: "Continuous, sampled, and quantized pressure",
            xLabel: "Time / s",
            yLabel: "Pressure / bar",
            xMax: 4,
            yMax: 10,
            curves: [
              { name: "Continuous signal", fn: trace.signal },
              {
                name: "Sample-and-hold digital value",
                values: trace.held,
              },
            ],
            points: trace.samples.map((s) => ({ x: s.t, y: s.analog })),
          }) +
          `<p class="observation">Dots show analog values sampled every ${fmt(interval)} s (${fmt(1 / interval, 1)} samples/s). The held trace rounds each sample to ${step} bar. Sampling limits when information is acquired; quantization limits how finely it is represented. At a 1 s interval this particular 0.5 Hz signal is sampled only at zero crossings and its variation is missed.</p><p class="note">A mechanical analog scale also has finite reading discrimination, set by divisions, pointer width, and the observer. A small digital step still does not guarantee small calibration error.</p>`;
      });
    }
    if (mode === "signal") {
      panel.innerHTML = `<div class="scenario"><strong>A flight-deck indication and an air-data input serve different users.</strong><p>Reuse this Measurement Chain bench to compare a local indication with a signal a controller can acquire. Aircraft transducers similarly send signals to an air-data computer; a cockpit display alone is not a measurement interface.</p></div><div class="bench"><div class="bench-head"><h2>Measurement chain</h2><span>DISPLAY / SIGNAL</span></div><div class="bench-body">${range("chain-pressure", "Pressure", 0, 10, 0.1, 4, "bar")}${select(
        "chain-mode",
        "Instrument output",
        [
          ["indicator", "Local indicator only"],
          ["signal", "4–20 mA signal transmitter"],
        ],
      )}<div id="chain-result"></div></div></div>${question("signal-q", "Does a digital display automatically provide a controller signal?", ["Yes: digits mean a digital interface", "No: display and signal output are separate properties"], 1, "A digital indicator may have no output port. A signal-output instrument can send analog current, voltage, or digital data to a logger or controller. An instrument can provide both indication and a signal.")}`;
      wireControls(panel, () => {
        const p = +$("#chain-pressure", panel).value,
          isSignal = $("#chain-mode", panel).value === "signal";
        $("#chain-result", panel).innerHTML =
          `<div class="chain"><span>Pressure ${fmt(p, 1)} bar</span><b aria-hidden="true">→</b><span>${isSignal ? `Transmitter ${fmt(4 + 1.6 * p)} mA` : "Local display"}</span><b aria-hidden="true">→</b><span>${isSignal ? "Controller + data logger" : "Human reads and records"}</span></div><p class="observation">${isSignal ? "The 4–20 mA signal maps 0–10 bar into a continuous current that the controller can sample. A/D conversion and sampling still affect the complete chain." : "The reading is available locally. Automatic control needs a usable signal connection, not simply an indication."}</p>`;
      });
    }
    if (mode === "smart") {
      panel.innerHTML = `<div class="chain"><span>Sensor</span><b aria-hidden="true">→</b><span>Conditioning</span><b aria-hidden="true">→</b><span>ADC</span><b aria-hidden="true">→</b><span>Processor</span><b aria-hidden="true">→</b><span>Communication + diagnostics</span></div><p class="note">A smart aircraft pressure module may store calibration coefficients, compensate temperature effects, communicate readings, and flag supply or sensor health faults. Diagnostics have limits; they do not replace reference checks.</p><div class="scenario"><strong>The transmitter sits in a hot enclosure.</strong><p>Can an onboard processor use a temperature measurement to correct a known offset? Change the environment, then enable compensation.</p></div><div class="bench"><div class="bench-head"><h2>Compensation workstation</h2><span>KNOWN OFFSET MODEL</span></div><div class="bench-body"><div class="controls">${range("smart-temp", "Environment", 20, 60, 1, 40, "°C")}${select(
        "smart-mode",
        "Processing",
        [
          ["raw", "Nonsmart: raw conversion"],
          ["compensated", "Smart: temperature compensation"],
        ],
      )}</div><div id="smart-result"></div></div></div>${question("smart-q", "A smart transmitter is guaranteed to be more accurate in every situation.", ["True", "False"], 1, "A processor can apply calibration, compensation, diagnostics, or digital communication. It cannot eliminate unknown errors or replace a sound sensor and reference standard. “Smart” describes capabilities, not a guaranteed accuracy class.")}<details class="explain"><summary>Explain the model’s limits</summary><p>Here the offset is known exactly: 0.02 bar per °C above 20°C. Real compensation has residual error from imperfect models and temperature measurements. Smart and nonsmart, analog and digital, and indicating and signal-output are independent classifications.</p></details>`;
      wireControls(panel, () => {
        const t = +$("#smart-temp", panel).value,
          smart = $("#smart-mode", panel).value === "compensated",
          offset = 0.02 * (t - 20);
        $("#smart-result", panel).innerHTML =
          metrics([
            ["True pressure", "2.00 bar"],
            ["Raw reading", `${fmt(2 + offset)} bar`],
            ["Reported reading", `${fmt(smart ? 2 : 2 + offset)} bar`],
          ]) +
          `<p class="observation">${smart ? "The processor subtracts the predicted temperature offset." : "The basic converter reports the offset together with the pressure."} This is ideal compensation, not a real-device performance claim.</p>`;
      });
    }
    wireQuestions(panel);
  }
  $$("[data-type]", root).forEach((b) =>
    b.addEventListener("click", () => show(b.dataset.type)),
  );
  show(tabs.some(([id]) => id === initialMode) ? initialMode : "energy");
}
