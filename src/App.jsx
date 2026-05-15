// Root application component.
// Owns top-level state: active tab, unit mode, source water, style selection,
// batch volume, alkalinity-raise source, recipe overrides (salts), multi-acid
// mode toggle, and the user's acid state (one amount per acid plus a primary
// dropdown selection — only the primary is editable in single-acid mode).

import { useState, useMemo, useEffect } from 'react';
import Header from './components/Header.jsx';
import WaterInTab from './components/tabs/WaterInTab.jsx';
import StyleTab from './components/tabs/StyleTab.jsx';
import RecipeTab from './components/tabs/RecipeTab.jsx';
import NotesTab from './components/tabs/NotesTab.jsx';
import { findStyle } from './data/styles.js';
import { volumeToGallons } from './chemistry/units.js';
import { colors } from './components/shared/styles.js';
import { SALT_CONTRIBUTIONS_PER_G_GAL } from './chemistry/salts.js';
import { ACIDS, acidCapacity, applyAcids } from './chemistry/acids.js';
import { solveAdditions } from './chemistry/solver.js';

const DEFAULT_SOURCE = {
  Ca: '', Mg: '', Na: '', SO4: '', Cl: '', Alkalinity: '', pH: '',
};

const TABS = [
  ['water', 'Water In'],
  ['style', 'Style'],
  ['recipe', 'Recipe'],
  ['notes', 'Notes'],
];

const ACID_KEYS = Object.keys(ACIDS);
const ZERO_ACIDS = Object.fromEntries(ACID_KEYS.map((k) => [k, 0]));

// Total mEq the solver recommends (always expressed via lactic_88 in v1.1).
// Used to translate the solver's dose into "equivalent rec" of any other acid.
function recommendedMeq(recommendation, volumeGallons) {
  if (!recommendation || !volumeGallons || volumeGallons <= 0) return 0;
  return applyAcids(recommendation.acids, volumeGallons).total_meq;
}

// What `userAcids` should look like for a given primary, with no overrides:
// only the primary holds the equivalent-rec amount, all others are 0.
// Used on solver-input changes, on dropdown changes in single mode, and on
// "Reset to recommended" — in both single and multi modes.
function expectedAcids(recommendation, volumeGallons, primary) {
  const meq = recommendedMeq(recommendation, volumeGallons);
  const equiv = meq > 0 ? meq / acidCapacity(primary) : 0;
  return { ...ZERO_ACIDS, [primary]: equiv };
}

export default function App() {
  const [tab, setTab] = useState('water');
  const [unitMode, setUnitMode] = useState('pro');
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [styleId, setStyleId] = useState('hoppy_ale');
  // Volume is held in the user's display unit; converted to gallons for math.
  const [volume, setVolume] = useState(10); // default 10 bbl (Pro) / 5 gal (Home)
  const [raiseAlkSource, setRaiseAlkSource] = useState('baking_soda');
  // Recipe salt overrides — sparse { [saltKey]: grams }
  const [overrides, setOverrides] = useState({});
  // Multi-acid mode is opt-in. When off, only the primary acid is in play —
  // the card behaves exactly like v1 (dropdown + single dose). When on, the
  // full multi-acid card with secondary rows is shown.
  const [multiAcidMode, setMultiAcidMode] = useState(false);
  // Acid recipe state — full 5-key map of amounts (mL liquid, g malt).
  // In single-acid mode only userAcids[primaryAcidType] is in use; all others
  // are kept at 0. In multi mode the secondaries are also editable.
  const [userAcids, setUserAcids] = useState(ZERO_ACIDS);
  const [primaryAcidType, setPrimaryAcidType] = useState('lactic_88');
  // Which salts the solver is allowed to use (user has them on hand)
  const [enabledSalts, setEnabledSalts] = useState(
    () => new Set(Object.keys(SALT_CONTRIBUTIONS_PER_G_GAL))
  );

  const style = findStyle(styleId);
  const target = useMemo(() => ({ ...style.profile }), [style]);

  const volumeGallons = useMemo(
    () => volumeToGallons(parseFloat(volume) || 0, unitMode),
    [volume, unitMode]
  );

  // Solver result is owned here so we can re-sync userAcids/primaryAcidType to
  // the new recommendation in lockstep with the salt overrides reset.
  const recommendation = useMemo(() => {
    if (!volumeGallons || volumeGallons <= 0) return null;
    return solveAdditions({
      source,
      target,
      volumeGallons,
      raiseAlkSource,
      enabledSalts,
    });
  }, [source, target, volumeGallons, raiseAlkSource, enabledSalts]);

  const recommendedSalts = useMemo(() => {
    const out = {};
    if (!recommendation) return out;
    for (const a of recommendation.additions) out[a.salt] = (out[a.salt] || 0) + a.grams;
    return out;
  }, [recommendation]);

  // When solver inputs change, userAcids resyncs to the new equivalent-rec
  // for whichever primary the user has selected. The dropdown selection
  // (primaryAcidType) is preserved across solver-input changes, matching v1.
  // Intentionally NOT depending on `primaryAcidType` here: dropdown changes
  // are handled in onSetPrimaryAcid (single-mode swap) or are a no-op for
  // userAcids (multi-mode just re-labels which key is "primary").
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!recommendation) return;
    setUserAcids(expectedAcids(recommendation, volumeGallons, primaryAcidType));
  }, [recommendation, volumeGallons]);

  function handleToggleSalt(key) {
    setEnabledSalts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setOverrides({});
  }

  // When unit mode flips, reset volume to the mode's natural default rather
  // than converting — Pro works in bbl (default 10), Home in gal (default 5).
  function handleUnitToggle(nextMode) {
    if (nextMode === unitMode) return;
    setVolume(nextMode === 'home' ? 5 : 10);
    setUnitMode(nextMode);
    setOverrides({});
  }

  // Solver-input changes invalidate user overrides (acids re-sync via effect).
  function handleStyleChange(id) {
    setStyleId(id);
    setOverrides({});
  }
  function handleVolumeChange(v) {
    setVolume(v);
    setOverrides({});
  }
  function handleRaiseAlkChange(k) {
    setRaiseAlkSource(k);
    setOverrides({});
  }

  function handleResetOverrides() {
    setOverrides({});
    setUserAcids(expectedAcids(recommendation, volumeGallons, primaryAcidType));
  }

  function handleSetUserAcid(acidKey, amount) {
    setUserAcids((prev) => ({ ...prev, [acidKey]: amount }));
  }

  // Dropdown change. In single-acid mode the dropdown effectively reselects
  // which acid is the dose; the amount snaps to the equivalent-rec for the
  // new acid (same total mEq the solver wants, expressed in new units) and
  // the previous acid drops to 0. Mirrors v1 where changing the dropdown
  // re-ran the solver in the new acid's units.
  // In multi-acid mode, dropdown is purely a UI swap — secondary amounts are
  // preserved (the user explicitly set them).
  function handleSetPrimaryAcid(newKey) {
    if (!multiAcidMode) {
      setUserAcids(expectedAcids(recommendation, volumeGallons, newKey));
    }
    setPrimaryAcidType(newKey);
  }

  // Multi-acid toggle. Going OFF zeros out the non-primary acids so the
  // chemistry matches what the (single-acid) UI shows — no hidden secondaries
  // silently affecting the predicted profile.
  function handleToggleMultiAcid(checked) {
    if (!checked) {
      setUserAcids((prev) => ({
        ...ZERO_ACIDS,
        [primaryAcidType]: prev[primaryAcidType] ?? 0,
      }));
    }
    setMultiAcidMode(checked);
  }

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <Header unitMode={unitMode} onToggleUnit={handleUnitToggle} />

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '1.5rem',
          padding: '0.85rem 1.25rem',
          borderBottom: `1px solid ${colors.border}`,
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        {TABS.map(([id, label]) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                fontFamily: 'inherit',
                fontSize: '1rem',
                fontWeight: active ? 700 : 400,
                color: active ? colors.textPrimary : colors.textMuted,
                background: 'transparent',
                border: 'none',
                padding: '0.25rem 0',
                borderBottom: active ? `2px solid ${colors.textPrimary}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <main style={{ padding: '1rem 1.25rem', maxWidth: '900px', margin: '0 auto' }}>
        {tab === 'water' && <WaterInTab source={source} onChangeSource={setSource} />}
        {tab === 'style' && (
          <StyleTab styleId={styleId} style={style} target={target} onSelectStyle={handleStyleChange} />
        )}
        {tab === 'recipe' && (
          <RecipeTab
            source={source}
            target={target}
            style={style}
            volume={volume}
            unitMode={unitMode}
            volumeGallons={volumeGallons}
            raiseAlkSource={raiseAlkSource}
            overrides={overrides}
            enabledSalts={enabledSalts}
            recommendation={recommendation}
            recommendedSalts={recommendedSalts}
            userAcids={userAcids}
            primaryAcidType={primaryAcidType}
            multiAcidMode={multiAcidMode}
            onChangeVolume={handleVolumeChange}
            onChangeRaiseAlk={handleRaiseAlkChange}
            onSetOverride={(key, value) =>
              setOverrides((o) => ({ ...o, [key]: value }))
            }
            onResetOverrides={handleResetOverrides}
            onToggleSalt={handleToggleSalt}
            onSetUserAcid={handleSetUserAcid}
            onSetPrimaryAcid={handleSetPrimaryAcid}
            onToggleMultiAcid={handleToggleMultiAcid}
          />
        )}
        {tab === 'notes' && <NotesTab />}
      </main>

      <footer
        style={{
          padding: '1.5rem 1.25rem',
          fontSize: '0.72rem',
          color: '#9faec0',
          lineHeight: 1.6,
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        Brew Water Chem v1 · Persyn Chemical Engineering and Consulting, PLLC
        <br />
        Calculations cite primary sources (Palmer-Kaminski 2013, Kolbach 1953,
        Troester 2009). Validate against a reference batch before production use.
      </footer>
    </div>
  );
}
