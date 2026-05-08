// White card container with 14px radius and the prototype's soft drop shadow.
// Matches the prototype's `styles.card` padding (1.25rem 1.1rem) so the visual
// rhythm carries over from the original single-file version.

import { colors, radii, shadows } from './styles.js';

export default function Card({ children, style, className }) {
  const base = {
    background: colors.cardBg,
    borderRadius: radii.card,
    padding: '1.25rem 1.1rem',
    marginBottom: '1rem',
    boxShadow: shadows.card,
  };
  return (
    <div className={className} style={{ ...base, ...style }}>
      {children}
    </div>
  );
}
