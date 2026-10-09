import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn(
  "python3",
  [
    "-m",
    "http.server",
    "8766",
    "--bind",
    "127.0.0.1",
    "--directory",
    dirname(repo),
  ],
  { stdio: "ignore" },
);
const base = `http://127.0.0.1:8766/${repo.split("/").pop()}/`,
  chapter = base + "chapters/chapter-03/index.html";
let browser;
const issues = [];
const stages = [
  "sources",
  "correction",
  "budget",
  "random",
  "noise",
  "reduction",
  "case",
];
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir(resolve(repo, "test-results"), { recursive: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    headless: true,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => issues.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") issues.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) issues.push(`${r.status()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => issues.push(r.failure().errorText));
  const goto = async (stage) => {
    await page.goto(chapter + "#" + stage);
    await page.locator("#lab-results").waitFor();
  };
  const slider = async (id, value) =>
    page.locator("#" + id).evaluate((el, v) => {
      el.value = String(v);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, value);
  const audit = async (label) => {
    const a = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      a.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      label,
    );
  };
  await page.goto(base);
  await page.getByRole("link", { name: "Explore Chapter 3" }).click();
  await page.waitForURL(/chapter-03\/index.html#overview/);
  assert.equal(await page.locator("#stage-nav a").count(), 7);
  await audit("home chapter navigation");
  for (const stage of stages) {
    await goto(stage);
    console.log("Exercise Chapter 3:", stage);
    const initial = await page
      .locator(".bench input,.bench select")
      .evaluateAll((els) => els.map((el) => [el.id, el.value, el.checked]));
    for (const input of await page.locator(".bench input[type=range]").all()) {
      if (await input.isDisabled()) continue;
      const old = await input.inputValue();
      for (const attr of ["min", "max"])
        await input.evaluate((el, a) => {
          el.value = el[a];
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, attr);
      await input.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event("input", { bubbles: true }));
      }, old);
    }
    for (const input of await page
      .locator(".bench input[type=checkbox]")
      .all()) {
      await input.click();
      await input.click();
    }
    for (const input of await page.locator(".bench select").all()) {
      const old = await input.inputValue();
      for (const option of await input.locator("option").all())
        await input.selectOption(await option.getAttribute("value"));
      await input.selectOption(old);
    }
    for (const q of await page.locator("[data-question]").all()) {
      const correct = await q.getAttribute("data-correct");
      await q.locator(`[data-choice="${correct}"]`).click();
      assert.match(await q.locator(".feedback").textContent(), /^Correct/);
      await q.locator(`[data-choice="${correct === "0" ? "1" : "0"}"]`).click();
      assert.match(await q.locator(".feedback").textContent(), /^Reconsider/);
    }
    for (const detail of await page.locator("details").all()) {
      await detail.locator("summary").click();
      assert.notEqual(await detail.getAttribute("open"), null);
      await detail.locator("summary").click();
      assert.equal(await detail.getAttribute("open"), null);
    }
    await page.locator(".ai-investigation summary").click();
    await page.locator("#ai-prepare").click();
    assert.match(
      await page.locator("#ai-prompt").inputValue(),
      /Numerical evidence:/,
    );
    for (const id of ["ai-suggestion", "ai-evidence", "ai-reflection"])
      await page
        .locator("#" + id)
        .fill(
          "Check measured values against a reference; do not assume the AI claim is verified.",
        );
    const download = page.waitForEvent("download");
    await page.locator("#ai-notes").click();
    assert.equal(
      (await download).suggestedFilename(),
      "chapter-03-investigation.txt",
    );
    await page.locator("#lab-reset").click();
    assert.deepEqual(
      await page
        .locator(".bench input,.bench select")
        .evaluateAll((els) => els.map((el) => [el.id, el.value, el.checked])),
      initial,
    );
    assert.equal(
      await page
        .locator("svg")
        .evaluateAll((els) =>
          els.some((el) => /NaN|Infinity/.test(el.outerHTML)),
        ),
      false,
    );
    await audit(stage + " after controls");
    await page.locator("#mark-complete").click();
  }
  assert.match(await page.locator("#progress-text").textContent(), /7 of 7/);
  await page.reload();
  assert.match(await page.locator("#progress-text").textContent(), /7 of 7/);
  // Source isolation and reference output.
  await goto("sources");
  for (const input of await page.locator("[id^=use-]").all())
    await input.uncheck();
  assert.match(
    await page.locator("#lab-results .metrics").textContent(),
    /Signed error0.000 kPa/,
  );
  // Calibration workflow, independent validation, nonlinear and temperature checks.
  await goto("correction");
  await page.locator("#apply").click();
  assert.match(
    await page.locator("#correction-state").textContent(),
    /Collect/,
  );
  await page.locator("#collect").click();
  await page.locator("#fit").click();
  await page.locator("#strategy").selectOption("linear");
  await page.locator("#fit").click();
  await page.locator("#apply").click();
  assert.match(
    await page.locator("#lab-results .metrics").textContent(),
    /Corrected maximum0.000 kPa/,
  );
  await slider("validation-temp", 40);
  assert.match(
    await page.locator("#lab-results .metrics").textContent(),
    /Corrected maximum0.962 kPa/,
  );
  await page.locator("#compensate").check();
  assert.match(
    await page.locator("#lab-results .metrics").textContent(),
    /Corrected maximum0.000 kPa/,
  );
  await slider("bow", 5);
  await page.locator("#collect").click();
  await page.locator("#strategy").selectOption("multipoint");
  await page.locator("#apply").click();
  assert.match(
    await page.locator("#correction-state").textContent(),
    /Piecewise/,
  );
  await page.screenshot({
    path: resolve(repo, "test-results/chapter3-desktop-correction.png"),
    fullPage: true,
  });
  // Budget identity and zero-relative-error condition.
  await goto("budget");
  assert.match(await page.locator("#lab-results").textContent(), /0.650 kPa/);
  await page.locator("#correct").check();
  assert.match(await page.locator("#lab-results").textContent(), /0.350 kPa/);
  await slider("reference", 0);
  assert.match(
    await page.locator("#lab-results").textContent(),
    /Undefined at zero/,
  );
  await page.locator("#statistical").check();
  assert.match(
    await page.locator("#standard-u").textContent(),
    /independent zero-mean rectangular/,
  );
  // Distribution and correlation assumptions plus reproducible reset.
  await goto("random");
  const first = await page.locator("#lab-results").textContent();
  await slider("rho", 0.9);
  assert.notEqual(await page.locator("#lab-results").textContent(), first);
  await page.locator("#distribution").selectOption("uniform");
  assert.equal(await page.locator("#rho").isDisabled(), true);
  assert.match(
    await page.locator("#lab-results").textContent(),
    /Not offered at small N/,
  );
  await page.locator("#lab-reset").click();
  assert.equal(await page.locator("#lab-results").textContent(), first);
  // Filter fidelity at aggressive cutoff.
  await goto("reduction");
  await page.locator("#method").selectOption("lowpass");
  await slider("cutoff", 0.5);
  assert.match(
    await page.locator("#lab-results").textContent(),
    /Useful amplitude \/ input24.3 %/,
  );
  await page.screenshot({
    path: resolve(
      repo,
      "test-results/chapter3-desktop-reduction-aggressive.png",
    ),
    fullPage: true,
  });
  // Every diagnostic experiment and corrective action; evidence gating and independent data.
  for (let c = 0; c < 4; c++) {
    await goto("case");
    await page.locator("#case").selectOption(String(c));
    await page.locator("#hypothesis").selectOption(String(c));
    await page.locator("#review-case").click();
    assert.equal(
      await page.locator("#case-feedback").getAttribute("data-state"),
      "additional",
    );
    for (const e of ["reference", "sweep", "repeat", "spectrum"]) {
      await page.locator("#experiment").selectOption(e);
      await page.locator("#collect-evidence").click();
    }
    await page.locator("#hypothesis").selectOption(String((c + 1) % 4));
    await page.locator("#review-case").click();
    assert.equal(
      await page.locator("#case-feedback").getAttribute("data-state"),
      "incorrect",
    );
    await page.locator("#hypothesis").selectOption(String(c));
    await page.locator("#review-case").click();
    assert.equal(
      await page.locator("#case-feedback").getAttribute("data-state"),
      "partial",
    );
    await page
      .locator("#action")
      .selectOption(["static", "pitot", "average", "shield"][c]);
    await page.locator("#validate").click();
    await page.locator("#review-case").click();
    assert.equal(
      await page.locator("#case-feedback").getAttribute("data-state"),
      "supported",
    );
    assert.match(
      await page.locator("#lab-results").textContent(),
      /Independent corrected validation/,
    );
    for (let i = 0; i < 4; i++) {
      for (const k of ["support", "contradict", "additional", "ai"])
        await page
          .locator(`#h${i}-${k}`)
          .fill("Evidence retained for instructor review.");
      await page
        .locator("#decision-" + i)
        .selectOption(i === c ? "supported" : "unsupported");
    }
    await page
      .locator("#case-conclusion")
      .fill(
        "Supported by collected reference and timed evidence; validation checks independent pressures under stated assumptions.",
      );
    const d = page.waitForEvent("download");
    await page.locator("#case-download").click();
    assert.equal(
      (await d).suggestedFilename(),
      "chapter-03-aircraft-evidence.txt",
    );
    await audit("case " + c + " diagnostics");
  }
  // Four viewports, every stage, expanded AI and selected advanced states.
  let layouts = 0;
  for (const [width, height] of [
    [1440, 1000],
    [1280, 800],
    [768, 1024],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    for (const stage of stages) {
      await goto(stage);
      await page.locator(".ai-investigation summary").click();
      await page.locator("#ai-prepare").click();
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `Overflow ${width} ${stage}`,
      );
      assert.ok(
        await page
          .locator("#lab-results")
          .evaluate(
            (el) =>
              el.getBoundingClientRect().right <=
              el.closest(".bench-body").getBoundingClientRect().right + 1,
          ),
        `Clipped bench results ${width} ${stage}`,
      );
      await audit(`${width} ${stage}`);
      layouts++;
      if ([1280, 390].includes(width))
        await page.screenshot({
          path: resolve(
            repo,
            `test-results/chapter3-${width === 390 ? "phone" : "desktop"}-${stage}.png`,
          ),
          fullPage: true,
        });
    }
  }
  await page.locator("#reset-progress").click();
  assert.match(await page.locator("#progress-text").textContent(), /^0 of 7/);
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw Error("Disabled");
      },
    });
  });
  const p = await blocked.newPage();
  await p.goto(chapter + "#random");
  await p.locator("#mark-complete").click();
  assert.match(await p.locator("#storage-note").textContent(), /unavailable/);
  assert.ok(await p.locator("svg").count());
  await blocked.close();
  await goto("sources");
  await page.locator("#reference").focus();
  const before = await page.locator("#reference").inputValue();
  await page.keyboard.press("ArrowRight");
  assert.notEqual(await page.locator("#reference").inputValue(), before);
  assert.ok(
    await page
      .locator("#reference")
      .evaluate((el) => getComputedStyle(el).outlineStyle !== "none"),
  );
  assert.deepEqual(issues, []);
  console.log(
    `PASS: Chapter 3 seven stages, every control/reset, calibration/validation, evidence gating, all four aircraft cases, downloads, storage fallback, keyboard focus, ${layouts} responsive layouts and WCAG A/AA audits; no console or request errors.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
