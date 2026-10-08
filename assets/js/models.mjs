// Pure engineering models. Inputs use the units displayed by each laboratory.
export const clamp = (x, min, max) => Math.min(max, Math.max(min, x));
export function rangeMetrics(span, accuracyFS, pressure) {
  const absolute = (span * accuracyFS) / 100;
  return {
    absolute,
    relative: pressure === 0 ? null : (100 * absolute) / Math.abs(pressure),
    utilization: (100 * pressure) / span,
    inRange: pressure >= 0 && pressure <= span,
  };
}
export function quantize(input, step) {
  return Math.round(input / step) * step;
}
export function thresholdOutput(input, threshold, step) {
  return input < threshold ? 0 : quantize(input, step);
}
export function firstOrder(t, tau) {
  return t <= 0 ? 0 : -Math.expm1(-t / tau);
}
export function secondOrder(t, damping, omega) {
  if (t <= 0) return 0;
  const u = omega * t;
  if (Math.abs(damping - 1) < 1e-8) return 1 - Math.exp(-u) * (1 + u);
  if (damping < 1) {
    const d = Math.sqrt(1 - damping * damping);
    return (
      1 -
      Math.exp(-damping * u) *
        (Math.cos(d * u) + (damping / d) * Math.sin(d * u))
    );
  }
  const d = Math.sqrt(damping * damping - 1),
    a = damping - d,
    b = damping + d;
  return 1 - (b * Math.exp(-a * u) - a * Math.exp(-b * u)) / (2 * d);
}
export function overshoot(damping) {
  return damping >= 1
    ? 0
    : 100 * Math.exp((-Math.PI * damping) / Math.sqrt(1 - damping * damping));
}
export function drift(input, temperature, mode) {
  const delta = temperature - 20;
  const offset = ["zero", "combined"].includes(mode) ? 0.025 * delta : 0;
  const gain = ["gain", "combined"].includes(mode) ? 1 + 0.003 * delta : 1;
  return { output: offset + gain * input, offset, gain };
}
export function nonlinearity(input, amount) {
  return input + amount * 4 * (input / 10) * (1 - input / 10);
}
export function hysteresis(input, width, direction) {
  return (
    input +
    ((direction === "up" ? -1 : 1) * width * Math.sin((Math.PI * input) / 10)) /
      2
  );
}
// A rate-independent play operator: reversal traverses 2*halfWidth before the output moves.
export function backlash(input, previous, halfWidth) {
  return clamp(previous, input - halfWidth, input + halfWidth);
}
export function calibration(input, zero, gain) {
  return (1.08 * input + 0.4 + zero) * gain;
}
export const samplePattern = [
  -1.5, 0.4, -0.6, 1.2, -0.2, 0.8, -1.1, 0.1, 1.6, -0.7,
];
export function samples(bias, scatter, shift = 0, run = 0) {
  return samplePattern.map(
    (_, i) =>
      5 +
      bias +
      shift +
      scatter * samplePattern[(i + run) % samplePattern.length],
  );
}
export function statistics(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return {
    mean,
    sd: Math.sqrt(
      values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1),
    ),
  };
}
export function settlingTime(response, horizon = 20, tolerance = 0.02) {
  let lastOutside = -1;
  const count = 2000;
  for (let i = 0; i <= count; i++)
    if (Math.abs(response((i * horizon) / count) - 1) > tolerance)
      lastOutside = i;
  return lastOutside >= count ? null : ((lastOutside + 1) * horizon) / count;
}
