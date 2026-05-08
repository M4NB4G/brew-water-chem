// Hand-calculated verification of unit-conversion constants and helpers.
//
// References:
//   US beer barrel = 31 US gallons (legal definition, 27 CFR 25.11)
//   1 US gallon    = 3.78541 liters (NIST Special Publication 811, App. B.8)
//   1 oz (avoir.)  = 28.3495 g
//   1 lb (avoir.)  = 16 oz = 453.592 g

import { describe, it, expect } from 'vitest';
import {
  GALLONS_PER_BBL,
  LITERS_PER_GALLON,
  LITERS_PER_BBL,
  G_PER_OZ,
  G_PER_LB,
  OZ_PER_LB,
  volumeToGallons,
  volumeUnit,
  acidMaltUnits,
} from '../../src/chemistry/units.js';

describe('unit constants', () => {
  it('1 US beer barrel = 31 gallons', () => {
    expect(GALLONS_PER_BBL).toBe(31.0);
  });

  it('1 US gallon = 3.78541 liters (NIST)', () => {
    expect(LITERS_PER_GALLON).toBeCloseTo(3.78541, 5);
  });

  it('1 bbl in liters = 31 × 3.78541 = 117.348 L', () => {
    expect(LITERS_PER_BBL).toBeCloseTo(31 * 3.78541, 4);
    expect(LITERS_PER_BBL).toBeCloseTo(117.348, 3);
  });

  it('1 oz = 28.3495 g', () => {
    expect(G_PER_OZ).toBeCloseTo(28.3495, 4);
  });

  it('1 lb = 16 oz', () => {
    expect(OZ_PER_LB).toBe(16);
  });

  it('1 lb = 16 × 28.3495 = 453.592 g', () => {
    expect(G_PER_LB).toBeCloseTo(453.592, 3);
  });
});

describe('volumeToGallons', () => {
  it('Pro mode: 10 bbl → 310 gal', () => {
    expect(volumeToGallons(10, 'pro')).toBe(310);
  });

  it('Pro mode: 5 bbl → 155 gal', () => {
    expect(volumeToGallons(5, 'pro')).toBe(155);
  });

  it('Home mode: passthrough (5 → 5)', () => {
    expect(volumeToGallons(5, 'home')).toBe(5);
  });

  it('Home mode: passthrough (12.5 → 12.5)', () => {
    expect(volumeToGallons(12.5, 'home')).toBe(12.5);
  });

  it('zero in either mode → 0 gallons', () => {
    expect(volumeToGallons(0, 'pro')).toBe(0);
    expect(volumeToGallons(0, 'home')).toBe(0);
  });
});

describe('volumeUnit', () => {
  it("Pro → 'bbl'", () => {
    expect(volumeUnit('pro')).toBe('bbl');
  });
  it("Home → 'gal'", () => {
    expect(volumeUnit('home')).toBe('gal');
  });
});

describe('acidMaltUnits', () => {
  it("Pro mode reports 'lb' label", () => {
    expect(acidMaltUnits('pro').unit).toBe('lb');
  });

  it("Home mode reports 'oz' label", () => {
    expect(acidMaltUnits('home').unit).toBe('oz');
  });

  it('Pro mode: 453.592 g → 1 lb (toDisplay)', () => {
    expect(acidMaltUnits('pro').toDisplay(453.592)).toBeCloseTo(1, 4);
  });

  it('Pro mode: 1 lb → 453.592 g (fromDisplay)', () => {
    expect(acidMaltUnits('pro').fromDisplay(1)).toBeCloseTo(453.592, 3);
  });

  it('Home mode: 28.3495 g → 1 oz (toDisplay)', () => {
    expect(acidMaltUnits('home').toDisplay(28.3495)).toBeCloseTo(1, 4);
  });

  it('Home mode: 1 oz → 28.3495 g (fromDisplay)', () => {
    expect(acidMaltUnits('home').fromDisplay(1)).toBeCloseTo(28.3495, 4);
  });

  it('Pro mode: roundtrip 100 g → display → back ≈ 100 g', () => {
    const m = acidMaltUnits('pro');
    expect(m.fromDisplay(m.toDisplay(100))).toBeCloseTo(100, 6);
  });

  it('Home mode: roundtrip 100 g → display → back ≈ 100 g', () => {
    const m = acidMaltUnits('home');
    expect(m.fromDisplay(m.toDisplay(100))).toBeCloseTo(100, 6);
  });
});
