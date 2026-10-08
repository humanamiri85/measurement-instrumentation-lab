# Measurement & Instrumentation Interactive Lab

An original, browser-based undergraduate engineering learning environment for **Chapter 2: Instrument Types and Performance Characteristics**. Students predict, operate an instrument, observe evidence, explain behavior, and make engineering decisions. Suitable for lecture demonstrations, laboratory discussion, and self-study.

Conceptual basis: Alan S. Morris and Reza Langari, _Measurement and Instrumentation: Theory and Application_, third edition, Chapter 2. Explanations, examples, SVG diagrams, questions, and simulations are original. The textbook PDF is not distributed in this repository.

## Learning journey

| Stage                   | What students do                                                                                                                                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1 Introduction        | Compare instruments for a low-pressure line; identify why a plausible display can mislead.                                                                                                                                                                                            |
| 2.2 Instrument types    | Trace passive/active energy paths; balance a dead-weight pressure reference; compare analog and quantized output; connect a controller signal; investigate smart compensation.                                                                                                        |
| 2.3 Static performance  | Operate nine benches: range and full-scale accuracy; bias and precision; repeatability/reproducibility; threshold and resolution; sensitivity and saturation; endpoint linearity; environmental zero/sensitivity drift; loading/unloading hysteresis; mechanical backlash/dead space. |
| 2.4 Dynamic performance | Apply a common temperature step to zero-, first-, and second-order models; inspect the 63.2% point, overshoot, damping regimes, natural frequency, and 2% settling.                                                                                                                   |
| 2.5 Calibration         | Compare an instrument with a reference at selected points; record before/after evidence; adjust zero and gain; verify five points against a tolerance.                                                                                                                                |
| Integrated challenge    | Compare three candidates using range, resolution, drift, lag, signal output, cost, and a conservative combined error bound; write and download a justification.                                                                                                                       |

Tolerance, disturbance sensitivity, range/span, and calibration versus adjustment are explicitly explained in the relevant benches. The final challenge intentionally has a narrow performance margin: it teaches the need to verify assumptions rather than blindly accept a specification.

## Preview locally

No build step, runtime package installation, backend, external fonts, or CDN is required. Serve files with Python 3 (ES modules should not be opened through `file://`):

```sh
cd /workspace/measurement-instrumentation-lab  # or your local checkout
python3 -m http.server 8000 --bind 127.0.0.1
```

In a local browser, open `http://127.0.0.1:8000/`. This is a development address, not a hosted site. Stop the server with Ctrl+C.

The home page links to the chapter overview and first stage. Each stage has previous/next navigation. The browser Back button also follows stage history. All five instrument explorers and nine static benches are individually selectable.

Stage completion is voluntary and stored in localStorage under `mi-lab-chapter-02-v1`. Experiments work if storage is disabled or throws an error. Changing stages resets experiment settings and notes; only completion persists. Decision notes can be downloaded before leaving the final stage. There is no account, analytics, or submission service.

## Tests

Node.js 20 or later is needed for the test tooling, not for serving the site.

```sh
npm ci --ignore-scripts --cache /tmp/mi-npm-cache
npm test
npm run test:browser
```

The pure-model suite checks full-scale/relative error, quantization, threshold onset, analytic dynamic responses and settling, drift, linearity, hysteresis, history-dependent backlash, calibration, repeated-measurement statistics, and the integrated challenge.

The browser suite starts its own Python server on port 8765, serves the site under the repository subpath, and uses Playwright plus axe-core. It tests navigation; every slider and select at its limits; calibration pass/fail; feedback; exports; progress storage/fallback; native keyboard behavior; SVG finiteness; console/request errors; automated WCAG A/AA rules; and 76 layout combinations at **1440, 1280, 768, and 390 px** widths. Screenshots are generated in ignored `test-results/` for visual review.

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
assets/js/static.mjs                Nine static experiments
assets/js/dynamic.mjs               Step-response workstation
assets/js/calibration.mjs           Reference comparison and verification
assets/js/challenge.mjs             Integrated selection and downloadable notes
tests/models.test.mjs               Node test suite
tests/browser.mjs                   Chromium interactions, layouts, and axe audits
```

Runtime code is vanilla JavaScript, HTML5, and CSS3. Test dependencies are development-only and pinned in `package-lock.json`. An instructor can adjust explanatory text in the relevant module, simulation equations in `models.mjs`, and presentation in `styles.css`. Keep engineering calculations out of presentation markup where possible.

## Model conventions and limits

- **Active/passive** follows the chapter's energy convention: an active instrument modulates an external energy source; a passive gauge obtains pointer energy from the measurand. Some sensor literature uses these terms differently.
- Full-scale error is a maximum bound, not a randomly generated actual error or a confidence interval. Relative error at zero is undefined. Out-of-range readings invalidate the stated error specification.
- Repeated-measurement points use a deterministic pattern to separate bias, scatter, and changed-condition shifts; they are not a statistical uncertainty study.
- Threshold suppresses the initial response below a selected level, then the response is quantized. The abrupt onset is intentionally idealized.
- Linearity uses an **endpoint** reference, not a least-squares fit. Hysteresis uses separate quasi-static loading/unloading branches; backlash retains actual input history via a play operator.
- Dynamic responses assume unit gain, initial equilibrium, and an ideal positive step. **Critical damping is ζ = 1**; ζ ≈ 0.707 is underdamped with about 4.3% overshoot. This corrects an inconsistent use of “critically damped” in the source's surrounding discussion. Frequency is in rad/s. Numerical settling is the last crossing of a ±2% band within the reported simulation horizon; undamped motion never settles.
- Calibration compares against a stated reference. Adjustment applies `gain × (raw + zero)` to an affine teaching model. Real calibration requires traceability, uncertainty, environment records, and possibly nonlinear/history checks.
- The challenge conservatively adds bounded static error, temperature offset, half a quantization step, and step-response lag. This is not a statistical uncertainty combination or a complete procurement assessment.

## Future extensions

Add another chapter in its own `chapters/` directory with a dedicated controller and reuse the shared styles, SVG utilities, and pure models. Keep a complete learning path rather than adding empty chapter links. Add model tests for any new engineering equations and browser checks for new controls. No future-chapter placeholders are needed to use Chapter 2 now.
