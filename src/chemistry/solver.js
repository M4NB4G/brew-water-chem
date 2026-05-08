// Greedy ion-balancing solver and final-profile predictor.
//
// Approach: deterministic step-by-step salt addition (NOT a black-box LP).
// Brewers want predictable, explainable additions where each step's
// reasoning is visible.
//
// Order of operations:
//   1. CaCl2 to hit Cl deficit (also adds Ca)
//   2. Gypsum to hit SO4 deficit (also adds Ca)
//   3. Epsom for Mg deficit (adds SO4 — switch to MgCl2 if SO4 would overshoot)
//   4. Alkalinity: now that exact Ca and Mg are known, compute the Alk needed
//      to achieve target.RA (alkForTargetRA = RA + Ca/1.4 + Mg/1.7), then:
//        - source > alkForTargetRA: dose acid
//        - source < alkForTargetRA: add baking soda or pickling lime
//      Baking soda is capped so total Na stays ≤ min(100, 3 × target.Na).
//   5. Top up Cl with NaCl if Na also deficient
//   6. Top up Na with NaCl
//
// References:
//   Palmer-Kaminski (2013) Ch. 5, pp. 119–162
//   Kolbach (1953) — RA formulation used to validate the result

import { SALT_CONTRIBUTIONS_PER_G_GAL, HCO3_TO_CACO3 } from './salts.js';
import { ACIDS, acidCapacity, acidAlkalinityReduction } from './acids.js';
import { LITERS_PER_GALLON } from './units.js';

/**
 * Solve for salt and acid additions.
 *
 * @param {object} params
 * @param {object} params.source         {Ca, Mg, Na, SO4, Cl, Alkalinity, pH} mg/L
 * @param {object} params.target         {Ca, Mg, Na, SO4, Cl, Alk, RA} mg/L
 * @param {number} params.volumeGallons  batch volume in US gallons
 * @param {string} params.acidKey        key into ACIDS
 * @param {string} params.raiseAlkSource 'baking_soda' | 'pickling_lime'
 *
 * @returns {{
 *   additions: Array<{ salt, name, grams, adds, reason }>,
 *   acidDose: { name, amount_ml?, amount_g?, mEq, ppm_neutralized } | null,
 *   finalIons: { Ca, Mg, Na, SO4, Cl, Alk }
 * }}
 */
export function solveAdditions({ source, target, volumeGallons, acidKey, raiseAlkSource }) {
  // Na safety cap: baking soda adds Na as a side-effect of raising alkalinity.
  // Cap total Na at the lower of 100 ppm or 3× the style target.
  const NA_CAP = Math.min(100, 3 * target.Na);

  const current = {
    Ca: source.Ca, Mg: source.Mg, Na: source.Na,
    SO4: source.SO4, Cl: source.Cl, Alk: source.Alkalinity,
  };

  const additions = [];
  const gFor = (deltaPpm, contribPerGGal) =>
    Math.max(0, deltaPpm / contribPerGGal) * volumeGallons;

  // ---------- STEP 1: CaCl2 for chloride deficit ----------
  if (target.Cl - current.Cl > 5 && target.Ca - current.Ca > 0) {
    const grams = gFor(target.Cl - current.Cl, SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl);
    const factor = grams / volumeGallons;
    additions.push({
      salt: 'calcium_chloride',
      name: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.name,
      grams,
      adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl },
      reason: 'Hit Cl⁻ target; provides Ca²⁺',
    });
    current.Ca += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca * factor;
    current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl * factor;
  }

  // ---------- STEP 2: Gypsum for sulfate ----------
  if (target.SO4 - current.SO4 > 5) {
    const grams = gFor(target.SO4 - current.SO4, SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4);
    const factor = grams / volumeGallons;
    additions.push({
      salt: 'gypsum',
      name: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.name,
      grams,
      adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca, SO4: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4 },
      reason: 'Hit SO₄²⁻ target; provides Ca²⁺',
    });
    current.Ca  += SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca  * factor;
    current.SO4 += SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4 * factor;
  }

  // ---------- STEP 3: Epsom (or MgCl2) for Mg deficit ----------
  if (target.Mg - current.Mg > 2) {
    const defMg = target.Mg - current.Mg;
    const epsomGrams = gFor(defMg, SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg);
    const epsomFactor = epsomGrams / volumeGallons;
    const so4Added = SALT_CONTRIBUTIONS_PER_G_GAL.epsom.SO4 * epsomFactor;

    if (current.SO4 + so4Added <= target.SO4 * 1.20) {
      additions.push({
        salt: 'epsom',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.name,
        grams: epsomGrams,
        adds: { Mg: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg, SO4: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.SO4 },
        reason: 'Hit Mg²⁺ target',
      });
      current.Mg  += SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg  * epsomFactor;
      current.SO4 += so4Added;
    } else {
      const mgcl2Grams  = gFor(defMg, SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg);
      const mgcl2Factor = mgcl2Grams / volumeGallons;
      additions.push({
        salt: 'magnesium_chloride',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.name,
        grams: mgcl2Grams,
        adds: { Mg: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Cl },
        reason: 'Hit Mg²⁺ target without overshooting SO₄²⁻',
      });
      current.Mg += SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg * mgcl2Factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Cl * mgcl2Factor;
    }
  }

  // ---------- STEP 4: Alkalinity to hit target RA ----------
  // Exact Ca and Mg from mineral additions are now known.
  // RA = Alk - Ca/1.4 - Mg/1.7  →  needed Alk = RA + Ca/1.4 + Mg/1.7
  const alkForTargetRA = target.RA + current.Ca / 1.4 + current.Mg / 1.7;
  const alkDelta = alkForTargetRA - current.Alk;
  let acidDose = null;

  if (alkDelta < -5) {
    const ppmToReduce = -alkDelta;
    const liters = volumeGallons * LITERS_PER_GALLON;
    const totalMeq = (ppmToReduce / 50.04) * liters;
    const cap = acidCapacity(acidKey);
    const a = ACIDS[acidKey];
    if (a.is_solid) {
      acidDose = { type: acidKey, name: a.name, amount_g: totalMeq / cap, mEq: totalMeq, ppm_neutralized: ppmToReduce };
    } else {
      acidDose = { type: acidKey, name: a.name, amount_ml: totalMeq / cap, mEq: totalMeq, ppm_neutralized: ppmToReduce };
    }
    current.Alk = alkForTargetRA;

  } else if (alkDelta > 5) {
    if (raiseAlkSource === 'pickling_lime') {
      const grams = gFor(alkDelta, SALT_CONTRIBUTIONS_PER_G_GAL.pickling_lime.alk_as_CaCO3);
      additions.push({
        salt: 'pickling_lime',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.pickling_lime.name,
        grams,
        adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.pickling_lime.Ca, Alk: SALT_CONTRIBUTIONS_PER_G_GAL.pickling_lime.alk_as_CaCO3 },
        reason: 'Raise alkalinity (also adds Ca²⁺)',
      });
      current.Ca  += SALT_CONTRIBUTIONS_PER_G_GAL.pickling_lime.Ca * (grams / volumeGallons);
      current.Alk  = alkForTargetRA;

    } else {
      // baking_soda: Na cap limits how much we can add.
      // If source Na already exceeds the cap, no soda can be added.
      const hco3PerGGal = SALT_CONTRIBUTIONS_PER_G_GAL.baking_soda.HCO3;
      const alkPerGGal  = hco3PerGGal * HCO3_TO_CACO3;
      let grams = gFor(alkDelta, alkPerGGal);

      const naHeadroom = Math.max(0, NA_CAP - current.Na);
      const naFromSoda = SALT_CONTRIBUTIONS_PER_G_GAL.baking_soda.Na * (grams / volumeGallons);
      if (naFromSoda > naHeadroom) {
        grams = (naHeadroom / SALT_CONTRIBUTIONS_PER_G_GAL.baking_soda.Na) * volumeGallons;
      }

      if (grams > 0) {
        additions.push({
          salt: 'baking_soda',
          name: SALT_CONTRIBUTIONS_PER_G_GAL.baking_soda.name,
          grams,
          adds: { Na: SALT_CONTRIBUTIONS_PER_G_GAL.baking_soda.Na, Alk: alkPerGGal },
          reason: naFromSoda > naHeadroom
            ? `Raise alkalinity (Na-capped at ${NA_CAP} ppm — adds Na⁺)`
            : 'Raise alkalinity (also adds Na⁺)',
        });
        current.Na  += SALT_CONTRIBUTIONS_PER_G_GAL.baking_soda.Na * (grams / volumeGallons);
        current.Alk += alkPerGGal * (grams / volumeGallons);
      }
    }
  }

  // ---------- STEP 5: top up Cl with NaCl if Na also short ----------
  if (target.Cl - current.Cl > 5 && target.Na - current.Na > 5) {
    const grams = gFor(target.Cl - current.Cl, SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl);
    const factor = grams / volumeGallons;
    additions.push({
      salt: 'table_salt',
      name: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.name,
      grams,
      adds: { Na: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl },
      reason: 'Hit Cl⁻ target; provides Na⁺',
    });
    current.Na += SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na * factor;
    current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl * factor;
  }

  // ---------- STEP 6: top up Na with NaCl ----------
  if (target.Na - current.Na > 5) {
    const grams = gFor(target.Na - current.Na, SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na);
    const factor = grams / volumeGallons;
    additions.push({
      salt: 'table_salt',
      name: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.name,
      grams,
      adds: { Na: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl },
      reason: 'Hit Na⁺ target',
    });
    current.Na += SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na * factor;
    current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl * factor;
  }

  return { additions, acidDose, finalIons: current };
}

/**
 * Recompute the final ion profile from a set of additions and acid dose.
 * Used to update the Predicted Final Profile when the user overrides any
 * recommended salt amount or acid dose on the Recipe tab.
 *
 * @param {object} params
 * @param {object} params.source        {Ca, Mg, Na, SO4, Cl, Alkalinity}
 * @param {object} params.additions     { [saltKey]: grams }
 * @param {number} params.acidDose      mL (liquid) or g (acid malt); 0 = none
 * @param {string} params.acidKey
 * @param {number} params.volumeGallons
 *
 * @returns {{ Ca, Mg, Na, SO4, Cl, Alk }}
 */
export function predictFinalProfile({ source, additions, acidDose, acidKey, volumeGallons }) {
  const result = {
    Ca: source.Ca || 0,
    Mg: source.Mg || 0,
    Na: source.Na || 0,
    SO4: source.SO4 || 0,
    Cl: source.Cl || 0,
    Alk: source.Alkalinity || 0,
  };

  for (const [saltKey, grams] of Object.entries(additions ?? {})) {
    if (!grams || grams <= 0) continue;
    const salt = SALT_CONTRIBUTIONS_PER_G_GAL[saltKey];
    if (!salt) continue;
    const factor = grams / volumeGallons;
    if (salt.Ca) result.Ca += salt.Ca * factor;
    if (salt.Mg) result.Mg += salt.Mg * factor;
    if (salt.Na) result.Na += salt.Na * factor;
    if (salt.SO4) result.SO4 += salt.SO4 * factor;
    if (salt.Cl) result.Cl += salt.Cl * factor;
    if (salt.HCO3) result.Alk += salt.HCO3 * factor * HCO3_TO_CACO3;
    if (salt.alk_as_CaCO3) result.Alk += salt.alk_as_CaCO3 * factor;
  }

  if (acidDose && acidDose > 0 && acidKey) {
    result.Alk -= acidAlkalinityReduction(acidKey, acidDose, volumeGallons);
  }

  return result;
}
