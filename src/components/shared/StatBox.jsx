// Centered stat tile — matches the prototype's `statBox`/`statValue`/`statLabel`
// layout: large value on top, smaller label beneath, optional sublabel
// (e.g. "tgt 100") below the label.

import { colors, radii } from './styles.js';

export default function StatBox({ value, label, sublabel, valueStyle, style }) {
  const base = {
    background: colors.statBoxBg,
    borderRadius: radii.statBox,
    padding: '1.1rem 0.9rem',
    textAlign: 'center',
  };
  const baseValue = {
    fontSize: '2.4rem',
    fontWeight: 700,
    color: colors.textPrimary,
    lineHeight: 1,
    letterSpacing: '-0.02em',
  };
  return (
    <div style={{ ...base, ...style }}>
      <div style={{ ...baseValue, ...valueStyle }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: colors.textSecondary, marginTop: '0.4rem', fontWeight: 500 }}>
        {label}
        {sublabel && (
          <>
            <br />
            <span style={{ fontSize: '0.7rem', color: colors.textMuted }}>{sublabel}</span>
          </>
        )}
      </div>
    </div>
  );
}
