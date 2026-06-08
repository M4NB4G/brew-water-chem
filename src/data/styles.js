// BJCP 2021 style family target water profiles.
//
// Sources:
//   Palmer, J.J., & Kaminski, C. (2013). Water: A Comprehensive Guide
//     for Brewers. Brewers Publications.
//   Palmer, J.J. (2006). How to Brew. Brewers Publications.
//   Janish, S. (2019). The New IPA. White Mule Press.
//   BJCP 2021 Style Guidelines — https://www.bjcp.org/style/2021/
//
// RA = Alkalinity − (Ca/1.4 + Mg/1.7), all as CaCO₃ mg/L (Kolbach 1953).

export const STYLE_FAMILIES = [
  {
    id: 'pilsner',
    name: 'Pilsner / Light Lager',
    bjcp: '1A, 1B, 1D, 2A, 3A, 3B, 5D',
    description: 'Soft, low-mineral water. Pilsen-inspired.',
    profile: { Ca: 50, Mg: 10, Na: 5, SO4: 50, Cl: 50, Alk: 2, RA: -40 },
    so4_cl_target: 1.0,
    page_ref: 'Palmer-Kaminski p. 156-157 Table 18',
  },
  {
    id: 'pale_lager',
    name: 'Pale Lager / Helles',
    bjcp: '4A, 4B, 5A, 5B, 6A, 7A',
    description: 'Munich-inspired; moderate carbonate, balanced.',
    profile: { Ca: 60, Mg: 18, Na: 10, SO4: 30, Cl: 60, Alk: 13, RA: -40 },
    so4_cl_target: 0.5,
    page_ref: 'Palmer-Kaminski p. 156-157 Table 18',
  },
  {
    id: 'amber_lager',
    name: 'Amber / Dark Lager / Bock',
    bjcp: '6A, 6B, 7B, 7C, 8A, 8B, 9A',
    description: 'Munich-style with higher alkalinity for darker malts.',
    profile: { Ca: 75, Mg: 10, Na: 15, SO4: 75, Cl: 125, Alk: 69, RA: 10 },
    so4_cl_target: 0.6,
    page_ref: 'Palmer-Kaminski p. 156-157 Table 18',
  },
  {
    id: 'pale_ale',
    name: 'Kölsch / Blonde / Cream Ale',
    bjcp: '1C, 5B, 18A',
    description: 'Soft balanced profile for these pale, subtle ales',
    profile: { Ca: 75, Mg: 10, Na: 10, SO4: 75, Cl: 75, Alk: 19, RA: -40 },
    so4_cl_target: 1.0,
    page_ref: 'Palmer How to Brew p.393',
  },
  {
    id: 'hoppy_ale',
    name: 'American Pale Ale / Bitter',
    bjcp: '11A, 11B, 11C, 12C, 18B',
    description: 'Sulfate forward for hop crispness.',
    profile: { Ca: 70, Mg: 15, Na: 35, SO4: 110, Cl: 55, Alk: 29, RA: -30 },
    so4_cl_target: 2.0,
    page_ref: 'Palmer-Kaminski p. 158-159 Table 19',
  },
  {
    id: 'ipa',
    name: 'IPA (American/English)',
    bjcp: '12C, 21A, 21B',
    description: 'High sulfate for sharp, accentuated bitterness.',
    profile: { Ca: 120, Mg: 18, Na: 15, SO4: 225, Cl: 75, Alk: 66, RA: -30 },
    so4_cl_target: 3.0,
    page_ref: 'Palmer-Kaminski p. 158-159 Table 19',
  },
  {
    id: 'west_coast_ipa',
    name: 'West Coast IPA',
    bjcp: '21A (American IPA — West Coast)',
    description: 'Pale, dry, sharply bitter. High sulfate, low chloride, low residual alkalinity.',
    profile: { Ca: 100, Mg: 12, Na: 12, SO4: 200, Cl: 50, Alk: 38, RA: -40 },
    so4_cl_target: 4.0,
    page_ref: 'Hunsaker, M., "West Coast-Style IPA" (water chemistry section), Craft Beer & Brewing Brewing Guides Library (subscriber content)',
  },
  {
    id: 'hazy_ipa',
    name: 'Hazy / NEIPA',
    bjcp: '21C (Hazy IPA)',
    description: 'Chloride forward for soft, juicy mouthfeel.',
    profile: { Ca: 100, Mg: 12, Na: 15, SO4: 100, Cl: 200, Alk: 38, RA: -40 },
    so4_cl_target: 0.5,
    page_ref: 'Janish The New IPA p. 229',
  },
  {
    id: 'amber_ale',
    name: 'Amber / Brown Ale',
    bjcp: '14A, 14B, 19A, 19B, 19C',
    description: 'Balanced with moderate alkalinity for crystal/Munich malts.',
    profile: { Ca: 90, Mg: 15, Na: 25, SO4: 110, Cl: 90, Alk: 73, RA: 0 },
    so4_cl_target: 1.2,
    page_ref: 'Palmer-Kaminski p. 158-159 Table 19',
  },
  {
    id: 'porter',
    name: 'Porter',
    bjcp: '9C, 13C, 20A',
    description: 'London-leaning; carbonate to support roast malts.',
    profile: { Ca: 100, Mg: 20, Na: 50, SO4: 80, Cl: 100, Alk: 158, RA: 75 },
    so4_cl_target: 0.8,
    page_ref: 'Palmer How to Brew p.412',
  },
  {
    id: 'stout',
    name: 'Stout / Imperial Stout',
    bjcp: '15B, 15C, 16A, 16B, 16C, 16D, 20B, 20C',
    description: 'Dublin-inspired; high carbonate for dark malt acidity.',
    profile: { Ca: 100, Mg: 20, Na: 50, SO4: 75, Cl: 100, Alk: 173, RA: 90 },
    so4_cl_target: 0.75,
    page_ref: 'Palmer How to Brew p.414',
  },
  {
    id: 'belgian',
    name: 'Belgian Ale (Pale/Strong)',
    bjcp: '24A, 24B, 25A, 25B, 25C, 26A, 26B, 26C',
    description: 'Soft water, low minerals; lets yeast express.',
    profile: { Ca: 60, Mg: 10, Na: 10, SO4: 50, Cl: 60, Alk: 19, RA: -30 },
    so4_cl_target: 0.83,
    page_ref: 'Palmer-Kaminski p. 158-159 Table 19',
  },
  {
    id: 'wheat',
    name: 'Wheat / Witbier / Hefeweizen',
    bjcp: '1D, 10A, 10C, 24A, 23A',
    description: 'Soft water; minimal mineral character.',
    profile: { Ca: 50, Mg: 10, Na: 10, SO4: 30, Cl: 50, Alk: 2, RA: -40 },
    so4_cl_target: 0.6,
    page_ref: 'Palmer-Kaminski p. 158-159 Table 19',
  },
];

export function findStyle(id) {
  return STYLE_FAMILIES.find((s) => s.id === id) || STYLE_FAMILIES[0];
}
