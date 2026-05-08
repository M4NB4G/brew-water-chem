// Chemistry-engine parity test against Bru'n Water 1.25 free.
//
// Bru'n Water 1.25 is a what-if calculator (no solver), so this is NOT a
// solver-vs-solver comparison. We feed each batch's source water + recorded
// salt/acid additions through our predictFinalProfile() chemistry engine
// and compare the predicted final ion profile against Bru'n's prediction.
//
// Tolerance: ±5 ppm OR ±5% per ion, whichever is greater.
//
// Known systematic differences (documented in batches.json _metadata) are
// marked as expected failures via it.fails() — they do NOT fail the suite,
// but if a "known" difference unexpectedly disappears (constants changed,
// Bru'n updated their model, etc.) the suite WILL fail and prompt review:
//   - Batch 1, Cl: ~8 ppm low. App uses CaCl2·2H2O (Palmer 2013 dihydrate);
//                  Bru'n uses anhydrous CaCl2.
//   - Batch 2, Alk: ~9 ppm high. Bru'n applies a CO2 outgassing correction
//                   to NaHCO3 alkalinity that we don't model.
//
// A summary table is printed per batch showing Mine, Bru'n, Diff, Pct, Status.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { predictFinalProfile } from '../../src/chemistry/solver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(readFileSync(join(__dirname, 'batches.json'), 'utf8'));

// First entry holds _metadata; real batches have a "name" field.
const batches = raw.filter((b) => b.name && b.test_type === 'chemistry_parity');

const TOL_PPM = 5;
const TOL_PCT = 5;
const IONS = ['Ca', 'Mg', 'Na', 'SO4', 'Cl', 'Alk'];

// Per-batch list of ions whose tolerance failure is *expected* and documented.
// Keyed by the leading "Batch N" prefix of the batch name.
const EXPECTED_FAILS = {
  'Batch 1': ['Cl'],   // CaCl2 dihydrate (Palmer 2013) vs Bru'n's anhydrous
  'Batch 2': ['Alk'],  // NaHCO3 CO2 outgassing — Bru'n applies, we don't
};

function withinTolerance(actual, expected) {
  const absErr = Math.abs(actual - expected);
  if (absErr <= TOL_PPM) return true;
  if (Math.abs(expected) > 0) return (absErr / Math.abs(expected)) * 100 <= TOL_PCT;
  return false;
}

function shortBatchName(name) {
  return name.split(' ').slice(0, 2).join(' '); // "Batch 1 — foo" → "Batch 1"
}

function formatRow(ion, mine, brun, status) {
  const diff = mine - brun;
  const pct = brun !== 0 ? (diff / brun) * 100 : 0;
  return [
    ion.padEnd(4),
    mine.toFixed(1).padStart(8),
    brun.toFixed(1).padStart(8),
    (diff >= 0 ? '+' : '') + diff.toFixed(2).padStart(7),
    `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`.padStart(8),
    status,
  ].join('  ');
}

describe("reference-batch parity vs Bru'n Water 1.25", () => {
  if (batches.length === 0) {
    it.todo('no chemistry_parity batches in batches.json');
    return;
  }

  for (const batch of batches) {
    describe(batch.name, () => {
      const expectedFails = EXPECTED_FAILS[shortBatchName(batch.name)] || [];
      const result = predictFinalProfile({
        source: batch.source,
        additions: batch.applied_additions_g,
        acidDose: batch.applied_acid_ml ?? 0,
        acidKey: batch.applied_acid_type,
        volumeGallons: batch.volume_gallons,
      });
      const ref = batch.brun_predicted_final_ions;

      // Print the summary table once per batch, before any per-ion assertion runs.
      beforeAll(() => {
        console.log(`\n${batch.name}`);
        console.log(`Ion   ${'Mine'.padStart(8)}  ${'Bru\'n'.padStart(8)}  ${'Diff'.padStart(8)}  ${'Pct'.padStart(8)}  Status`);
        for (const ion of IONS) {
          const ours = result[ion];
          const brun = ref[ion];
          const within = withinTolerance(ours, brun);
          const expected = expectedFails.includes(ion);
          const status = within
            ? 'PASS'
            : expected
              ? `EXPECTED FAIL (${ion === 'Cl' ? 'CaCl2 hydrate' : ion === 'Alk' ? 'NaHCO3 outgassing' : 'documented'})`
              : 'UNEXPECTED FAIL';
          console.log(formatRow(ion, ours, brun, status));
        }
      });

      for (const ion of IONS) {
        const ours = result[ion];
        const brun = ref[ion];

        if (expectedFails.includes(ion)) {
          // it.fails: passes if the assertion FAILS — exactly the semantics
          // we want for "this is expected to be outside tolerance".
          // If our chemistry ever moves into tolerance unexpectedly, this
          // test will fail and we will know to remove the expected-fail tag.
          it.fails(`${ion} — outside tolerance (expected systematic difference)`, () => {
            expect(withinTolerance(ours, brun)).toBe(true);
          });
        } else {
          it(`${ion} — within ±${TOL_PPM} ppm or ±${TOL_PCT}%`, () => {
            expect(withinTolerance(ours, brun)).toBe(true);
          });
        }
      }
    });
  }
});
