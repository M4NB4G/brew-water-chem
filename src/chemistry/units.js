// Unit conversion constants and helpers.
//
// Internal canonical units used by the chemistry engine:
//   Volume: US gallons       (matches Palmer-Kaminski tables)
//   Salts:  grams
//   Acid:   mL (liquid) or g (acidulated malt)
//
// UI unit modes (display only; converted at the boundary):
//   Pro  — bbl for volume, g for salts, mL for liquid acid, lb for acidulated malt
//   Home — gal for volume, g for salts, mL for liquid acid, oz for acidulated malt

export const GALLONS_PER_BBL = 31.0; // US beer barrel
export const LITERS_PER_GALLON = 3.78541;
export const LITERS_PER_BBL = GALLONS_PER_BBL * LITERS_PER_GALLON;

export const G_PER_OZ = 28.3495;
export const OZ_PER_LB = 16;
export const G_PER_LB = OZ_PER_LB * G_PER_OZ; // 453.592

/**
 * Convert a volume entered in the user's mode into US gallons (canonical).
 */
export function volumeToGallons(value, mode) {
  return mode === 'pro' ? value * GALLONS_PER_BBL : value;
}

export function volumeUnit(mode) {
  return mode === 'pro' ? 'bbl' : 'gal';
}

/**
 * Acidulated malt unit conversion + label for the current mode.
 * Solver always works in grams; this helper converts at display time.
 */
export function acidMaltUnits(mode) {
  if (mode === 'pro') {
    return {
      unit: 'lb',
      toDisplay: (g) => g / G_PER_LB,
      fromDisplay: (lb) => lb * G_PER_LB,
    };
  }
  return {
    unit: 'oz',
    toDisplay: (g) => g / G_PER_OZ,
    fromDisplay: (oz) => oz * G_PER_OZ,
  };
}
