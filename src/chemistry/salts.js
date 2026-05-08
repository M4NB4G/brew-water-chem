// Salt ion contribution constants.
//
// Source: Palmer, J.J. & Kaminski, C. (2013). Water: A Comprehensive Guide
// for Brewers. Brewers Publications. Appendix A, pp. 281–283.
//
// Each entry gives the mg/L (ppm) of each ion contributed when 1 gram of
// the salt is dissolved in 1 US gallon of water. To convert per-liter,
// divide by 3.78541. The solver works in gallons because the source data
// is tabulated in g/gal and the conversion is lossy at typical brewing
// scales.

export const SALT_CONTRIBUTIONS_PER_G_GAL = {
  // Gypsum — Calcium Sulfate Dihydrate, CaSO4·2H2O, MW 172.17
  gypsum: {
    name: 'Gypsum (CaSO₄·2H₂O)',
    formula: 'CaSO4_2H2O',
    Ca: 61.5,
    SO4: 147.4,
  },
  // Calcium Chloride Dihydrate, CaCl2·2H2O, MW 147.01
  calcium_chloride: {
    name: 'Calcium Chloride (CaCl₂·2H₂O)',
    formula: 'CaCl2_2H2O',
    Ca: 72.0,
    Cl: 127.4,
  },
  // Epsom Salt — Magnesium Sulfate Heptahydrate, MgSO4·7H2O, MW 246.47
  epsom: {
    name: 'Epsom Salt (MgSO₄·7H₂O)',
    formula: 'MgSO4_7H2O',
    Mg: 26.0,
    SO4: 103.0,
  },
  // Table Salt (non-iodized) — Sodium Chloride, NaCl, MW 58.44
  table_salt: {
    name: 'Table Salt (NaCl, non-iodized)',
    formula: 'NaCl',
    Na: 103.9,
    Cl: 160.3,
  },
  // Baking Soda — Sodium Bicarbonate, NaHCO3, MW 84.01
  baking_soda: {
    name: 'Baking Soda (NaHCO₃)',
    formula: 'NaHCO3',
    Na: 72.3,
    HCO3: 191.7,
  },
  // Chalk — Calcium Carbonate, CaCO3, MW 100.09. Theoretical contribution;
  // poorly soluble in plain water without CO2-saturated mash water.
  // Palmer-Kaminski (2013) p. 162 discusses dissolution issues.
  chalk: {
    name: 'Chalk (CaCO₃) — see solubility note',
    formula: 'CaCO3',
    Ca: 105.7,
    HCO3: 158.4,
  },
  // Pickling Lime — Calcium Hydroxide, Ca(OH)2, MW 74.09. Strong base.
  // Palmer-Kaminski (2013) p. 152 — preferred for raising RA cleanly.
  pickling_lime: {
    name: 'Pickling Lime (Ca(OH)₂) — strong base',
    formula: 'Ca(OH)2',
    Ca: 142.9,
    alk_as_CaCO3: 357.5,
  },
  // Magnesium Chloride Hexahydrate, MgCl2·6H2O, MW 203.30
  magnesium_chloride: {
    name: 'Magnesium Chloride (MgCl₂·6H₂O)',
    formula: 'MgCl2_6H2O',
    Mg: 31.5,
    Cl: 92.1,
  },
};

// HCO3 (mg/L) → Alkalinity-as-CaCO3 (mg/L) conversion factor.
// 1 mEq HCO3 = 61.02 mg HCO3 = 50.04 mg CaCO3 equivalent
export const HCO3_TO_CACO3 = 50.04 / 61.02;

/**
 * Compute ion deltas (mg/L) from adding a salt to a given gallon volume.
 *
 * @param {string} saltKey - key into SALT_CONTRIBUTIONS_PER_G_GAL
 * @param {number} grams   - grams of salt added
 * @param {number} gallons - volume of water in US gallons
 * @returns {object} ion deltas in mg/L; only ions present in the salt
 */
export function saltContribution(saltKey, grams, gallons) {
  const salt = SALT_CONTRIBUTIONS_PER_G_GAL[saltKey];
  if (!salt) throw new Error(`Unknown salt: ${saltKey}`);
  if (gallons <= 0) throw new Error('gallons must be > 0');
  const factor = grams / gallons;
  const out = {};
  for (const ion of ['Ca', 'Mg', 'Na', 'SO4', 'Cl', 'HCO3', 'alk_as_CaCO3']) {
    if (salt[ion]) out[ion] = salt[ion] * factor;
  }
  return out;
}
