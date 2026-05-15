// "Recipe" tab — salt & acid additions calculator.
//
// Behavior:
//   - Solver (owned by App.jsx) auto-runs whenever style/volume/source/raise-alk
//     source/enabled-salts change. App passes the recommendation in via props.
//   - Salt amounts are EDITABLE inputs pre-populated with the solver's
//     recommendation; user can override any value (sparse overrides map).
//   - Acid amounts use a different state pattern: App owns a full 5-key
//     `userAcids` map plus a `primaryAcidType` dropdown selection. The primary
//     row renders userAcids[primaryAcidType]; the four other rows render the
//     remaining keys as "secondary acids".
//   - Predicted Final Profile recomputes immediately from effective salts +
//     userAcids. Alkalinity reduction sums across all acids (linearly).
//   - Small grey hint text under each editable field shows the recommended
//     value (and per-acid mEq contribution for acid rows).
//   - "Reset to recommended" button is visible only when ≥1 salt OR ≥1 acid
//     value differs from the solver's recommendation (incl. primary dropdown).

import { useEffect, useMemo, useState } from 'react';
import Card from '../shared/Card.jsx';
import StatBox from '../shared/StatBox.jsx';
import InputRow from '../shared/InputRow.jsx';
import { colors, radii, tokens } from '../shared/styles.js';
import { ACIDS, acidCapacity, acidContribution, applyAcids } from '../../chemistry/acids.js';
import { SALT_CONTRIBUTIONS_PER_G_GAL } from '../../chemistry/salts.js';
import { predictFinalProfile } from '../../chemistry/solver.js';
import { residualAlkalinity, sulfateChlorideRatio } from '../../chemistry/ra.js';
import { volumeUnit, acidMaltUnits } from '../../chemistry/units.js';

const ACID_KEYS = Object.keys(ACIDS);

// Uncontrolled-style number input that holds a local string draft while the
// user is typing. Commits the parsed value to the parent on blur, and
// normalizes the display.
//
// External-sync rule: when `initialValue` changes from outside (parent reset,
// recommendation refresh), the draft re-syncs to the new value. We detect
// "external" by comparing the parsed draft to initialValue — if they already
// match (within float tolerance), we assume the change came from our own
// onChange emit and leave the draft alone. If the parsed draft is null
// (transient invalid input like "" or "-" mid-typing), we also skip — the
// user is in the middle of editing and we don't want to clobber their text.
function DraftInput({ initialValue, format, parse, onChange, style }) {
  const [draft, setDraft] = useState(() => format(initialValue));

  useEffect(() => {
    const parsed = parse(draft);
    if (parsed !== null && Math.abs(parsed - initialValue) > 1e-6) {
      setDraft(format(initialValue));
    }
    // parse/format are stable; intentionally not in deps to avoid resync loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        const v = parse(e.target.value);
        if (v !== null) onChange(v);
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => {
        const v = parse(draft) ?? 0;
        setDraft(format(v));
        onChange(v);
      }}
      style={style}
    />
  );
}


export default function RecipeTab({
  source,
  target,
  style,
  volume,
  unitMode,
  volumeGallons,
  raiseAlkSource,
  overrides,
  enabledSalts,
  recommendation,
  recommendedSalts,
  userAcids,
  primaryAcidType,
  multiAcidMode,
  onChangeVolume,
  onChangeRaiseAlk,
  onSetOverride,
  onResetOverrides,
  onToggleSalt,
  onSetUserAcid,
  onSetPrimaryAcid,
  onToggleMultiAcid,
}) {
  // Effective values (overrides applied where present)
  const effectiveSalts = useMemo(() => {
    const out = { ...recommendedSalts };
    for (const key of Object.keys(overrides)) {
      out[key] = overrides[key];
    }
    return out;
  }, [recommendedSalts, overrides]);

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
    .filter((k, i, arr) => k !== alkRaiseSaltKey && arr.indexOf(k) === i && enabledSalts.has(k));

  // Predicted final ions, recomputed live as overrides or any acid changes
  const finalIons = useMemo(() => {
    if (!volumeGallons || volumeGallons <= 0) return null;
    return predictFinalProfile({
      source,
      additions: effectiveSalts,
      acids: userAcids,
      volumeGallons,
    });
  }, [source, effectiveSalts, userAcids, volumeGallons]);

  // Multi-acid totals (for the bold summary line at the bottom of multi-mode)
  const acidTotals = useMemo(() => {
    if (!volumeGallons || volumeGallons <= 0) return { total_meq: 0, ppm_alk_reduced: 0 };
    return applyAcids(userAcids, volumeGallons);
  }, [userAcids, volumeGallons]);

  // Solver's recommendation translated to the primary acid's units. Same
  // total mEq as the solver's hardcoded-lactic_88 dose, just re-expressed.
  // This is what the "rec X mL" hint shows and what equality is checked
  // against for the override-styling and reset-button visibility.
  const recommendedMeq = useMemo(() => {
    if (!recommendation || !volumeGallons || volumeGallons <= 0) return 0;
    return applyAcids(recommendation.acids, volumeGallons).total_meq;
  }, [recommendation, volumeGallons]);
  const equivalentRecForPrimary =
    recommendedMeq > 0 ? recommendedMeq / acidCapacity(primaryAcidType) : 0;

  // Expected `userAcids` shape when nothing is customized: primary at
  // equivalent-rec, everything else at 0. Used to decide whether to surface
  // the "Reset to recommended" button (acids side).
  const expectedAcids = Object.fromEntries(ACID_KEYS.map((k) => [k, 0]));
  expectedAcids[primaryAcidType] = equivalentRecForPrimary;
  const saltsCustomized = Object.keys(overrides).length > 0;
  const acidsCustomized = ACID_KEYS.some(
    (k) => Math.abs((userAcids[k] ?? 0) - expectedAcids[k]) > 1e-6
  );
  const isCustomized = saltsCustomized || acidsCustomized;

  function formatGrams(g) {
    return unitMode === 'pro' ? g.toFixed(0) : g.toFixed(1);
  }

  // Order secondary acids: stable ACIDS key order, excluding the primary.
  const secondaryAcidKeys = ACID_KEYS.filter((k) => k !== primaryAcidType);

  return (
    <>
      <Card>
        <div style={tokens.cardLabel}>Mash Volume</div>
        <InputRow
          label="Volume"
          unit={volumeUnit(unitMode)}
          value={volume}
          onChange={(e) => onChangeVolume(e.target.value)}
          step={0.1}
          min={0}
        />
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Available Salts</div>
        <div style={{ fontSize: '0.8rem', color: colors.textMuted, marginBottom: '0.6rem' }}>
          Check the salts you have on hand. The solver will only use enabled salts.
        </div>
        <div style={saltGridStyle}>
          {Object.entries(SALT_CONTRIBUTIONS_PER_G_GAL).map(([key, meta]) => {
            const checked = enabledSalts.has(key);
            return (
              <label key={key} style={saltCheckStyle}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleSalt(key)}
                  style={{ marginRight: '0.4rem', accentColor: colors.accent }}
                />
                {meta.name}
              </label>
            );
          })}
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
                      <DraftInput
                        key={saltKey}
                        initialValue={effG}
                        format={formatGrams}
                        parse={(s) => { const v = parseFloat(s); return isNaN(v) || v < 0 ? null : v; }}
                        onChange={(v) => onSetOverride(saltKey, v)}
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

          <Card>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem',
              }}
            >
              <span style={tokens.cardLabel}>
                {multiAcidMode ? 'Acid Additions' : 'Acid Dose'}
              </span>
              <label style={multiToggleStyle}>
                <input
                  type="checkbox"
                  checked={multiAcidMode}
                  onChange={(e) => onToggleMultiAcid(e.target.checked)}
                  style={{ marginRight: '0.4rem', accentColor: colors.accent }}
                />
                Use multiple acids
              </label>
            </div>

            {!multiAcidMode ? (
              // v1-style single-acid layout — dropdown + single dose. Behavior
              // matches v1 exactly: changing the dropdown re-expresses the
              // solver's recommendation in the new acid's units.
              <>
                <AcidRow
                  acidKey={primaryAcidType}
                  value={userAcids[primaryAcidType] ?? 0}
                  recommended={equivalentRecForPrimary}
                  unitMode={unitMode}
                  onChangeAmount={(v) => onSetUserAcid(primaryAcidType, v)}
                  primary
                  primaryAcidType={primaryAcidType}
                  onSetPrimaryAcid={onSetPrimaryAcid}
                  reason={
                    recommendedMeq > 0
                      ? `Neutralize ${acidTotals.ppm_alk_reduced.toFixed(0)} mg/L alkalinity (${acidTotals.total_meq.toFixed(1)} mEq total)`
                      : 'No acid required by solver — adjust if desired.'
                  }
                />
              </>
            ) : (
              <>
                <div style={subsectionHeaderStyle}>Primary</div>
                <AcidRow
                  acidKey={primaryAcidType}
                  value={userAcids[primaryAcidType] ?? 0}
                  recommended={equivalentRecForPrimary}
                  unitMode={unitMode}
                  onChangeAmount={(v) => onSetUserAcid(primaryAcidType, v)}
                  primary
                  primaryAcidType={primaryAcidType}
                  onSetPrimaryAcid={onSetPrimaryAcid}
                />

                <div style={{ ...subsectionHeaderStyle, marginTop: '0.5rem' }}>
                  Add secondary acids (optional)
                </div>
                {secondaryAcidKeys.map((k) => (
                  <AcidRow
                    key={k}
                    acidKey={k}
                    value={userAcids[k] ?? 0}
                    recommended={0}
                    unitMode={unitMode}
                    onChangeAmount={(v) => onSetUserAcid(k, v)}
                  />
                ))}

                <div style={totalRowStyle}>
                  Total acid: {acidTotals.total_meq.toFixed(1)} mEq{'  '}→{'  '}
                  −{acidTotals.ppm_alk_reduced.toFixed(0)} ppm Alk
                </div>
              </>
            )}

            <p style={tokens.notice}>
              Phosphoric acid treated as monoprotic at mash pH 5.4 (pKa₁=2.15,
              pKa₂=7.20). See Troester (2009), Braukaiser.com.
            </p>
          </Card>

          {(() => {
            const meta = SALT_CONTRIBUTIONS_PER_G_GAL[alkRaiseSaltKey];
            const recG = recommendedSalts[alkRaiseSaltKey] ?? 0;
            const effG = effectiveSalts[alkRaiseSaltKey] ?? recG;
            const isOverridden = overrides[alkRaiseSaltKey] !== undefined;
            return (
              <Card>
                <div style={tokens.cardLabel}>Alkalinity Raise</div>
                <div style={{ marginBottom: '0.6rem' }}>
                  <div style={{ ...tokens.cardLabel, marginBottom: '0.4rem' }}>
                    Source (if needed)
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
                      <DraftInput
                        key={alkRaiseSaltKey}
                        initialValue={effG}
                        format={formatGrams}
                        parse={(s) => { const v = parseFloat(s); return isNaN(v) || v < 0 ? null : v; }}
                        onChange={(v) => onSetOverride(alkRaiseSaltKey, v)}
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

          {finalIons && (() => {
            const finalRA = residualAlkalinity(finalIons.Alk, finalIons.Ca, finalIons.Mg);
            const sign = (n) => (n > 0 ? '+' : '');

            const statColor = (val, tgt) => {
              const off = Math.abs(val - tgt);
              const pct = tgt !== 0 ? (off / Math.abs(tgt)) * 100 : 0;
              return pct < 20 ? '#3a8055' : pct < 50 ? '#a07835' : '#a04835';
            };
            const raColor = (() => {
              const off = Math.abs(finalRA - target.RA);
              return off < 20 ? '#3a8055' : off < 40 ? '#a07835' : '#a04835';
            })();

            return (
              <Card>
                <div style={tokens.cardLabel}>Predicted Final Profile</div>

                <div style={profileSectionLabel}>Mash Chemistry</div>
                <div style={tokens.statGrid}>
                  {[['Ca','Calcium'],['Mg','Magnesium']].map(([key, label]) => (
                    <StatBox
                      key={key}
                      value={finalIons[key].toFixed(0)}
                      label={label}
                      sublabel={`tgt ${target[key]}`}
                      valueStyle={{ fontSize: '1.6rem', color: statColor(finalIons[key], target[key]) }}
                    />
                  ))}
                  <StatBox
                    value={`${sign(finalRA)}${finalRA.toFixed(0)}`}
                    label="Residual Alk"
                    sublabel={`tgt ${sign(target.RA)}${target.RA}`}
                    valueStyle={{ fontSize: '1.6rem', color: raColor }}
                  />
                  <StatBox
                    value={finalIons.Alk.toFixed(0)}
                    label="Total Alkalinity"
                    sublabel={`tgt ${target.Alk}`}
                    valueStyle={{ fontSize: '1.6rem', color: statColor(finalIons.Alk, target.Alk) }}
                  />
                </div>

                <div style={{ ...profileSectionLabel, marginTop: '1rem' }}>Flavor</div>
                <div style={tokens.statGrid}>
                  {[['SO4','Sulfate'],['Cl','Chloride'],['Na','Sodium']].map(([key, label]) => (
                    <StatBox
                      key={key}
                      value={finalIons[key].toFixed(0)}
                      label={label}
                      sublabel={`tgt ${target[key]}`}
                      valueStyle={{ fontSize: '1.6rem', color: statColor(finalIons[key], target[key]) }}
                    />
                  ))}
                  {(() => {
                    const ratio = sulfateChlorideRatio(finalIons.SO4, finalIons.Cl);
                    return (
                      <StatBox
                        value={ratio.toFixed(2)}
                        label="SO₄:Cl Ratio"
                        sublabel={`tgt ${style.so4_cl_target.toFixed(2)}`}
                        valueStyle={{
                          fontSize: '1.6rem',
                          color: statColor(ratio, style.so4_cl_target),
                        }}
                      />
                    );
                  })()}
                </div>

                <p style={tokens.notice}>
                  RA per Kolbach (1953): Alk − (Ca/1.4 + Mg/1.7), all as CaCO₃.
                </p>
              </Card>
            );
          })()}
        </>
      )}
    </>
  );
}


// Single row for one acid. Used by both the v1-style single-acid card (primary
// row with a dropdown and an optional `reason` text underneath, v1-shaped
// hint "rec X mL") and the multi-acid card (primary plus secondary rows,
// mEq-flavored hint "X.X mEq · rec Y.Y").
// Acidulated malt rows convert lb (Pro) or oz (Home) ↔ grams at the display
// boundary; the underlying state remains in grams.
function AcidRow({
  acidKey,
  value,
  recommended,
  unitMode,
  onChangeAmount,
  primary = false,
  primaryAcidType,
  onSetPrimaryAcid,
  reason,
}) {
  const acid = ACIDS[acidKey];
  const isSolid = !!acid.is_solid;
  const malt = isSolid ? acidMaltUnits(unitMode) : null;

  // Display format / parse: integer mL for liquid acids; 0.01 lb in Pro,
  // 0.01 oz in Home for acidulated malt.
  function format(v) {
    if (isSolid) return malt.toDisplay(v).toFixed(2);
    return v.toFixed(0);
  }
  function parse(raw) {
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0) return null;
    return isSolid ? malt.fromDisplay(v) : v;
  }
  function parseOrZero(raw) {
    const r = parse(raw);
    return r === null ? 0 : r;
  }

  const unit = isSolid ? malt.unit : 'mL';
  const meq = acidContribution(acidKey, value);
  const isOverridden = Math.abs(value - recommended) > 1e-6;

  // v1-style hint: just `rec X.X <unit>`. Multi-style hint: also show the
  // current row's mEq contribution. v1 mode is signalled by `reason` being
  // passed (single-acid card sets it; multi card does not).
  const singleAcidMode = reason !== undefined;
  const hintText = singleAcidMode
    ? `rec ${format(recommended)} ${unit}`
    : `${meq.toFixed(1)} mEq · rec ${acidContribution(acidKey, recommended).toFixed(1)}`;

  return (
    <div style={editableRowStyle}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {primary ? (
          <select
            value={primaryAcidType}
            onChange={(e) => onSetPrimaryAcid(e.target.value)}
            style={{ ...tokens.select, marginBottom: '0.2rem' }}
          >
            {ACID_KEYS.map((k) => (
              <option key={k} value={k}>{ACIDS[k].name}</option>
            ))}
          </select>
        ) : (
          <div style={recipeNameStyle}>{acid.name}</div>
        )}
        {reason && <div style={recipeReasonStyle}>{reason}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
          <DraftInput
            key={acidKey}
            initialValue={value}
            format={format}
            parse={(s) => {
              const v = parseOrZero(s);
              return v < 0 ? null : v;
            }}
            onChange={onChangeAmount}
            style={{
              ...tokens.numberInput,
              width: '90px',
              background: isOverridden ? colors.inputBgOverride : colors.inputBg,
            }}
          />
          <span style={unitLabelStyle}>{unit}</span>
        </div>
        <div style={hintStyle}>{hintText}</div>
      </div>
    </div>
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

const profileSectionLabel = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.textMuted,
  marginBottom: '0.5rem',
};

const subsectionHeaderStyle = {
  fontSize: '0.72rem',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: colors.textMuted,
  marginTop: '0.4rem',
  marginBottom: '0.2rem',
};

const totalRowStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  color: colors.textPrimary,
  padding: '0.75rem 0 0.25rem',
  textAlign: 'right',
};

const saltGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
  gap: '0.5rem 1rem',
};

const saltCheckStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.82rem',
  color: colors.textPrimary,
  cursor: 'pointer',
};

const multiToggleStyle = {
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.78rem',
  color: colors.textSecondary,
  cursor: 'pointer',
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
