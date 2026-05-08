// Residual Alkalinity (RA) and SO4:Cl ratio.
//
// References:
//   Kolbach, P. (1953). "Der Einfluss des Brauwassers auf die Bierfarbe."
//     Monatsschrift für Brauerei, 6, 167–171. — Original RA formulation.
//   Palmer & Kaminski, "Water: A Comprehensive Guide for Brewers" (2013)
//     — pp. 57–60 (RA derivation), pp. 134–137 (SO4:Cl flavor balance).

/**
 * Residual Alkalinity in mg/L as CaCO3.
 *
 * RA = Alkalinity − (Ca/1.4 + Mg/1.7)
 *
 * @param {number} alk_caco3 alkalinity as CaCO3 (mg/L)
 * @param {number} ca calcium (mg/L)
 * @param {number} mg magnesium (mg/L)
 */
export function residualAlkalinity(alk_caco3, ca, mg) {
  return alk_caco3 - (ca / 1.4 + mg / 1.7);
}

/**
 * Sulfate-to-chloride balance ratio. Returns Infinity when Cl ≤ 0.
 */
export function sulfateChlorideRatio(so4, cl) {
  if (cl <= 0) return Infinity;
  return so4 / cl;
}

/**
 * Flavor-balance interpretation of the SO4:Cl ratio.
 * Palmer-Kaminski (2013) Table 5.2, p. 136.
 */
export function ratioCharacter(r) {
  if (!isFinite(r)) return 'extremely bitter (no Cl)';
  if (r >= 2.0) return 'very bitter, dry';
  if (r >= 1.0) return 'bitter, hop-forward';
  if (r >= 0.77) return 'balanced toward bitter';
  if (r >= 0.5) return 'balanced toward malt';
  if (r >= 0.4) return 'malty, slightly sweet';
  return 'very malty, full';
}
