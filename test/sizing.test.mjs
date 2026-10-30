import test from 'node:test';
import assert from 'node:assert/strict';
import { SAMPLE_LOADS, DEFAULTS, tierPower, isOutage, solarShape, autoSize, simulate, economics } from '../public/sizing.js';

test('solar shape sums to peak sun hours', () => {
  let s = 0; for (let h = 0; h < 24; h++) s += solarShape(h, 5);
  assert.ok(Math.abs(s - 5) < 0.05, `got ${s}`);
});

test('outage window wraps past midnight', () => {
  const hrs = [...Array(24).keys()].filter((h) => isOutage(h, 18, 14));
  assert.equal(hrs.length, 14);
  assert.ok(isOutage(23, 18, 14) && isOutage(7, 18, 14) && !isOutage(8, 18, 14));
});

test('auto-sized system never drops a life-critical load', () => {
  const size = autoSize(SAMPLE_LOADS);
  const sim = simulate(SAMPLE_LOADS, size);
  assert.ok(sim.unserved[1] < 1e-6, `life-critical unserved ${sim.unserved[1]}`);
  assert.ok(sim.unserved[2] < 1e-6, `essential unserved ${sim.unserved[2]}`);
});

test('without storage or generator the critical loads go dark at night', () => {
  const sim = simulate(SAMPLE_LOADS, { pvKw: 10, batteryKwh: 0, generatorKw: 0 });
  assert.ok(sim.unserved[1] > 1);
});

test('comfort loads are shed before essential ones and never get diesel', () => {
  const size = { pvKw: 0, batteryKwh: 0, generatorKw: 20 };
  const sim = simulate(SAMPLE_LOADS, size);
  const p = tierPower(SAMPLE_LOADS);
  assert.ok(sim.unserved[1] < 1e-6 && sim.unserved[2] < 1e-6);
  assert.ok(Math.abs(sim.unserved[3] - p[3] * DEFAULTS.outageHours) < 1e-6);
});

test('hybrid burns less diesel than genset-only and pays back', () => {
  const size = autoSize(SAMPLE_LOADS);
  const e = economics(SAMPLE_LOADS, size, simulate(SAMPLE_LOADS, size));
  assert.ok(e.hybridLitres < e.baselineLitres);
  assert.ok(e.paybackYears > 0 && Number.isFinite(e.paybackYears));
});
