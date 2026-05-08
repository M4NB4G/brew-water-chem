// "Style" tab — BJCP 2021 style family selector and target profile display.

import Card from '../shared/Card.jsx';
import { colors, tokens } from '../shared/styles.js';
import { STYLE_FAMILIES } from '../../data/styles.js';

const TARGET_ROWS = [
  ['Ca', 'Calcium'],
  ['Mg', 'Magnesium'],
  ['Na', 'Sodium'],
  ['SO4', 'Sulfate'],
  ['Cl', 'Chloride'],
  ['Alk', 'Alkalinity (as CaCO₃)'],
];

const rowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.6rem 0',
  borderBottom: `1px solid ${colors.rowDivider}`,
};

const labelStyle = {
  fontSize: '0.92rem',
  color: colors.textPrimary,
  fontWeight: 500,
};

const valueStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  color: colors.textPrimary,
  fontVariantNumeric: 'tabular-nums',
};

export default function StyleTab({ styleId, style, target, onSelectStyle }) {
  return (
    <>
      <Card>
        <div style={tokens.cardLabel}>BJCP 2021 Style Family</div>
        <select
          value={styleId}
          onChange={(e) => onSelectStyle(e.target.value)}
          style={{ ...tokens.select, marginTop: '0.4rem' }}
        >
          {STYLE_FAMILIES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <div style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: colors.textSecondary, lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: colors.textPrimary }}>{style.bjcp}</div>
          <div style={{ marginTop: '0.3rem' }}>{style.description}</div>
          <div style={{ marginTop: '0.3rem', fontSize: '0.75rem', color: colors.textMuted }}>
            Ref: {style.page_ref}
          </div>
        </div>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Target Water Profile (mg/L)</div>
        <div>
          {TARGET_ROWS.map(([key, label]) => (
            <div key={key} style={rowStyle}>
              <span style={labelStyle}>{label}</span>
              <span style={valueStyle}>{target[key]} mg/L</span>
            </div>
          ))}
          <div style={rowStyle}>
            <span style={labelStyle}>
              Residual Alkalinity
              <span style={{ fontSize: '0.78rem', color: colors.textMuted, marginLeft: '0.4rem' }}>
                (target)
              </span>
            </span>
            <span style={valueStyle}>
              {target.RA > 0 ? '+' : ''}
              {target.RA} mg/L
            </span>
          </div>
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <span style={labelStyle}>Target SO₄:Cl ratio</span>
            <span style={valueStyle}>{style.so4_cl_target.toFixed(2)}</span>
          </div>
        </div>
        <p style={tokens.notice}>
          Targets from Palmer & Kaminski (2013). RA derived from beer color per
          Kolbach (1953) — see p. 121, Fig. 5.1. Tweak based on recipe specifics.
        </p>
      </Card>
    </>
  );
}
