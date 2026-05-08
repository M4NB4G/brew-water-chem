// BJCP 2021 style family target water profiles.
//
// Sources:
//   Palmer-Kaminski (2013) Chapter 5, pp. 119–162 — historical city water
//     profiles mapped to style families.
//   BJCP 2021 Style Guidelines — https://www.bjcp.org/style/2021/
//   Janish, S. (2019). IPA: Brewing Tips, Recipes, & Techniques.
//     — modern hazy/NEIPA chloride-forward practice.
//
// RA targets are derived from beer color via Palmer-Kaminski (2013) p. 121,
// Fig. 5.1 (Kolbach color/RA chart):
//   Very pale  (1–4 SRM)   → RA −60 to 0    (use −30)
//   Pale       (4–7 SRM)   → RA   0 to 60   (use  30)
//   Amber      (7–14 SRM)  → RA  60 to 120  (use  90)
//   Brown      (14–25 SRM) → RA 120 to 180  (use 150)
//   Black      (25+ SRM)   → RA 180 to 300  (use 240)
//
// These are starting points; adjust based on hop intensity, malt character,
// and water source.

export const STYLE_FAMILIES = [
  {
    id: 'pilsner',
    name: 'Pilsner / Light Lager',
    bjcp: '1A, 1B, 1D, 2A, 3A, 3B, 5D',
    description: 'Soft, low-mineral water. Pilsen-inspired.',
    profile: { Ca: 50, Mg: 5, Na: 5, SO4: 50, Cl: 50, Alk: 25, RA: -30 },
    so4_cl_target: 1.0,
    page_ref: 'Palmer-Kaminski p. 124–127 (Pilsen)',
  },
  {
    id: 'pale_lager',
    name: 'Pale Lager / Helles / Märzen',
    bjcp: '4A, 4B, 5A, 5B, 6A, 7A',
    description: 'Munich-inspired; moderate carbonate, balanced.',
    profile: { Ca: 75, Mg: 18, Na: 10, SO4: 60, Cl: 60, Alk: 80, RA: 30 },
    so4_cl_target: 1.0,
    page_ref: 'Palmer-Kaminski p. 128–131 (Munich)',
  },
  {
    id: 'amber_lager',
    name: 'Amber/Dark Lager / Bock',
    bjcp: '6B, 7B, 7C, 8A, 8B, 9A',
    description: 'Munich-style with higher alkalinity for darker malts.',
    profile: { Ca: 80, Mg: 20, Na: 15, SO4: 60, Cl: 75, Alk: 120, RA: 90 },
    so4_cl_target: 0.8,
    page_ref: 'Palmer-Kaminski p. 128–131 (Munich, dark)',
  },
  {
    id: 'pale_ale',
    name: 'Pale Ale / English Bitter',
    bjcp: '11A, 11B, 11C, 12A, 18A, 18B',
    description: 'Burton-leaning; sulfate forward for hop crispness.',
    profile: { Ca: 110, Mg: 18, Na: 17, SO4: 250, Cl: 60, Alk: 50, RA: 30 },
    so4_cl_target: 4.0,
    page_ref: 'Palmer-Kaminski p. 137–140 (Burton, modified)',
  },
  {
    id: 'ipa',
    name: 'IPA (American/English)',
    bjcp: '12B, 12C, 21A, 21B1, 21B2',
    description: 'High sulfate for sharp, accentuated bitterness.',
    profile: { Ca: 120, Mg: 18, Na: 15, SO4: 300, Cl: 55, Alk: 40, RA: 30 },
    so4_cl_target: 5.5,
    page_ref: 'Palmer-Kaminski p. 137–140; modern IPA practice',
  },
  {
    id: 'hazy_ipa',
    name: 'Hazy / NEIPA',
    bjcp: '21B6 (Hazy IPA)',
    description: 'Chloride forward for soft, juicy mouthfeel.',
    profile: { Ca: 110, Mg: 12, Na: 15, SO4: 90, Cl: 175, Alk: 40, RA: 30 },
    so4_cl_target: 0.5,
    page_ref: 'Janish (2019), IPA: Brewing Tips, Recipes & Techniques',
  },
  {
    id: 'amber_ale',
    name: 'Amber / Brown Ale',
    bjcp: '14B, 19A, 19B, 19C, 27 (Pre-Pro Lager)',
    description: 'Balanced with moderate alkalinity for crystal/Munich malts.',
    profile: { Ca: 90, Mg: 15, Na: 25, SO4: 110, Cl: 90, Alk: 100, RA: 90 },
    so4_cl_target: 1.2,
    page_ref: 'Palmer-Kaminski p. 142 (balanced amber)',
  },
  {
    id: 'porter',
    name: 'Porter',
    bjcp: '9C, 13C, 20A, 20B, 20C',
    description: 'London-leaning; carbonate to support roast malts.',
    profile: { Ca: 90, Mg: 12, Na: 50, SO4: 75, Cl: 95, Alk: 160, RA: 150 },
    so4_cl_target: 0.8,
    page_ref: 'Palmer-Kaminski p. 144 (London)',
  },
  {
    id: 'stout',
    name: 'Stout / Imperial Stout',
    bjcp: '15A, 15B, 15C, 16A, 16B, 16C, 16D, 20C',
    description: 'Dublin-inspired; high carbonate for dark malt acidity.',
    profile: { Ca: 110, Mg: 18, Na: 50, SO4: 60, Cl: 80, Alk: 200, RA: 240 },
    so4_cl_target: 0.75,
    page_ref: 'Palmer-Kaminski p. 145–147 (Dublin)',
  },
  {
    id: 'belgian',
    name: 'Belgian Ale (Pale/Strong)',
    bjcp: '24A, 24B, 25A, 25B, 25C, 26A, 26B, 26C',
    description: 'Soft water, low minerals; lets yeast express.',
    profile: { Ca: 60, Mg: 8, Na: 10, SO4: 50, Cl: 60, Alk: 50, RA: 30 },
    so4_cl_target: 0.83,
    page_ref: 'Palmer-Kaminski p. 156–157 (Belgian practice)',
  },
  {
    id: 'wheat',
    name: 'Wheat / Witbier / Hefeweizen',
    bjcp: '1D, 10A, 10B, 10C, 24A, 23A',
    description: 'Soft water; minimal mineral character.',
    profile: { Ca: 50, Mg: 10, Na: 10, SO4: 50, Cl: 60, Alk: 50, RA: 30 },
    so4_cl_target: 0.83,
    page_ref: 'Palmer-Kaminski p. 158',
  },
  {
    id: 'sour',
    name: 'Sour / Lambic / Gose / Berliner',
    bjcp: '23A, 23B, 23C, 23D, 23E, 23F, 23G, 28, 29',
    description: 'Soft, low-mineral. Acid produced by fermentation, not water.',
    profile: { Ca: 50, Mg: 8, Na: 60, SO4: 50, Cl: 80, Alk: 30, RA: -30 },
    so4_cl_target: 0.6,
    page_ref: 'Palmer-Kaminski p. 158–159 (acid styles)',
  },
];

export function findStyle(id) {
  return STYLE_FAMILIES.find((s) => s.id === id) || STYLE_FAMILIES[0];
}
