import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import {
  sections,
  defaults,
  presets,
} from "../assets/js/chapter8/activities.mjs";
import { exercises } from "../assets/js/chapter8/practice.mjs";
const server = spawn(
    "python3",
    [
      "-m",
      "http.server",
      "8768",
      "--bind",
      "127.0.0.1",
      "--directory",
      dirname(process.cwd()),
    ],
    { stdio: "ignore" },
  ),
  base = `http://127.0.0.1:8768/${process.cwd().split("/").pop()}/`,
  url = base + "chapters/chapter-08/index.html";
let browser;
const errors = [];
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  await mkdir("test-results", { recursive: true });
  browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      acceptDownloads: true,
      permissions: ["clipboard-read", "clipboard-write"],
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("requestfailed", (r) => errors.push(r.failure().errorText));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  const goto = async (id) => {
    await page.goto(url + "#" + id);
    await page.locator("#lab-results").waitFor();
    assert.equal(await page.locator("#error").textContent(), "");
  };
  const change = async (id, value) => {
    const l = page.locator("#" + id);
    if ((await l.evaluate((e) => e.tagName)) === "SELECT")
      await l.selectOption(String(value));
    else await l.fill(String(value));
    await l.dispatchEvent("change");
  };
  const layout = async (label) => {
    const problems = await page.evaluate(() => {
      const p = [];
      if (document.documentElement.scrollWidth > innerWidth + 1)
        p.push("Page overflow");
      for (const svg of document.querySelectorAll("svg")) {
        const a = svg.getBoundingClientRect(),
          b = svg.parentElement.getBoundingClientRect();
        if (a.left < b.left - 1 || a.right > b.right + 1)
          p.push("Plot/circuit overflow");
        if (/NaN|Infinity/.test(svg.innerHTML)) p.push("Nonfinite SVG");
        for (const t of svg.querySelectorAll("text")) {
          const b = t.getBBox(),
            box = svg.viewBox.baseVal;
          if (
            b.x < box.x - 1 ||
            b.x + b.width > box.width + 1 ||
            b.y < box.y - 1 ||
            b.y + b.height > box.height + 1
          )
            p.push("SVG text clipped: " + t.textContent);
        }
      }
      return p;
    });
    assert.deepEqual(problems, [], label);
  };
  const a11y = async (label) => {
    const r = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    assert.deepEqual(
      r.violations.map((v) => ({
        id: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      [],
      label,
    );
  };
  await page.goto(base);
  await page.getByRole("link", { name: "Explore Chapter 8" }).click();
  await page.locator("#lab-results").waitFor();
  assert.equal(await page.locator("#stage-nav a").count(), sections.length);
  assert.match(
    await page.locator("#workspace").textContent(),
    /8\.8.*8\.9.*outside/,
  );
  for (const [id, title, kind] of sections) {
    await goto(id);
    console.log("Exercise Chapter 8:", id);
    assert.equal(await page.locator("h1").textContent(), title);
    await page.locator('.concept[data-answer="no"]').click();
    assert.match(
      await page.locator("#concept-feedback").textContent(),
      /Correct/,
    );
    for (const el of await page
      .locator("#controls input,#controls textarea,#controls select")
      .all()) {
      const tag = await el.evaluate((e) => e.tagName),
        type = await el.getAttribute("type"),
        original = await el.inputValue();
      if (tag === "SELECT") {
        const options = await el.locator("option").all();
        for (const o of options) {
          await el.selectOption(await o.getAttribute("value"));
          await el.dispatchEvent("change");
        }
      } else {
        await el.fill(
          type === "number"
            ? String(Number(original) + 1)
            : original + " evidence",
        );
        await el.dispatchEvent("change");
        await el.fill(original);
        await el.dispatchEvent("change");
      }
    }
    await page.click("#lab-reset");
    assert.equal(await page.locator("#error").textContent(), "");
    await page.click("#calculate");
    if (presets[kind]) {
      for (let i = 0; i < presets[kind].length; i++) {
        await page.selectOption("#preset", String(i));
        await page.click("#apply-preset");
        assert.equal(await page.locator("#error").textContent(), "");
        await layout(id + " preset " + i);
      }
      await page.click("#lab-reset");
    }
    await layout(id);
  }
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id] of sections) {
      await goto(id);
      await layout(id + "@" + width);
      await a11y(id + "@" + width);
    }
    for (const [id, name] of [
      ["8.4", "alias"],
      ["8.5", "adc"],
      ["8.7.2", "bode"],
      ["8.7.3", "highpass"],
      ["design", "design"],
    ]) {
      await goto(id);
      await page.screenshot({
        path: `test-results/chapter8-${name}-${width}.png`,
        fullPage: true,
      });
    }
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const [id, , kind] of sections.filter(
    (s, i, a) => a.findIndex((x) => x[2] === s[2]) === i,
  )) {
    await goto(id);
    const input = page.locator("#controls input[type=number]").first();
    if (await input.count()) {
      await input.fill("");
      await input.dispatchEvent("change");
      assert.ok(
        (await page.locator("#error").textContent()).length > 0,
        id + " invalid input",
      );
      await page.click("#lab-reset");
    }
  }
  await goto("8.4");
  await change("preset", "2");
  await page.click("#apply-preset");
  assert.match(
    await page.locator("#lab-results").textContent(),
    /Nyquist-boundary/,
  );
  await change("preset", "4");
  await page.click("#apply-preset");
  assert.match(
    await page.locator("#lab-results").textContent(),
    /DC alias.*1 V/,
  );
  await change("fs", 0);
  assert.match(await page.locator("#error").textContent(), /Positive/);
  await page.click("#lab-reset");
  await goto("8.5");
  await change("lo", 10);
  assert.match(await page.locator("#error").textContent(), /upper voltage/);
  await page.click("#lab-reset");
  await change("bits", 1.5);
  assert.match(await page.locator("#error").textContent(), /1–20 bits/);
  await page.click("#lab-reset");
  await change("a", 12);
  await change("bits", 16);
  assert.match(await page.locator("#lab-results").textContent(), /Yes/);
  await goto("8.7.2");
  const hz = await page.locator(".plot").first().textContent();
  await change("axis", "rad");
  const rad = await page.locator(".plot").first().textContent();
  assert.match(hz, /Frequency \/ Hz/);
  assert.match(rad, /Frequency \/ rad\/s/);
  assert.match(rad, /Cursor 10/);
  assert.notEqual(hz, rad);
  await change("R", 0);
  assert.match(await page.locator("#error").textContent(), /Positive/);
  await page.click("#lab-reset");
  await goto("8.7.3");
  await change("f", 0);
  assert.match(await page.locator("#lab-results").textContent(), /−∞/);
  assert.match(await page.locator("#lab-results").textContent(), /Undefined/);
  await layout("high-pass DC");
  await goto("design");
  await page.click("#complete");
  assert.match(
    await page.locator("#completion-status").textContent(),
    /engineering explanation/,
  );
  await change("validationF", defaults.design.useful);
  await change("validationA", defaults.design.a);
  assert.match(
    await page.locator("#lab-results").textContent(),
    /different useful frequency/,
  );
  await change("validationF", 4);
  await change(
    "explanation",
    "Accept under these illustrative constraints; account for component tolerances before hardware use.",
  );
  await change(
    "evidence",
    "Changed input to 4 Hz; verify |H|=1/sqrt(1+(4/20)^2) independently and compare ADC step.",
  );
  await page.click("#complete");
  assert.match(
    await page.locator("#completion-status").textContent(),
    /Completion recorded/,
  );
  await change("preset", "1");
  await page.click("#apply-preset");
  assert.match(
    await page.locator("#lab-results").textContent(),
    /cannot both be met/,
  );
  await page.click("#reset-progress");
  await goto("practice");
  for (const e of exercises) {
    await change("exercise", e.id);
    await change("series", "E24");
    await change("phase", 0);
    assert.match(
      await page.locator("#lab-results").textContent(),
      new RegExp("p" + e.page),
    );
    for (const d of await page.locator("#lab-results details").all())
      await d.locator(":scope > summary").click();
    await layout(e.id + " expanded");
    const entries = Object.entries(e.values({ series: "E24", phase: 0 }));
    await page.fill("#exercise-answer", "-987654");
    await page.click("#exercise-check");
    assert.match(
      await page.locator("#exercise-feedback").textContent(),
      /No numerical|Conceptual/,
    );
    for (let i = 0; i < entries.length; i++) {
      await page.selectOption("#check-quantity", String(i));
      await page.fill("#exercise-answer", String(entries[i][1]));
      await page.click("#exercise-check");
      assert.match(
        await page.locator("#exercise-feedback").textContent(),
        /Numerical agreement/,
      );
    }
    if (e.number === "8.6" || e.number === "8.7") {
      await change("series", "E12");
      assert.equal(await page.locator("#error").textContent(), "");
    }
  }
  await change("exercise", "exercise-8-1");
  await page.fill("#phase", "90");
  await page.selectOption("#check-quantity", "4");
  await page.fill("#exercise-answer", "1");
  await page.click("#exercise-check");
  assert.match(
    await page.locator("#exercise-feedback").textContent(),
    /Numerical agreement/,
  );
  assert.match(
    await page.locator("#lab-results").textContent(),
    /unitAmplitudeDCAlias/,
  );
  await goto("8.4");
  await change("f", 4);
  await change("p", 30);
  await goto("ai");
  assert.match(
    await page.locator("#lab-results").textContent(),
    /signedAliasHz/,
  );
  assert.match(
    await page.locator("#ai-prompt").inputValue(),
    /"signedAliasHz": -2/,
  );
  await page.click("#complete");
  assert.match(
    await page.locator("#completion-status").textContent(),
    /critique/,
  );
  await change(
    "critique",
    "A compatible alias is not proof of the original analog frequency.",
  );
  await change(
    "evidence",
    "Evaluate both signals at k/6; then resample at 20 samples/s.",
  );
  await change("topic", "bits");
  await change("critique", "More bits do not remove clipping.");
  await change("evidence", "Check a 12 V input on the ±10 V range.");
  await change("topic", "alias");
  assert.match(
    await page.locator("#critique").inputValue(),
    /compatible alias/,
  );
  await page.click("#copy-prompt");
  await page
    .locator("#copy-status")
    .filter({ hasText: /No AI request/ })
    .waitFor();
  assert.match(
    await page.locator("#copy-status").textContent(),
    /No AI request/,
  );
  assert.match(
    await page.evaluate(() => navigator.clipboard.readText()),
    /signedAliasHz/,
  );
  await page.evaluate(() => {
    navigator.clipboard.writeText = () =>
      Promise.reject(new Error("Clipboard unavailable"));
  });
  await page.click("#copy-prompt");
  await page
    .locator("#copy-status")
    .filter({ hasText: /manually/ })
    .waitFor();
  assert.ok(
    await page
      .locator("#ai-prompt")
      .evaluate((e) => e.selectionEnd > e.selectionStart),
  );
  await page.click("#complete");
  await page.fill(
    "#notes",
    "Prediction and measured evidence retained independently for Chapter 8.",
  );
  await page.reload();
  await page.locator("#notes").waitFor();
  assert.match(await page.locator("#notes").inputValue(), /Prediction/);
  assert.match(await page.locator("#progress-text").textContent(), /^1 of/);
  const dl = page.waitForEvent("download");
  await page.click("#export");
  const download = await dl;
  assert.equal(download.suggestedFilename(), "chapter8-daq-evidence.json");
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.equal(exported.chapter, 8);
  assert.equal(exported.states.alias.f, 4);
  assert.equal(exported.currentData.evidence.signedAliasHz, -2);
  assert.match(exported.states.ai.responses.bits.critique, /clipping/);
  await page.locator("#reset-progress").focus();
  await page.keyboard.press("Enter");
  assert.match(await page.locator("#progress-text").textContent(), /^0 of/);
  await page.locator('#stage-nav a[href="#8.5"]').focus();
  await page.keyboard.press("Enter");
  await page.waitForURL(/#8\.5/);
  await page.locator("#bits").focus();
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator("#error").textContent(), "");
  const blocked = await browser.newContext({ reducedMotion: "reduce" });
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const p = await blocked.newPage();
  await p.goto(url + "#8.4");
  await p.locator("#lab-results").waitFor();
  assert.match(
    await p.locator("#storage-note").textContent(),
    /Storage unavailable/,
  );
  await p.click("#complete");
  assert.match(await p.locator("#progress-text").textContent(), /^1 of/);
  await p.locator('#stage-nav a[href="#8.5"]').click();
  await p.locator("#bits").waitFor();
  assert.match(await p.locator("#progress-text").textContent(), /^1 of/);
  assert.equal(await p.locator("svg animate").count(), 0);
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Chapter 8, 13 routes / 52 responsive and WCAG layouts; all controls, presets, resets, signed aliases, ADC guards, Bode units, 7 exercise checkers, design validation, offline AI, keyboard, exports and storage fallback; no console/request errors.",
  );
} finally {
  if (browser) await browser.close();
  server.kill();
}
