import * as m from "./models.mjs";
export const exercises = [
  {
    id: "exercise-8-1",
    number: "8.1",
    page: 238,
    title: "Bandwidth, sampling boundary and a hidden interferer",
    lab: "8.4",
    learn:
      "For a 750 Hz band limit, the Nyquist rate is 1500 samples/s. Treat 1500 as the theoretical boundary, not a robust practical choice; sampling strictly above it and analog antialiasing are needed. At that boundary a 15 kHz sine is sampled at ten cycles/sample and folds to DC with value A sin(phase). Zero phase yields zero, not a guaranteed nonzero offset.",
    hints: [
      "Keep the signal Nyquist rate (2B) separate from the system Nyquist frequency (fs/2).",
      "Subtract an integer multiple of fs from the interference frequency, then evaluate its phase at k/fs.",
    ],
    values: (s) => ({
      signalNyquistRate: 1500,
      boundarySamplingRate: 1500,
      systemNyquistFrequencyAtBoundary: 750,
      interferenceAliasHz: m.alias(15000, 1500, m.radians(s.phase)).frequency,
      unitAmplitudeDCAlias: Math.sin(m.radians(s.phase)),
      illustrativePracticalSamplingRate: 2000,
    }),
  },
  {
    id: "exercise-8-2",
    number: "8.2",
    page: 238,
    title: "Which harmonics survive acquisition?",
    lab: "8.4",
    learn:
      "A 1 kHz sinusoid sampled at 5 kHz lies below the 2.5 kHz system Nyquist frequency. Its own Nyquist rate is 2 kHz. The second harmonic at 2 kHz is representable; the third at 3 kHz is the first harmonic to fold, to signed −2 kHz. A positive 2 kHz sine equivalent requires phase π−φ. The fifth harmonic folds to phase-sensitive DC.",
    hints: [
      "List harmonic frequencies before comparing each with fs/2.",
      "The first out-of-band harmonic is 3 kHz, not 5 kHz; use a signed principal frequency.",
    ],
    values: (s) => ({
      systemNyquistHz: 2500,
      signalNyquistRate: 2000,
      highestUnaliasedHarmonic: 2,
      highestUnaliasedHz: 2000,
      firstAliasedHarmonic: 3,
      firstSignedAliasHz: -2000,
      positiveAliasHz: 2000,
      positiveAliasPhaseDegrees: 180 - s.phase,
    }),
  },
  {
    id: "exercise-8-3",
    number: "8.3",
    page: 238,
    title: "Can an analog system alias?",
    lab: "8.4",
    learn:
      "A purely continuous-time linear circuit does not have sampling replicas or a sampling Nyquist boundary. It can attenuate, distort or shift phase, which are not sampling aliasing. Analog sample-and-hold or switched sampling can alias even without a digital computer. Nonlinear mixing can create new frequencies, but that is a separate mechanism.",
    hints: [
      "Ask whether any stage samples in time, rather than whether it uses a computer.",
      "Distinguish continuous-time filtering, nonlinear mixing and sampled-data frequency ambiguity.",
    ],
    values: () => ({}),
  },
  {
    id: "exercise-8-4",
    number: "8.4",
    page: 238,
    title: "Maximum in-range quantization error",
    lab: "8.5",
    learn:
      "For a ±10 V, 14-bit uniform mid-rise ADC, Δ=20/16384 V. The ideal in-range error bound is half that step, including the selected endpoint convention. Overload, bias and noise are outside this bound.",
    hints: [
      "Use the full 20 V span, not the positive limit alone.",
      "There are 2¹⁴ cells; reconstruct at cell centers and use Δ/2 for the maximum in-range error.",
    ],
    values: () => ({
      codes: 16384,
      deltaV: 20 / 16384,
      maxInRangeErrorV: 10 / 16384,
      maxInRangeErrorMV: 10000 / 16384,
    }),
  },
  {
    id: "exercise-8-5",
    number: "8.5",
    page: 239,
    title: "Minimum ADC bit depth for a specified step",
    lab: "8.5",
    learn:
      "Interpret 0.005 V resolution as an ideal step no greater than 0.005 V over the 20 V span. Require 2ᴺ≥4000, so 12 bits suffice. This is a resolution calculation; it does not guarantee 5 mV measurement accuracy.",
    hints: [
      "Solve 20/2ᴺ≤0.005 rather than using Δ/2.",
      "Round log₂(4000) upward and verify both the chosen and preceding bit depths.",
    ],
    values: () => ({
      minimumBits: m.minimumBits(20, 0.005),
      chosenDeltaV: 20 / 4096,
      previousDeltaV: 20 / 2048,
    }),
  },
  {
    id: "exercise-8-6",
    number: "8.6",
    page: 239,
    title: "Design a 50 Hz passive low-pass",
    lab: "8.7.2",
    learn:
      "The rendered source page confirms C=0.01 µF=10 nF, despite text extraction rendering the micro symbol incorrectly. Derive R=1/(2πfcC). Select from the stated E-series by smallest achieved-cutoff deviation, and recalculate fc. Nominal preferred values do not include component tolerances; this is an explicit standard-series interpretation of the open-ended source question.",
    hints: [
      "Convert 0.01 µF to 1×10⁻⁸ F before calculating resistance.",
      "Choose a real E12/E24 value and use that value—not the ideal R—to calculate the achieved cutoff and signed percent deviation.",
    ],
    values: (s) => {
      const d = m.resistorDesign(50, 1e-8, s.series);
      return {
        capacitanceF: 1e-8,
        targetHz: 50,
        idealOhm: d.ideal,
        selectedOhm: d.selected,
        achievedHz: d.achieved,
        deviationPercent: d.deviation,
      };
    },
  },
  {
    id: "exercise-8-7",
    number: "8.7",
    page: 239,
    title: "Design a 100 Hz passive high-pass",
    lab: "8.7.3",
    learn:
      "Use the same visually confirmed 0.01 µF capacitor and fc=1/(2πRC). The high-pass corner equation matches the low-pass equation, but its magnitude/phase shape is different. E24 gives 160 kΩ; E12 gives 150 kΩ under the stated cutoff-error criterion. Browser Bode plots replace the requested MATLAB plot.",
    hints: [
      "The capacitor is 10 nF, not 10 µF: confusing µF and mF changes resistance by a factor of 1000.",
      "Check achieved fc, signed percent deviation, and +45° high-pass phase at the actual corner.",
    ],
    values: (s) => {
      const d = m.resistorDesign(100, 1e-8, s.series);
      return {
        capacitanceF: 1e-8,
        targetHz: 100,
        idealOhm: d.ideal,
        selectedOhm: d.selected,
        achievedHz: d.achieved,
        deviationPercent: d.deviation,
      };
    },
  },
];
