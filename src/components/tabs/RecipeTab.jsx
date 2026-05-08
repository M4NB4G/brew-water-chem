// "Recipe" tab — salt & acid additions calculator.
//
// Behavior:
//   - Solver auto-runs whenever style, volume, or acid type/raise-alk source changes.
//   - Salt amounts and acid dose are EDITABLE inputs pre-populated with the
//     solver's recommendation. User can override any value.
//   - Predicted Final Profile recomputes immediately from the effective values
//     (overrides applied where present, recommendations otherwise).
//   - Small grey hint text under each editable field shows the recommended value.
//   - "Reset to recommended" button is visible only when ≥1 field is customized.

import { useMemo } from 'react';
import Card from '../shared/Card.jsx';
import StatBox from '../shared/StatBox.jsx';
import InputRow from '../shared/InputRow.jsx';
import { colors, radii, tokens } from '../shared/styles.js';
import { ACIDS } from '../../chemistry/acids.js';
import { SALT_CONTRIBUTIONS_PER_G_GAL } from '../../chemistry/salts.js';
import { solveAdditions, predictFinalProfile } from '../../chemistry/solver.js';
import { residualAlkalinity, sulfateChlorideRatio } from '../../chemistry/ra.js';
import { volumeUnit, acidMaltUnits } from '../../chemistry/units.js';

const FINAL_PROFILE_ROWS = [
  ['Ca', 'Calcium'],
  ['Mg', 'Magnesium'],
  ['Na', 'Sodium'],
  ['SO4', 'Sulfate'],
  ['Cl', 'Chloride'],
  ['Alk', 'Alkalinity'],
];

export default function RecipeTab({
  source,
  target,
  style,
  volume,
  unitMode,
  volumeGallons,
  acidKey,
  raiseAlkSource,
  overrides,
  onChangeVolume,
  onChangeAcid,
  onChangeRaiseAlk,
  onSetOverride,
  onResetOverrides,
}) {
  const acid = ACIDS[acidKey];
  const acidIsSolid = !!acid.is_solid;
  const malt = acidMaltUnits(unitMode);

  // Solver recommendation
  const recommendation = useMemo(() => {
    if (!volumeGallons || volumeGallons <= 0) return null;
    return solveAdditions({ source, target, volumeGallons, acidKey, raiseAlkSource });
  }, [source, target, volumeGallons, acidKey, raiseAlkSource]);

  const recommendedSalts = useMemo(() => {
    const out = {};
    if (!recommendation) return out;
    for (const a of recommendation.additions) out[a.salt] = a.grams;
    return out;
  }, [recommendation]);

  const recommendedAcidDose = useMemo(() => {
    if (!recommendation || !recommendation.acidDose) return 0;
    return recommendation.acidDose.amount_ml ?? recommendation.acidDose.amount_g ?? 0;
  }, [recommendation]);

  // Effective values (overrides applied where present)
  const effectiveSalts = useMemo(() => {
    const out = { ...recommendedSalts };
    for (const key of Object.keys(overrides)) {
      if (key === '_acidDose') continue;
      out[key] = overrides[key];
    }
    return out;
  }, [recommendedSalts, overrides]);
  const effectiveAcidDose = overrides._acidDose ?? recommendedAcidDose;

  // The raise-alk salt always gets its own dedicated card — always the user's
  // chosen raiseAlkSource, regardless of whether the solver recommends any.
  const alkRaiseSaltKey = raiseAlkSource; // 'baking_soda' | 'pickling_lime'

  // Show all salts: solver-recommended first (natural order), then any remaining
  // salts from the full catalogue not yet listed. The raise-alk salt always
  // gets its own dedicated card below, so exclude it here.
  const displayedSalts = [
    ...Object.keys({ ...recommendedSalts, ...effectiveSalts }),
    ...Object.keys(SALT_CONTRIBUTIONS_PER_G_GAL),
  ]
    .filter((k, i, arr) => k !== alkRaiseSaltKey && arr.indexOf(k) === i);

  // Predicted final ions, recomputed live as overrides change
  const finalIons = useMemo(() => {
    if (!volumeGallons || volumeGallons <= 0) return null;
    return predictFinalProfile({
      source,
      additions: effectiveSalts,
      acidDose: effectiveAcidDose,
      acidKey,
      volumeGallons,
    });
  }, [source, effectiveSalts, effectiveAcidDose, acidKey, volumeGallons]);

  const isCustomized = Object.keys(overrides).length > 0;

  function formatGrams(g) {
    return g.toFixed(g >= 10 ? 1 : 2);
  }
  function formatAcidDose(value) {
    if (acidIsSolid) return malt.toDisplay(value).toFixed(2);
    return value.toFixed(2);
  }
  function parseAcidDoseInput(raw) {
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0) return 0;
    if (acidIsSolid) return malt.fromDisplay(v);
    return v;
  }

  return (
    <>
      <Card>
        <div style={tokens.cardLabel}>Batch Volume & Acid</div>
        <InputRow
          label="Volume"
          unit={volumeUnit(unitMode)}
          value={volume}
          onChange={(e) => onChangeVolume(e.target.value)}
          step={0.1}
          min={0}
        />
        <div style={{ marginTop: '0.85rem' }}>
          <div style={{ ...tokens.cardLabel, marginBottom: '0.4rem' }}>Acid Type</div>
          <select value={acidKey} onChange={(e) => onChangeAcid(e.target.value)} style={tokens.select}>
            {Object.entries(ACIDS).map(([k, a]) => (
              <option key={k} value={k}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div style={{ marginTop: '0.85rem' }}>
          <div style={{ ...tokens.cardLabel, marginBottom: '0.4rem' }}>
            Alkalinity Raise Source (if needed)
          </div>
          <select
            value={raiseAlkSource}
            onChange={(e) => onChangeRaiseAlk(e.target.value)}
            style={tokens.select}
          >
            <option value="baking_soda">Baking Soda (NaHCO₃) — adds Na⁺</option>
            <option value="pickling_lime">Pickling Lime (Ca(OH)₂) — adds Ca²⁺</option>
          </select>
        </div>
      </Card>

      {recommendation && (
        <>
          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <span style={tokens.cardLabel}>Salt Additions</span>
              {isCustomized && (
                <button onClick={onResetOverrides} style={resetButtonStyle}>
                  Reset to recommended
                </button>
              )}
            </div>
            <div style={tokens.cardTitle}>{style.name}</div>
            <div style={tokens.accentBar} />

            {displayedSalts.length === 0 && (
              <p style={tokens.notice}>
                No salt additions needed — source water is already within tolerance
                of the target profile.
              </p>
            )}

            {displayedSalts.map((saltKey) => {
              const meta = SALT_CONTRIBUTIONS_PER_G_GAL[saltKey];
              if (!meta) return null;
              const recG = recommendedSalts[saltKey] ?? 0;
              const effG = effectiveSalts[saltKey] ?? 0;
              const isOverridden = overrides[saltKey] !== undefined;
              const reason =
                recommendation.additions.find((a) => a.salt === saltKey)?.reason ??
                'User-added salt';

              return (
                <div key={saltKey} style={editableRowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={recipeNameStyle}>{meta.name}</div>
                    <div style={recipeReasonStyle}>{reason}</div>
                    {saltKey === 'chalk' && (
                      <div style={{ ...recipeReasonStyle, color: colors.textWarn }}>
                        ⚠ Chalk dissolves poorly — pre-dissolve in CO₂-saturated mash water.
                      </div>
                    )}
                    {saltKey === 'pickling_lime' && (
                      <div style={{ ...recipeReasonStyle, color: colors.textWarn }}>
                        ⚠ Strong base. Add to mash, never directly to grain.
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={formatGrams(effG)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onSetOverride(saltKey, isNaN(v) || v < 0 ? 0 : v);
                        }}
                        style={{
                          ...tokens.numberInput,
                          width: '80px',
                          background: isOverridden ? colors.inputBgOverride : colors.inputBg,
                        }}
                      />
                      <span style={unitLabelStyle}>g</span>
                    </div>
                    <div style={hintStyle}>rec {formatGrams(recG)} g</div>
                  </div>
                </div>
              );
            })}
          </Card>

          {true && (
            <Card>
              <div style={tokens.cardLabel}>Acid Dose</div>
              <div style={editableRowStyle}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={recipeNameStyle}>{acid.name}</div>
                  <div style={recipeReasonStyle}>
                    {recommendation.acidDose
                      ? `Neutralize ${recommendation.acidDose.ppm_neutralized.toFixed(0)} mg/L alkalinity (${recommendation.acidDose.mEq.toFixed(1)} mEq total)`
                      : 'No acid required by solver — adjust if desired.'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                    <input
                      type="number"
                      step={0.01}
                      min={0}
                      value={formatAcidDose(effectiveAcidDose)}
                      onChange={(e) => onSetOverride('_acidDose', parseAcidDoseInput(e.target.value))}
                      style={{
                        ...tokens.numberInput,
                        width: '90px',
                        background: overrides._acidDose !== undefined ? colors.inputBgOverride : colors.inputBg,
                      }}
                    />
                    <span style={unitLabelStyle}>{acidIsSolid ? malt.unit : 'mL'}</span>
                  </div>
                  <div style={hintStyle}>
                    rec {formatAcidDose(recommendedAcidDose)}{' '}
                    {acidIsSolid ? malt.unit : 'mL'}
                  </div>
                </div>
              </div>
              <p style={tokens.notice}>
                Phosphoric acid treated as monoprotic at mash pH 5.4 (pKa₁=2.15,
                pKa₂=7.20). See Troester (2009), Braukaiser.com.
              </p>
            </Card>
          )}

          {(() => {
            const meta = SALT_CONTRIBUTIONS_PER_G_GAL[alkRaiseSaltKey];
            const recG = recommendedSalts[alkRaiseSaltKey] ?? 0;
            const effG = effectiveSalts[alkRaiseSaltKey] ?? recG;
            const isOverridden = overrides[alkRaiseSaltKey] !== undefined;
            return (
              <Card>
                <div style={tokens.cardLabel}>Alkalinity Raise</div>
                <div style={editableRowStyle}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={recipeNameStyle}>{meta.name}</div>
                    <div style={recipeReasonStyle}>
                      Raise alkalinity to target
                      {alkRaiseSaltKey === 'baking_soda' ? ' (adds Na⁺)' : ' (adds Ca²⁺)'}
                    </div>
                    {alkRaiseSaltKey === 'pickling_lime' && (
                      <div style={{ ...recipeReasonStyle, color: colors.textWarn }}>
                        ⚠ Strong base. Add to mash, never directly to grain.
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={formatGrams(effG)}
                        onChange={(e) => {
                          const v = parseFloat(e.target.value);
                          onSetOverride(alkRaiseSaltKey, isNaN(v) || v < 0 ? 0 : v);
                        }}
                        style={{
                          ...tokens.numberInput,
                          width: '80px',
                          background: isOverridden ? colors.inputBgOverride : colors.inputBg,
                        }}
                      />
                      <span style={unitLabelStyle}>g</span>
                    </div>
                    <div style={hintStyle}>rec {formatGrams(recG)} g</div>
                  </div>
                </div>
              </Card>
            );
          })()}

          {finalIons && (
            <Card>
              <div style={tokens.cardLabel}>Predicted Final Profile</div>
              <div style={tokens.statGrid}>
                {FINAL_PROFILE_ROWS.map(([key, label]) => {
                  const val = finalIons[key];
                  const tgt = target[key];
                  const off = Math.abs(val - tgt);
                  const pctOff = tgt > 0 ? (off / tgt) * 100 : 0;
                  const c = pctOff < 10 ? '#3a8055' : pctOff < 25 ? '#a07835' : '#a04835';
                  return (
                    <StatBox
                      key={key}
                      value={val.toFixed(0)}
                      label={label}
                      sublabel={`tgt ${tgt}`}
                      valueStyle={{ fontSize: '1.6rem', color: c }}
                    />
                  );
                })}
                {(() => {
                  const finalRA = residualAlkalinity(finalIons.Alk, finalIons.Ca, finalIons.Mg);
                  const tgtRA = target.RA;
                  const offRA = Math.abs(finalRA - tgtRA);
                  const c = offRA < 20 ? '#3a8055' : offRA < 40 ? '#a07835' : '#a04835';
                  const sign = (n) => (n > 0 ? '+' : '');
                  return (
                    <StatBox
                      value={`${sign(finalRA)}${finalRA.toFixed(0)}`}
                      label="Residual Alk"
                      sublabel={`tgt ${sign(tgtRA)}${tgtRA}`}
                      valueStyle={{ fontSize: '1.6rem', color: c }}
                    />
                  );
                })()}
              </div>
              <p style={tokens.notice}>
                Final SO₄:Cl ratio:{' '}
                <strong>{sulfateChlorideRatio(finalIons.SO4, finalIons.Cl).toFixed(2)}</strong>{' '}
                (target {style.so4_cl_target.toFixed(2)}). RA per Kolbach (1953):
                Alk − (Ca/1.4 + Mg/1.7), all as CaCO₃.
              </p>
            </Card>
          )}
        </>
      )}
    </>
  );
}

const editableRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  padding: '0.85rem 0',
  borderBottom: `1px solid ${colors.rowDivider}`,
  gap: '0.75rem',
};

const recipeNameStyle = {
  fontSize: '0.95rem',
  fontWeight: 600,
  color: colors.textPrimary,
};

const recipeReasonStyle = {
  fontSize: '0.78rem',
  color: colors.textMuted,
  marginTop: '0.2rem',
};

const hintStyle = {
  fontSize: '0.72rem',
  color: colors.textMuted,
  marginTop: '0.2rem',
  fontStyle: 'italic',
};

const unitLabelStyle = {
  fontSize: '0.78rem',
  color: colors.textMuted,
};

const resetButtonStyle = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  color: colors.textSecondary,
  padding: '0.4rem 0.7rem',
  borderRadius: radii.btn,
  fontSize: '0.75rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
