// Shared design tokens for use in inline styles.
// All colors, radii, shadows, typography, and recurring component styles
// live here so every component reads from one source of truth.

export const colors = {
  // Backgrounds
  pageBg: 'linear-gradient(180deg, #f5f7fa 0%, #eaf0f6 100%)',
  cardBg: '#ffffff',
  statBoxBg: 'linear-gradient(135deg, #e8eef6 0%, #dfe9f2 100%)',
  inputBg: '#fafbfd',
  inputBgReadOnly: '#f3f6fa',
  inputBgOverride: '#fff8ec',
  noticeBg: '#f0f5fa',

  // Brand accent strip
  accent: 'linear-gradient(90deg, #e8a89c 0%, #b8c2d4 50%, #8eaad0 100%)',

  // Text
  textPrimary: '#1f3147',
  textSecondary: '#5a7390',
  textMuted: '#7c8fa6',
  textNotice: '#3a5680',
  textWarn: '#a04835',

  // Borders
  border: '#dde6ef',
  rowDivider: '#eef2f7',
  inputBorder: '#d8e0e9',
  inputBorderFocus: '#8eaad0',

  // Toggle / button accents
  togglePillBg: '#e8eef6',
  toggleActiveBg: '#1f3147',
  toggleActiveText: '#ffffff',
};

export const radii = {
  card: '14px',
  statBox: '12px',
  input: '8px',
  btn: '8px',
  pill: '999px',
};

export const shadows = {
  card: '0 1px 2px rgba(31, 49, 71, 0.04), 0 4px 12px rgba(31, 49, 71, 0.04)',
  header: '0 1px 8px rgba(30, 60, 100, 0.06)',
};

export const typography = {
  // Inline brand label (e.g. "BREW WATER CHEM" sub-label in header)
  brandLabel: {
    fontFamily: "'Source Sans 3', system-ui, sans-serif",
    fontWeight: 600,
    letterSpacing: '0.32em',
    textTransform: 'uppercase',
  },
};

// Recurring composite styles. Spread these into inline style objects so
// callers can layer overrides on top.
export const tokens = {
  // Small uppercase label that sits above each card's content
  cardLabel: {
    fontSize: '0.72rem',
    letterSpacing: '0.22em',
    textTransform: 'uppercase',
    color: colors.textSecondary,
    fontWeight: 600,
    display: 'block',
    marginBottom: '0.6rem',
  },
  // Large card title (e.g. style name on the Recipe tab)
  cardTitle: {
    fontSize: '1.55rem',
    fontWeight: 700,
    color: colors.textPrimary,
    marginBottom: '0.85rem',
  },
  // Accent gradient bar that sits under the card title
  accentBar: {
    height: '14px',
    borderRadius: '7px',
    background: colors.accent,
    marginBottom: '0.5rem',
  },
  // Italic grey notice/footnote line at the bottom of a card
  notice: {
    fontSize: '0.8rem',
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: '0.5rem',
    lineHeight: 1.5,
  },
  // Compact number input (right-aligned)
  numberInput: {
    width: '90px',
    padding: '0.45rem 0.6rem',
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: radii.input,
    fontSize: '0.95rem',
    textAlign: 'right',
    fontFamily: 'inherit',
    color: colors.textPrimary,
    background: colors.inputBg,
  },
  // Full-width select (style/acid dropdowns)
  select: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    border: `1px solid ${colors.inputBorder}`,
    borderRadius: radii.input,
    fontSize: '0.95rem',
    color: colors.textPrimary,
    background: colors.inputBg,
    fontFamily: 'inherit',
  },
  // Stat-tile grid (used inside cards that show a 2-column tile grid)
  statGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '0.75rem',
    marginTop: '0.4rem',
  },
};
