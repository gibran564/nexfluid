import { MORPH_PHYSICS, morphTiming, overshootOf } from './src/morph.ts';
for (const [name, p] of Object.entries(MORPH_PHYSICS)) {
  const t = morphTiming(p);
  console.log(name.padEnd(10), 'surface', Math.round(t.surface * 1000), 'ms visual', Math.round(t.visual * 1000), 'ms  total', Math.round(t.total * 1000), 'ms  overshoot', (t.overshoot * 100).toFixed(1), '% analytic', (overshootOf(p) * 100).toFixed(1));
}
