import * as m from "./models.mjs";
import {
  field,
  select,
  area,
  metrics,
  chart,
  note,
  table,
  fmt,
  circuit,
  chain,
  sampleTable,
} from "./ui.mjs";
export const sections = [
  ["8.1", "Introduction: from sensor to decision", "chain", 211],
  ["8.2", "Signals, frequencies and records", "chain", 213],
  ["8.3", "Sensor signal quality", "sensor", 216],
  ["8.4", "Sampling and aliasing", "alias", 217],
  ["8.5", "ADC quantization", "adc", 220],
  ["8.6", "Analog conditioning before sampling", "conditioning", 220],
  ["8.7", "Passive RC circuits", "rc", 221],
  ["8.7.1", "Transfer function and transient response", "rc", 222],
  ["8.7.2", "Low-pass Bode workbench", "lp", 223],
  ["8.7.3", "High-pass workbench", "hp", 225],
  ["design", "Integrated DAQ design investigation", "design", null],
  ["practice", "Guided textbook exercises 8.1–8.7", "practice", 238],
  ["ai", "Optional evidence-based AI investigations", "ai", null],
];
export const defaults = {
  chain: {
    dc: 1,
    a1: 1,
    f1: 0.075,
    p1: 0,
    a2: 0.5,
    f2: 0.125,
    p2: 0,
    a3: 0,
    f3: 0.25,
    p3: 0,
    a4: 0,
    f4: 0.5,
    p4: 0,
    fc: 0.3,
    fs: 2,
    bits: 8,
    lo: -2,
    hi: 4,
    duration: 40,
    spectrum: "exact",
  },
  sensor: {
    a: 0.002,
    offset: 0.003,
    noise: 0.0005,
    gain: 100,
    f: 2,
    seed: 42,
    lo: -1,
    hi: 1,
  },
  alias: { a: 1, f: 8, fs: 6, p: 0, duration: 2, display: "markers" },
  adc: {
    a: 8,
    offset: 0,
    f: 1,
    fs: 16,
    bits: 12,
    lo: -10,
    hi: 10,
    gain: 1,
    duration: 1,
  },
  conditioning: {
    f: 2,
    a: 1,
    interference: 32,
    interferenceA: 0.4,
    fc: 5,
    fs: 20,
    duration: 1,
    purpose: "lp",
  },
  rc: {
    R: 10,
    C: 10,
    f: 1,
    a: 1,
    phase: 0,
    Rs: 5,
    RL: 20,
    loading: "no",
    mode: "steady",
  },
  lp: {
    R: 10,
    C: 10,
    f: 1.5915494309189535,
    a: 1,
    phase: 0,
    axis: "hz",
    asymptote: "yes",
    mode: "steady",
  },
  hp: {
    R: 10,
    C: 10,
    f: 1.5915494309189535,
    a: 1,
    phase: 0,
    axis: "hz",
    asymptote: "yes",
    mode: "steady",
    drift: 0.2,
    offset: 1,
  },
  design: { ...m.challengeDefaults, explanation: "", evidence: "" },
  practice: {
    exercise: "exercise-8-1",
    answer: "",
    quantity: "0",
    phase: 0,
    series: "E24",
  },
  ai: { topic: "alias", critique: "", evidence: "" },
};
export const presets = {
  chain: [
    ["Reference signal, Eq. 8.1", defaults.chain],
    [
      "Compound signal, Eq. 8.3",
      {
        ...defaults.chain,
        a1: 1,
        f1: 1 / 16,
        a2: 0.5,
        f2: 1 / 8,
        a3: 0.25,
        f3: 1 / 4,
        a4: 0.125,
        f4: 1 / 2,
        duration: 32,
      },
    ],
    [
      "Incommensurate frequencies",
      { ...defaults.chain, f1: 1, f2: Math.SQRT2, duration: 4, fs: 20, fc: 3 },
    ],
  ],
  sensor: [
    ["Weak illustrative sensor", defaults.sensor],
    ["Gain causes overload", { ...defaults.sensor, gain: 500 }],
    ["Noisy sensor", { ...defaults.sensor, noise: 0.003, gain: 100 }],
  ],
  alias: [
    ["8 Hz and 2 Hz at 6 samples/s", defaults.alias],
    ["Negative fold: 4 Hz at 6 samples/s", { ...defaults.alias, f: 4, p: 30 }],
    ["Nyquist boundary: zero-phase sine", { ...defaults.alias, f: 3, p: 0 }],
    ["Nyquist boundary: 90° phase", { ...defaults.alias, f: 3, p: 90 }],
    ["DC alias: sine phase 90°", { ...defaults.alias, f: 12, p: 90 }],
  ],
  adc: [
    ["12 bits / ±10 V", defaults.adc],
    ["3-bit staircase", { ...defaults.adc, bits: 3 }],
    ["Overload persists with more bits", { ...defaults.adc, a: 12, bits: 16 }],
  ],
  conditioning: [
    ["Out-of-band interference", defaults.conditioning],
    [
      "Insufficient first-order attenuation",
      { ...defaults.conditioning, fc: 20 },
    ],
    ["Useful signal destroyed", { ...defaults.conditioning, fc: 0.3 }],
  ],
  rc: [
    ["Textbook τ = 0.1 s", defaults.rc],
    ["Slower RC", { ...defaults.rc, R: 100 }],
    ["Loaded circuit", { ...defaults.rc, loading: "yes" }],
  ],
  lp: [
    ["Textbook τ = 0.1 s", defaults.lp],
    ["At 0.1fc", { ...defaults.lp, f: 0.15915494309189535 }],
    ["At 10fc", { ...defaults.lp, f: 15.915494309189535 }],
  ],
  hp: [
    ["Textbook τ = 0.1 s", defaults.hp],
    ["Drift removal", { ...defaults.hp, f: 10, drift: 0.1 }],
    ["Useful low frequency lost", { ...defaults.hp, f: 0.1 }],
  ],
  design: [
    ["Feasible first-order design", defaults.design],
    [
      "No first-order cutoff can satisfy both",
      { ...defaults.design, interference: 12 },
    ],
    ["Overload", { ...defaults.design, hi: 0.6, lo: -0.6 }],
    ["Insufficient ADC resolution", { ...defaults.design, bits: 8 }],
  ],
};
export const teaching = {
  chain: [
    "Identify what changes in time sampling versus amplitude quantization.",
    "Which stage can destroy information even when later processing is perfect?",
    "A synthetic signal has an exact component spectrum. A finite record provides an estimate, not direct access to every physical frequency.",
    "Does the largest signal frequency always equal the fundamental?",
    "No. The reference signal has components 0.075 and 0.125 Hz but a 0.025 Hz fundamental; that fundamental need not appear as a spectral line.",
  ],
  sensor: [
    "Match an illustrative sensor output to the ADC without hiding noise or overload.",
    "Will multiplying the voltage by 100 improve its signal-to-noise ratio?",
    "Ideal gain multiplies existing useful signal, offset and noise equally. It can improve use of ADC range, but it cannot improve the pre-existing SNR.",
    "Does an ideal amplifier inherently improve the input SNR?",
    "No. Signal and noise scale together; clipping can further damage the result.",
  ],
  alias: [
    "Compare continuous signals and exact samples; preserve signed aliases and phase.",
    "Can 8 Hz and 2 Hz produce identical readings at 6 samples/s?",
    "Samples at k/fs constrain a family of compatible signals. A low-frequency trace is an explanation compatible with those samples, not proof of the original analog frequency.",
    "Is sampling exactly at twice the signal frequency a robust design?",
    "No. A zero-phase sine can give all zero samples at the boundary; real designs require margin and bandwidth control.",
  ],
  adc: [
    "Separate time sampling, finite amplitude resolution and overload.",
    "Would extra bits correct clipping or aliasing?",
    "This ADC is an ideal uniform mid-rise quantizer. Resolution describes a step size; accuracy also depends on calibration, noise, reference quality and timing.",
    "Can more ADC bits recover an already aliased analog component?",
    "No. Extra amplitude codes cannot restore analog-frequency information lost at sampling.",
  ],
  conditioning: [
    "Calculate analog attenuation before evaluating acquisition samples.",
    "Can you reject the interferer without losing useful signal?",
    "Each analog sinusoid is attenuated and phase shifted at its original frequency before sampling. A first-order RC response is gradual, not a brick wall.",
    "Can post-sampling filtering generally determine which analog signal produced ambiguous samples?",
    "No. Identical sample sequences do not retain a unique analog origin.",
  ],
  rc: [
    "Connect circuit topology, differential equation, transfer function and response.",
    "What changes when source resistance or a finite load is included?",
    "For an ideal source and unloaded low-pass, RC dvo/dt + vo = vi and H(s)=1/(1+sRC). The Laplace variable s is not the time constant τ=RC.",
    "Is a steady-state sinusoid the complete zero-state response from t=0?",
    "No. The zero-state solution also includes a decaying exponential satisfying the initial capacitor condition.",
  ],
  lp: [
    "Read linked magnitude, phase and time-domain responses on physical logarithmic axes.",
    "Does a corner frequency pass all lower frequencies unchanged?",
    "At fc the low-pass magnitude is 1/√2, gain −3.0103 dB and phase −45°. Above the corner, −20 dB/decade is an asymptote.",
    "Does phase imply one universal time delay for every frequency?",
    "No. The ratio −phase/ω depends on frequency; the RC filter is not a pure time delay.",
  ],
  hp: [
    "Explain DC rejection, transient response and the cost of removing slow drift.",
    "Can a high-pass distinguish useful slow information from unwanted drift?",
    "Series C and shunt R give H(s)=sRC/(1+sRC). At DC magnitude is zero, dB is −∞ and phase is undefined.",
    "Is a high-pass filter alone an antialiasing low-pass filter?",
    "No. It passes high frequencies and can remove useful low-frequency information.",
  ],
  design: [
    "Choose a defensible first-order RC, sampling rate and ADC design.",
    "Can one cutoff satisfy both useful-band and interference constraints?",
    "Acceptance uses actual analytic attenuation, residual interference, conservative signal bounds, Nyquist margin and quantizer resolution. A second input scenario is required for validation.",
    "Can every set of signal specifications be met by a first-order RC filter?",
    "No. The permissible cutoff interval can be empty; report infeasibility rather than a fabricated pass.",
  ],
  practice: [
    "Derive, calculate, then verify using the workbenches.",
    "Which assumption or tail/phase convention changes the answer?",
    "Exercise IDs are distinct from section IDs. Original solutions refer to printed pp238–239.",
    "Is a 0 Hz sine alias necessarily a nonzero DC signal?",
    "No. Its constant value is A sin(phase); a zero-phase sine aliases to zero.",
  ],
  ai: [
    "Critique an offline claim using current numerical evidence and an independent check.",
    "Which result would falsify the authored claim?",
    "No AI service is called. The copyable prompt is optional, and written reasoning remains self/instructor reviewed.",
    "Is agreement with an AI answer a substitute for independent validation?",
    "No. Verify sample equality, quantizer behavior or useful-signal fidelity with a separate calculation or scenario.",
  ],
};
const fields = (s, spec) =>
  spec.map(([k, label, unit]) => field(k, label, s[k], unit)).join("");
const frequencyFields = [
  ["f", "Input frequency", "Hz"],
  ["a", "Peak amplitude", "V"],
];
const filterFields = [
  ["R", "Series/shunt resistance R", "kΩ"],
  ["C", "Capacitance C", "µF"],
  ["f", "Sinusoidal cursor frequency", "Hz"],
  ["a", "Input peak amplitude", "V"],
  ["phase", "Input phase", "degrees"],
];
export function controls(kind, s) {
  switch (kind) {
    case "chain":
      return (
        field("dc", "DC offset", s.dc, "V") +
        [1, 2, 3, 4]
          .map(
            (i) =>
              `<fieldset><legend>Sinusoid ${i}</legend>${field("a" + i, "Peak amplitude", s["a" + i], "V")}${field("f" + i, "Frequency", s["f" + i], "Hz")}${field("p" + i, "Phase", s["p" + i], "degrees")}</fieldset>`,
          )
          .join("") +
        fields(s, [
          ["fc", "Analog RC cutoff", "Hz"],
          ["fs", "Sampling rate", "samples/s"],
          ["bits", "ADC bit depth", "bits"],
          ["lo", "ADC lower range", "V"],
          ["hi", "ADC upper range", "V"],
          ["duration", "Observation duration", "s"],
        ]) +
        select("spectrum", "Spectrum display", s.spectrum, [
          ["exact", "Exact synthetic components"],
          ["estimate", "Finite sampled-record estimate"],
        ])
      );
    case "sensor":
      return fields(s, [
        ["a", "Useful peak amplitude", "V"],
        ["offset", "DC offset", "V"],
        ["noise", "Illustrative noise SD", "V"],
        ["gain", "Ideal voltage gain", "V/V"],
        ["f", "Useful signal frequency", "Hz"],
        ["seed", "Reproducible noise seed", "integer"],
        ["lo", "ADC lower range", "V"],
        ["hi", "ADC upper range", "V"],
      ]);
    case "alias":
      return (
        fields(s, [
          ...frequencyFields,
          ["fs", "Acquisition sampling rate", "samples/s"],
          ["p", "Initial sine phase", "degrees"],
          ["duration", "Observation duration", "s"],
        ]) +
        select("display", "Optional sampled-data visualization", s.display, [
          ["markers", "Sample markers only"],
          ["connected", "Straight joins: display only"],
          ["hold", "Zero-order hold: display only"],
        ])
      );
    case "adc":
      return fields(s, [
        ...frequencyFields,
        ["offset", "DC offset", "V"],
        ["gain", "Ideal input gain", "V/V"],
        ["fs", "Sampling rate", "samples/s"],
        ["bits", "Bit depth (1–20)", "bits"],
        ["lo", "Lower input range", "V"],
        ["hi", "Upper input range", "V"],
        ["duration", "Observation duration", "s"],
      ]);
    case "conditioning":
      return (
        fields(s, [
          ["f", "Useful frequency", "Hz"],
          ["a", "Useful peak amplitude", "V"],
          ["interference", "Out-of-band interferer", "Hz"],
          ["interferenceA", "Interferer peak amplitude", "V"],
          ["fc", "Analog RC low-pass cutoff", "Hz"],
          ["fs", "Sampling rate", "samples/s"],
          ["duration", "Observation duration", "s"],
        ]) +
        select(
          "purpose",
          "Conceptual filter purpose (separate from RC experiment)",
          s.purpose,
          [
            ["lp", "Low-pass: retain low frequencies"],
            ["hp", "High-pass: reject DC / drift"],
            ["bp", "Band-pass: retain a band"],
            ["notch", "Notch: reject a narrow region"],
          ],
        )
      );
    case "rc":
      return (
        fields(s, filterFields) +
        select("mode", "Sinusoidal calculation", s.mode, [
          ["steady", "Steady-state sinusoid"],
          ["zero", "Zero-state response from t=0"],
        ]) +
        select("loading", "Source/load comparison", s.loading, [
          ["no", "Ideal source, unloaded output"],
          ["yes", "Include Rs and RL comparison"],
        ]) +
        fields(s, [
          ["Rs", "Source series resistance Rs", "kΩ"],
          ["RL", "Parallel load RL", "kΩ"],
        ])
      );
    case "lp":
    case "hp":
      return (
        fields(s, filterFields) +
        select("axis", "Bode frequency axis units", s.axis, [
          ["hz", "Hz"],
          ["rad", "rad/s"],
        ]) +
        select("asymptote", "Magnitude asymptote", s.asymptote, [
          ["yes", "Show labelled asymptote"],
          ["no", "Exact curve only"],
        ]) +
        select("mode", "Sinusoidal calculation", s.mode, [
          ["steady", "Steady state"],
          ["zero", "Zero-state transient included"],
        ]) +
        (kind === "hp"
          ? fields(s, [
              ["offset", "Input DC offset for drift scenario", "V"],
              ["drift", "Slow drift frequency (0.4 V peak)", "Hz"],
            ])
          : "")
      );
    case "design":
      return (
        fields(s, [
          ["useful", "Useful bandwidth / test frequency", "Hz"],
          ["a", "Useful peak amplitude", "V"],
          ["interference", "Interferer frequency", "Hz"],
          ["interferenceA", "Interferer peak amplitude", "V"],
          ["fc", "Analog RC cutoff", "Hz"],
          ["fs", "Sampling rate", "samples/s"],
          ["bits", "ADC bits", "bits"],
          ["lo", "ADC lower range", "V"],
          ["hi", "ADC upper range", "V"],
          ["offset", "DC offset", "V"],
          ["maxLoss", "Maximum useful amplitude loss", "%"],
          ["maxResidual", "Maximum residual interferer", "V peak"],
          ["maxDelta", "Maximum quantizer step Δ", "V"],
          ["validationF", "Independent validation frequency", "Hz"],
          ["validationA", "Independent validation amplitude", "V"],
        ]) +
        area(
          "explanation",
          "Engineering decision and explanation",
          s.explanation,
        ) +
        area(
          "evidence",
          "Independent validation: calculation, observations and limits",
          s.evidence,
        )
      );
  }
}
const components = (s) =>
  [1, 2, 3, 4].map((i) => ({
    a: s["a" + i],
    f: s["f" + i],
    p: m.radians(s["p" + i]),
  }));
const pairs = (ts, vs) => ts.map((t, i) => [t, vs[i]]);
const sinusoid = (s, t) =>
  s.a * Math.sin(m.hzToRad(s.f) * t + m.radians(s.p ?? s.phase ?? 0));
const quantizerNote = () =>
  note(
    "Convention: 2ᴺ equal-width cells; Δ=(Vmax−Vmin)/2ᴺ. Interior thresholds belong to the higher code (ties upwards). Code c reconstructs Vmin+(c+½)Δ. Vmax maps to the final code, never an extra endpoint code. Inputs outside [Vmin,Vmax] saturate. The in-range bound |error|≤Δ/2 includes both endpoints; overload errors can be larger. Δ/√12 applies only to a suitably spread, approximately uniform, uncorrelated quantization-error model—not universally white independent noise.",
  );
export function calculate(kind, s) {
  switch (kind) {
    case "chain": {
      const cs = components(s),
        combined = m.componentSpectrum(s.dc, cs),
        effective = combined.components.length
          ? combined.components
          : [{ a: 0, f: 0, p: 0 }],
        info = m.signalInfo(s.dc, cs),
        ts = m.sampleTimes(s.fs, s.duration),
        grid = m.drawingTimes(s.duration, info.bandwidth),
        out = m.filteredComponents(
          "lp",
          combined.dc,
          effective,
          1 / (2 * Math.PI * s.fc),
          1,
        );
      m.positive(s.fc);
      const raw = grid.map((t) => m.signalAt(t, combined.dc, effective)),
        conditioned = grid.map((t) => m.signalAt(t, out.dc, out.components)),
        samples = ts.map((t) => m.signalAt(t, out.dc, out.components)),
        q = samples.map((v) => m.quantizer(v, s.bits, s.lo, s.hi));
      let spec;
      if (s.spectrum === "exact") {
        spec = chart(
          "Exact mathematical component spectrum",
          "Frequency / Hz",
          "Peak component amplitude / V",
          [
            {
              name: "Input peak amplitudes / DC magnitude",
              points: [
                [0, 0],
                [0, Math.abs(info.dc)],
                [0, 0],
                ...combined.components.flatMap((c) => [
                  [c.f, 0],
                  [c.f, c.a],
                  [c.f, 0],
                ]),
              ],
            },
          ],
        );
      } else {
        const est = m.estimateSpectrum(
          samples.slice(0, Math.min(512, samples.length)),
          s.fs,
        );
        spec =
          chart(
            "Estimated spectrum of conditioned samples",
            "Frequency / Hz",
            "One-sided peak amplitude estimate / V",
            [{ name: "Mean-removed Hann-windowed record", points: est.bins }],
          ) +
          note(
            `N=${est.n}; fs=${fmt(est.fs)} samples/s; DFT record duration N/fs=${fmt(est.recordDuration)} s (sample span (N−1)/fs); Δf=${fmt(est.resolution)} Hz. Symmetric Hann window, coherent-gain normalization; positive bins doubled except DC/Nyquist. The sample mean ${fmt(est.dc)} V is reported separately; the windowed zero bin is not the exact DC component. At most the first 512 samples are analyzed. Leakage and finite resolution mean a peak is not necessarily the exact physical frequency.`,
          );
      }
      return {
        html:
          chain() +
          metrics([
            ["Input bandwidth", info.bandwidth, "Hz"],
            ["Total DC", info.dc, "V"],
            ["Fundamental if established", info.fundamental, "Hz"],
            ["Common period if established", info.period, "s"],
            ["Sampling interval", 1 / s.fs, "s"],
            ["Sample rate", s.fs, "samples/s"],
            ["ADC step", q[0].delta, "V"],
          ]) +
          chart(
            "Signals along the acquisition chain",
            "Time / s",
            "Voltage / V",
            [
              { name: "Sensor input", points: pairs(grid, raw) },
              {
                name: "Analog RC conditioned",
                points: pairs(grid, conditioned),
              },
              {
                name: "ADC reconstructions at sample instants",
                points: pairs(
                  ts,
                  q.map((x) => x.value),
                ),
                markers: true,
              },
            ],
          ) +
          table(
            "Exact input definitions",
            [
              "Component",
              "Peak amplitude / V",
              "f / Hz",
              "ω / rad/s",
              "Period / s",
              "Phase / degrees",
            ],
            [
              [
                "DC parameter",
                fmt(s.dc),
                0,
                0,
                "Not applicable",
                "Not applicable",
              ],
              ...cs
                .filter((c) => c.a > 0)
                .map((c, i) => [
                  i + 1,
                  c.a,
                  c.f,
                  fmt(m.hzToRad(c.f)),
                  c.f ? fmt(1 / c.f) : "Constant",
                  fmt((c.p * 180) / Math.PI),
                ]),
            ],
          ) +
          spec +
          sampleTable(ts, samples, {
            headers: ["Code", "Reconstructed / V", "Clipped"],
            rows: q.map((x) => [
              x.code,
              fmt(x.value),
              x.clipped ? "Yes" : "No",
            ]),
          }) +
          note(
            "Coincident-frequency components are combined as phasors for the spectrum and actual response; zero-frequency terms contribute to total DC. Common period is reported only for the recognized textbook frequency sets or one active frequency. For arbitrary settings it is not established: incommensurate frequencies have no finite common period. The compound preset has harmonics 1, 2, 4 and 8; harmonics 3, 5, 6 and 7 need not be present. All conditioning is analytic analog steady state; the ADC stage samples that result. Samples can still alias if the source is insufficiently attenuated.",
          ) +
          quantizerNote(),
        data: { times: ts, samples, codes: q, components: cs, info },
      };
    }
    case "sensor": {
      const r = m.sensorRun(s);
      return {
        html:
          metrics([
            ["Input useful RMS", r.signalRMS, "V"],
            ["Input noise RMS", r.noiseRMS, "V"],
            [
              "Input / ideal output SNR",
              r.snr,
              "dB (unchanged before clipping)",
            ],
            ["Useful output peak", s.a * s.gain, "V"],
            ["ADC overload samples", r.clipping, "of 201"],
          ]) +
          chart("Raw illustrative sensor snapshot", "Time / s", "Voltage / V", [
            { name: "Useful component", points: pairs(r.times, r.useful) },
            {
              name: "Raw including offset and noise",
              points: pairs(r.times, r.raw),
            },
          ]) +
          chart("Gain and ADC input range", "Time / s", "Voltage / V", [
            {
              name: "Ideal gain output",
              points: pairs(r.times, r.conditioned),
            },
            { name: "Range-clipped output", points: pairs(r.times, r.clipped) },
            {
              name: "ADC upper bound",
              points: [
                [0, s.hi],
                [1, s.hi],
              ],
              dashed: true,
            },
            {
              name: "ADC lower bound",
              points: [
                [0, s.lo],
                [1, s.lo],
              ],
              dashed: true,
            },
          ]) +
          table(
            "Level matching",
            ["Stage", "Useful RMS / V", "Noise RMS / V", "DC / V"],
            [
              ["Raw", fmt(r.signalRMS), fmt(r.noiseRMS), s.offset],
              [
                "Ideal gain",
                fmt(s.gain * r.signalRMS),
                fmt(s.gain * r.noiseRMS),
                s.gain * s.offset,
              ],
            ],
          ) +
          note(
            "Values are illustrative, not a universal sensor specification. Thermocouple voltage depends on type, temperature difference and reference junction; it is not always in the µV range. A stationary accelerometer can contain real vibration, gravity/projection changes and drift as well as electrical noise. The seeded 200 samples/s snapshot uses independent Gaussian disturbances; it is not a claim about every real sensor noise spectrum. Ideal gain cannot improve existing SNR, though it can improve ADC range utilization.",
          ),
        data: r,
      };
    }
    case "alias": {
      const p = m.radians(s.p),
        r = m.sampleSignal({ ...s, p }),
        grid = m.drawingTimes(s.duration, s.f),
        series = [
          {
            name: "Continuous-time mathematical input",
            points: grid.map((t) => [t, sinusoid(s, t)]),
          },
          {
            name: "Compatible positive-frequency alias (phase adjusted)",
            points: grid.map((t) => [
              t,
              s.a * Math.sin(m.hzToRad(r.frequency) * t + r.phase),
            ]),
          },
          {
            name: "Actual acquisition samples",
            points: pairs(r.times, r.values),
            markers: true,
          },
        ];
      if (s.display === "connected")
        series.push({
          name: "Straight joins: not ideal reconstruction",
          points: pairs(r.times, r.values),
          dashed: true,
        });
      if (s.display === "hold")
        series.push({
          name: "Zero-order hold: not ideal reconstruction",
          points: r.times.flatMap((t, i) => [
            [t, r.values[i]],
            [r.times[i + 1] ?? t, r.values[i]],
          ]),
          dashed: true,
        });
      return {
        html:
          metrics([
            ["Nyquist rate of input", r.nyquistRate, "samples/s"],
            ["System Nyquist frequency", r.nyquistFrequency, "Hz"],
            ["f/fs", r.normalized, "cycles/sample"],
            ["2πf/fs", r.digitalRadians, "rad/sample"],
            ["Signed principal alias", r.signed, "Hz"],
            ["Positive alias frequency", r.frequency, "Hz"],
            ["Positive alias phase", (r.phase * 180) / Math.PI, "degrees"],
            [
              "Maximum sample disagreement",
              Math.max(
                ...r.values.map((v, i) => Math.abs(v - r.compatible[i])),
              ),
              "V",
            ],
          ]) +
          chart(
            "Continuous possibilities and exact acquisition times",
            "Time / s",
            "Voltage / V",
            series,
          ) +
          sampleTable(r.times, r.values, {
            headers: ["Compatible alias / V"],
            rows: r.compatible.map((v) => [fmt(v, 8)]),
          }) +
          note(
            `${r.boundary ? "Nyquist-boundary case: equality is phase sensitive and is not a robust sampling design. " : ""}${r.frequency === 0 ? "The DC alias is A sin(phase) = " + fmt(s.a * r.dcValue) + " V; a zero-phase sine aliases to zero. " : ""}Negative folding requires sin(−ωt+φ)=sin(ωt+π−φ); simply taking |falias| without changing phase can be wrong. Straight joins, sample holds and jagged-looking traces do not establish ideal reconstruction or prove aliasing. The continuous drawing grid resolves at least 40 points per highest-frequency cycle, independently of fs.`,
          ),
        data: r,
      };
    }
    case "adc": {
      m.finite(s.offset);
      m.positive(s.gain);
      const r = m.sampleSignal({
          f: s.f,
          fs: s.fs,
          a: s.a,
          p: 0,
          duration: s.duration,
        }),
        values = r.values.map((v) => (v + s.offset) * s.gain),
        q = values.map((v) => m.quantizer(v, s.bits, s.lo, s.hi)),
        grid = m.drawingTimes(s.duration, s.f);
      return {
        html:
          metrics([
            ["Possible codes", q[0].levels],
            ["Δ", q[0].delta, "V"],
            ["Δ", 1000 * q[0].delta, "mV"],
            ["Maximum in-range error", q[0].half, "V"],
            ["Overload samples", q.filter((v) => v.clipped).length],
            ["Sampling interval", 1 / s.fs, "s"],
          ]) +
          chart(
            "Amplitude quantization, independently sampled in time",
            "Time / s",
            "Voltage / V",
            [
              {
                name: "Analog input after gain",
                points: grid.map((t) => [
                  t,
                  (s.offset + s.a * Math.sin(m.hzToRad(s.f) * t)) * s.gain,
                ]),
              },
              {
                name: "Actual analog samples",
                points: pairs(r.times, values),
                markers: true,
              },
              {
                name: "Code-value hold (display only)",
                points: r.times.flatMap((t, i) => [
                  [t, q[i].value],
                  [r.times[i + 1] ?? t, q[i].value],
                ]),
                dashed: true,
              },
            ],
          ) +
          chart(
            "Quantization and overload error",
            "Sample time / s",
            "Reconstructed minus input / V",
            [
              {
                name: "Actual error",
                points: pairs(
                  r.times,
                  q.map((v) => v.error),
                ),
              },
            ],
          ) +
          sampleTable(r.times, values, {
            headers: [
              "Integer code",
              "Reconstructed / V",
              "Error / V",
              "Overload",
            ],
            rows: q.map((v) => [
              v.code,
              fmt(v.value, 7),
              fmt(v.error, 7),
              v.clipped ? "Yes" : "No",
            ]),
          }) +
          quantizerNote() +
          note(
            "At ±10 V and 12 bits, Δ=20/4096 V=4.8828125 mV; the textbook 5 mV is rounded. ADC code values are not an ideal band-limited reconstruction. Changing fs affects sample times; changing bits affects amplitude cells.",
          ),
        data: { times: r.times, input: values, quantized: q },
      };
    }
    case "conditioning": {
      const r = m.conditioning(s),
        grid = m.drawingTimes(s.duration, Math.max(s.f, s.interference)),
        concept = Array.from({ length: 121 }, (_, i) => {
          const f = s.fc * 10 ** (-2 + i / 30),
            z = f / s.fc;
          let mag;
          if (s.purpose === "lp") mag = 1 / Math.hypot(1, z);
          else if (s.purpose === "hp") mag = z / Math.hypot(1, z);
          else if (s.purpose === "bp")
            mag = z / 0.3 / Math.hypot(1, z / 0.3) / Math.hypot(1, z / 3);
          else mag = Math.abs(z * z - 1) / Math.hypot(z * z - 1, z / 4);
          return [f, mag];
        });
      return {
        html:
          metrics([
            ["Useful amplitude retained", 100 * r.usefulGain, "%"],
            ["Useful amplitude lost", 100 * (1 - r.usefulGain), "%"],
            ["Residual interferer", r.residual, "V peak"],
            ["Interferer signed alias", r.fold.signed, "Hz"],
          ]) +
          chart(
            "Analog components before acquisition",
            "Time / s",
            "Voltage / V",
            [
              {
                name: "Unfiltered continuous input",
                points: grid.map((t) => [t, m.signalAt(t, 0, r.components)]),
              },
              {
                name: "Analog RC steady-state output",
                points: grid.map((t) => [
                  t,
                  m.signalAt(t, r.out.dc, r.out.components),
                ]),
              },
            ],
          ) +
          chart(
            "Compare acquisition with and without analog prefilter",
            "Sample time / s",
            "Voltage / V",
            [
              {
                name: "A: no analog prefilter",
                points: pairs(r.times, r.raw),
                markers: true,
              },
              {
                name: "B: analytic analog RC before sampling",
                points: pairs(r.times, r.filtered),
                markers: true,
              },
            ],
          ) +
          sampleTable(r.times, r.raw, {
            headers: ["Prefiltered sample / V"],
            rows: r.filtered.map((v) => [fmt(v, 7)]),
          }) +
          chart(
            "Separate conceptual response: " + s.purpose.toUpperCase(),
            "Frequency / Hz",
            "Illustrative magnitude",
            [
              {
                name: "Purpose only; not a detailed circuit design",
                points: concept,
              },
            ],
            { log: true },
          ) +
          note(
            "Low-pass retains lower frequencies; high-pass rejects DC/slow changes; band-pass retains a selected band; notch rejects a narrow region. The selectable conceptual curve does not change the RC antialiasing experiment above. No active or digital filter implementation is included in this scope. Analog filtering is performed at each original component frequency before exact sample-time evaluation. Once different analog signals have produced identical samples, post-sampling processing cannot generally distinguish them. A first-order filter leaves residual out-of-band energy; report it together with useful-signal loss.",
          ),
        data: r,
      };
    }
    case "rc":
    case "lp":
    case "hp":
      return filterResult(kind, s);
    case "design": {
      const r = m.challenge(s);
      let v = null,
        validationError = "";
      try {
        v = m.validateChallenge(s);
      } catch (e) {
        validationError = e.message;
      }
      const duration = 2 / Math.max(s.useful, 1),
        c = m.conditioning({
          f: s.useful,
          a: s.a,
          interference: s.interference,
          interferenceA: s.interferenceA,
          fc: s.fc,
          fs: s.fs,
          duration,
        }),
        q = c.filtered.map((x) =>
          m.quantizer(x + s.offset, s.bits, s.lo, s.hi),
        );
      return {
        html:
          metrics([
            ["Useful amplitude retained", 100 * r.gain, "%"],
            ["Residual interference", r.residual, "V peak"],
            ["Conservative |voltage| bound", r.bound, "V"],
            ["ADC step Δ", r.delta, "V"],
            ["Minimum cutoff for useful signal", r.fcMin, "Hz"],
            ["Maximum cutoff for interferer", r.fcMax, "Hz"],
          ]) +
          table(
            "Design acceptance from actual models",
            ["Constraint", "Result", "Evidence"],
            Object.entries(r.checks).map(([key, pass]) => [
              key,
              pass ? "PASS" : "FAIL",
              {
                bandwidth: `fs=${fmt(s.fs)} > 2B=${fmt(2 * s.useful)} required`,
                useful: `Loss ${fmt(100 * (1 - r.gain))}% ≤ ${s.maxLoss}%`,
                interference: `${fmt(r.residual)} V ≤ ${s.maxResidual} V`,
                clipping: `Use filtered amplitude sum around offset ${s.offset} V within [${s.lo}, ${s.hi}] V`,
                resolution: `Δ=${fmt(r.delta)} V ≤ ${s.maxDelta} V`,
              }[key],
            ]),
          ) +
          note(
            `<strong>${r.pass ? "Nominal constraints pass." : "Nominal constraints fail."}</strong> ${r.feasible ? "A first-order cutoff interval exists for the signal-loss and interference constraints." : "These signal-loss and interference constraints cannot both be met by any first-order RC cutoff."} Sampling above twice the useful bandwidth alone does not remove the residual interferer. The amplitude-sum clipping bound is conservative and valid for arbitrary relative phases; it may reject a particular phase record that happens not to clip.`,
          ) +
          chart(
            "Actual sampled and quantized design record",
            "Time / s",
            "Voltage / V",
            [
              {
                name: "Useful-band filtered mixture before ADC",
                points: pairs(
                  c.times,
                  c.filtered.map((x) => x + s.offset),
                ),
                markers: true,
              },
              {
                name: "ADC reconstructed values",
                points: pairs(
                  c.times,
                  q.map((x) => x.value),
                ),
                markers: true,
              },
            ],
          ) +
          sampleTable(
            c.times,
            c.filtered.map((x) => x + s.offset),
            {
              headers: ["Code", "Reconstructed / V"],
              rows: q.map((x) => [x.code, fmt(x.value, 6)]),
            },
          ) +
          note(
            v
              ? `Independent scenario f=${s.validationF} Hz, amplitude=${s.validationA} V: ${v.pass ? "constraints pass" : "constraints fail"}. Useful gain=${fmt(v.gain)}, residual=${fmt(v.residual)} V, Δ=${fmt(v.delta)} V. Change the input, not just the prose; then explain whether your engineering decision still holds.`
              : validationError,
          ) +
          note(
            "A broad useful band from DC to the stated bandwidth is represented by its worst-case low-pass amplitude loss at the band edge. No automatic prose grading is used. Real ADC aperture, component tolerances, source/load impedances and broadband noise need additional validation.",
          ),
        data: {
          nominal: r,
          validation: v,
          record: {
            times: c.times,
            input: c.filtered.map((x) => x + s.offset),
            codes: q,
          },
        },
      };
    }
  }
}
function filterResult(kind, s) {
  const topology = kind === "hp" ? "hp" : "lp",
    R = s.R * 1000,
    C = s.C * 1e-6;
  m.finite(s.phase);
  m.positive(s.a);
  const constants = m.rc(R, C),
    { tau, fc, wc } = constants,
    h = m.response(topology, s.f, R, C),
    axis = s.axis ?? "hz",
    scale = axis === "rad" ? 2 * Math.PI : 1,
    freqs = Array.from({ length: 181 }, (_, i) => fc * 10 ** (-3 + i / 30)),
    curves = [
      {
        name: "Exact magnitude",
        points: freqs.map((f) => [f * scale, m.response(topology, f, R, C).db]),
      },
    ];
  if (s.asymptote === "yes")
    curves.push({
      name:
        topology === "lp"
          ? "Asymptote: −20 dB/decade above fc"
          : "Asymptote: +20 dB/decade below fc",
      points: freqs.map((f) => [
        f * scale,
        topology === "lp"
          ? Math.min(0, -20 * Math.log10(f / fc))
          : Math.min(0, 20 * Math.log10(f / fc)),
      ]),
      dashed: true,
    });
  const duration = s.f > 0 ? Math.max(3 / s.f, 5 * tau) : 5 * tau,
    ts = m.drawingTimes(duration, s.f),
    p = m.radians(s.phase),
    timeSeries = [
      {
        name: "Input sine",
        points: ts.map((t) => [t, s.a * Math.sin(m.hzToRad(s.f) * t + p)]),
      },
      {
        name:
          s.mode === "zero"
            ? "Zero-state response (transient included)"
            : "Steady-state sinusoid (transient excluded)",
        points: ts.map((t) => [
          t,
          s.mode === "zero"
            ? m.zeroStateSine(topology, t, R, C, s.a, s.f, p)
            : h.phase === null
              ? 0
              : s.a * h.mag * Math.sin(m.hzToRad(s.f) * t + p + h.phase),
        ]),
      },
    ],
    stepTimes = Array.from({ length: 201 }, (_, i) => (i * 5 * tau) / 200);
  let extra = "";
  if (kind === "rc" && s.loading === "yes") {
    const loaded = m.loadedLP(s.f, R, C, s.Rs * 1000, s.RL * 1000);
    extra =
      circuit("lp", R, C, { loaded: true, Rs: s.Rs * 1000, RL: s.RL * 1000 }) +
      metrics([
        ["Loaded DC gain", loaded.dcGain, "V/V"],
        ["Loaded time constant", loaded.tau, "s"],
        ["Loaded corner relative to DC gain", loaded.fc, "Hz"],
        ["Loaded magnitude at cursor", loaded.mag],
      ]) +
      note(
        "From the displayed circuit, (vi−vo)/(R+Rs)=C dvo/dt+vo/RL. Thus K=RL/(R+Rs+RL), τloaded=((R+Rs)∥RL)C, H=K/(1+sτloaded). The corner is −3.0103 dB relative to the loaded DC gain, not necessarily relative to unity. Loading changes gain and pole.",
      );
  }
  if (topology === "hp") {
    m.finite(s.offset, s.drift);
    if (s.drift < 0)
      throw new RangeError("Drift frequency must be nonnegative.");
    const cs = [
        { a: s.a, f: s.f, p },
        { a: 0.4, f: s.drift, p: 0 },
      ],
      out = m.filteredComponents("hp", s.offset, cs, R, C),
      tt = m.drawingTimes(
        Math.max(
          duration,
          Math.min(s.drift > 0 ? 2 / s.drift : duration, 50 * tau),
        ),
        Math.max(s.f, s.drift),
      );
    extra +=
      chart(
        "Removing DC and drift can also remove useful information",
        "Time / s",
        "Voltage / V",
        [
          {
            name: "Input with offset and 0.4 V slow component",
            points: tt.map((t) => [t, m.signalAt(t, s.offset, cs)]),
          },
          {
            name: "High-pass steady-state result",
            points: tt.map((t) => [t, m.signalAt(t, out.dc, out.components)]),
          },
        ],
      ) +
      table(
        "Component fidelity",
        ["Component", "Input peak / V", "Output peak / V"],
        [
          ["DC", s.offset, 0],
          ["Useful", s.a, fmt(out.components[0].a)],
          ["Drift", 0.4, fmt(out.components[1].a)],
        ],
      );
  }
  return {
    html:
      circuit(topology, R, C) +
      metrics([
        ["τ = RC", tau, "s"],
        ["fc = 1/(2πRC)", fc, "Hz"],
        ["ωc = 1/RC", wc, "rad/s"],
        ["Magnitude at cursor", h.mag, "V/V"],
        ["Gain at cursor", h.db, "dB"],
        [
          "Phase at cursor",
          h.phase === null ? null : (h.phase * 180) / Math.PI,
          "degrees",
        ],
      ]) +
      note(
        topology === "lp"
          ? "RC dvo/dt + vo = vi; HLP(s)=1/(1+sτ)."
          : "HHP(s)=sτ/(1+sτ). At DC, |H|=0, gain=−∞ dB and phase is undefined; DC is omitted from logarithmic plots, never assigned a fabricated finite gain or phase.",
      ) +
      chart(
        "Logarithmic magnitude response",
        "Frequency / " + (axis === "rad" ? "rad/s" : "Hz"),
        "Gain / dB",
        curves,
        { log: true, cursor: s.f * scale },
      ) +
      chart(
        "Logarithmic phase response",
        "Frequency / " + (axis === "rad" ? "rad/s" : "Hz"),
        "Phase / degrees",
        [
          {
            name: "Exact phase",
            points: freqs.map((f) => [
              f * scale,
              (m.response(topology, f, R, C).phase * 180) / Math.PI,
            ]),
          },
        ],
        { log: true, cursor: s.f * scale },
      ) +
      table(
        "Independent landmarks",
        ["Frequency", "|H|", "Gain / dB", "Phase / degrees"],
        [0.1, 1, 10].map((z) => {
          const x = m.response(topology, z * fc, R, C);
          return [
            fmt(z) + "fc",
            fmt(x.mag, 7),
            fmt(x.db, 5),
            fmt((x.phase * 180) / Math.PI, 5),
          ];
        }),
      ) +
      chart(
        "Sinusoidal response: " +
          (s.mode === "zero" ? "zero state" : "steady state"),
        "Time / s",
        "Voltage / V",
        timeSeries,
      ) +
      chart(
        "DC-step response from an initially uncharged capacitor",
        "Time / s",
        "Voltage / V",
        [
          {
            name: "Input step",
            points: stepTimes.map((t) => [t, s.a]),
            dashed: true,
          },
          {
            name:
              topology === "lp"
                ? "Low-pass charging"
                : "High-pass decaying pulse",
            points: stepTimes.map((t) => [t, m.rcStep(topology, t, R, C, s.a)]),
          },
          {
            name: "At one time constant",
            points: [[tau, m.rcStep(topology, tau, R, C, s.a)]],
            markers: true,
          },
        ],
      ) +
      note(
        `At τ, ${topology === "lp" ? "the LP output reaches 63.212% of the step" : "the HP pulse decays to 36.788% of its initial value"}. The steady-state sine uses analytic magnitude and phase; zero-state mode adds the exponential needed for the initial capacitor condition. The source is ideal and output unloaded unless the displayed loading comparison is selected. Real tolerances, parasitics and load/source impedances can change the response. Switching Bode units multiplies every frequency coordinate and cursor by 2π. Phase shift is not one frequency-independent delay. ${topology === "hp" ? "High-frequency magnitude approaches unity; high-pass alone does not protect against high-frequency aliases." : "Attenuation is gradual even below fc; the high-frequency slope approaches −20 dB/decade."}`,
      ) +
      extra,
    data: {
      ...constants,
      cursor: h,
      step: stepTimes.map((t) => [t, m.rcStep(topology, t, R, C, s.a)]),
      sinusoid: timeSeries.map((x) => ({ name: x.name, points: x.points })),
    },
  };
}
