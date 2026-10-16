# Measurement & Instrumentation Interactive Lab

An original, browser-based undergraduate engineering learning environment for **Chapter 2: Instrument Types and Performance Characteristics** and **Chapter 3: Measurement Errors, Uncertainty & Noise**. Students predict, operate an instrument, observe evidence, explain behavior, and make engineering decisions. Suitable for lecture demonstrations, laboratory discussion, and self-study.

Conceptual basis: Alan S. Morris and Reza Langari, _Measurement and Instrumentation: Theory and Application_, third edition, Chapter 2. Explanations, examples, SVG diagrams, questions, and simulations are original. The textbook PDF is not distributed in this repository.

## Learning journey

| Learning block / stage              | What students do                                                                                                                                                                                                                    |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A · 2.1 Measurement chain           | Follow atmospheric pressure through sensing, transduction, conditioning, acquisition, processing, and cockpit indication. Compare instruments for a low-pressure line.                                                              |
| A · 2.2 Instrument types            | Trace active/passive energy paths; balance a dead-weight reference; compare continuous, sampled, and quantized signals; reuse the Measurement Chain signal-output activity; investigate smart compensation.                         |
| B · 2.3 Static performance          | Operate ten benches, including a negative-endpoint range/span scale, target-style accuracy/precision examples, repeatability/reproducibility, threshold/resolution, sensitivity, linearity, drift, hysteresis sweeps, and backlash. |
| C · 2.4 Dynamic performance         | Vary step amplitude, gain, time constant, damping, and natural frequency; compare zero-, first-, and second-order responses, the 63.2% point, overshoot, and settling.                                                              |
| D · 2.5 Calibration                 | Compare against a reference, record evidence, adjust and verify; separately toggle offset, scale error, noise, and nonlinearity on a calibration curve. Distinguish observed error from uncertainty.                                |
| Aerospace and engineering synthesis | Investigate pitot-static channel bias, complete the retained instrument-selection challenge, and critically evaluate an AI analysis of a synthetic measurement dataset.                                                             |

Tolerance, disturbance sensitivity, range/span, and calibration versus adjustment are explicitly explained in the relevant benches. The final challenge intentionally has a narrow performance margin: it teaches the need to verify assumptions rather than blindly accept a specification.

## Preview locally

No build step, runtime package installation, backend, external fonts, or CDN is required. Serve files with Python 3 (ES modules should not be opened through `file://`):

```sh
cd /workspace/measurement-instrumentation-lab  # or your local checkout
python3 -m http.server 8000 --bind 127.0.0.1
```

In a local browser, open `http://127.0.0.1:8000/`. This is a development address, not a hosted site. Stop the server with Ctrl+C.

The home page links to the chapter overview and first stage. Each stage has previous/next navigation. The browser Back button also follows stage history. All five instrument explorers and ten static benches are individually selectable. The final stage has three selectable activities: Pitot-static case, Instrument selection, and AI Engineering Challenge.

Stage completion is voluntary and stored in localStorage under `mi-lab-chapter-02-v1`. Experiments work if storage is disabled or throws an error. Changing stages resets experiment settings and notes; only completion persists. Changing an experiment tab also resets its local notes and controls. Both instrument-selection notes and AI evidence notes can be downloaded before leaving an activity. There is no account, analytics, or submission service.

## Tests

Node.js 20 or later is needed for the test tooling, not for serving the site.

```sh
npm ci --ignore-scripts --cache /tmp/mi-npm-cache
npm test
npm run test:browser
```

The pure-model suite checks full-scale/relative error, quantization, threshold onset, analytic dynamic responses and settling, drift, linearity, hysteresis, history-dependent backlash, calibration, repeated-measurement statistics, and the integrated challenge. Seven enrichment tests additionally verify range/span, scaled first-order responses, sampling/quantization, configurable calibration errors, standard-atmosphere conversion, static-channel bias, and the AI dataset line fit.

The browser suite starts its own Python server on port 8765, serves the site under the repository subpath, and uses Playwright plus axe-core. It tests navigation; every slider and select at its limits; calibration pass/fail and error toggles; the existing Measurement Chain transition; aircraft pressure-bias behavior; AI evidence feedback and downloads; feedback; exports; progress storage/fallback; native keyboard behavior; SVG finiteness; console/request errors; automated WCAG A/AA rules; and 92 layout combinations at **1440, 1280, 768, and 390 px** widths. Screenshots are generated in ignored `test-results/` for visual review.

The suite defaults to system Chromium at `/usr/bin/chromium`. To use another installed Chromium executable:

```sh
CHROMIUM_PATH=/path/to/chromium npm run test:browser
```

For a developer machine without Chromium, install a Playwright browser with `npx playwright install chromium`, then set `CHROMIUM_PATH` to the executable path reported by `node --input-type=module -e "import {chromium} from 'playwright'; console.log(chromium.executablePath())"`. Browser installation may need operating-system libraries. The website itself has no such dependency.

Automated accessibility checks supplement semantic markup, labels, visible keyboard focus, non-color feedback, touch-size controls, numerical chart summaries, and reduced-motion support. They are not a substitute for a full assistive-technology audit.

## GitHub Pages deployment

This is a static site with **relative asset and navigation paths**, including the chapter two directory. It works at `/measurement-instrumentation-lab/`; nothing assumes deployment at the domain root. No bundling or generated output is needed.

After reviewing and merging the development branch:

1. In the repository, go to **Settings → Pages**.
2. Choose **Deploy from a branch**.
3. Select **main** and **/ (root)**, then save.
4. Wait for GitHub Pages deployment and use the URL shown in those settings.

Alternatively, select the development branch for a review deployment. This project does not change repository settings or publish automatically. `.nojekyll` makes the static-file intent explicit. No secrets are required.

## Architecture

```text
index.html                         Course home
chapters/chapter-02/index.html      Chapter shell and semantic navigation
assets/styles.css                  Shared responsive design and print styles
assets/favicon.svg                 Original local icon
assets/js/chapter.mjs               Routing, chapter sequence, optional progress
assets/js/ui.mjs                    Controls, questions, SVG plotting, formatting
assets/js/models.mjs                Pure, independently tested engineering models
assets/js/types.mjs                 Introduction and instrument classifications
assets/js/static.mjs                Ten static experiments
assets/js/dynamic.mjs               Step-response workstation
assets/js/calibration.mjs           Reference comparison and verification
assets/js/challenge.mjs             Synthesis activity switcher + retained selection
assets/js/chapter2-activities.mjs    Measurement bridge, aircraft case, AI evidence
assets/js/chapter2-models.mjs        Chapter-only enrichment models and dataset
assets/js/calibration-errors.mjs    Configurable error-characterization bench
chapters/chapter-02/enrichment.css  Chapter-only teaching visual styles
tests/models.test.mjs               Node test suite
tests/browser.mjs                   Chromium interactions, layouts, and axe audits
```

Runtime code is vanilla JavaScript, HTML5, and CSS3. Test dependencies are development-only and pinned in `package-lock.json`. An instructor can adjust explanatory text in the relevant module, simulation equations in `models.mjs` or `chapter2-models.mjs`, and presentation in `styles.css` or the chapter-only `enrichment.css`. The homepage, global header/styles, shared plotting utilities, and established models are unchanged by the enrichment. Keep engineering calculations out of presentation markup where possible.

## Model conventions and limits

- **Active/passive** follows the chapter's energy convention: an active instrument modulates an external energy source; a passive gauge obtains pointer energy from the measurand. Some sensor literature uses these terms differently.
- Full-scale error is a maximum bound, not a randomly generated actual error or a confidence interval. Relative error at zero is undefined. Out-of-range readings invalidate the stated error specification.
- Repeated-measurement points use a deterministic pattern to separate bias, scatter, and changed-condition shifts; they are not a statistical uncertainty study.
- Threshold suppresses the initial response below a selected level, then the response is quantized. The abrupt onset is intentionally idealized.
- Linearity uses an **endpoint** reference, not a least-squares fit. Hysteresis uses separate quasi-static full loading/unloading branches and does not model partial-reversal minor loops; backlash retains actual input history via a play operator.
- Dynamic responses start at 20°C with adjustable step amplitude and gain K. First-order normalization is Δoutput/(K Δinput) = 1 − exp(−t/τ). The 63.2% point is a fraction of the final output change, not absolute temperature. **Critical damping is ζ = 1**; ζ ≈ 0.707 is underdamped with about 4.3% overshoot. A visible activity note acknowledges the assigned textbook’s different use of “critically damped” for ζ = 0.707 while retaining standard scientific terminology. Frequency is in rad/s. Numerical settling is the last crossing of a ±2% band within the reported simulation horizon; undamped motion never settles.
- Calibration compares against a stated reference. Adjustment applies `gain × (raw + zero)` to an affine teaching model. Real calibration requires traceability, uncertainty, environment records, and possibly nonlinear/history checks.
- The challenge conservatively adds bounded static error, temperature offset, half a quantization step, and step-response lag. This is not a statistical uncertainty combination or a complete procurement assessment.

## Aerospace and AI activity scope

The existing Measurement Chain functionality is the indicator/4–20 mA transmitter experiment inside the instrument explorer; this checkout has no separate Measurement Chain page or pre-existing pitot-static simulator. The compact altitude bridge and aircraft case link directly to that activity through `#types/signal`; they do not replace it. The synthesis panels can be opened directly with `#challenge/aircraft`, `#challenge/selection`, and `#challenge/ai`.

The aircraft case is an ideal low-speed demonstration, not a flight-navigation or certification tool. It uses a standard tropospheric pressure relation and an incompressible equivalent-speed relation at reference density 1.225 kg/m³. Pressure altitude is distinguished from weather-corrected/true altitude. Negative measured impact pressure is reported as invalid. VSI is explained as a time-history quantity, not fabricated from a single steady-state sample.

The AI challenge has no API dependency. Students diagnose data first, optionally prepare a prompt for an assistant of their choice, or critique an explicitly authored flawed sample answer. A numerical line-fit reference is available offline. Free text is retained locally in the current activity and is never submitted or automatically graded. One increasing steady-state run cannot establish hysteresis, a time constant, reproducibility, or a complete uncertainty budget.

Only the supplied Morris & Langari material was available in this checkout/session. Other named lecture notes and source books were not present; the enrichment does not attribute unsupported quotations to them. Explanations and diagrams remain original, with standard measurement definitions and explicit model limits.

## Future extensions

Add another chapter in its own `chapters/` directory with a dedicated controller and reuse the shared styles, SVG utilities, and pure models. Keep a complete learning path rather than adding empty chapter links. Add model tests for any new engineering equations and browser checks for new controls. No future-chapter placeholders are needed to use Chapter 2 now.

## Chapter 3 — Measurement Errors, Uncertainty & Noise

Chapter 3 is an integrated seven-stage continuation at `chapters/chapter-03/index.html`, linked from the course home. It covers the six required textbook topics: systematic sources, reduction, quantification, random errors, induced noise, and noise reduction. Its final aircraft pressure-chain investigation requires diagnostic evidence, a matching correction, and independent validation.

Reuse the existing preview command. `npm test` now runs both chapter model suites; `npm run test:browser` runs the unchanged Chapter 2 browser suite followed by Chapter 3. No new dependency, build step, account, AI API, or deployment setting is required.

The Chapter 3 controller, labs, aircraft case, UI helpers and pure models are in `assets/js/chapter3*.mjs`, with a chapter shell and local CSS in `chapters/chapter-03/`. Existing shared UI, statistics and air-data utilities are reused. Its optional progress storage is independent of Chapter 2. All written evidence stays in the current page until downloaded and resets on navigation.

See [Chapter 3 instructor and model guide](docs/chapter-03.md) for the repository audit, LO1–LO10 mapping, laboratory and AI workflows, equations, noise/spectrum/filter assumptions, instructor case key, validation methodology, limits and future improvements. The teaching distinction is explicit: error is not uncertainty; correcting known bias does not remove all uncertainty; averaging can improve precision while preserving bias; and less visible noise can accompany worse signal fidelity. The original Chapter 2 journey, roadmap and future-extension guidance remain unchanged. This checkout contains no Chapter 1 or legacy phase code.

## Chapter 4 — Statistical Analysis of Measurements

The complete Chapter 4 is available at `chapters/chapter-04/index.html#4.1`. Its 24 discoverable routes cover all sixteen textbook sections, six subsections, a pressure investigation and three optional offline AI critiques. The practice bank contains 22 worked examples and 60 individually referenced problems, progressive hints, independent numerical answer checks and visible source/adaptation notes.

`npm test` includes independent NumPy/SciPy fixtures for all numerical bank answers and distribution values. `npm run test:browser` runs the unchanged Chapter 2/3 suites and the Chapter 4 interactions, accessibility and responsive checks. No runtime dependencies, build or deployment changes are needed. Offline fixture regeneration uses `python3 scripts/audit-chapter4.py` with NumPy/SciPy installed; that tool is not part of the public app.

The controller, activities, pure models and bank are isolated in `assets/js/chapter4.mjs` and `assets/js/chapter4/`, with local chapter CSS. Shared statistics, reproducible sampling, table/escaping utilities and the existing low-speed pressure model are reused. Chapter 4 progress, dataset state and notes use independent browser storage with a session-memory fallback and JSON export. Written reasoning is self/instructor reviewed; no AI API or automatic external transmission is involved.

See the [Persian instructor guide](docs/chapter-04/instructor-guide.fa.md), [complete coverage matrix](docs/chapter-04/coverage.md) and [validation evidence](docs/chapter-04/validation.md). Ambiguous source statements are explicitly corrected or adapted; no textbook PDF or full prose is redistributed. Pearson tests use tail-complete grouped fitting and guarded degrees of freedom; non-rejection never proves normality. Standard uncertainty, tolerance bounds, SEM and single-reading prediction intervals remain distinct.
