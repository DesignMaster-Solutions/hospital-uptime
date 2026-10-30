// Hospital Uptime: sizing + hourly dispatch for a solar + battery + backup generator system.
// Pure functions, no DOM: the page and the tests share this file.

export const TIERS = { 1: 'Life-critical', 2: 'Essential', 3: 'Comfort' };

// Typical small Nigerian general hospital. Watts are nameplate-average running power, not surge.
export const SAMPLE_LOADS = [
  { name: 'Oxygen concentrators (4)', watts: 1200, hours: 24, tier: 1 },
  { name: 'Vaccine & blood bank fridges (3)', watts: 450, hours: 24, tier: 1 },
  { name: 'ICU monitors & infusion pumps', watts: 600, hours: 24, tier: 1 },
  { name: 'Theatre lights & suction', watts: 1500, hours: 6, tier: 1 },
  { name: 'Ward & corridor lighting (LED)', watts: 900, hours: 12, tier: 2 },
  { name: 'Laboratory analyzers & centrifuge', watts: 1100, hours: 10, tier: 2 },
  { name: 'Water pump', watts: 750, hours: 4, tier: 2 },
  { name: 'Records PCs, router, phones', watts: 400, hours: 12, tier: 2 },
  { name: 'Ceiling fans', watts: 1200, hours: 14, tier: 3 },
  { name: 'Office air conditioner', watts: 1500, hours: 8, tier: 3 },
];

// Every number here is an editable assumption, not a quote.
export const DEFAULTS = {
  outageHours: 14, // 8-20 h/day reported; midpoint
  outageStart: 18, // evening peak load shedding
  peakSunHours: 5.0, // northern Nigeria ~5.5-6, south ~4-4.5
  performanceRatio: 0.75,
  depthOfDischarge: 0.8, // LiFePO4
  roundTrip: 0.92,
  dieselPrice: 1.0, // currency units per litre
  litresPerKwh: 0.3, // small genset at part load
  pvCostPerKw: 550,
  batteryCostPerKwh: 250,
  generatorCostPerKw: 180,
  inverterCostPerKw: 200,
  financeYears: 5,
  financeRate: 0.12,
};

export function tierPower(loads) {
  const p = { 1: 0, 2: 0, 3: 0 };
  for (const l of loads) p[l.tier] += (l.watts * l.hours) / 24 / 1000; // average kW
  return p;
}

export function isOutage(hour, start, hours) {
  return ((hour - start + 24) % 24) < hours;
}

// Solar shape: half-sine from 06:00 to 18:00, scaled so the day sums to peakSunHours per kWp.
export function solarShape(hour, psh) {
  if (hour < 6 || hour >= 18) return 0;
  const x = (hour + 0.5 - 6) / 12;
  return Math.sin(Math.PI * x) * psh * (Math.PI / 24);
}

export function autoSize(loads, a = DEFAULTS) {
  const p = tierPower(loads);
  const critical = p[1] + p[2];
  const outageKwh = critical * a.outageHours;
  return {
    pvKw: ceil1(outageKwh / (a.peakSunHours * a.performanceRatio)),
    batteryKwh: ceil1(outageKwh / (a.depthOfDischarge * a.roundTrip)),
    generatorKw: Math.ceil(p[1] * 1.25 + 0.5), // backs up life-critical only, for cloudy days
  };
}

// Runs `days` identical days and reports the last one (battery state has settled by then).
export function simulate(loads, size, a = DEFAULTS, days = 3) {
  const p = tierPower(loads);
  const usable = size.batteryKwh * a.depthOfDischarge;
  const chargeRate = size.batteryKwh * 0.25;
  let soc = usable / 2;
  let day;
  for (let d = 0; d < days; d++) {
    day = { hours: [], unserved: { 1: 0, 2: 0, 3: 0 }, genKwh: 0, genHours: 0, solarKwh: 0, gridKwh: 0 };
    for (let h = 0; h < 24; h++) {
      const solar = size.pvKw * a.performanceRatio * solarShape(h, a.peakSunHours);
      const out = isOutage(h, a.outageStart, a.outageHours);
      const row = { h, out, solar, served: { 1: 0, 2: 0, 3: 0 }, gen: 0, soc: 0 };
      let avail = solar;
      if (!out) {
        // Grid carries every load; solar surplus and grid top up the battery.
        row.served = { ...p };
        day.gridKwh += Math.max(0, p[1] + p[2] + p[3] - solar);
        soc = Math.min(usable, soc + chargeRate * a.roundTrip);
      } else {
        let fromBattery = Math.min(soc * a.roundTrip, chargeRate);
        let genLeft = 0;
        for (const t of [1, 2, 3]) {
          let need = p[t];
          const s = Math.min(need, avail); avail -= s; need -= s;
          const b = Math.min(need, fromBattery); fromBattery -= b; soc -= b / a.roundTrip; need -= b;
          // Generator only for life-critical and essential loads, never for comfort.
          if (need > 1e-9 && t < 3 && size.generatorKw > 0) {
            if (row.gen === 0) genLeft = size.generatorKw;
            const g = Math.min(need, genLeft); genLeft -= g; row.gen += g; need -= g;
          }
          row.served[t] = p[t] - need;
          day.unserved[t] += need;
        }
        if (avail > 0) soc = Math.min(usable, soc + Math.min(avail, chargeRate) * a.roundTrip);
        if (row.gen > 0) { day.genKwh += row.gen; day.genHours += 1; }
      }
      day.solarKwh += solar;
      row.soc = usable ? soc / usable : 0;
      day.hours.push(row);
    }
  }
  return day;
}

export function economics(loads, size, sim, a = DEFAULTS) {
  const p = tierPower(loads);
  const baselineLitres = (p[1] + p[2] + p[3]) * a.outageHours * a.litresPerKwh; // genset carries every outage hour
  const hybridLitres = sim.genKwh * a.litresPerKwh;
  const inverterKw = Math.ceil((p[1] + p[2] + p[3]) * 2); // headroom over average for motor starts
  const capex = size.pvKw * a.pvCostPerKw + size.batteryKwh * a.batteryCostPerKwh
    + size.generatorKw * a.generatorCostPerKw + inverterKw * a.inverterCostPerKw;
  const baselineYear = baselineLitres * a.dieselPrice * 365;
  const hybridYear = hybridLitres * a.dieselPrice * 365;
  const savingYear = baselineYear - hybridYear;
  const r = a.financeRate / 12, n = a.financeYears * 12;
  const monthly = r ? (capex * r) / (1 - (1 + r) ** -n) : capex / n;
  return {
    inverterKw, capex, baselineLitres, hybridLitres, baselineYear, hybridYear, savingYear,
    paybackYears: savingYear > 0 ? capex / savingYear : Infinity,
    monthlyPayment: monthly,
    monthlyDieselSaving: savingYear / 12,
  };
}

function ceil1(x) { return Math.ceil(x * 10) / 10; }
