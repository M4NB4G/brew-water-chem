// "Water In" tab — source water ion profile entry.
// Inputs match the Persyn Chemical Engineering test report row order:
//   Ca, Mg, Na, SO4, Cl, Total Alkalinity (as CaCO3), pH

import { useMemo } from 'react';
import Card from '../shared/Card.jsx';
import StatBox from '../shared/StatBox.jsx';
import InputRow from '../shared/InputRow.jsx';
import { colors, radii, tokens } from '../shared/styles.js';
import {
  residualAlkalinity,
  sulfateChlorideRatio,
  ratioCharacter,
} from '../../chemistry/ra.js';

const REPORT_ROWS = [
  ['Ca', 'Calcium Ion', 'ppm'],
  ['Mg', 'Magnesium Ion', 'ppm'],
  ['Na', 'Sodium Ion', 'ppm'],
  ['SO4', 'Sulfate Ion (SO₄²⁻)', 'ppm'],
  ['Cl', 'Chloride Ion', 'ppm'],
  ['Alkalinity', 'Total Alkalinity', 'ppm as CaCO₃'],
  ['pH', 'pH', 'SU'],
];

// Bristlecone Brewing Co. sample 20251022-1, HLT — Persyn Chemical Engineering
// test report. Used for the "Load Example" button.
const DEMO_SOURCE = {
  Ca: 8,
  Mg: 2,
  Na: 22,
  SO4: 0,
  Cl: 20,
  Alkalinity: 50,
  pH: 7.2,
};

export default function WaterInTab({ source, onChangeSource }) {
  const sourceRA = useMemo(
    () => residualAlkalinity(source.Alkalinity, source.Ca, source.Mg),
    [source]
  );
  const sourceRatio = useMemo(
    () => sulfateChlorideRatio(source.SO4, source.Cl),
    [source]
  );

  function setField(field, val) {
    const num = parseFloat(val);
    onChangeSource({ ...source, [field]: isNaN(num) ? 0 : num });
  }

  return (
    <>
      <div
        style={{
          background: colors.noticeBg,
          border: `1px solid ${colors.inputBorder}`,
          borderRadius: '10px',
          padding: '0.75rem 0.9rem',
          fontSize: '0.82rem',
          color: colors.textNotice,
          lineHeight: 1.5,
          marginBottom: '1rem',
        }}
      >
        <strong>Enter values directly from your water test report.</strong>{' '}
        Inputs match the bottom rows of the Persyn Chemical Engineering test
        results table (ion concentrations, not Hardness as CaCO₃). Total
        Alkalinity is the only value reported as CaCO₃.
      </div>

      <Card>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.4rem',
          }}
        >
          <span style={tokens.cardLabel}>Source Water Test Results</span>
          <button
            onClick={() => onChangeSource({ ...source, ...DEMO_SOURCE })}
            style={demoButtonStyle}
            title="Load Bristlecone Brewing 10/22/2025 example values"
          >
            Load Example
          </button>
        </div>
        <div>
          {REPORT_ROWS.map(([key, label, unit]) => (
            <InputRow
              key={key}
              label={label}
              unit={unit}
              value={source[key]}
              onChange={(e) => setField(key, e.target.value)}
              step={0.1}
            />
          ))}
        </div>
        <p style={tokens.notice}>
          Hardness values from the test report (Total Hardness, Calcium Hardness,
          Magnesium Hardness) are not required — the calculator uses ion
          concentrations directly.
        </p>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Current Status</div>
        <div style={tokens.cardTitle}>Source Water</div>
        <div style={tokens.accentBar} />
        <div style={{ ...tokens.statGrid, marginTop: '0.75rem' }}>
          <StatBox value={sourceRA.toFixed(0)} label="Residual Alk (CaCO₃)" />
          <StatBox
            value={isFinite(sourceRatio) ? sourceRatio.toFixed(2) : '∞'}
            label="SO₄ : Cl ratio"
          />
          <StatBox value={source.Alkalinity.toFixed(0)} label="Alkalinity" />
          <StatBox value={source.pH.toFixed(1)} label="pH" />
        </div>
        <p style={tokens.notice}>
          Character: {ratioCharacter(sourceRatio)}. RA per Kolbach (1953):
          TotalAlk − (Ca/1.4 + Mg/1.7).
        </p>
      </Card>
    </>
  );
}

const demoButtonStyle = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  color: colors.textSecondary,
  padding: '0.5rem 0.85rem',
  borderRadius: radii.btn,
  fontSize: '0.78rem',
  fontWeight: 600,
  letterSpacing: '0.04em',
  cursor: 'pointer',
  fontFamily: 'inherit',
};
