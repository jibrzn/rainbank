// Synthetic training storms for the RainBank flood-risk predictor.
// Uses the SAME simulation engine as the prototype (copied from index.html into engine_from_index.js).
// Each row = what is known at forecast time + what actually happened with today's passive tanks.
// The real storm differs from the forecast (about +/-20% in depth), so the model learns probabilities.
// Usage: node generate_data.js 20000 > storms.csv
const { DEFAULTS, simulate } = require('./engine_from_index.js');
const N = parseInt(process.argv[2] || '20000', 10);
let seed = 20261022; const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
const DURS = [30, 45, 60, 90, 120, 150, 180];
console.log('fc_depth_mm,duration_min,peak_pos,tank_start,cap_ls_per_100homes,act_depth_mm,peak_ls_per_100homes,flood');
for (let i = 0; i < N; i++) {
  const fc = 5 + rnd() * 115, du = DURS[Math.floor(rnd() * DURS.length)], pk = 0.2 + rnd() * 0.4;
  const start = rnd(), capPer100 = 100 + rnd() * 250;            // drain capacity per 100 homes (default 175)
  const act = fc * Math.exp(0.2 * gauss()), actPk = Math.min(0.7, Math.max(0.15, pk + 0.05 * gauss()));
  const p = { ...DEFAULTS, depth: act, duration: du, peakPos: actPk, basicStart: start, cap: capPer100 * DEFAULTS.homes / 100 };
  const r = simulate(p, 'basic');                                // today's passive tanks, no AI
  console.log([fc, du, pk, start, capPer100, act, r.peak / DEFAULTS.homes * 100].map(v => (+v).toFixed(4)).concat([r.overflow > 0.5 ? 1 : 0]).join(','));
}
