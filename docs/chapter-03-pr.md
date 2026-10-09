Chapter 3 now provides a complete interactive continuation of the existing laboratory: students identify measurement errors, validate corrections, characterize random variation, investigate induced noise, preserve useful signal fidelity, and support an aircraft diagnosis with evidence. The six required textbook topics are implemented as seven learning stages using the existing design and static ES-module architecture.

## Modules

- **3.1 Sources:** independently switch offset, gain, temperature, drift, nonlinearity and random disturbance; inspect reference/calibration/error curves and a signed contribution breakdown. Loading, leads, wear, installation, procedure and hysteresis are explained.
- **3.2 Reduction:** collect calibration pressures, estimate/apply offset or two-point coefficients, or use a monotone multipoint inverse. Validate at separate pressures and temperatures; compare maximum error, signed mean, RMSE and %FS.
- **3.3 Quantification:** configure input-referred sensor/conditioner/DAQ biases and limits; distinguish signed corrections, worst-case limits and conditional independent rectangular standard uncertainty.
- **3.4 Random errors:** seeded Gaussian/uniform readings, N = 5/20/100/500, histogram, sample SD, SEM, appropriately qualified mean intervals, bias retention and stationary AR(1) correlation.
- **3.5 Induced noise:** low-amplitude voltage signals with broadband noise, 50/60 Hz pickup, drift and transients; time records, Hann amplitude spectrum, RMS and defined SNR; physical coupling hypotheses.
- **3.6 Mitigation:** causal moving average, low-pass, notch, CMRR, shielding and wiring scenarios; report residual disturbance, conditioned SNR, useful attenuation/delay/distortion and total tracking error.
- **Aircraft case:** four unknown pressure-chain datasets, reference/sweep/repeated/spectral diagnostics, hypothesis matrix, matched corrective action, separate validation conditions and an exportable engineering conclusion.

## Reused infrastructure and scientific models

Reuses shared controls, questions, SVG plots, metrics, CSS, sample statistics, line fitting, standard-atmosphere conversion and low-speed equivalent-speed calculations. Chapter 2 source/models/styles/tests and the dependency lockfile are unchanged. There is no Chapter 1 or legacy phase implementation in this checkout. No framework, runtime dependency, backend, account or required AI service is added. All paths remain compatible with GitHub Pages.

Pure numerical models and their assumptions are documented in [the instructor guide](docs/chapter-03.md). Three named optional AI investigations plus stage/case prompts require numerical verification; AI agreement is never graded as correctness.

## Validation

- `npm test`: **40/40 passed**, including all 20 preserved Chapter 2 tests and 20 new Chapter 3 tests.
- `npm run test:browser`: Chapter 2 **92** layout combinations and Chapter 3 **28** stage/viewport layouts passed at 1440, 1280, 768 and 390 px.
- Final Chapter 3 rerun after visual corrections: every range limit/checkbox/select, concept questions, details, resets, calibration workflow, all aircraft cases, evidence gating, notes/matrix exports, storage fallback and keyboard focus passed.
- WCAG A/AA automated audits passed; no console or request errors. Layout checks include both page overflow and plots clipped inside benches.
- Independent checks include known-tone frequency/amplitude, analytic digital low-pass response, causal filter behavior, Student-t intervals, empirical averaging across a seeded ensemble, deterministic correction and pressure relationships.

## Review screenshots

![Chapter 3 overview](https://github.com/humanamiri85/measurement-instrumentation-lab/blob/chapter-3-measurement-errors-noise/docs/screenshots/chapter3-overview-desktop.png?raw=true)
![Independent pressure correction](https://github.com/humanamiri85/measurement-instrumentation-lab/blob/chapter-3-measurement-errors-noise/docs/screenshots/chapter3-correction-desktop.png?raw=true)
![Aggressive filtering destroys useful amplitude](https://github.com/humanamiri85/measurement-instrumentation-lab/blob/chapter-3-measurement-errors-noise/docs/screenshots/chapter3-filter-desktop.png?raw=true)
![Phone time/frequency noise view](https://github.com/humanamiri85/measurement-instrumentation-lab/blob/chapter-3-measurement-errors-noise/docs/screenshots/chapter3-noise-phone.png?raw=true)
![Phone aircraft pressure and validation data](https://github.com/humanamiri85/measurement-instrumentation-lab/blob/chapter-3-measurement-errors-noise/docs/screenshots/chapter3-case-phone.png?raw=true)

## Limits and unresolved review concerns

Models are illustrative, not sensor specifications or certification tools. Correlation intervals use known simulation parameters; reference/correction covariance is omitted. Shielding/CMRR/wiring factors are selected teaching scenarios. Digital filters do not undo analog clipping or aliasing. Aircraft datasets have one dominant mechanism each and use low-speed incompressible equivalent speed. Written conclusions are instructor/self-reviewed, not automatically graded. Automated accessibility audits are not a full screen-reader audit. No known failing numerical/browser checks remain.

The supplied textbook Chapter 3 (printed pp. 45–74) was cross-checked. Lab numbering follows the requested six-module sequence, while textbook topic sections are §§3.2–3.7. No textbook PDF is distributed.

## Instructor checklist

- [ ] Check six topic mappings and the explicit error/uncertainty distinctions.
- [ ] Review independent calibration validation and residual nonlinear/temperature errors.
- [ ] Verify bias retention, SD/SEM, mean-interval target and correlation assumptions.
- [ ] Compare baseline, notch and 0.5 Hz low-pass on the useful 2 Hz signal.
- [ ] Require discriminating aircraft evidence, a matching action and independent validation.
- [ ] Review AI evidence and written conclusions against numerical checks.
- [ ] Confirm model limitations suit the course before merging.

Please review before merging. This branch has not been merged or deployed by this task.
