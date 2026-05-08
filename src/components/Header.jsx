// App header: Persyn Chemical Engineering brand block — stacked vertical layout.
//
// Stack order (top → bottom):
//   1. Persyn logo image (centered, max-height 80px)
//   2. 1px #bcc8d6 divider rule, 80% width centered
//   3. "BREW WATER CHEM" sub-label (centered) + Pro/Home toggle (right-aligned)
//      on the same row — 3-column flex keeps the label truly centered
//   4. 3px accent gradient strip at the very bottom

import { colors, radii, shadows, typography } from './shared/styles.js';

export default function Header({ unitMode, onToggleUnit }) {
  return (
    <header style={{ background: colors.cardBg, boxShadow: shadows.header }}>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.85rem 1.25rem 0.75rem' }}>

        {/* Logo — centered */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '0.15rem' }}>
          <img
            src="/persyn-logo.jpg"
            alt="Persyn Chemical Engineering and Consulting, PLLC"
            style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Horizontal divider */}
        <div
          style={{
            width: '80%',
            margin: '0.6rem auto',
            height: '1px',
            background: '#bcc8d6',
          }}
        />

        {/* Sub-label + toggle: left spacer | centered label | right toggle */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ flex: 1 }} />

          <span
            style={{
              ...typography.brandLabel,
              fontSize: '0.75rem',
              color: colors.textMuted,
            }}
          >
            Brew Water Chem
          </span>

          <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <div
              style={{
                display: 'inline-flex',
                background: colors.togglePillBg,
                borderRadius: radii.pill,
                padding: '3px',
                gap: '2px',
              }}
            >
              {[
                ['pro', 'Pro'],
                ['home', 'Home'],
              ].map(([id, label]) => {
                const active = unitMode === id;
                return (
                  <button
                    key={id}
                    onClick={() => onToggleUnit(id)}
                    style={{
                      padding: '0.35rem 0.95rem',
                      borderRadius: radii.pill,
                      border: 'none',
                      background: active ? colors.toggleActiveBg : 'transparent',
                      color: active ? colors.toggleActiveText : colors.textSecondary,
                      fontWeight: 600,
                      fontSize: '0.82rem',
                      letterSpacing: '0.05em',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </div>
      <div style={{ height: '3px', background: colors.accent }} />
    </header>
  );
}
