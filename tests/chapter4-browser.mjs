import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { dirname } from "node:path";
import { mkdir, readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { sections, defaults } from "../assets/js/chapter4/activities.mjs";
const server = spawn(
    "python3",
    [
      "-m",
      "http.server",
      "8767",
      "--bind",
      "127.0.0.1",
      "--directory",
      dirname(process.cwd()),
    ],
    { stdio: "ignore" },
  ),
  base = `http://127.0.0.1:8767/${process.cwd().split("/").pop()}/`,
  url = base + "chapters/chapter-04/index.html";
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
    }),
    page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  page.on("requestfailed", (r) => errors.push(r.failure().errorText));
  const goto = async (id) => {
    await page.goto(url + "#" + id);
    await page.locator("#activity").waitFor();
  };
  const change = async (id, value) => {
    const l = page.locator("#" + id);
    if ((await l.evaluate((e) => e.tagName)) === "SELECT")
      await l.selectOption(value);
    else await l.fill(String(value));
    await l.dispatchEvent("change");
  };
  const layout = async (label) => {
    const problems = await page.evaluate(() => {
      const out = [];
      if (document.documentElement.scrollWidth > innerWidth + 1)
        out.push("page overflow");
      for (const e of document.querySelectorAll("svg")) {
        const r = e.getBoundingClientRect(),
          p = e.parentElement.getBoundingClientRect();
        if (r.left < p.left - 1 || r.right > p.right + 1)
          out.push("plot clipping");
        if (/NaN|Infinity/.test(e.innerHTML)) out.push("nonfinite svg");
      }
      return out;
    });
    assert.deepEqual(problems, [], label);
  };
  await page.goto(base);
  await page.getByRole("link", { name: "Explore Chapter 4" }).click();
  await page.locator("#activity").waitFor();
  assert.equal(await page.locator("#stage-nav a").count(), sections.length);
  for (const [id, title, kind] of sections) {
    await goto(id);
    assert.equal(await page.locator("h1").textContent(), title);
    if (kind !== "bank") {
      assert.equal(await page.locator("#error").textContent(), "");
      await page.locator('.check[data-answer="No"]').click();
      assert.match(
        await page.locator("#check-feedback").textContent(),
        /Correct/,
      );
      for (const el of await page
        .locator("#controls input,#controls textarea,#controls select")
        .all()) {
        const tag = await el.evaluate((e) => e.tagName),
          type = await el.getAttribute("type");
        if (tag === "SELECT") {
          const options = await el.locator("option").all();
          for (const o of options) {
            await el.selectOption(await o.getAttribute("value"));
            await el.dispatchEvent("change");
          }
        } else {
          const v = await el.inputValue();
          await el.fill(type === "number" ? String(Number(v) + 1) : v + " ");
          await el.dispatchEvent("change");
          await el.fill(v);
          await el.dispatchEvent("change");
        }
      }
      await page.locator("#lab-reset").click();
      assert.equal(await page.locator("#error").textContent(), "");
      await page.locator("#calculate").click();
    }
    await layout(id);
  }
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [id, , kind] of sections) {
      await goto(id);
      await layout(`${id}@${width}`);
      const a = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      assert.deepEqual(
        a.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
        [],
        `${id}@${width}`,
      );
    }
    await goto("4.11.3");
    await page.screenshot({
      path: `test-results/chapter4-fit-${width}.png`,
      fullPage: true,
    });
    await goto("4.14.3");
    await page.screenshot({
      path: `test-results/chapter4-budget-${width}.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const [id, , kind] of sections.filter(
    (s, i, a) => s[2] !== "bank" && a.findIndex((x) => x[2] === s[2]) === i,
  )) {
    await goto(id);
    const number = page.locator("#controls input[type=number]").first();
    if (await number.count()) {
      await number.fill("");
      await number.dispatchEvent("change");
      assert.ok(
        (await page.locator("#error").textContent()).length > 0,
        kind + " empty number",
      );
      await page.locator("#lab-reset").click();
    }
    const data = page.locator("#controls textarea#data");
    if (await data.count()) {
      await data.fill("1, not-a-number");
      await data.dispatchEvent("change");
      assert.ok((await page.locator("#error").textContent()).length > 0);
      await page.locator("#lab-reset").click();
    }
  }
  await goto("4.12");
  await change("exclude", "yes");
  assert.match(await page.locator("#error").textContent(), /reason/);
  await change("reason", "Check digitization against instrument log");
  assert.equal(await page.locator("#error").textContent(), "");
  assert.equal(await page.locator("#data").inputValue(), defaults.outlier.data);
  await goto("4.11.3");
  await change("counts", "1, 1, 1, 1, 1, 1");
  assert.match(
    await page.locator("#lab-results").textContent(),
    /No valid p-value/,
  );
  await page.locator("#lab-reset").click();
  await goto("pressure");
  await page.click("#complete");
  assert.match(
    await page.locator("#completion-status").textContent(),
    /engineering decision/,
  );
  await change("decision", "Do not accept without validation uncertainty");
  await change(
    "evidence",
    "Compare q=495 Pa with independent 495 Pa; include SEM and static u.",
  );
  await page.click("#complete");
  assert.match(
    await page.locator("#completion-status").textContent(),
    /Completion recorded/,
  );
  await goto("ai");
  await page.click("#complete");
  assert.match(
    await page.locator("#completion-status").textContent(),
    /critique/,
  );
  await change(
    "response",
    "A contaminated reading can shift the mean more than the median.",
  );
  await change(
    "evidence",
    "Compare mean and median before/after adding 53.5; verify sorted ranks independently.",
  );
  await change("claim", "gaussian");
  assert.equal(await page.locator("#response").inputValue(), "");
  await change("response", "Histogram shape cannot prove a distribution.");
  await change(
    "evidence",
    "Check QQ plot and guarded p-value with predeclared bins.",
  );
  await change("claim", "mean");
  assert.match(await page.locator("#response").inputValue(), /contaminated/);
  await page.click("#reset-progress");
  const bank = JSON.parse(await readFile("assets/js/chapter4/bank.json"));
  await goto("4.16");
  assert.equal(await page.locator("#exercise option").count(), 82);
  for (const e of bank) {
    await page.selectOption("#exercise", e.id);
    assert.match(
      await page.locator("#exercise-body").textContent(),
      new RegExp("p" + e.page),
    );
    for (const d of await page.locator("#exercise-body details").all())
      await d.locator("summary").click();
    assert.equal(await page.locator("#solution table").count(), 1);
    await page.fill("#answer", "-987654");
    await page.click("#answer-check");
    assert.match(
      await page.locator("#answer-feedback").textContent(),
      /No numerical|conceptual/,
    );
    if (e.type !== "concept") {
      const option = await page
        .locator("#quantity option")
        .first()
        .textContent();
      const cell = page
        .locator("#solution tbody tr")
        .filter({ has: page.locator("td", { hasText: option }) })
        .first();
      const expected = await cell.locator("td").nth(1).textContent();
      await page.fill("#answer", expected);
      await page.click("#answer-check");
      assert.match(
        await page.locator("#answer-feedback").textContent(),
        /Numerical agreement/,
      );
    }
    await page.click("#load-data");
  }
  await page.fill("#exercise-filter", "problem-4-28");
  assert.equal(await page.locator("#exercise option").count(), 1);
  await page.fill("#exercise-filter", "no-such-exercise");
  assert.match(
    await page.locator("#exercise-body").textContent(),
    /No matching/,
  );
  await page.fill("#exercise-filter", "");
  await page.selectOption("#exercise", "example-4-1");
  await page.click("#load-data");
  await page.goto(url + "#4.2");
  await page.locator("#activity").waitFor();
  assert.match(await page.locator("#data").inputValue(), /398/);
  await page.fill("#notes", "Prediction, evidence and independent check");
  await page.click("#complete");
  await page.reload();
  await page.locator("#notes").waitFor();
  assert.equal(
    await page.locator("#notes").inputValue(),
    "Prediction, evidence and independent check",
  );
  assert.match(await page.locator("#progress-text").textContent(), /^1 of/);
  const dl = page.waitForEvent("download");
  await page.click("#export");
  const downloaded = await dl;
  assert.equal(downloaded.suggestedFilename(), "chapter4-evidence.json");
  const exported = JSON.parse(await readFile(await downloaded.path(), "utf8"));
  assert.equal(exported.notes, "Prediction, evidence and independent check");
  assert.ok(exported.states.data.data.includes("398"));
  await page.locator("#reset-progress").focus();
  await page.keyboard.press("Enter");
  assert.match(await page.locator("#progress-text").textContent(), /^0 of/);
  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  const p = await blocked.newPage();
  await p.goto(url + "#4.7");
  await p.locator("#activity").waitFor();
  assert.match(
    await p.locator("#storage-note").textContent(),
    /Storage unavailable/,
  );
  await p.click("#complete");
  assert.match(await p.locator("#progress-text").textContent(), /^1 of/);
  await p.locator('#stage-nav a[href="#4.8"]').click();
  await p.locator("h1").filter({ hasText: "Random error" }).waitFor();
  assert.match(await p.locator("#progress-text").textContent(), /^1 of/);
  await blocked.close();
  assert.deepEqual(errors, []);
  console.log(
    "Chapter 4: 96 responsive/accessibility layouts, all controls/routes, 82 answers/hints, invalid inputs, exports, progress and storage fallback passed.",
  );
} finally {
  if (browser) await browser.close();
  server.kill();
}
