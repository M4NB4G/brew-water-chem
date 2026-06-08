// Root application component.
// Owns top-level state: active tab, unit mode, source water, style selection,
// batch volume, acid type, alkalinity-raise source, and recipe overrides.

import { useState, useMemo } from 'react';
import Header from './components/Header.jsx';
import WaterInTab from './components/tabs/WaterInTab.jsx';
import StyleTab from './components/tabs/StyleTab.jsx';
import RecipeTab from './components/tabs/RecipeTab.jsx';
import NotesTab from './components/tabs/NotesTab.jsx';
import { findStyle } from './data/styles.js';
import { volumeToGallons } from './chemistry/units.js';
import { colors } from './components/shared/styles.js';
import { SALT_CONTRIBUTIONS_PER_G_GAL } from './chemistry/salts.js';

const DEFAULT_SOURCE = {
  Ca: '', Mg: '', Na: '', SO4: '', Cl: '', Alkalinity: '', pH: '',
};

const TABS = [
  ['water', 'Water In'],
  ['style', 'Style'],
  ['recipe', 'Recipe'],
  ['notes', 'Notes'],
];

export default function App() {
  const [tab, setTab] = useState('water');
  const [unitMode, setUnitMode] = useState('pro');
  const [source, setSource] = useState(DEFAULT_SOURCE);
  const [styleId, setStyleId] = useState('hoppy_ale');
  // Volume is held in the user's display unit; converted to gallons for math.
  const [volume, setVolume] = useState(10); // default 10 bbl (Pro) / 5 gal (Home)
  const [acidKey, setAcidKey] = useState('lactic_88');
  const [raiseAlkSource, setRaiseAlkSource] = useState('baking_soda');
  // Recipe overrides — { [saltKey]: grams, _acidDose: number }
  const [overrides, setOverrides] = useState({});
  // Which salts the solver is allowed to use (user has them on hand)
  const [enabledSalts, setEnabledSalts] = useState(
    () => new Set(Object.keys(SALT_CONTRIBUTIONS_PER_G_GAL))
  );

  function handleToggleSalt(key) {
    setEnabledSalts((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
    setOverrides({});
  }

  const style = findStyle(styleId);
  const target = useMemo(() => ({ ...style.profile }), [style]);

  const volumeGallons = useMemo(
    () => volumeToGallons(parseFloat(volume) || 0, unitMode),
    [volume, unitMode]
  );

  // When unit mode flips, reset volume to the mode's natural default rather
  // than converting — Pro works in bbl (default 10), Home in gal (default 5).
  function handleUnitToggle(nextMode) {
    if (nextMode === unitMode) return;
    setVolume(nextMode === 'home' ? 5 : 10);
    setUnitMode(nextMode);
    setOverrides({});
  }

  // Solver-input changes invalidate user overrides.
  function handleStyleChange(id) {
    setStyleId(id);
    setOverrides({});
  }
  function handleVolumeChange(v) {
    setVolume(v);
    setOverrides({});
  }
  function handleAcidChange(k) {
    setAcidKey(k);
    setOverrides({});
  }
  function handleRaiseAlkChange(k) {
    setRaiseAlkSource(k);
    setOverrides({});
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
            acidKey={acidKey}
            raiseAlkSource={raiseAlkSource}
            overrides={overrides}
            enabledSalts={enabledSalts}
            onChangeVolume={handleVolumeChange}
            onChangeAcid={handleAcidChange}
            onChangeRaiseAlk={handleRaiseAlkChange}
            onSetOverride={(key, value) =>
              setOverrides((o) => ({ ...o, [key]: value }))
            }
            onResetOverrides={() => setOverrides({})}
            onToggleSalt={handleToggleSalt}
          />
        )}
        {tab === 'notes' && <NotesTab />}
      </main>

      <footer
        style={{
          padding: '1.5rem 1.25rem',
          maxWidth: '900px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
          <img
            src="/persyn-logo.jpg"
            alt="Persyn Chemical Engineering and Consulting, PLLC"
            style={{ maxWidth: '120px', width: '100%', objectFit: 'contain', flexShrink: 0 }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '0.72rem',
              color: '#9faec0',
              lineHeight: 1.6,
            }}
          >
            Brew Water Chem v1.2 · Persyn Chemical Engineering and Consulting, PLLC
            <br />
            Calculations cite primary sources (Palmer-Kaminski 2013, Kolbach 1953,
            Troester 2009). Validate against a reference batch before production use.
          </p>
        </div>
      </footer>
    </div>
  );
}
