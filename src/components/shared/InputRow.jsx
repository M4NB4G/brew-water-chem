// Labelled numeric input row — matches the prototype's `inputRow`/`input`
// pattern: label (with optional unit annotation) on the left, right-aligned
// number input on the right, dividing line beneath.
//
// Use this for any number entry inside a card. The optional `hint` prop
// renders small grey text under the input — used by the Recipe tab to show
// the solver's recommended value beneath each editable salt amount.

import { colors, tokens } from './styles.js';

export default function InputRow({
  label,
  unit,
  value,
  onChange,
  step = 0.1,
  min,
  max,
  readOnly = false,
  highlight = false, // tints the input bg when the user has overridden it
  hint,
  rightAdornment, // optional element rendered to the right of the input (e.g. unit picker)
}) {
  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '0.6rem 0',
    borderBottom: `1px solid ${colors.rowDivider}`,
    gap: '0.75rem',
  };

  const inputStyle = {
    ...tokens.numberInput,
    background: readOnly
      ? colors.inputBgReadOnly
      : highlight
        ? colors.inputBgOverride
        : colors.inputBg,
  };

  return (
    <div style={rowStyle}>
      <div style={{ paddingTop: '0.45rem' }}>
        <span style={{ fontSize: '0.92rem', color: colors.textPrimary, fontWeight: 500 }}>
          {label}
        </span>
        {unit && (
          <span style={{ fontSize: '0.78rem', color: colors.textMuted, marginLeft: '0.4rem' }}>
            {unit}
          </span>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
          <input
            type="number"
            step={step}
            min={min}
            max={max}
            value={value}
            onChange={onChange}
            readOnly={readOnly}
            style={inputStyle}
          />
          {rightAdornment}
        </div>
        {hint && (
          <div
            style={{
              fontSize: '0.72rem',
              color: colors.textMuted,
              marginTop: '0.2rem',
              fontStyle: 'italic',
            }}
          >
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
