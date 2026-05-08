// Hand-calculated verification of Kolbach (1953) RA and SO4:Cl ratio.
//
// Kolbach formula:  RA = Alkalinity − (Ca/1.4 + Mg/1.7)
//   where Alkalinity is reported as CaCO3 mg/L, and Ca, Mg are ion mg/L.
//
// The 1.4 and 1.7 divisors are equivalence factors that convert Ca²⁺ and
// Mg²⁺ to alkalinity-suppressing capacity expressed as CaCO3. They come
// from the molar masses and valences:
//   Ca: (CaCO3/2) / (Ca/2)  = 50.04 / 20.04 ≈ 2.50 (per mEq Ca²⁺)
//   Kolbach reports a phenomenological 1.4 because only ~3.5/5 of Ca²⁺
//   precipitates phosphate at mash pH (Palmer-Kaminski p. 58).
// Constants are NOT modified — they are Kolbach (1953) values.

import { describe, it, expect } from 'vitest';
import {
  residualAlkalinity,
  sulfateChlorideRatio,
  ratioCharacter,
} from '../../src/chemistry/ra.js';

describe('residualAlkalinity', () => {
  it('RA = 0 when all inputs are 0', () => {
    expect(residualAlkalinity(0, 0, 0)).toBe(0);
  });

  it('pure alkalinity with no hardness returns the alkalinity value', () => {
    expect(residualAlkalinity(100, 0, 0)).toBe(100);
  });

  it('Kolbach factors: Ca/1.4 and Mg/1.7 are subtracted', () => {
    // RA = 100 − 140/1.4 − 85/1.7 = 100 − 100 − 50 = −50
    const ra = residualAlkalinity(100, 140, 85);
    expect(ra).toBeCloseTo(-50, 5);
  });

  it('typical light lager water has negative or near-zero RA', () => {
    // Soft Pilsen-like water: low alk, moderate Ca
    const ra = residualAlkalinity(30, 60, 10);
    expect(ra).toBeLessThanOrEqual(10);
  });

  it('typical stout water has high positive RA', () => {
    const ra = residualAlkalinity(150, 50, 12);
    expect(ra).toBeGreaterThan(50);
  });
});

describe('sulfateChlorideRatio', () => {
  it('returns Infinity when Cl is 0', () => {
    expect(sulfateChlorideRatio(100, 0)).toBe(Infinity);
  });

  it('returns 1 when SO4 equals Cl', () => {
    expect(sulfateChlorideRatio(75, 75)).toBe(1);
  });

  it('ratio > 1 for sulfate-forward water', () => {
    expect(sulfateChlorideRatio(200, 50)).toBe(4);
  });

  it('ratio < 1 for chloride-forward water', () => {
    expect(sulfateChlorideRatio(50, 150)).toBeCloseTo(0.333, 2);
  });
});

describe('first-principles hand-calculations (Kolbach)', () => {
  it('Pilsen-like soft water (Alk 30, Ca 7, Mg 3): RA = 30 − 5 − 1.76 = 23.24', () => {
    // Pilsen historical profile per Palmer-Kaminski p. 124
    //   30 − (7/1.4 + 3/1.7) = 30 − (5.000 + 1.7647) = 30 − 6.7647 = 23.235
    expect(residualAlkalinity(30, 7, 3)).toBeCloseTo(23.24, 2);
  });

  it('Burton-on-Trent (Alk 270, Ca 295, Mg 45): RA = 270 − 210.71 − 26.47 = 32.82', () => {
    // Burton historical profile per Palmer-Kaminski p. 137
    //   270 − (295/1.4 + 45/1.7) = 270 − (210.7143 + 26.4706) = 270 − 237.185 = 32.815
    expect(residualAlkalinity(270, 295, 45)).toBeCloseTo(32.82, 2);
  });

  it('Munich (Alk 200, Ca 75, Mg 18): RA = 200 − 53.57 − 10.59 = 135.84', () => {
    // Munich historical profile per Palmer-Kaminski p. 128
    //   200 − (75/1.4 + 18/1.7) = 200 − (53.5714 + 10.5882) = 135.840
    expect(residualAlkalinity(200, 75, 18)).toBeCloseTo(135.84, 2);
  });

  it('Dublin (Alk 280, Ca 115, Mg 4): RA = 280 − 82.143 − 2.353 = 195.504', () => {
    // Dublin historical profile per Palmer-Kaminski p. 145
    //   280 − (115/1.4 + 4/1.7) = 280 − (82.1429 + 2.3529) = 195.504
    expect(residualAlkalinity(280, 115, 4)).toBeCloseTo(195.504, 2);
  });

  it('zero hardness: RA equals alkalinity exactly', () => {
    expect(residualAlkalinity(150, 0, 0)).toBe(150);
  });
});

describe('ratioCharacter — Palmer-Kaminski Table 5.2 thresholds', () => {
  it('≥ 2.0 → very bitter, dry', () => {
    expect(ratioCharacter(2.5)).toBe('very bitter, dry');
    expect(ratioCharacter(2.0)).toBe('very bitter, dry');
  });
  it('1.0–1.99 → bitter, hop-forward', () => {
    expect(ratioCharacter(1.5)).toBe('bitter, hop-forward');
  });
  it('0.77–0.99 → balanced toward bitter', () => {
    expect(ratioCharacter(0.85)).toBe('balanced toward bitter');
  });
  it('0.5–0.76 → balanced toward malt', () => {
    expect(ratioCharacter(0.6)).toBe('balanced toward malt');
  });
  it('0.4–0.49 → malty, slightly sweet', () => {
    expect(ratioCharacter(0.45)).toBe('malty, slightly sweet');
  });
  it('< 0.4 → very malty, full', () => {
    expect(ratioCharacter(0.2)).toBe('very malty, full');
  });
  it('Infinity → extremely bitter (no Cl)', () => {
    expect(ratioCharacter(Infinity)).toBe('extremely bitter (no Cl)');
  });
});
