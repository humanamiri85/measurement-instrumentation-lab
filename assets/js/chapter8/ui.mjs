import { escape as esc, table } from "../chapter3-ui.mjs";
export { esc, table };
export const fmt = (x, d = 4) =>
  x === null || x === undefined
    ? "Undefined"
    : x === Infinity
      ? "∞"
      : x === -Infinity
        ? "−∞"
        : typeof x === "number"
          ? Math.abs(x) > 0 && Math.abs(x) < 0.0001
            ? x.toExponential(3)
            : Number(x.toFixed(d)).toString()
          : String(x);
export const metrics = (rows) =>
  `<div class="metrics">${rows.map(([label, value, unit = ""]) => `<div class="metric"><span>${esc(label)}</span><strong>${esc(fmt(value))}</strong><small>${esc(unit)}</small></div>`).join("")}</div>`;
export const note = (t) => `<p class="note">${t}</p>`;
export const field = (id, label, value, unit = "", step = "any") =>
  `<label class="control" for="${id}"><span>${label}${unit ? " / " + unit : ""}</span><input type="number" id="${id}" name="${id}" value="${esc(value)}" step="${step}"></label>`;
export const select = (id, label, value, options) =>
  `<label class="control" for="${id}"><span>${label}</span><select id="${id}" name="${id}">${options.map(([v, t]) => `<option value="${v}" ${String(v) === String(value) ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
export const area = (id, label, value) =>
  `<label class="control" for="${id}"><span>${label}</span><textarea id="${id}" name="${id}" rows="4">${esc(value)}</textarea></label>`;
const colors = ["#11695d", "#b45125", "#4c61aa", "#7a3c79", "#526974"];
// x values remain physical values; log axes transform positions and tick locations together.
export function chart(
  title,
  xlabel,
  ylabel,
  series,
  { log = false, cursor = null, yMin = null, yMax = null } = {},
) {
  const valid = series
    .flatMap((s) => s.points)
    .filter(
      ([x, y]) => Number.isFinite(x) && Number.isFinite(y) && (!log || x > 0),
    );
  if (!valid.length) return note("No finite points to plot.");
  const xx = (x) => (log ? Math.log10(x) : x);
  let lo = Math.min(...valid.map((p) => xx(p[0]))),
    hi = Math.max(...valid.map((p) => xx(p[0]))),
    bottom = yMin ?? Math.min(...valid.map((p) => p[1])),
    top = yMax ?? Math.max(...valid.map((p) => p[1]));
  if (hi === lo) hi = lo + 1;
  const pad = Math.max((top - bottom) * 0.1, Math.abs(top) * 0.02, 0.001);
  if (yMin === null) bottom -= pad;
  if (yMax === null) top += pad;
  const X = (x) => 102 + ((xx(x) - lo) / (hi - lo)) * 484,
    Y = (y) => 252 - ((y - bottom) / (top - bottom)) * 210;
  const ticks = log
    ? Array.from(
        { length: Math.floor(hi) - Math.ceil(lo) + 1 },
        (_, i) => 10 ** (Math.ceil(lo) + i),
      )
    : Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3);
  const tick = (v, y = false) => {
    if (y && Math.abs(v) < Math.max(Math.abs(bottom), Math.abs(top)) * 1e-12)
      return "0";
    return Math.abs(v) > 0 && (Math.abs(v) < 0.001 || Math.abs(v) >= 1e5)
      ? Number(v.toPrecision(2)).toExponential().replace("e+", "e")
      : fmt(v, 3);
  };
  return `<figure class="plot"><svg viewBox="0 0 640 334" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title>${ticks.map((x) => `<path d="M${X(x)} 42V252" class="gridline"/><text x="${X(x)}" y="279" text-anchor="middle">${esc(tick(x))}</text>`).join("")}${[bottom, (bottom + top) / 2, top].map((y) => `<path d="M102 ${Y(y)}H586" class="gridline"/><text x="93" y="${Y(y) + 5}" text-anchor="end">${esc(tick(y, true))}</text>`).join("")}<path d="M102 42V252H586" fill="none" stroke="currentColor"/>${series
    .map((s, i) => {
      const pts = s.points.filter(
        ([x, y]) => Number.isFinite(x) && Number.isFinite(y) && (!log || x > 0),
      );
      const color = colors[i % colors.length];
      return s.markers
        ? pts
            .map(
              ([x, y]) =>
                `<circle cx="${X(x)}" cy="${Y(y)}" r="3.5" fill="${color}"/>`,
            )
            .join("")
        : `<polyline points="${pts.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2.5" ${s.dashed ? 'stroke-dasharray="8 5"' : ""}/>`;
    })
    .join(
      "",
    )}${cursor !== null && cursor > 0 && xx(cursor) >= lo && xx(cursor) <= hi ? `<path d="M${X(cursor)} 42V252" stroke="#182f3b" stroke-dasharray="3 3"/><text x="${X(cursor)}" y="30" text-anchor="middle">Cursor ${esc(fmt(cursor, 3))}</text>` : ""}<text x="335" y="319" text-anchor="middle">${esc(xlabel)}</text></svg><figcaption><strong>${esc(title)}</strong> · ${esc(ylabel)}${log ? " · logarithmic frequency axis" : ""}<span class="legend">${series.map((s, i) => `<span><i style="background:${colors[i % colors.length]}"></i>${esc(s.name)}${s.markers ? " (markers)" : ""}${s.dashed ? " (dashed)" : ""}</span>`).join("")}</span></figcaption></figure>`;
}
const resistor = (x, y, width = 80) =>
  `<path d="M${x} ${y}h10l8 -12 12 24 12 -24 12 24 12 -24 8 12h${width - 74}"/>`;
const capacitor = (x, y) =>
  `<path d="M${x} ${y}h30m0 -20v40m12 -40v40m0 -20h38"/>`;
export function circuit(
  kind,
  R,
  C,
  { loaded = false, Rs = 0, RL = 100000 } = {},
) {
  const hp = kind === "hp",
    left = loaded ? 190 : 100;
  return `<figure class="circuit"><svg viewBox="0 0 640 280" role="img" aria-label="${hp ? "High-pass: series capacitor, output across shunt resistor" : "Low-pass: series resistor, output across shunt capacitor"}${loaded ? ", with series source resistance and parallel load" : ""}"><title>${hp ? "Passive RC high-pass" : "Passive RC low-pass"} circuit</title><g fill="none" stroke="currentColor" stroke-width="2.5"><path d="${loaded ? "M40 100H90 M170 100H190" : "M40 100H100"}M${left + 80} 100H440M360 100V145M360 220V245H40V200 M40 140V100"/><circle cx="40" cy="170" r="30"/>${loaded ? resistor(90, 100) : ""}${hp ? capacitor(left, 100) : resistor(left, 100)}${hp ? `<g transform="translate(360 145) rotate(90)">${resistor(0, 0, 75)}</g>` : '<path d="M360 145v20m-22 0h44m-44 13h44m-22 0v42"/>'}${loaded ? `<path d="M440 100H530V145M530 220V245H360"/><g transform="translate(530 145) rotate(90)">${resistor(0, 0, 75)}</g>` : ""}<path d="M360 245v10m-25 0h50m-40 8h30m-20 8h10"/></g><g fill="currentColor"><circle cx="40" cy="100" r="5"/><circle cx="360" cy="100" r="5"/></g><g class="circuit-label"><text x="24" y="75">vi</text><text x="31" y="177">~</text><text x="396" y="80">vo</text><text x="${left + 30}" y="55">${hp ? "C = " + fmt(C * 1e9) + " nF" : "R = " + fmt(R / 1000) + " kΩ"}</text><text x="375" y="196">${hp ? "R = " + fmt(R / 1000) + " kΩ" : "C = " + fmt(C * 1e9) + " nF"}</text>${loaded ? `<text x="93" y="55">Rs ${fmt(Rs / 1000)} kΩ</text><text x="548" y="190">RL</text><text x="485" y="232">${fmt(RL / 1000)} kΩ</text>` : ""}<text x="48" y="236">Reference / ground</text></g></svg><figcaption>${hp ? "Series C, shunt R, output across R." : "Series R, shunt C, output across C."}${loaded ? " Rs is in series with R; RL is in parallel with C." : " Ideal voltage source, unloaded output."}</figcaption></figure>`;
}
export function chain() {
  return `<ol class="chain" aria-label="Data acquisition chain"><li>Sensor output<br><small>continuous voltage</small></li><li>Analog conditioning<br><small>gain / RC before ADC</small></li><li>Sampling<br><small>t = k/fs</small></li><li>Quantization<br><small>integer code</small></li><li>Record & interpret<br><small>units / limits / evidence</small></li></ol>`;
}
export function sampleTable(times, values, extra = null) {
  const headers = extra
    ? ["k", "t / s", "Sample / V", ...extra.headers]
    : ["k", "t / s", "Sample / V"];
  return table(
    "Sample record" + (times.length > 16 ? " (first 16; export for all)" : ""),
    headers,
    times
      .slice(0, 16)
      .map((t, i) => [
        i,
        fmt(t, 6),
        fmt(values[i], 6),
        ...(extra ? extra.rows[i] : []),
      ]),
  );
}
