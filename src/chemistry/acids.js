// Acid concentration data and alkalinity-reduction math.
//
// References:
//   Troester, K. (2009). "An Overview of pH." Braukaiser.com.
//     — Phosphoric acid is treated as monoprotic at mash pH 5.4
//       (pKa1 = 2.15, pKa2 = 7.20; only the first proton is fully active).
//   CRC Handbook of Chemistry and Physics, 97th ed.
//     — Acid densities at the listed concentrations.
//   Weyermann Specialty Malts. Acidulated Malt spec sheet (weyermann.de).
//     — ~2% lactic acid by weight (published range 1–2%; midpoint used).
//
// mEq/mL (or mEq/g for solid) is the H+ delivered per unit of acid that
// neutralizes alkalinity in the mash. The formula is:
//   (density [g/mL] × weight_fraction × 1000) / molecular_weight   = mEq/mL
// Solid (acid malt):
//   (weight_fraction_lactic × 1000) / mw_lactic                    = mEq/g

import { LITERS_PER_GALLON } from './units.js';

export const ACIDS = {
  phosphoric_10: {
    name: '10% Phosphoric Acid',
    density_g_ml: 1.054,
    weight_fraction: 0.10,
    mw: 97.99,
    // = (1.054 × 0.10 × 1000) / 97.99 ≈ 1.0756 mEq/mL
    unit: 'mL',
  },
  phosphoric_75: {
    name: '75% Phosphoric Acid',
    density_g_ml: 1.579,
    weight_fraction: 0.75,
    mw: 97.99,
    // ≈ 12.083 mEq/mL
    unit: 'mL',
  },
  phosphoric_85: {
    name: '85% Phosphoric Acid',
    density_g_ml: 1.685,
    weight_fraction: 0.85,
    mw: 97.99,
    // ≈ 14.617 mEq/mL
    unit: 'mL',
  },
  lactic_88: {
    name: '88% Lactic Acid',
    density_g_ml: 1.209,
    weight_fraction: 0.88,
    mw: 90.08,
    // ≈ 11.812 mEq/mL
    unit: 'mL',
  },
  acidulated_malt: {
    name: 'Acidulated Malt (Weyermann, ~2% lactic)',
    // 2% per Weyermann product spec (weyermann.de); range is 1–2%, using midpoint 2.0%
    weight_fraction_lactic: 0.02,
    mw_lactic: 90.08,
    is_solid: true,
    // = (0.02 × 1000) / 90.08 ≈ 0.222 mEq/g
    unit: 'g',
  },
};

/**
 * mEq H+ delivered per unit (mL for liquid, g for solid).
 */
export function acidCapacity(acidKey) {
  const a = ACIDS[acidKey];
  if (!a) throw new Error(`Unknown acid: ${acidKey}`);
  if (a.is_solid) return (a.weight_fraction_lactic * 1000) / a.mw_lactic;
  return (a.density_g_ml * a.weight_fraction * 1000) / a.mw;
}

/**
 * Alkalinity reduction (mg/L as CaCO3) for a given acid dose.
 *
 * @param {string} acidKey   - key into ACIDS
 * @param {number} doseUnits - mL of liquid acid OR g of solid (acid malt)
 * @param {number} gallons   - batch volume in US gallons
 * @returns {number} alkalinity reduction in mg/L as CaCO3
 */
export function acidAlkalinityReduction(acidKey, doseUnits, gallons) {
  if (doseUnits === 0) return 0;
  if (gallons <= 0) throw new Error('gallons must be > 0');
  const cap = acidCapacity(acidKey);
  const totalMeq = doseUnits * cap;
  const liters = gallons * LITERS_PER_GALLON;
  // 1 mEq/L = 50.04 mg/L as CaCO3
  return (totalMeq / liters) * 50.04;
}

/**
 * mEq H+ contributed by a given amount of one acid.
 * Used by the UI to show per-acid mEq contributions in multi-acid mode.
 *
 * @param {string} acidKey - key into ACIDS
 * @param {number} amount  - mL (liquid) or g (acidulated malt)
 * @returns {number} mEq
 */
export function acidContribution(acidKey, amount) {
  if (!amount || amount <= 0) return 0;
  return amount * acidCapacity(acidKey);
}

/**
 * Total alkalinity reduction (mg/L as CaCO3) for a mixture of acids.
 * mEq combines linearly across acids — no cross-terms.
 *
 * @param {object} acidMix - { [acidKey]: amount }, amount in mL (liquid) or g (solid)
 *                           Missing or zero entries are ignored.
 * @param {number} gallons - batch volume in US gallons
 * @returns {{ total_meq: number, ppm_alk_reduced: number }}
 */
export function applyAcids(acidMix, gallons) {
  if (gallons <= 0) throw new Error('gallons must be > 0');
  let total_meq = 0;
  for (const [key, amount] of Object.entries(acidMix ?? {})) {
    if (!amount || amount <= 0) continue;
    total_meq += amount * acidCapacity(key);
  }
  const liters = gallons * LITERS_PER_GALLON;
  const ppm_alk_reduced = (total_meq / liters) * 50.04;
  return { total_meq, ppm_alk_reduced };
}
