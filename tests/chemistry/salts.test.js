// Hand-calculated verification of salt ion contribution math.
//
// Each "first-principles" test derives the expected ppm contribution from
// atomic masses + molecular weights + the gallon→liter conversion, with the
// arithmetic shown in comments. The constants in salts.js are NOT modified
// — they're Palmer-Kaminski (2013) Appendix A values, kept verbatim — but
// these tests prove the table values are internally consistent.
//
// Reference atomic masses (IUPAC 2021): Ca 40.08, Mg 24.31, Na 22.99,
// S 32.06, O 16.00, Cl 35.45, H 1.008, C 12.01.

import { describe, it, expect } from 'vitest';
import {
  saltContribution,
  SALT_CONTRIBUTIONS_PER_G_GAL,
  HCO3_TO_CACO3,
} from '../../src/chemistry/salts.js';

// 1 g/gal converted to mg/L: 1000 mg / 3.78541 L = 264.172 mg/L
const PPM_PER_G_GAL = 1000 / 3.78541;

describe('saltContribution', () => {
  it('returns zero contribution for zero grams', () => {
    const r = saltContribution('gypsum', 0, 5);
    expect(r.Ca ?? 0).toBe(0);
    expect(r.SO4 ?? 0).toBe(0);
  });

  it('throws for an unknown salt key', () => {
    expect(() => saltContribution('unobtainium', 5, 5)).toThrow('Unknown salt');
  });

  it('throws for non-positive volume', () => {
    expect(() => saltContribution('gypsum', 1, 0)).toThrow();
  });

  it('gypsum: 1 g/gal → 61.5 ppm Ca and 147.4 ppm SO4', () => {
    const { Ca, SO4 } = saltContribution('gypsum', 1, 1);
    expect(Ca).toBeCloseTo(61.5, 1);
    expect(SO4).toBeCloseTo(147.4, 1);
  });

  it('calcium_chloride: 1 g/gal → 72.0 ppm Ca and 127.4 ppm Cl', () => {
    const { Ca, Cl } = saltContribution('calcium_chloride', 1, 1);
    expect(Ca).toBeCloseTo(72.0, 1);
    expect(Cl).toBeCloseTo(127.4, 1);
  });

  it('epsom: contributes Mg and SO4, no Ca', () => {
    const r = saltContribution('epsom', 1, 1);
    expect(r.Ca).toBeUndefined();
    expect(r.Mg).toBeCloseTo(26.0, 1);
    expect(r.SO4).toBeCloseTo(103.0, 1);
  });

  it('table_salt: 5 g into 5 gal → 103.9 ppm Na, 160.3 ppm Cl (linear)', () => {
    const { Na, Cl } = saltContribution('table_salt', 5, 5);
    expect(Na).toBeCloseTo(103.9, 1);
    expect(Cl).toBeCloseTo(160.3, 1);
  });

  it('SALT_CONTRIBUTIONS_PER_G_GAL: all listed ion values are non-negative', () => {
    for (const [key, salt] of Object.entries(SALT_CONTRIBUTIONS_PER_G_GAL)) {
      for (const ion of ['Ca', 'Mg', 'Na', 'SO4', 'Cl', 'HCO3', 'alk_as_CaCO3']) {
        if (salt[ion] !== undefined) {
          expect(salt[ion], `${key}.${ion}`).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('scales linearly with grams', () => {
    const a = saltContribution('gypsum', 1, 5);
    const b = saltContribution('gypsum', 2, 5);
    expect(b.Ca).toBeCloseTo(a.Ca * 2, 6);
  });

  it('scales inversely with volume', () => {
    const small = saltContribution('gypsum', 1, 5);
    const large = saltContribution('gypsum', 1, 10);
    expect(small.Ca).toBeCloseTo(large.Ca * 2, 6);
  });

  it('HCO3_TO_CACO3 ratio is approximately 0.82', () => {
    expect(HCO3_TO_CACO3).toBeCloseTo(50.04 / 61.02, 6);
  });

  it('baking soda: HCO3 contribution is non-zero', () => {
    const r = saltContribution('baking_soda', 1, 1);
    expect(r.Na).toBeCloseTo(72.3, 1);
    expect(r.HCO3).toBeCloseTo(191.7, 1);
  });
});

describe('first-principles hand-calculations', () => {
  it('gypsum (CaSO₄·2H₂O) constant matches derivation from atomic masses', () => {
    // MW(CaSO4·2H2O) = 40.08 + 32.06 + 4×16.00 + 2×(2×1.008 + 16.00)
    //                = 40.08 + 32.06 + 64.00 + 36.03 = 172.17 g/mol
    // Ca  mass fraction = 40.08 / 172.17 = 0.23278
    // SO4 mass fraction = (32.06 + 64.00) / 172.17 = 96.06 / 172.17 = 0.55792
    // 1 g/gal = 264.172 mg/L gypsum
    //   → Ca:  264.172 × 0.23278 = 61.49 mg/L  (table = 61.5  ✓)
    //   → SO4: 264.172 × 0.55792 = 147.40 mg/L (table = 147.4 ✓)
    const MW = 172.17;
    const expectedCa = PPM_PER_G_GAL * (40.08 / MW);
    const expectedSO4 = PPM_PER_G_GAL * (96.06 / MW);
    const { Ca, SO4 } = saltContribution('gypsum', 1, 1);
    expect(Ca).toBeCloseTo(expectedCa, 1);
    expect(SO4).toBeCloseTo(expectedSO4, 1);
  });

  it('table salt (NaCl) constant matches derivation from atomic masses', () => {
    // MW(NaCl) = 22.99 + 35.45 = 58.44
    // Na frac = 22.99 / 58.44 = 0.39341
    // Cl frac = 35.45 / 58.44 = 0.60660
    // 1 g/gal = 264.172 mg/L NaCl
    //   → Na: 264.172 × 0.39341 = 103.93 (table = 103.9 ✓)
    //   → Cl: 264.172 × 0.60660 = 160.25 (table = 160.3 ✓)
    const MW = 58.44;
    const { Na, Cl } = saltContribution('table_salt', 1, 1);
    expect(Na).toBeCloseTo(PPM_PER_G_GAL * (22.99 / MW), 0);
    expect(Cl).toBeCloseTo(PPM_PER_G_GAL * (35.45 / MW), 0);
  });

  it('calcium chloride (CaCl₂·2H₂O) constant matches derivation', () => {
    // MW(CaCl2·2H2O) = 40.08 + 2×35.45 + 2×18.015 = 40.08 + 70.90 + 36.03 = 147.01
    // Ca frac = 40.08 / 147.01 = 0.27263
    // Cl frac = 70.90 / 147.01 = 0.48228
    // 1 g/gal = 264.172 mg/L
    //   → Ca: 264.172 × 0.27263 =  72.02 (table = 72.0  ✓)
    //   → Cl: 264.172 × 0.48228 = 127.40 (table = 127.4 ✓)
    const MW = 147.01;
    const { Ca, Cl } = saltContribution('calcium_chloride', 1, 1);
    expect(Ca).toBeCloseTo(PPM_PER_G_GAL * (40.08 / MW), 0);
    expect(Cl).toBeCloseTo(PPM_PER_G_GAL * (70.90 / MW), 0);
  });

  it('Epsom salt (MgSO₄·7H₂O) constant matches derivation', () => {
    // MW(MgSO4·7H2O) = 24.31 + 32.06 + 4×16.00 + 7×18.015
    //                = 24.31 + 32.06 + 64.00 + 126.10 = 246.47
    // Mg  frac = 24.31 / 246.47 = 0.09864
    // SO4 frac = 96.06 / 246.47 = 0.38975
    // 1 g/gal = 264.172 mg/L
    //   → Mg:  264.172 × 0.09864 =  26.06 (table =  26.0 ✓)
    //   → SO4: 264.172 × 0.38975 = 102.97 (table = 103.0 ✓)
    const MW = 246.47;
    const { Mg, SO4 } = saltContribution('epsom', 1, 1);
    expect(Mg).toBeCloseTo(PPM_PER_G_GAL * (24.31 / MW), 0);
    expect(SO4).toBeCloseTo(PPM_PER_G_GAL * (96.06 / MW), 0);
  });

  it('baking soda (NaHCO₃) constant matches derivation', () => {
    // MW(NaHCO3) = 22.99 + 1.008 + 12.01 + 3×16.00 = 84.01
    // Na   frac = 22.99 / 84.01 = 0.27366
    // HCO3 frac = (1.008 + 12.01 + 48.00) / 84.01 = 61.018 / 84.01 = 0.72632
    // 1 g/gal = 264.172 mg/L
    //   → Na:   264.172 × 0.27366 =  72.30 (table =  72.3 ✓)
    //   → HCO3: 264.172 × 0.72632 = 191.85 (table = 191.7 ≈)
    const MW = 84.01;
    const { Na, HCO3 } = saltContribution('baking_soda', 1, 1);
    expect(Na).toBeCloseTo(PPM_PER_G_GAL * (22.99 / MW), 0);
    expect(HCO3).toBeCloseTo(PPM_PER_G_GAL * (61.018 / MW), 0);
  });

  it('HCO3→CaCO3 conversion factor: 50.04/61.02 ≈ 0.820', () => {
    // 1 mEq HCO3 = 61.02 mg HCO3 (MW 61.02 g/mol, monovalent)
    // 1 mEq CaCO3 = 50.04 mg CaCO3 (MW 100.09 / 2 valence)
    // Conversion: HCO3 mg/L × (50.04 / 61.02) = alkalinity as CaCO3 mg/L
    expect(HCO3_TO_CACO3).toBeCloseTo(0.8201, 3);
  });

  it('5 g gypsum into 5 gal: hand-calculated multi-gram, multi-gallon scaling', () => {
    // 5 g / 5 gal = 1 g/gal exactly → 61.5 ppm Ca, 147.4 ppm SO4
    const r = saltContribution('gypsum', 5, 5);
    expect(r.Ca).toBeCloseTo(61.5, 1);
    expect(r.SO4).toBeCloseTo(147.4, 1);
  });

  it('3 g gypsum into 10 gal: hand-calculated', () => {
    // 3 g / 10 gal = 0.3 g/gal → 0.3 × 61.5 = 18.45 ppm Ca; 0.3 × 147.4 = 44.22 ppm SO4
    const r = saltContribution('gypsum', 3, 10);
    expect(r.Ca).toBeCloseTo(18.45, 2);
    expect(r.SO4).toBeCloseTo(44.22, 2);
  });
});
