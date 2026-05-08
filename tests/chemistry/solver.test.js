import { describe, it, expect } from 'vitest';
import { solveAdditions, predictFinalProfile } from '../../src/chemistry/solver.js';

// Soft, low-mineral source (RO-ish) that needs additions to hit most targets.
const SOFT_SOURCE = {
  Ca: 8, Mg: 2, Na: 22, SO4: 0, Cl: 20, Alkalinity: 50, pH: 7.2,
};

// Hard, alkaline source that needs acid to drop alkalinity.
const HARD_SOURCE = {
  Ca: 80, Mg: 12, Na: 30, SO4: 60, Cl: 50, Alkalinity: 220, pH: 7.8,
};

const TARGET_PALE_ALE = {
  Ca: 110, Mg: 18, Na: 17, SO4: 250, Cl: 60, Alk: 50, RA: 30,
};

const TARGET_PILSNER = {
  Ca: 50, Mg: 5, Na: 5, SO4: 50, Cl: 50, Alk: 25, RA: -30,
};

describe('solveAdditions — return shape', () => {
  it('returns the expected keys', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r).toHaveProperty('additions');
    expect(r).toHaveProperty('acidDose');
    expect(r).toHaveProperty('finalIons');
    expect(Array.isArray(r.additions)).toBe(true);
  });

  it('each addition has salt, name, grams, and reason', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    for (const a of r.additions) {
      expect(a.salt).toBeTypeOf('string');
      expect(a.name).toBeTypeOf('string');
      expect(a.grams).toBeGreaterThanOrEqual(0);
      expect(a.reason).toBeTypeOf('string');
    }
  });
});

describe('solveAdditions — alkalinity branch', () => {
  it('hard alkaline source produces an acid dose', () => {
    // HARD_SOURCE has Ca=80, Mg=12; pilsner adds nothing (all ions already above target).
    // estCa=80, estMg=12 → alkForTargetRA = RA + 80/1.4 + 12/1.7 = -30 + 57.14 + 7.06 = 34.2
    // ppm_neutralized = source.Alk − alkForTargetRA = 220 − 34.2 = 185.8
    const r = solveAdditions({
      source: HARD_SOURCE,
      target: TARGET_PILSNER,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.acidDose).not.toBeNull();
    expect(r.acidDose.amount_ml).toBeGreaterThan(0);
    expect(r.acidDose.ppm_neutralized).toBeCloseTo(185.8, 0);
  });

  it('soft source needing higher alk → no acid, baking soda used', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: { ...TARGET_PALE_ALE, Alk: 150 }, // raise Alk required
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.acidDose).toBeNull();
    expect(r.additions.find((a) => a.salt === 'baking_soda')).toBeDefined();
  });

  it('pickling_lime alkalinity raise adds Ca, not Na', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: { ...TARGET_PALE_ALE, Alk: 150 },
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'pickling_lime',
    });
    expect(r.additions.find((a) => a.salt === 'pickling_lime')).toBeDefined();
    expect(r.additions.find((a) => a.salt === 'baking_soda')).toBeUndefined();
  });
});

describe('solveAdditions — ion targeting accuracy', () => {
  it('pale ale: final SO4 within ±10 mg/L of target', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(Math.abs(r.finalIons.SO4 - TARGET_PALE_ALE.SO4)).toBeLessThan(10);
  });

  it('pale ale: solver moves Cl toward the target (greedy may overshoot when MgCl2 substitutes for Epsom)', () => {
    // The prototype's greedy algorithm switches Epsom → MgCl2 when SO4 would
    // overshoot the 1.20× ceiling, which can dump extra Cl. Documented in
    // solver.js. We assert directional progress, not tight tolerance.
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.finalIons.Cl).toBeGreaterThanOrEqual(TARGET_PALE_ALE.Cl);
  });

  it('pale ale: final Ca meets or exceeds target (gypsum/CaCl2 are the only Ca sources)', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.finalIons.Ca).toBeGreaterThanOrEqual(TARGET_PALE_ALE.Ca - 5);
  });
});

describe('solveAdditions — fully traced single-step hand-calculations', () => {
  // For each test the comment block walks the solver step-by-step and shows
  // the arithmetic, so any drift from Palmer-Kaminski's table values gets
  // caught even if the high-level "ion within X mg/L" tests pass.

  it('pure Cl + Ca deficit → CaCl2 only, hand-traced grams', () => {
    // Source: zero ions, Alkalinity = 50
    // Target: Ca=72, Cl=100, Alk=50
    // Volume: 1 gallon
    //
    // Pre-estimate (step 0):
    //   CaCl2 for Cl=100: grams/gal = 100/127.4 = 0.78493 → estCa = 72.0×0.78493 = 56.51
    //   alkForTargetRA = RA + estCa/1.4 = RA + 40.37
    //   Set RA = 10 → alkForTargetRA = 50.37; |50.37−50| < 5 → no alk step.
    //
    // Step 2 (Cl):  grams = 100/127.4 × 1 = 0.78493 g
    //               Cl added = 100.0 ppm, Ca added = 56.51 ppm
    // Steps 3–6:    no deficits → no action
    //
    // Result: 1 addition (calcium_chloride, 0.785 g), no acid, Cl ≈ 100
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 50, pH: 7 },
      target: { Ca: 72, Mg: 0, Na: 0, SO4: 0, Cl: 100, Alk: 50, RA: 10 },
      volumeGallons: 1,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.additions).toHaveLength(1);
    expect(r.additions[0].salt).toBe('calcium_chloride');
    expect(r.additions[0].grams).toBeCloseTo(100 / 127.4, 4);
    expect(r.acidDose).toBeNull();
    expect(r.finalIons.Cl).toBeCloseTo(100.0, 1);
    expect(r.finalIons.Ca).toBeCloseTo(72.0 * (100 / 127.4), 1);
  });

  it('pure SO4 deficit → gypsum only, hand-traced grams', () => {
    // Source: zero except Alkalinity = 25
    // Target: SO4=147.4, Alk=25
    // Volume: 1 gallon
    //
    // Pre-estimate (step 0):
    //   Gypsum for SO4=147.4: grams/gal = 1.0 → estCa = 61.5
    //   alkForTargetRA = RA + estCa/1.4 = RA + 43.93
    //   Set RA = -19 → alkForTargetRA = 24.93; |24.93−25| < 5 → no alk step.
    //
    // Step 3 (SO4):  grams = 147.4/147.4 × 1 = 1.000 g
    //                Ca added = 61.5 ppm, SO4 added = 147.4 ppm (exact)
    // All other steps: no deficits → no action
    //
    // Result: 1 addition (gypsum, 1.000 g), no acid
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 25, pH: 7 },
      target: { Ca: 61.5, Mg: 0, Na: 0, SO4: 147.4, Cl: 0, Alk: 25, RA: -19 },
      volumeGallons: 1,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.additions).toHaveLength(1);
    expect(r.additions[0].salt).toBe('gypsum');
    expect(r.additions[0].grams).toBeCloseTo(1.0, 3);
    expect(r.finalIons.SO4).toBeCloseTo(147.4, 1);
    expect(r.finalIons.Ca).toBeCloseTo(61.5, 1);
  });

  it('alkalinity-excess source → acid dose hand-traced', () => {
    // Source: Alkalinity 200, all else zero
    // Target: Alk 50 → reduce by 150 ppm CaCO3 with 88% lactic
    // Volume: 5 gallons
    //
    // Liters = 5 × 3.78541 = 18.927 L
    // mEq needed = 150 / 50.04 × 18.927 = 56.74 mEq
    // capacity (lactic_88) = 11.812 mEq/mL
    // mL = 56.74 / 11.812 = 4.804 mL
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 200, pH: 7.5 },
      target: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alk: 50, RA: 50 },
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(r.acidDose).not.toBeNull();
    expect(r.acidDose.ppm_neutralized).toBeCloseTo(150, 0);
    expect(r.acidDose.mEq).toBeCloseTo((150 / 50.04) * (5 * 3.78541), 1);
    expect(r.acidDose.amount_ml).toBeCloseTo(4.804, 1);
  });

  it('alkalinity-shortage source with baking_soda raise → hand-traced grams', () => {
    // Source: Alk 50, target Alk 200 → raise by 150 ppm CaCO3 with NaHCO3
    // Volume: 1 gallon. Na target = 100 so NA_CAP = min(100, 300) = 100.
    // Na from soda = 72.3 × 0.95416 = 68.99 ppm < 100 → cap not reached.
    //
    // alk_per_g_gal = 191.7 × (50.04 / 61.02) = 157.207 ppm CaCO3
    // grams = 150 / 157.207 × 1 = 0.95416 g
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 50, pH: 7 },
      target: { Ca: 0, Mg: 0, Na: 100, SO4: 0, Cl: 0, Alk: 200, RA: 200 },
      volumeGallons: 1,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    const baking = r.additions.find((a) => a.salt === 'baking_soda');
    expect(baking).toBeDefined();
    const expectedGrams = 150 / (191.7 * (50.04 / 61.02));
    expect(baking.grams).toBeCloseTo(expectedGrams, 3);
    expect(baking.grams).toBeCloseTo(0.954, 2);
  });

  it('alkalinity-shortage with pickling_lime raise → hand-traced grams', () => {
    // Source: Alk 50, target Alk 200 → raise by 150 ppm CaCO3 with Ca(OH)2
    // Volume: 1 gallon
    //
    // alk_per_g_gal (lime) = 357.5 ppm CaCO3 directly (no HCO3 conversion)
    // grams = 150 / 357.5 × 1 = 0.41958 g
    // Ca added = 142.9 × 0.41958 / 1 = 59.96 ppm
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 50, pH: 7 },
      target: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alk: 200, RA: 200 },
      volumeGallons: 1,
      acidKey: 'lactic_88',
      raiseAlkSource: 'pickling_lime',
    });
    const lime = r.additions.find((a) => a.salt === 'pickling_lime');
    expect(lime).toBeDefined();
    expect(lime.grams).toBeCloseTo(150 / 357.5, 4);
    expect(lime.grams).toBeCloseTo(0.4196, 3);
  });
});

describe('predictFinalProfile', () => {
  it('returns the source unchanged when no additions and no acid', () => {
    const r = predictFinalProfile({
      source: SOFT_SOURCE,
      additions: {},
      acidDose: 0,
      acidKey: 'lactic_88',
      volumeGallons: 5,
    });
    expect(r.Ca).toBe(SOFT_SOURCE.Ca);
    expect(r.Alk).toBe(SOFT_SOURCE.Alkalinity);
  });

  it('gypsum addition raises Ca and SO4 correctly', () => {
    const r = predictFinalProfile({
      source: SOFT_SOURCE,
      additions: { gypsum: 5 }, // 5 g into 5 gal = 1 g/gal
      acidDose: 0,
      acidKey: 'lactic_88',
      volumeGallons: 5,
    });
    expect(r.Ca).toBeCloseTo(SOFT_SOURCE.Ca + 61.5, 1);
    expect(r.SO4).toBeCloseTo(SOFT_SOURCE.SO4 + 147.4, 1);
  });

  it('acid dose lowers Alk', () => {
    const r = predictFinalProfile({
      source: HARD_SOURCE,
      additions: {},
      acidDose: 5, // 5 mL lactic 88%
      acidKey: 'lactic_88',
      volumeGallons: 5,
    });
    expect(r.Alk).toBeLessThan(HARD_SOURCE.Alkalinity);
  });

  it('matches solveAdditions.finalIons when fed the same recommendations', () => {
    const sol = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    const additionsMap = {};
    for (const a of sol.additions) additionsMap[a.salt] = a.grams;
    const acidDose = sol.acidDose
      ? sol.acidDose.amount_ml ?? sol.acidDose.amount_g
      : 0;

    const predicted = predictFinalProfile({
      source: SOFT_SOURCE,
      additions: additionsMap,
      acidDose,
      acidKey: 'lactic_88',
      volumeGallons: 5,
    });
    for (const ion of ['Ca', 'Mg', 'Na', 'SO4', 'Cl']) {
      expect(predicted[ion]).toBeCloseTo(sol.finalIons[ion], 1);
    }
    expect(predicted.Alk).toBeCloseTo(sol.finalIons.Alk, 1);
  });
});

// =====================================================================
// Solver smoke tests — validate the solver in isolation (no Bru'n ref).
// =====================================================================

describe('solveAdditions — smoke tests', () => {
  it('no-op: source matches a self-consistent target → near-zero additions', () => {
    // For the solver to truly do nothing, source ions must match target AND
    // source.Alk must match alkForTargetRA. Construct target.RA so that
    // alkForTargetRA = target.Alk = source.Alk:
    //   target.RA = target.Alk - target.Ca/1.4 - target.Mg/1.7
    const ions = { Ca: 50, Mg: 5, Na: 10, SO4: 50, Cl: 50, Alk: 50 };
    const RA = ions.Alk - ions.Ca / 1.4 - ions.Mg / 1.7;
    const r = solveAdditions({
      source: { ...ions, Alkalinity: ions.Alk, pH: 7 },
      target: { ...ions, RA },
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });

    const totalGrams = r.additions.reduce((sum, a) => sum + a.grams, 0);
    expect(totalGrams).toBeLessThan(0.5);
    expect(r.acidDose).toBeNull();
  });

  it('direction: target Ca > source Ca → solver adds at least one Ca-bearing salt', () => {
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 50, pH: 7 },
      target: { Ca: 100, Mg: 0, Na: 50, SO4: 100, Cl: 50, Alk: 50, RA: -10 },
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    const caBearing = ['gypsum', 'calcium_chloride', 'pickling_lime', 'chalk'];
    const hasCa = r.additions.some((a) => caBearing.includes(a.salt));
    expect(hasCa).toBe(true);
    // Ca should have moved upward toward target
    expect(r.finalIons.Ca).toBeGreaterThan(0);
  });

  it('bounds: solver never recommends negative grams or negative acid dose', () => {
    // Sweep across multiple source/target combinations to stress the math.
    const sources = [
      { Ca: 0,   Mg: 0,  Na: 0,  SO4: 0,  Cl: 0,  Alkalinity: 0,   pH: 7 },   // RO
      { Ca: 30,  Mg: 5,  Na: 15, SO4: 25, Cl: 20, Alkalinity: 80,  pH: 7 },   // typical municipal
      { Ca: 100, Mg: 20, Na: 50, SO4: 80, Cl: 60, Alkalinity: 200, pH: 7 },   // hard, alkaline
    ];
    const targets = [
      TARGET_PILSNER,
      TARGET_PALE_ALE,
      { Ca: 110, Mg: 18, Na: 50, SO4: 60,  Cl: 80, Alk: 200, RA: 240 },        // stout-ish
    ];
    const acids = ['lactic_88', 'phosphoric_85', 'acidulated_malt'];

    for (const source of sources) {
      for (const target of targets) {
        for (const acidKey of acids) {
          for (const raiseAlkSource of ['baking_soda', 'pickling_lime']) {
            const r = solveAdditions({ source, target, volumeGallons: 5, acidKey, raiseAlkSource });
            for (const a of r.additions) {
              expect(a.grams).toBeGreaterThanOrEqual(0);
            }
            if (r.acidDose) {
              const dose = r.acidDose.amount_ml ?? r.acidDose.amount_g ?? 0;
              expect(dose).toBeGreaterThanOrEqual(0);
              expect(r.acidDose.mEq).toBeGreaterThanOrEqual(0);
              expect(r.acidDose.ppm_neutralized).toBeGreaterThanOrEqual(0);
            }
          }
        }
      }
    }
  });

  it('convergence: pilsner with low-mineral source → Ca/Mg/Na/SO4 within ±10 ppm; final RA near target', () => {
    // Why pilsner not pale ale: pale ale's high SO4 target (250) forces enough
    // gypsum that Ca structurally overshoots target by ~25 ppm. Pilsner's
    // SO4:Ca ratio (50:50) keeps the gypsum+CaCl2 stack inside tolerance.
    // We test RA (which the solver targets) rather than Alk (which it doesn't).
    const r = solveAdditions({
      source: { Ca: 0, Mg: 0, Na: 0, SO4: 0, Cl: 0, Alkalinity: 0, pH: 7 }, // RO
      target: TARGET_PILSNER,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    expect(Math.abs(r.finalIons.Ca  - TARGET_PILSNER.Ca )).toBeLessThan(10);
    expect(Math.abs(r.finalIons.Mg  - TARGET_PILSNER.Mg )).toBeLessThan(10);
    expect(Math.abs(r.finalIons.Na  - TARGET_PILSNER.Na )).toBeLessThan(10);
    expect(Math.abs(r.finalIons.SO4 - TARGET_PILSNER.SO4)).toBeLessThan(10);
    // Cl excluded — MgCl2 substitution can dump extra Cl, and the CaCl2
    // hydrate-form choice introduces ~33% variance vs anhydrous references.
    const finalRA = r.finalIons.Alk - r.finalIons.Ca / 1.4 - r.finalIons.Mg / 1.7;
    expect(Math.abs(finalRA - TARGET_PILSNER.RA)).toBeLessThan(10);
  });

  it('sanity: pale ale 5-gallon build totals < 30 g of salts', () => {
    const r = solveAdditions({
      source: SOFT_SOURCE,
      target: TARGET_PALE_ALE,
      volumeGallons: 5,
      acidKey: 'lactic_88',
      raiseAlkSource: 'baking_soda',
    });
    const totalSalts = r.additions.reduce((sum, a) => sum + a.grams, 0);
    expect(totalSalts).toBeLessThan(30);
    expect(totalSalts).toBeGreaterThan(0); // sanity floor — pale ale needs salts
  });
});
