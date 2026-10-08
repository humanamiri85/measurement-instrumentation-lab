// Serve the entire workspace parent at /measurement-instrumentation-lab/ to exercise Pages subpaths.
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
    "8765",
    "--bind",
    "127.0.0.1",
    "--directory",
    dirname(repo),
  ],
  { stdio: "ignore" },
);
const base = `http://127.0.0.1:8765/${repo.split("/").pop()}/`;
let browser;
const issues = [];
async function ready() {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Preview server did not become ready");
}
try {
  await ready();
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
  await page.goto(base);
  await page.getByRole("link", { name: "Enter Chapter 2" }).click();
  await page.waitForURL(/#intro$/);
  assert.equal(
    await page.locator("h1").textContent(),
    "Three instruments.One pressure line.",
  );
  await page
    .getByRole("button", {
      name: "B: a closer range and finer steps",
      exact: true,
    })
    .click();
  assert.match(await page.locator(".feedback").textContent(), /^Correct/);
  const navigate = async (id) => {
    await page.locator(`#stage-nav a[href="#${id}"]`).click();
    await page.waitForURL(new RegExp(`#${id}$`));
  };
  const setRange = async (id, value) => {
    await page.locator("#" + id).evaluate((el, v) => {
      el.value = v;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, String(value));
  };
  const checkControls = async () => {
    for (const field of await page.locator("[data-question]").all()) {
      const correct = await field.getAttribute("data-correct");
      await field.locator(`[data-choice="${correct}"]`).click();
      assert.match(await field.locator(".feedback").textContent(), /^Correct/);
      const wrong = correct === "0" ? "1" : "0";
      await field.locator(`[data-choice="${wrong}"]`).click();
      assert.match(
        await field.locator(".feedback").textContent(),
        /^Reconsider/,
      );
    }
    for (const detail of await page.locator("details").all()) {
      await detail.locator("summary").click();
      assert.equal(await detail.getAttribute("open"), "");
      await detail.locator("summary").click();
    }
    for (const input of await page.locator("input[type=range]:enabled").all()) {
      for (const attr of ["min", "max"])
        await input.evaluate((el, a) => {
          el.value = el[a];
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, attr);
    }
    for (const select of await page.locator("select").all()) {
      for (const option of await select.locator("option").all())
        await select.selectOption(await option.getAttribute("value"));
    }
    assert.equal(
      await page
        .locator("svg")
        .evaluateAll((els) =>
          els.some((el) => /NaN|Infinity/.test(el.outerHTML)),
        ),
      false,
      "Chart contains nonfinite values",
    );
  };
  const audit = async (label) => {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      results.violations.map((v) => ({
        id: v.id,
        description: v.description,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      `Accessibility: ${label}`,
    );
  };
  await audit("introduction");
  await page.getByRole("button", { name: "Mark stage complete" }).click();
  assert.match(await page.locator("#progress-text").textContent(), /^1 of 6/);
  await navigate("types");
  for (const mode of ["energy", "balance", "digital", "signal", "smart"]) {
    await page.locator(`[data-type=${mode}]`).click();
    await checkControls();
    await audit(`types ${mode}`);
  }
  await page.locator("[data-type=balance]").click();
  await setRange("mass", (2 * 10) / 9.81);
  assert.match(await page.locator("#balance-result").textContent(), /BALANCED/);
  await page.getByRole("button", { name: "Mark stage complete" }).click();
  await navigate("static");
  assert.match(
    await page.locator("#static-result").textContent(),
    /±0.100 bar/,
  );
  assert.match(await page.locator("#static-result").textContent(), /±10.0%/);
  await setRange("actual-pressure", 0);
  assert.match(
    await page.locator("#static-result").textContent(),
    /Undefined at zero/,
  );
  await setRange("span", 1);
  await setRange("actual-pressure", 2);
  assert.match(
    await page.locator("#static-result").textContent(),
    /OUT OF RANGE/,
  );
  for (const mode of [
    "range",
    "scatter",
    "repeat",
    "threshold",
    "sensitivity",
    "linearity",
    "drift",
    "hysteresis",
    "dead",
  ]) {
    await page.locator(`[data-static=${mode}]`).click();
    await checkControls();
    await audit(`static ${mode}`);
    if (["scatter", "repeat"].includes(mode))
      await page.locator("#sample-again").click();
  }
  await page.locator("[data-static=dead]").click();
  await page.locator("#dead-plus").click();
  await page.locator("#dead-minus").click();
  await page.locator("#dead-reset").click();
  await page.getByRole("button", { name: "Mark stage complete" }).click();
  await navigate("dynamic");
  assert.equal(await page.locator("#time-cursor").isDisabled(), true);
  await page.locator("#apply-step").click();
  await setRange("time-cursor", 1);
  assert.match(await page.locator("#dynamic-result").textContent(), /57.9°C/);
  for (const button of await page.locator("[data-damping]").all())
    await button.click();
  await checkControls();
  await audit("dynamic");
  await page.locator("#reset-step").click();
  assert.equal(await page.locator("#time-cursor").isDisabled(), true);
  await page.locator("#apply-step").click();
  await page.getByRole("button", { name: "Mark stage complete" }).click();
  await navigate("calibration");
  await page.locator("#record-point").click();
  await page.locator("#verify-calibration").click();
  assert.match(
    await page.locator("#verification-result").textContent(),
    /NOT YET/,
  );
  await setRange("cal-zero", -0.4);
  await setRange("cal-gain", 0.926);
  await page.locator("#verify-calibration").click();
  assert.match(
    await page.locator("#verification-result").textContent(),
    /PASS/,
  );
  await page.locator("#record-point").click();
  assert.equal(await page.locator("#cal-log tr").count(), 2);
  await audit("calibration");
  await page.locator("#reset-calibration").click();
  await checkControls();
  await page.getByRole("button", { name: "Mark stage complete" }).click();
  await navigate("challenge");
  await page.locator("#submit-decision").click();
  assert.match(
    await page.locator("#decision-feedback").textContent(),
    /Select a candidate/,
  );
  for (const candidate of ["a", "c", "b"])
    await page.locator(`[data-candidate=${candidate}]`).click();
  assert.match(
    await page.locator("#candidate-analysis").textContent(),
    /0.0493 bar/,
  );
  for (const reason of ["range", "total", "resolution", "interface"])
    await page.locator("#reason-" + reason).check();
  await page
    .locator("#justification")
    .fill(
      "I recommend B because its 0.0493 bar bound meets the 0.05 bar requirement, but the small margin needs field verification.",
    );
  await page.locator("#submit-decision").click();
  assert.match(
    await page.locator("#decision-feedback").textContent(),
    /B is the strongest fit/,
  );
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#export-decision").click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "chapter-02-decision.txt");
  await audit("challenge");
  await page.getByRole("button", { name: "Mark stage complete" }).click();
  await page.reload();
  assert.match(await page.locator("#progress-text").textContent(), /^6 of 6/);
  await navigate("intro");
  await page.locator('.chapter-bottom a[href="#types"]').click();
  await page.waitForURL(/#types$/);
  await page.getByRole("link", { name: "← Previous", exact: true }).click();
  await page.waitForURL(/#intro$/);
  await page
    .getByRole("link", { name: "Chapter overview", exact: true })
    .click();
  await page.waitForURL(/#overview$/);
  await audit("overview");
  await page.goto(base);
  await audit("home");
  // Inspect every experiment at every target viewport, including chart bounds.
  let layouts = 0;
  for (const [width, height, label] of [
    [1440, 1000, "desktop"],
    [1280, 800, "laptop"],
    [768, 1024, "tablet"],
    [390, 844, "phone"],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto(base);
    await page.screenshot({
      path: resolve(repo, `test-results/${label}-home.png`),
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `Home overflow at ${width}`,
    );
    await page.goto(base + "chapters/chapter-02/index.html#overview");
    for (const stage of [
      "overview",
      "intro",
      "types",
      "static",
      "dynamic",
      "calibration",
      "challenge",
    ]) {
      await page.goto(base + `chapters/chapter-02/index.html#${stage}`);
      const modes =
        stage === "types"
          ? ["energy", "balance", "digital", "signal", "smart"]
          : stage === "static"
            ? [
                "range",
                "scatter",
                "repeat",
                "threshold",
                "sensitivity",
                "linearity",
                "drift",
                "hysteresis",
                "dead",
              ]
            : [null];
      for (const mode of modes) {
        if (mode)
          await page
            .locator(`[data-${stage === "types" ? "type" : "static"}=${mode}]`)
            .click();
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `Overflow at ${width} ${stage} ${mode}`,
        );
        for (const svg of await page.locator("main svg").all()) {
          const box = await svg.boundingBox();
          assert.ok(
            box.width > 200 && box.width <= width,
            `Unusable chart ${width} ${stage} ${mode}`,
          );
        }
        layouts++;
      }
      if (stage === "dynamic") await page.locator("#apply-step").click();
      if (stage === "challenge")
        await page.locator("[data-candidate=b]").click();
      if (stage === "static") {
        await setRange("dead-input", 8);
        await setRange("dead-input", 7.5);
        await setRange("dead-input", 3);
      }
      if (["static", "dynamic", "challenge"].includes(stage))
        await page.screenshot({
          path: resolve(repo, `test-results/${label}-${stage}.png`),
          fullPage: true,
        });
    }
  }
  // Native keyboard behavior and visible focus.
  await page.goto(base + "chapters/chapter-02/index.html#static");
  await page.locator("#span").focus();
  const before = await page.locator("#span").inputValue();
  await page.keyboard.press("ArrowRight");
  assert.notEqual(await page.locator("#span").inputValue(), before);
  assert.ok(
    await page
      .locator("#span")
      .evaluate((el) => getComputedStyle(el).outlineStyle !== "none"),
  );
  await page.locator("[data-static=drift]").focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#drift-mode").count(), 1);
  await page.locator("#reset-progress").click();
  assert.match(await page.locator("#progress-text").textContent(), /^0 of 6/);
  // Storage failures must not prevent simulation or navigation.
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new Error("Storage unavailable");
      },
    });
  });
  const noStorage = await blocked.newPage();
  await noStorage.goto(base + "chapters/chapter-02/index.html#dynamic");
  await noStorage.locator("#apply-step").click();
  await noStorage.locator("#mark-complete").click();
  assert.match(
    await noStorage.locator("#storage-note").textContent(),
    /unavailable/,
  );
  assert.match(
    await noStorage.locator("#progress-text").textContent(),
    /^1 of 6/,
  );
  await blocked.close();
  assert.deepEqual(issues, [], "Browser/console/network failures");
  console.log(
    `PASS: all 6 stages, 14 subexperiments, range/select limits, questions, calibration pass/fail, decision export, progress persistence/fallback, keyboard controls, WCAG A/AA audits, and ${layouts} layout combinations across 4 viewports. No console or request errors.`,
  );
} finally {
  await browser?.close();
  server.kill();
}
