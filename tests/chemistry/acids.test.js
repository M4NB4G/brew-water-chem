// Hand-calculated verification of acid capacity and alkalinity-reduction math.
//
// Two derivation chains under test:
//
//   (1) Liquid acid capacity (mEq/mL) =
//         density [g/mL] × weight_fraction × 1000 / molecular_weight
//
//   (2) Alkalinity reduction (mg/L as CaCO3) for `dose` units of acid in
//       `gallons` of water =
//         (dose × capacity) / (gallons × 3.78541) × 50.04
//
// Constants are NOT modified — densities are CRC Handbook 97th ed., MW
// values are IUPAC. Acidulated malt: 2% lactic w/w (Weyermann spec sheet,
// midpoint of the published 1–2% range).
//
// Reference per Troester (2009) Braukaiser.com — phosphoric acid is treated
// as monoprotic at mash pH 5.4 (only pKa1 = 2.15 dissociates fully).

import { describe, it, expect } from 'vitest';
import {
  acidAlkalinityReduction,
  acidCapacity,
  acidContribution,
  applyAcids,
  ACIDS,
} from '../../src/chemistry/acids.js';

describe('acidCapacity', () => {
  it('lactic 88%: ≈ 11.81 mEq/mL', () => {
    expect(acidCapacity('lactic_88')).toBeCloseTo(11.812, 2);
  });

  it('phosphoric 10%: ≈ 1.076 mEq/mL', () => {
    expect(acidCapacity('phosphoric_10')).toBeCloseTo(1.0756, 3);
  });

  it('phosphoric 75%: ≈ 12.08 mEq/mL', () => {
    expect(acidCapacity('phosphoric_75')).toBeCloseTo(12.083, 2);
  });

  it('phosphoric 85%: ≈ 14.62 mEq/mL', () => {
    expect(acidCapacity('phosphoric_85')).toBeCloseTo(14.617, 2);
  });

  it('acidulated malt: ≈ 0.222 mEq/g (2% lactic)', () => {
    expect(acidCapacity('acidulated_malt')).toBeCloseTo(0.222, 2);
  });

  it('throws for an unknown acid key', () => {
    expect(() => acidCapacity('sulfuric')).toThrow('Unknown acid');
  });
});

describe('acidAlkalinityReduction', () => {
  it('returns 0 for zero dose', () => {
    expect(acidAlkalinityReduction('lactic_88', 0, 5)).toBe(0);
  });

  it('throws for an unknown acid key', () => {
    expect(() => acidAlkalinityReduction('sulfuric', 1, 5)).toThrow('Unknown acid');
  });

  it('lactic 88%: 1 mL in 5 gal → ~31.2 mg/L as CaCO3', () => {
    // (1 mL × 11.812 mEq/mL) / (5 × 3.78541 L) × 50.04 ≈ 31.24
    expect(acidAlkalinityReduction('lactic_88', 1, 5)).toBeCloseTo(31.24, 1);
  });

  it('phosphoric 10%: lower mEq/mL than lactic 88% → smaller reduction', () => {
    const lactic = acidAlkalinityReduction('lactic_88', 1, 5);
    const phos10 = acidAlkalinityReduction('phosphoric_10', 1, 5);
    expect(phos10).toBeLessThan(lactic);
  });

  it('scales linearly with dose', () => {
    const one = acidAlkalinityReduction('lactic_88', 1, 5);
    const two = acidAlkalinityReduction('lactic_88', 2, 5);
    expect(two).toBeCloseTo(one * 2, 6);
  });

  it('scales inversely with volume', () => {
    const small = acidAlkalinityReduction('lactic_88', 1, 5);
    const large = acidAlkalinityReduction('lactic_88', 1, 10);
    expect(small).toBeCloseTo(large * 2, 6);
  });

  it('ACIDS table: every entry has a working capacity calculation', () => {
    for (const key of Object.keys(ACIDS)) {
      expect(acidCapacity(key), key).toBeGreaterThan(0);
    }
  });
});

describe('first-principles hand-calculations', () => {
  it('lactic 88% capacity: 1.209 × 0.88 × 1000 / 90.08 ≈ 11.811 mEq/mL', () => {
    // density=1.209 g/mL, wt_frac=0.88, MW(C3H6O3)=90.08
    // (1.209 × 0.88) × 1000 = 1063.92 g/L of lactic acid
    // mEq/mL = 1063.92 / 90.08 = 11.8108 (monoprotic)
    const expected = (1.209 * 0.88 * 1000) / 90.08;
    expect(acidCapacity('lactic_88')).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(11.811, 2);
  });

  it('phosphoric 10% capacity: 1.054 × 0.10 × 1000 / 97.99 ≈ 1.0756 mEq/mL', () => {
    // Treated as monoprotic at mash pH (Troester 2009)
    const expected = (1.054 * 0.10 * 1000) / 97.99;
    expect(acidCapacity('phosphoric_10')).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(1.0756, 4);
  });

  it('phosphoric 75% capacity: 1.579 × 0.75 × 1000 / 97.99 ≈ 12.085 mEq/mL', () => {
    const expected = (1.579 * 0.75 * 1000) / 97.99;
    expect(acidCapacity('phosphoric_75')).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(12.085, 2);
  });

  it('phosphoric 85% capacity: 1.685 × 0.85 × 1000 / 97.99 ≈ 14.616 mEq/mL', () => {
    const expected = (1.685 * 0.85 * 1000) / 97.99;
    expect(acidCapacity('phosphoric_85')).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(14.616, 2);
  });

  it('acidulated malt capacity: 0.02 × 1000 / 90.08 ≈ 0.2220 mEq/g', () => {
    // 2% lactic by weight (Weyermann spec 1–2%; app uses 2%); divided by lactic MW
    const expected = (0.02 * 1000) / 90.08;
    expect(acidCapacity('acidulated_malt')).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(0.222, 3);
  });

  it('lactic 88%, 2 mL into 10 gal: full hand-calc of alkalinity reduction', () => {
    // Step 1: total mEq = 2 mL × 11.812 mEq/mL = 23.624 mEq
    // Step 2: liters    = 10 gal × 3.78541 L/gal = 37.8541 L
    // Step 3: mEq/L     = 23.624 / 37.8541 = 0.62408
    // Step 4: ppm CaCO3 = 0.62408 × 50.04 = 31.23 mg/L
    const totalMeq = 2 * ((1.209 * 0.88 * 1000) / 90.08);
    const liters = 10 * 3.78541;
    const expected = (totalMeq / liters) * 50.04;
    expect(acidAlkalinityReduction('lactic_88', 2, 10)).toBeCloseTo(expected, 6);
    expect(expected).toBeCloseTo(31.23, 1);
  });

  it('phosphoric 75%, 5 mL into 10 gal: hand-calc reduction', () => {
    // mEq = 5 × 12.083 = 60.415
    // L   = 37.8541
    // ppm CaCO3 = (60.415 / 37.8541) × 50.04 = 79.86 mg/L
    expect(acidAlkalinityReduction('phosphoric_75', 5, 10)).toBeCloseTo(79.86, 1);
  });

  it('acidulated malt, 100 g into 5 gal: hand-calc reduction', () => {
    // mEq = 100 × 0.2220 = 22.20  (2% lactic; was 3%/0.333 before Weyermann correction)
    // L   = 18.927
    // ppm CaCO3 = (22.20 / 18.927) × 50.04 ≈ 58.70 mg/L
    expect(acidAlkalinityReduction('acidulated_malt', 100, 5)).toBeCloseTo(58.70, 1);
  });

  it('1 mEq H+ per L = 50.04 mg/L as CaCO3 (definition check)', () => {
    // Define a synthetic dose: 1 mEq exactly into 1 liter (≈ 0.2642 gal)
    // Result must be exactly 50.04.
    const cap = acidCapacity('lactic_88'); // mEq/mL
    const mlForOneMeq = 1 / cap;            // mL of acid that delivers 1 mEq
    const gallonsForOneL = 1 / 3.78541;     // gallons in 1 L
    expect(acidAlkalinityReduction('lactic_88', mlForOneMeq, gallonsForOneL)).toBeCloseTo(50.04, 2);
  });
});

describe('acidContribution', () => {
  it('amount × capacity for liquid acid', () => {
    expect(acidContribution('lactic_88', 1)).toBeCloseTo(acidCapacity('lactic_88'), 9);
    expect(acidContribution('phosphoric_85', 2.5))
      .toBeCloseTo(2.5 * acidCapacity('phosphoric_85'), 9);
  });

  it('amount × capacity for acidulated malt (mEq/g)', () => {
    expect(acidContribution('acidulated_malt', 100))
      .toBeCloseTo(100 * acidCapacity('acidulated_malt'), 9);
  });

  it('zero or missing amount returns 0', () => {
    expect(acidContribution('lactic_88', 0)).toBe(0);
    expect(acidContribution('lactic_88', undefined)).toBe(0);
    expect(acidContribution('lactic_88', null)).toBe(0);
  });
});

describe('applyAcids — multi-acid linearity', () => {
  it('mEq combines linearly with no cross-terms', () => {
    // applyAcids({lactic_88: 1, phosphoric_85: 1}, 5) must equal the sum of
    // the two single-acid reductions evaluated separately.
    const a = acidAlkalinityReduction('lactic_88', 1, 5);
    const b = acidAlkalinityReduction('phosphoric_85', 1, 5);
    const mix = applyAcids({ lactic_88: 1, phosphoric_85: 1 }, 5);
    expect(mix.ppm_alk_reduced).toBeCloseTo(a + b, 6);

    const expectedMeq = 1 * acidCapacity('lactic_88')
                      + 1 * acidCapacity('phosphoric_85');
    expect(mix.total_meq).toBeCloseTo(expectedMeq, 6);
  });

  it('three-acid mix sums all contributions (lactic + phos85 + acid malt)', () => {
    const liquid1 = acidAlkalinityReduction('lactic_88', 0.5, 10);
    const liquid2 = acidAlkalinityReduction('phosphoric_85', 0.3, 10);
    const solid   = acidAlkalinityReduction('acidulated_malt', 50, 10);
    const mix = applyAcids(
      { lactic_88: 0.5, phosphoric_85: 0.3, acidulated_malt: 50 },
      10
    );
    expect(mix.ppm_alk_reduced).toBeCloseTo(liquid1 + liquid2 + solid, 6);
  });

  it('empty mix returns zero', () => {
    expect(applyAcids({}, 5).total_meq).toBe(0);
    expect(applyAcids({}, 5).ppm_alk_reduced).toBe(0);
  });

  it('zero / missing entries treated as 0', () => {
    const r = applyAcids({ lactic_88: 0, phosphoric_85: 1 }, 5);
    expect(r.total_meq).toBeCloseTo(acidCapacity('phosphoric_85'), 6);
    expect(r.ppm_alk_reduced).toBeCloseTo(
      acidAlkalinityReduction('phosphoric_85', 1, 5), 6
    );
  });

  it('single-acid mix equals legacy single-acid function', () => {
    const legacy = acidAlkalinityReduction('lactic_88', 2, 10);
    const multi  = applyAcids({ lactic_88: 2 }, 10).ppm_alk_reduced;
    expect(multi).toBeCloseTo(legacy, 9);
  });

  it('throws for non-positive gallons', () => {
    expect(() => applyAcids({ lactic_88: 1 }, 0)).toThrow('gallons must be > 0');
  });

  it('throws for an unknown acid key in the mix', () => {
    expect(() => applyAcids({ sulfuric: 1 }, 5)).toThrow('Unknown acid');
  });
});
