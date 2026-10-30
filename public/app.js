import { TIERS, SAMPLE_LOADS, DEFAULTS, tierPower, autoSize, simulate, economics } from './sizing.js';

const $ = (id) => document.getElementById(id);
const ASSUMPTION_IDS = ['outageHours', 'outageStart', 'peakSunHours', 'dieselPrice', 'financeYears',
  'pvCostPerKw', 'batteryCostPerKwh', 'generatorCostPerKw', 'inverterCostPerKw', 'depthOfDischarge', 'litresPerKwh'];
const SIZE_IDS = ['pvKw', 'batteryKwh', 'generatorKw'];

let loads = SAMPLE_LOADS.map((l) => ({ ...l }));

function assumptions() {
  const a = { ...DEFAULTS };
  for (const id of ASSUMPTION_IDS) a[id] = num($(id).value, DEFAULTS[id]);
  a.financeRate = num($('financeRatePct').value, DEFAULTS.financeRate * 100) / 100;
  a.outageHours = clamp(a.outageHours, 0, 24);
  a.outageStart = clamp(Math.round(a.outageStart), 0, 23);
  return a;
}

function size() {
  return Object.fromEntries(SIZE_IDS.map((id) => [id, Math.max(0, num($(id).value, 0))]));
}

function fillAssumptions() {
  for (const id of ASSUMPTION_IDS) $(id).value = DEFAULTS[id];
  $('financeRatePct').value = DEFAULTS.financeRate * 100;
}

function fillSize() {
  const s = autoSize(loads, assumptions());
  for (const id of SIZE_IDS) $(id).value = s[id];
}

function renderLoads() {
  const tbody = $('loads').querySelector('tbody');
  tbody.innerHTML = '';
  loads.forEach((l, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input aria-label="Equipment" data-k="name" value="${esc(l.name)}"></td>
      <td><input aria-label="Watts" data-k="watts" type="number" min="0" step="10" value="${l.watts}"></td>
      <td><input aria-label="Hours per day" data-k="hours" type="number" min="0" max="24" step="0.5" value="${l.hours}"></td>
      <td><select aria-label="Tier" data-k="tier">${[1, 2, 3].map((t) =>
        `<option value="${t}"${t === l.tier ? ' selected' : ''}>${t} · ${TIERS[t]}</option>`).join('')}</select></td>
      <td><button type="button" class="link del" aria-label="Remove ${esc(l.name)}">Remove</button></td>`;
    tr.addEventListener('input', (e) => {
      const k = e.target.dataset.k;
      if (!k) return;
      l[k] = k === 'name' ? e.target.value : k === 'tier' ? Number(e.target.value) : Math.max(0, num(e.target.value, 0));
      if (k === 'hours') l.hours = Math.min(24, l.hours);
      render();
    });
    tr.querySelector('.del').addEventListener('click', () => { loads.splice(i, 1); renderLoads(); render(); });
    tbody.appendChild(tr);
  });
}

function render() {
  const a = assumptions();
  const s = size();
  const sim = simulate(loads, s, a);
  const e = economics(loads, s, sim, a);
  const p = tierPower(loads);

  const safe = sim.unserved[1] < 0.01;
  const essential = sim.unserved[2] < 0.01;
  $('verdict').className = 'verdict ' + (safe && essential ? 'ok' : safe ? 'warn' : 'bad');
  $('verdict').textContent = safe && essential
    ? `Life-critical and essential loads stay on through all ${a.outageHours} outage hours.`
    : safe
      ? `Life-critical loads stay on, but ${f1(sim.unserved[2])} kWh of essential load is shed each day. Add battery or generator.`
      : `Life-critical loads lose ${f1(sim.unserved[1])} kWh a day. This system is not safe yet: add battery or generator.`;

  $('kpis').innerHTML = [
    ['Critical load (tiers 1+2)', `${f1(p[1] + p[2])} kW avg`],
    ['Diesel today (genset only)', `${f0(e.baselineLitres)} L/day`],
    ['Diesel with this system', `${f1(e.hybridLitres)} L/day · ${sim.genHours} h run`],
    ['Up-front cost', money(e.capex)],
    ['Monthly payment', `${money(e.monthlyPayment)} over ${a.financeYears} y`],
    ['Monthly diesel saved', money(e.monthlyDieselSaving)],
    ['Simple payback', Number.isFinite(e.paybackYears) ? `${f1(e.paybackYears)} years` : 'never'],
    ['Inverter', `${e.inverterKw} kW`],
  ].map(([k, v]) => `<div><span>${k}</span><strong>${v}</strong></div>`).join('');

  $('order').innerHTML = [3, 2, 1].map((t) => {
    const names = loads.filter((l) => l.tier === t).map((l) => esc(l.name)).join(', ') || 'none';
    const rule = t === 3 ? 'shed first, never on diesel' : t === 2 ? 'solar, battery, then generator' : 'never shed; generator is the last line';
    return `<li><strong>Tier ${t} · ${TIERS[t]}</strong> (${rule}): ${names}</li>`;
  }).join('');

  $('chart').innerHTML = chart(sim, p);
}

function chart(sim, p) {
  const W = 720, H = 260, padL = 34, padB = 22, padT = 8;
  const total = p[1] + p[2] + p[3];
  const max = Math.max(total, ...sim.hours.map((r) => r.solar)) * 1.1 || 1;
  const bw = (W - padL) / 24;
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  let bars = '';
  for (const r of sim.hours) {
    const served = r.served[1] + r.served[2] + r.served[3];
    const solarUsed = Math.min(r.solar, served);
    const parts = r.out
      ? [['solar', solarUsed], ['batt', Math.max(0, served - solarUsed - r.gen)], ['gen', r.gen], ['shed', total - served]]
      : [['solar', solarUsed], ['grid', served - solarUsed]];
    let acc = 0;
    const x = padL + r.h * bw + 1;
    for (const [cls, v] of parts) {
      if (v <= 1e-6) continue;
      bars += `<rect class="${cls}" x="${x}" y="${y(acc + v)}" width="${bw - 2}" height="${y(acc) - y(acc + v)}"><title>${pad(r.h)}:00 ${cls} ${f1(v)} kW</title></rect>`;
      acc += v;
    }
    if (r.out) bars += `<rect class="outband" x="${x - 1}" y="${H - padB + 3}" width="${bw}" height="4"/>`;
  }
  const soc = sim.hours.map((r) => `${padL + r.h * bw + bw / 2},${padT + (H - padT - padB) * (1 - r.soc)}`).join(' ');
  const ticks = [0, 6, 12, 18].map((h) => `<text x="${padL + h * bw}" y="${H - 2}">${pad(h)}:00</text>`).join('');
  const yt = [0, max / 2].map((v) => `<text x="0" y="${y(v) + 4}">${f1(v)}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">${bars}<polyline class="socline" points="${soc}"/>${ticks}${yt}<text x="0" y="${padT + 10}">kW</text></svg>
    <p class="hint">Red strip under the hours = grid outage. Line = battery charge (0-100% of usable).</p>`;
}

const num = (v, d) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : d);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const f0 = (v) => Math.round(v).toLocaleString('en');
const f1 = (v) => (Math.round(v * 10) / 10).toLocaleString('en');
const money = (v) => Math.round(v).toLocaleString('en');
const pad = (h) => String(h).padStart(2, '0');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

fillAssumptions();
renderLoads();
fillSize();
render();

for (const id of [...ASSUMPTION_IDS, 'financeRatePct', ...SIZE_IDS]) $(id).addEventListener('input', render);
$('add').addEventListener('click', () => { loads.push({ name: 'New equipment', watts: 100, hours: 8, tier: 2 }); renderLoads(); render(); });
$('reset').addEventListener('click', () => { loads = SAMPLE_LOADS.map((l) => ({ ...l })); renderLoads(); fillSize(); render(); });
$('autosize').addEventListener('click', () => { fillSize(); render(); });
$('print').addEventListener('click', () => window.print());
