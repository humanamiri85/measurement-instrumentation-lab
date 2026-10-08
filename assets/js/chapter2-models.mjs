// Chapter 2 enrichment only: reuse the established instrument models.
import {
  firstOrder,
  quantize,
  nonlinearity,
  samplePattern,
} from "./models.mjs";
export function instrumentSpan(lower, upper) {
  return upper - lower;
}
export function scaledStep(t, tau, amplitude, gain, initial = 20) {
  return initial + gain * amplitude * firstOrder(t, tau);
}
export function sampledSignal(interval, resolution, duration = 4) {
  const signal = (t) => 5 + 2 * Math.sin(Math.PI * t);
  const samples = Array.from(
    { length: Math.floor(duration / interval) + 1 },
    (_, i) => {
      const t = i * interval;
      return { t, analog: signal(t), digital: quantize(signal(t), resolution) };
    },
  );
  // Duplicate each update time to draw an instantaneous transition, not a ramp.
  const held = samples.flatMap((sample, i) =>
    i === 0
      ? [[sample.t, sample.digital]]
      : [
          [sample.t, samples[i - 1].digital],
          [sample.t, sample.digital],
        ],
  );
  held.push([duration, samples.at(-1).digital]);
  return { signal, samples, held };
}
export function calibrationReading(
  input,
  { offset = 0.4, scale = 0.08, bow = 0, noise = 0 } = {},
  index = 0,
) {
  return (
    nonlinearity(input, bow) +
    offset +
    scale * input +
    noise * samplePattern[index % samplePattern.length]
  );
}
export function standardPressure(altitude) {
  return 101325 * (1 - (0.0065 * altitude) / 288.15) ** 5.25588;
}
export function pressureAltitude(pressure) {
  return (288.15 / 0.0065) * (1 - (pressure / 101325) ** (1 / 5.25588));
}
export function airData(staticPressure, totalPressure) {
  const impact = totalPressure - staticPressure;
  return {
    impact,
    equivalentSpeed: impact < 0 ? null : Math.sqrt((2 * impact) / 1.225),
    altitude: pressureAltitude(staticPressure),
  };
}
export const aiDataset = [
  { reference: 0, measured: 2.0 },
  { reference: 20, measured: 22.3 },
  { reference: 40, measured: 42.9 },
  { reference: 60, measured: 63.1 },
  { reference: 80, measured: 83.7 },
  { reference: 100, measured: 103.9 },
];
export function fitLine(rows) {
  const n = rows.length,
    mx = rows.reduce((s, r) => s + r.reference, 0) / n,
    my = rows.reduce((s, r) => s + r.measured, 0) / n;
  const slope =
    rows.reduce((s, r) => s + (r.reference - mx) * (r.measured - my), 0) /
    rows.reduce((s, r) => s + (r.reference - mx) ** 2, 0);
  const offset = my - slope * mx;
  return {
    slope,
    offset,
    residuals: rows.map((r) => r.measured - (offset + slope * r.reference)),
  };
}
