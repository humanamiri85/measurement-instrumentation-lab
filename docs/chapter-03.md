# Chapter 3 — Measurement Errors, Uncertainty & Noise

## Repository audit and implementation scope

Audited `origin/main` at `a94ed5c` before implementation. This checkout contains Chapter 2 and a course home; it contains no Chapter 1, Chapter 3 placeholder, separate legacy Aircraft Instrumentation Lab, phase 6/7/10/11 code, or CI/deployment workflow. Do not equate those legacy phase numbers with textbook chapters. Existing functionality remains intact.

Reusable infrastructure: shared responsive CSS; vanilla ES-module routing conventions; labelled controls, SVG plotting, numerical metrics, tables, concept questions; optional localStorage completion; pure sample statistics; calibration line fitting; standard pressure/altitude and low-speed air-data relationships. Relevant old-phase capabilities are represented only by Chapter 2's calibration, quantization/sampling, repeated-reading illustrations, and aircraft models. No unavailable legacy code was fabricated.

Missing capabilities were genuine seeded random experiments, systematic source isolation, independent calibration validation, bounded/conditional statistical budgets, voltage spectra and conditioning, and an evidence-driven aircraft investigation. Added chapter-specific pure models, UI helpers, labs, aircraft case, controller, shell, and CSS. Existing shared UI and numerical files were reused unchanged. The home gains a Chapter 3 card; test commands include the new suites. No runtime dependency, framework, backend, account, or future chapter is added. GitHub Pages still serves relative static paths without a build.

Principal risks: confusing errors with uncertainty; treating every limit as a random standard deviation; assuming independent observations despite correlation; validating on fitted points; misleading spectrum normalization; optimizing noise reduction while destroying useful signal; and identifying a unique physical coupling path from a frequency peak. Model checks and visible qualifications address each.

The supplied Morris & Langari third-edition PDF was cross-checked against Chapter 3, printed pp. 45–74. Its six topic sections are §§3.2–3.7; lab numbers 3.1–3.6 follow the requested activity sequence, rather than reproducing textbook subsection numbers. Explanations and datasets are original/reused project material; the PDF is not distributed. Loading, connecting-lead resistance, wear, internal potentials, and shot noise are explicitly discussed alongside the requested practical examples.

## Learning objectives and sequence

| Stage                                      | Learning outcomes                                                      | Experiment and verification                                                                                                                                                                                                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 Sources of systematic error            | LO1 identify sources; LO2 quantify errors                              | Isolate offset, gain, temperature, accumulated drift, nonlinear bow, and random disturbance. Compare calibration and error curves and signed contributions. Discuss hysteresis, loading, installation, procedure, and observation.                                                    |
| 3.2 Reduction of systematic errors         | LO3 design/validate correction                                         | Collect reference points, estimate coefficients, apply offset/two-point/multipoint correction, test separate pressures and temperature, compare maximum error, signed mean, RMSE and %FS. Explain selection, controlled conditions, installation, compensation, and drift monitoring. |
| 3.3 Quantification of systematic errors    | LO2 quantify; LO5 appropriate calculations                             | Input-referred sensor/conditioner/DAQ biases and residual limits. Apply known corrections, calculate signed sums/worst-case budget, optionally assume independent rectangular residuals. Worked example with units.                                                                   |
| 3.4 Sources and treatment of random errors | LO4 variation; LO5 statistics                                          | Seeded repetitions, N = 5/20/100/500, sample SD, SEM, distribution, confidence interval, histogram, AR(1) correlation, and bias retention. Explain outlier investigation and repeatability versus reproducibility.                                                                    |
| 3.5 Induced measurement noise              | LO6 plausible physical mechanisms                                      | Voltage versus time, Hann amplitude spectrum, RMS and SNR, broadband disturbance, 50/60 Hz pickup, drift, switching transient. Explain capacitive/inductive/common-mode coupling, power line, ground loops, excitation and routing.                                                   |
| 3.6 Reducing induced measurement noise     | LO7 mitigation; LO8 fidelity trade-offs                                | Causal moving average, low-pass, notch, differential/CMRR, shielding, wiring. Compare residual disturbance, SNR, useful amplitude, phase delay, distortion and total tracking error; discuss grounding, isolation, instrumentation amplification and power quality.                   |
| Aircraft investigation                     | LO1–LO10 including LO9 evaluate AI and LO10 evidence-based conclusions | Four unknown pressure-chain runs; collect diagnostic references, sweeps, repetitions, spectra; compare hypotheses, correct, independently validate, record an evidence matrix and conclusion.                                                                                         |

Every lab has an English LEARN → EXPERIMENT → ANALYZE → AI CHALLENGE → VERIFY flow, a reference scenario/prediction, adjustable controls, reset, numerical results, data table, visualization, interpretation, concept verification, and optional AI investigation. CORE/EXPLORE labels are guidance, not locks or separate modes. Completion is voluntary; experiments and written notes reset on stage change. Downloads preserve notes. No text is sent to an external service. Completion uses `mi-lab-chapter-03-v1`, independently of Chapter 2; storage failure leaves experiments usable.

## Mathematical models and assumptions

### Systematic sources and correction

Pressure in kPa; illustrative range 0–100 kPa:

`y = (1 + g)x + b + kT(T − 20°C) + d + 4a(x/100)(1 − x/100) + ε`.

`g` is relative gain error (kPa/kPa); `b`, `d`, `a`, and ε are kPa; `kT` is kPa/°C. Drift is the accumulated offset at the observation time, not a universal aging law. Source switches zero each contribution. A fixed seeded Gaussian draw illustrates random disturbance in the current indication; calibration/error curves exclude it. Hysteresis/loading/procedural errors are explained, not falsely modeled by this additive equation.

The correction workshop isolates deterministic behavior with noiseless synthetic references. Calibration points are `[0,20,40,60,80,100]` kPa at 20°C; validation points are `[10,30,50,70,90]` kPa, never fitted. Offset correction subtracts the zero reading. Two-point correction inverts the endpoint affine model with student-adjustable offset/slope. Multipoint correction linearly interpolates the monotone inverse calibration knots; nonlinear validation residuals remain. Known deterministic temperature correction precedes inversion. Coefficient/reference uncertainties are not simulated. Real corrections require their uncertainty and stability to be assessed.

Metrics: signed mean error; maximum absolute error; `sqrt(mean(error²))` RMSE; maximum absolute error / 100 kPa full scale × 100%. Calibration compares; correction changes reporting; adjustment changes an instrument. These are distinct.

### Error budgets

All stages are expressed in input-referred kPa. Known bias `Σb` adds algebraically. Residual unknown limits have worst-case half-width `Σa`, giving maximum magnitude `|Σb| + Σa` before exact correction, and `Σa` after correction. Signed cancellation does not cancel residual limits. Relative error at zero is undefined. Percentage full-scale error is distinct from percentage-of-reading error.

The optional standard uncertainty is **conditional**: independent, zero-mean rectangular residual distributions of half-width `a` have `u = a/√3`; `uc = sqrt(Σa²/3)`. This is not RSS of arbitrary systematic limits, not a coverage interval, and omits reference/correction uncertainty and covariances. Known corrections and their residual uncertainty are different quantities. The text introduces small deterministic propagation with sensitivities; no claim of a full GUM treatment is made.

### Repeated readings

A seeded 32-bit LCG plus Box–Muller transform supplies reproducible Gaussian innovations. Uniform disturbances use `√3(2U−1)` for the same unit variance. The sample SD reuses the existing `(N−1)` estimator. Independent estimated SEM is `s/√N`. Gaussian independent 95% intervals use Student-t critical values for df 4, 19, 99, 499: 2.776445105, 2.093024054, 1.984216952, 1.964729390. Uniform intervals are only approximate normal large-sample intervals at N ≥ 100; no interval is offered for small N.

The correlated Gaussian model is stationary AR(1): `e[i] = ρe[i−1] + σ√(1−ρ²)z[i]`, initialized with variance σ². Known-model mean variance is `σ²[N + 2Σ(N−k)ρ^k]/N²`. Its 95% normal interval uses the **known simulation** σ and ρ; it is not a fitted correlation estimator. All these intervals target the biased population mean, not the true measurand, and omit bias/reference uncertainty. The expected mean remains reference + bias. One finite run need not improve monotonically with N. No model requires all real errors to be Gaussian.

### Induced noise and conditioning

Voltage in mV; useful signal is a 2 Hz sine of selected peak amplitude. Disturbance contains seeded discrete Gaussian broadband samples, a 50 or 60 Hz line sine, 0.5 Hz drift, and an optional 2 mV switching pulse from 0.35–0.37 s. Sampling is 200/500/1000 samples/s, duration 0.5/1/2 s, with at most 2000 samples. All sample rates exceed twice the line frequency. This discrete noise model is not an analog anti-aliasing model.

RMS is `sqrt(mean(v²))`. Disturbance is measured against the clean reference, without mean subtraction, so RMS includes drift/offset effects. `SNR = 20 log10(RMS useful / RMS disturbance)` is equivalent to power ratio at the same impedance. Zero useful signal: undefined; nonzero useful signal with zero noise: infinite. Values are illustrative, not hardware specifications.

Spectrum: DFT of a mean-removed record with a symmetric Hann window; bins `k fs/N`; amplitudes divided by window sum; positive-frequency bins doubled except DC/Nyquist. Axes show Hz and **peak amplitude**, not power density. Coherent-gain correction is exact for a bin-centered isolated tone to the numerical tolerance tested; off-bin leakage and short-record resolution remain. No amplitude spectrum uniquely identifies a physical coupling path.

Filtering starts from zero state, including startup in tracking error:

- Moving average: fixed-length causal window, zero padded at startup; group delay `(M−1)/(2fs)` within its first lobe.
- First-order low-pass: `α = 1 − exp(−2πfc/fs)` and `y += α(x−y)`.
- Notch: zeros at selected line frequency, poles of radius 0.95, normalized to unity DC gain.
- Shielding/routing scenarios reduce induced line/transient coupling to 10%/30%, respectively; these chosen factors are not physical guarantees. Sensor broadband noise and low-frequency drift remain.
- Differential scenario assumes 80% of induced pickup is common-mode, attenuated by 60 dB amplitude CMRR, with 20% differential pickup remaining. Linear common-mode range and matching are assumed; saturation is not modeled.

Residual disturbance = conditioned noisy signal − conditioned clean signal. Conditioned SNR uses that filtered useful component. **Total tracking RMSE** compares conditioned noisy signal against the original clean signal and therefore includes distortion, attenuation, delay and startup. Useful-component distortion is also reported. Steady-state useful 2 Hz amplitude/phase delay is measured on a four-second unit-sine probe after two seconds of warmup; phase delay is frequency-specific, not universal step delay. A 0.5 Hz low-pass attenuates a useful 2 Hz sine to about 24.3%, providing a counterexample to “strongest filter is best.” Software cannot recover clipping, unobserved aliasing, or poor analog acquisition.

### Aircraft case and instructor key

Reuses the Chapter 2 standard-troposphere and `V_E = sqrt(2(pt−ps)/1.225)` equivalent-speed model. Pressure is Pa, density is kg/m³, speed is m/s, altitude is m. The low-speed conditions do not model compressibility, weather correction, aerodynamic installation errors, or certification. Negative impact pressure is invalid; no VSI is invented from a static sample.

| Run | Dominant synthetic source                                    | Discriminating evidence                                                 | Corrective action                                                               |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| A   | Static offset 120 Pa at 20°C plus 3 Pa/°C temperature effect | Static-channel references at multiple pressures and temperatures        | Subtract characterized offset and temperature term                              |
| B   | Total-pressure gain 1.003                                    | Multi-pressure pitot sweep, normal static mean                          | Invert gain calibration                                                         |
| C   | Independent 25 Pa Gaussian channel noise                     | Repeated readings **and timed spectrum** to distinguish periodic pickup | Average 100 actual independent seeded pressure readings; residual noise remains |
| D   | 80 Pa, 50 Hz induced pressure-equivalent pickup              | Timed spectrum and coupling intervention                                | Illustrative 90% coupling reduction; residual pickup remains                    |

Initial conditions use heights 500/1000/2000 m and speeds 40/60/80 m/s. Validation uses separate heights 650/1350/2150 m and speeds 35/55/75 m/s and another seed. Controlled diagnostic mean-reference/sweep checks isolate the deterministic response and are noiseless ideal mean observations; finite real checks have uncertainty. Run D exploratory repeated checks sample randomized phases of a sine, not Gaussian pickup. Timed spectra distinguish coherent pickup. The model has one dominant mechanism per run; real faults can coexist.

Diagnosis feedback distinguishes additional evidence needed, contradicted mechanism, partially supported diagnosis without action/validation, and support under the model. AI agreement never determines feedback. The matrix holds supporting evidence, contradictions, needed experiments, AI suggestions, verified diagnostic results and decisions. Free-text reasoning is not automatically graded. Conclusions must cite quantitative validation and state remaining uncertainty.

## Optional AI investigations

A: diagnose the unknown increasing-pressure dataset reused from Chapter 2 and test plausible mechanisms with isolated controls. B: design a correction and test independent pressures/temperature. C: reduce noise without destroying the useful signal. Each includes problem/conditions, current numerical evidence, an exportable optional prompt, required numerical checks, an evidence writing field/table, reflection, and evidence-based assessment criteria. Other stages and the aircraft case include corresponding optional investigations. Authored flawed claims provide an offline alternative; no AI API/backend is used.

## Validation and acceptance

Model tests verify zero error, additive contributions, separate correction validation, nonlinear inverse limitations, signed/full-scale metrics, worst-case/conditional statistical budgets, reproducible RNG, N−1 SD, Student-t intervals, square-root sample scaling across an ensemble, correlation covariance, histogram boundaries, RMS/SNR zero conditions, known-tone spectral amplitude, causal filter responses, DC/line behavior, useful attenuation/delay, aircraft corrections, actual averaging, evidence gating, and invalid input handling.

Browser tests exercise every range limit, checkbox, select, concept question, reset, AI preparation/writing/download, calibration workflow, all diagnostic experiments/actions/cases, independent validation, matrix editing/export, completion persistence/fallback, keyboard focus, SVG finiteness, console/request errors, four responsive widths, and WCAG A/AA automated audits. The existing Chapter 2 suite is run unchanged. Chapter 1 cannot be regression-tested because it is absent from this repository.

Final execution results and screenshots are recorded in the PR/report. Screenshots generated in `test-results/` are ignored; selected review images are copied to `docs/screenshots/` for the PR. Automated accessibility checks are supplemented by desktop/phone visual review, not a full assistive-technology audit.

## Known limits and future improvements

The simple models make mechanisms inspectable and do not specify real sensor hardware. Gaussian/discrete noise and AR(1) correlation are selectable teaching assumptions. Reference/correction uncertainty, joint faults, analog saturation, anti-aliasing hardware, and comprehensive traceability are outside scope. Future improvements can add measured datasets, reference/coefficient covariance, robust outlier sensitivity studies, joint fault hypotheses, and human screen-reader review. Detailed ADC theory, calibration standards, accounts and unrelated chapters remain deferred.

## Final verification record

- `npm test`: **40/40 passed** (20 preserved Chapter 2 tests, 20 new Chapter 3 tests).
- `npm run test:browser`: both suites passed; Chapter 2 **92** layout combinations, Chapter 3 **28** stage/viewport layouts, at 1440/1280/768/390 px.
- Final Chapter 3 rerun after visual corrections: passed all controls/resets, details, AI notes, independent calibration validation, all four aircraft cases, evidence gating, exports, storage fallback, keyboard focus, page overflow and bench clipping checks, and WCAG A/AA audits. No console or request errors.
- Shared Chapter 2 source, models, styles, tests and lockfile are unchanged relative to the audited main branch.
- Reviewed desktop and phone screenshots of the learning stages and five focused review images in `docs/screenshots/`. These include independent affine correction, a harmful aggressive filter, the time/frequency noise view and aircraft data.

| Acceptance criterion                         | Status / evidence                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Six required textbook topics                 | Implemented in labs 3.1–3.6                                                                     |
| Meaningful interaction in every major module | Seven functional labs, controls, resets, tables, plots and feedback                             |
| Numerical calculations verified              | 40 tests passed, including 20 new Chapter 3 tests                                               |
| Clear educational objectives                 | LO mapping, Learn/Experiment/Analyze/AI/Verify structure and prediction tasks                   |
| Compare measured and reference quantities    | Present throughout; separate correction/case validation                                         |
| Distinguish systematic and random errors     | Source isolation, repeatability and bias-retention examples                                     |
| Meaningful noise/fidelity trade-offs         | RMS, SNR, amplitude, delay, distortion and tracking error                                       |
| Integrated engineering investigation         | All four cases tested with evidence/action/validation feedback                                  |
| Evidence-based AI verification               | Three named investigations plus stage/case prompts and evidence matrix; no AI-dependent grading |
| Existing chapters preserved                  | Chapter 2 suite passed unchanged; Chapter 1 absent from checkout                                |
| Responsive behavior tested                   | 28 Chapter 3 layouts plus focused desktop/phone visual review                                   |
| Documentation updated                        | Audit, objectives, models, instructor key, tests, limits and future work recorded               |
| Reviewable pull request                      | Blocked: GitHub GraphQL API returned Forbidden; branch pushed, prepared PR description saved in chapter-03-pr.md                     |

### Instructor review checklist

- Verify the six topic mappings and course terminology, especially the difference between error limits and uncertainty.
- Check separate calibration/validation pressures and the residual nonlinear/temperature behavior.
- Compare unbiased precision improvement with persistent bias and correlated SEM assumptions.
- Compare baseline, notch and 0.5 Hz low-pass on the 2 Hz useful signal.
- Require discriminating aircraft experiments, a matching corrective action and independent validation.
- Review written AI evidence and conclusions manually; the app does not grade prose.
- Confirm the stated model limits are suitable for your course before merging.
