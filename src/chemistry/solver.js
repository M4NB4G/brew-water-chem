// Greedy ion-balancing solver and final-profile predictor.
//
// Approach: deterministic step-by-step salt addition (NOT a black-box LP).
// Brewers want predictable, explainable additions where each step's
// reasoning is visible.
//
// Order of operations:
//   1. CaCl2 first pass — up to 70% of Cl target (Ca-capped)
//   2. Epsom for Mg deficit (adds SO4 — switch to MgCl2 if SO4 would overshoot)
//   3. Gypsum to hit remaining SO4 deficit (Ca-capped)
//   3b. CaCl2 second pass — remaining Cl up to Ca limit (after SO4 is set)
//   4. Alkalinity: now that exact Ca and Mg are known, compute the Alk needed
//      to achieve target.RA (alkForTargetRA = RA + Ca/1.4 + Mg/1.7), then:
//        - source > alkForTargetRA: dose acid
//        - source < alkForTargetRA: add baking soda or pickling lime
//      Baking soda is capped so total Na stays ≤ min(100, 3 × target.Na).
//   5. Top up remaining Cl with NaCl (Na is never actively targeted — only
//      checked to ensure additions stay below the Na safety cap)
//
// References:
//   Palmer-Kaminski (2013) Ch. 5, pp. 119–162
//   Kolbach (1953) — RA formulation used to validate the result

import { SALT_CONTRIBUTIONS_PER_G_GAL, HCO3_TO_CACO3 } from './salts.js';
import { acidCapacity, applyAcids } from './acids.js';
import { LITERS_PER_GALLON } from './units.js';

// TODO(v1.2): make the recommended acid configurable from a settings page.
// For v1.1 the solver always recommends 88% lactic. Multi-acid blends are a
// manual override on the Recipe tab — the solver itself stays single-acid.
const SOLVER_ACID_KEY = 'lactic_88';

/**
 * Solve for salt and acid additions.
 *
 * @param {object} params
 * @param {object} params.source         {Ca, Mg, Na, SO4, Cl, Alkalinity, pH} mg/L
 * @param {object} params.target         {Ca, Mg, Na, SO4, Cl, Alk, RA} mg/L
 * @param {number} params.volumeGallons  batch volume in US gallons
 * @param {string} params.raiseAlkSource 'baking_soda' | 'pickling_lime'
 * @param {Set<string>} [params.enabledSalts]  salt keys the solver may use;
 *                                              defaults to all salts enabled
 *
 * @returns {{
 *   additions: Array<{ salt, name, grams, adds, reason }>,
 *   acids: { [acidKey]: amount },   // mL for liquid acids, g for acidulated malt; {} when no acid needed
 *   finalIons: { Ca, Mg, Na, SO4, Cl, Alk }
 * }}
 */
export function solveAdditions({ source, target, volumeGallons, raiseAlkSource, enabledSalts }) {
  const acidKey = SOLVER_ACID_KEY;
  const canUse = (key) => !enabledSalts || enabledSalts.has(key);
  // Na safety cap: baking soda adds Na as a side-effect of raising alkalinity.
  // Cap total Na at the lower of 100 ppm or 3× the style target.
  const NA_CAP = Math.min(100, 3 * target.Na);

  const current = {
    Ca: parseFloat(source.Ca) || 0,
    Mg: parseFloat(source.Mg) || 0,
    Na: parseFloat(source.Na) || 0,
    SO4: parseFloat(source.SO4) || 0,
    Cl: parseFloat(source.Cl) || 0,
    Alk: parseFloat(source.Alkalinity) || 0,
  };

  const additions = [];
  const gFor = (deltaPpm, contribPerGGal) =>
    Math.max(0, deltaPpm / contribPerGGal) * volumeGallons;

  // ---------- STEP 1: CaCl2 first pass — up to 70% of Cl target ----------
  // Reserving the remaining Ca headroom for gypsum ensures SO4 can be hit even
  // when the Cl target is high (e.g. Hazy IPA). A second CaCl2 pass after
  // gypsum spends whatever Ca budget is left. NaCl fills any final Cl gap.
  if (canUse('calcium_chloride') && target.Cl - current.Cl > 5 && target.Ca - current.Ca > 0) {
    const clFirst = Math.max(0, target.Cl * 0.70 - current.Cl);
    const gramsByCl = gFor(clFirst, SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl);
    const caHeadroom = Math.max(0, target.Ca - current.Ca);
    const maxGramsByCa = (caHeadroom / SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca) * volumeGallons;
    const grams = Math.min(gramsByCl, maxGramsByCa);
    if (grams > 0) {
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'calcium_chloride',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.name,
        grams,
        adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl },
        reason: 'Hit Cl⁻ target (first pass); provides Ca²⁺',
      });
      current.Ca += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca * factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl * factor;
    }
  }

  // ---------- STEP 2: Epsom (or MgCl2) for Mg deficit ----------
  // Runs before gypsum so its SO4 contribution is known before gypsum is sized.
  if (target.Mg - current.Mg > 2) {
    const defMg = target.Mg - current.Mg;
    const epsomOk = canUse('epsom');
    const mgcl2Ok = canUse('magnesium_chloride');

    if (epsomOk) {
      const epsomGrams = gFor(defMg, SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg);
      const epsomFactor = epsomGrams / volumeGallons;
      const so4Added = SALT_CONTRIBUTIONS_PER_G_GAL.epsom.SO4 * epsomFactor;

      if (current.SO4 + so4Added <= target.SO4 * 1.20 || !mgcl2Ok) {
        additions.push({
          salt: 'epsom',
          name: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.name,
          grams: epsomGrams,
          adds: { Mg: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg, SO4: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.SO4 },
          reason: 'Hit Mg²⁺ target',
        });
        current.Mg  += SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg  * epsomFactor;
        current.SO4 += so4Added;
      } else if (mgcl2Ok) {
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
    } else if (mgcl2Ok) {
      const mgcl2Grams  = gFor(defMg, SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg);
      const mgcl2Factor = mgcl2Grams / volumeGallons;
      additions.push({
        salt: 'magnesium_chloride',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.name,
        grams: mgcl2Grams,
        adds: { Mg: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Cl },
        reason: 'Hit Mg²⁺ target',
      });
      current.Mg += SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg * mgcl2Factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Cl * mgcl2Factor;
    }
  }

  // ---------- STEP 3: Gypsum for remaining SO4 deficit ----------
  // Capped so the resulting Ca doesn't exceed the style target — gypsum adds
  // significant Ca as a side-effect, and overshooting Ca is a harder problem
  // to correct than undershooting SO4 (the user can add less manually).
  if (canUse('gypsum') && target.SO4 - current.SO4 > 5) {
    const gramsBySO4 = gFor(target.SO4 - current.SO4, SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4);
    const caHeadroom = Math.max(0, target.Ca - current.Ca);
    const maxGramsByCa = (caHeadroom / SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca) * volumeGallons;
    const grams = Math.min(gramsBySO4, maxGramsByCa);
    if (grams > 0) {
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'gypsum',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.name,
        grams,
        adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca, SO4: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4 },
        reason: gramsBySO4 > maxGramsByCa
          ? 'Top up SO₄²⁻ (Ca-capped — full SO₄ target would overshoot Ca)'
          : 'Hit SO₄²⁻ target; provides Ca²⁺',
      });
      current.Ca  += SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca  * factor;
      current.SO4 += SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4 * factor;
    }
  }

  // ---------- STEP 3b: CaCl2 second pass — remaining Cl up to Ca limit ----------
  // After gypsum has spent its Ca budget on SO4, any remaining Ca headroom is
  // available to push Cl closer to target. NaCl (Step 5) fills the final gap.
  if (canUse('calcium_chloride') && target.Cl - current.Cl > 5 && target.Ca - current.Ca > 0) {
    const gramsByCl = gFor(target.Cl - current.Cl, SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl);
    const caHeadroom = Math.max(0, target.Ca - current.Ca);
    const maxGramsByCa = (caHeadroom / SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca) * volumeGallons;
    const grams = Math.min(gramsByCl, maxGramsByCa);
    if (grams > 0) {
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'calcium_chloride',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.name,
        grams,
        adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl },
        reason: 'Hit Cl⁻ target (second pass — remaining Ca headroom after SO₄)',
      });
      current.Ca += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca * factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl * factor;
    }
  }

  // ---------- SANITY: Ca minimum 50 ppm ----------
  // Runs before the alk step so alkForTargetRA uses the final Ca value.
  // Split the deficit equally between gypsum and CaCl2 when both are available
  // so the SO4 and Cl side-effects are balanced. Fall back to whichever is enabled.
  if (current.Ca < 50) {
    const deficit = 50 - current.Ca;
    const gypsumOk = canUse('gypsum');
    const cacl2Ok  = canUse('calcium_chloride');
    const share = (gypsumOk && cacl2Ok) ? deficit / 2 : deficit;

    if (gypsumOk) {
      const grams = gFor(share, SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca);
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'gypsum',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.name,
        grams,
        adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca, SO4: SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4 },
        reason: 'Minimum Ca²⁺ 50 ppm (yeast health)',
      });
      current.Ca  += SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.Ca  * factor;
      current.SO4 += SALT_CONTRIBUTIONS_PER_G_GAL.gypsum.SO4 * factor;
    }

    if (cacl2Ok) {
      const grams = gFor(share, SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca);
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'calcium_chloride',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.name,
        grams,
        adds: { Ca: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl },
        reason: 'Minimum Ca²⁺ 50 ppm (yeast health)',
      });
      current.Ca += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Ca * factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.calcium_chloride.Cl * factor;
    }
  }

  // ---------- SANITY: Mg minimum 5 ppm ----------
  // Runs before the alk step so alkForTargetRA uses the final Mg value.
  if (current.Mg < 5) {
    const deficit = 5 - current.Mg;
    if (canUse('epsom')) {
      const grams = gFor(deficit, SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg);
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'epsom',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.name,
        grams,
        adds: { Mg: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg, SO4: SALT_CONTRIBUTIONS_PER_G_GAL.epsom.SO4 },
        reason: 'Minimum Mg²⁺ 5 ppm (enzyme cofactor)',
      });
      current.Mg  += SALT_CONTRIBUTIONS_PER_G_GAL.epsom.Mg  * factor;
      current.SO4 += SALT_CONTRIBUTIONS_PER_G_GAL.epsom.SO4 * factor;
    } else if (canUse('magnesium_chloride')) {
      const grams = gFor(deficit, SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg);
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'magnesium_chloride',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.name,
        grams,
        adds: { Mg: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Cl },
        reason: 'Minimum Mg²⁺ 5 ppm (enzyme cofactor)',
      });
      current.Mg += SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Mg * factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.magnesium_chloride.Cl * factor;
    }
  }

  // ---------- STEP 4: Alkalinity to hit target RA ----------
  // Exact Ca and Mg from mineral additions are now known.
  // RA = Alk - Ca/1.4 - Mg/1.7  →  needed Alk = RA + Ca/1.4 + Mg/1.7
  const alkForTargetRA = target.RA + current.Ca / 1.4 + current.Mg / 1.7;
  const alkDelta = alkForTargetRA - current.Alk;
  const acids = {};

  if (alkDelta < -5) {
    const ppmToReduce = -alkDelta;
    const liters = volumeGallons * LITERS_PER_GALLON;
    const totalMeq = (ppmToReduce / 50.04) * liters;
    const cap = acidCapacity(acidKey);
    acids[acidKey] = totalMeq / cap;
    current.Alk = alkForTargetRA;

  } else if (alkDelta > 5 && canUse(raiseAlkSource)) {
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

  // ---------- STEP 5: top up remaining Cl with NaCl ----------
  // Na is never actively targeted — the solver only checks that NaCl additions
  // don't push Na above the safety cap (same cap used for baking soda).
  if (canUse('table_salt') && target.Cl - current.Cl > 5) {
    const gramsByCl = gFor(target.Cl - current.Cl, SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl);
    const naHeadroom = Math.max(0, NA_CAP - current.Na);
    const maxGramsByNa = (naHeadroom / SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na) * volumeGallons;
    const grams = Math.min(gramsByCl, maxGramsByNa);
    if (grams > 0) {
      const factor = grams / volumeGallons;
      additions.push({
        salt: 'table_salt',
        name: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.name,
        grams,
        adds: { Na: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na, Cl: SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl },
        reason: gramsByCl > maxGramsByNa
          ? `Hit Cl⁻ target (Na-capped at ${NA_CAP} ppm)`
          : 'Hit Cl⁻ target',
      });
      current.Na += SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Na * factor;
      current.Cl += SALT_CONTRIBUTIONS_PER_G_GAL.table_salt.Cl * factor;
    }
  }

  return { additions, acids, finalIons: current };
}

/**
 * Recompute the final ion profile from a set of additions and an acid mix.
 * Used to update the Predicted Final Profile when the user overrides any
 * recommended salt amount or acid dose on the Recipe tab.
 *
 * @param {object} params
 * @param {object} params.source        {Ca, Mg, Na, SO4, Cl, Alkalinity}
 * @param {object} params.additions     { [saltKey]: grams }
 * @param {object} params.acids         { [acidKey]: amount }  mL (liquid) or g (solid); empty = none
 * @param {number} params.volumeGallons
 *
 * @returns {{ Ca, Mg, Na, SO4, Cl, Alk }}
 */
export function predictFinalProfile({ source, additions, acids, volumeGallons }) {
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

  if (acids && volumeGallons > 0) {
    result.Alk -= applyAcids(acids, volumeGallons).ppm_alk_reduced;
  }

  return result;
}
