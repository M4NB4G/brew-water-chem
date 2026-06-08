// App header: product-first layout.
//
// Stack order (top → bottom):
//   1. Brand row — flask icon + "BREW WATER CHEM" wordmark + Persyn kicker
//   2. 3px accent gradient strip
//   3. Pro/Home toggle row (right-aligned)

import flaskSrc from '../assets/bwc-flask-header.svg';
import { colors, radii, shadows } from './shared/styles.js';

const SS3 = "'Source Sans 3', system-ui, sans-serif";

export default function Header({ unitMode, onToggleUnit }) {
  return (
    <header style={{ background: colors.cardBg, boxShadow: shadows.header }}>

      {/* Brand row */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.85rem 1.25rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>

          {/* Flask icon */}
          <img
            src={flaskSrc}
            alt=""
            aria-hidden="true"
            style={{ height: 'clamp(40px, 5vw, 48px)', width: 'auto', flexShrink: 0 }}
          />

          {/* Text lockup */}
          <div>
            {/* Wordmark */}
            <div
              style={{
                fontFamily: SS3,
                fontSize: 'clamp(1.2rem, 5vw, 1.4rem)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                lineHeight: 1.1,
              }}
            >
              <span style={{ fontWeight: 400, color: '#1f3147' }}>Brew Water </span>
              <span style={{ fontWeight: 700, color: '#c8841f' }}>Chem</span>
            </div>

            {/* Kicker */}
            <div
              style={{
                fontFamily: SS3,
                fontWeight: 500,
                fontSize: '0.58rem',
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color: '#7c8fa6',
                marginTop: '0.3rem',
                whiteSpace: 'nowrap',
              }}
            >
              Persyn Chemical Engineering
            </div>
          </div>

        </div>
      </div>

      {/* Accent gradient bar */}
      <div style={{ height: '3px', background: colors.accent, marginTop: '1rem' }} />

      {/* Pro/Home toggle — right-aligned */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0.55rem 1.25rem 0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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

    </header>
  );
}
