// Print-only batch sheet component.
// Hidden on screen via .print-sheet CSS class; rendered to paper via window.print().
// All calculations are derived from props — no chemistry logic lives here.

import { useMemo } from 'react';
import { ACIDS, acidContribution, applyAcids } from '../../chemistry/acids.js';
import { SALT_CONTRIBUTIONS_PER_G_GAL } from '../../chemistry/salts.js';
import { residualAlkalinity, sulfateChlorideRatio } from '../../chemistry/ra.js';
import { volumeUnit, acidMaltUnits } from '../../chemistry/units.js';

const NAVY  = '#1f3147';
const GRAY  = '#9faec0';
const WARN  = '#8b2500';
const ROW_ALT = '#f3f6fa';
const BORDER  = '#c8d4e0';
const HDR_BG  = '#e4ecf5';

export default function BatchSheet({
  source,
  target,
  style,
  volume,
  unitMode,
  effectiveSalts,
  userAcids,
  primaryAcidType,
  finalIons,
  volumeGallons,
}) {
  // Source water derived values (inputs may be empty strings)
  const srcCa  = parseFloat(source.Ca)          || 0;
  const srcMg  = parseFloat(source.Mg)          || 0;
  const srcAlk = parseFloat(source.Alkalinity)  || 0;
  const srcSO4 = parseFloat(source.SO4)         || 0;
  const srcCl  = parseFloat(source.Cl)          || 0;

  const sourceRA    = residualAlkalinity(srcAlk, srcCa, srcMg);
  const sourceRatio = sulfateChlorideRatio(srcSO4, srcCl);

  const finalRA    = residualAlkalinity(finalIons.Alk, finalIons.Ca, finalIons.Mg);
  const finalRatio = sulfateChlorideRatio(finalIons.SO4, finalIons.Cl);

  const acidTotals = useMemo(() => {
    if (!volumeGallons || volumeGallons <= 0) return { total_meq: 0, ppm_alk_reduced: 0 };
    return applyAcids(userAcids, volumeGallons);
  }, [userAcids, volumeGallons]);

  // Only show salts/acids that have a non-zero amount
  const activeSalts = Object.entries(effectiveSalts).filter(([, g]) => g > 0);
  const activeAcids = Object.entries(userAcids).filter(([, amt]) => amt > 0);

  function fmtG(g) {
    return unitMode === 'pro' ? g.toFixed(0) : g.toFixed(1);
  }

  function fmtAcid(acidKey, amount) {
    const acid = ACIDS[acidKey];
    if (acid.is_solid) {
      const malt = acidMaltUnits(unitMode);
      return `${malt.toDisplay(amount).toFixed(2)} ${malt.unit}`;
    }
    return `${amount.toFixed(0)} mL`;
  }

  const signF = (n, dec) => (n >= 0 ? `+${n.toFixed(dec)}` : n.toFixed(dec));
  const targetRA    = target.RA;
  const targetRatio = style.so4_cl_target;

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="print-sheet">

      {/* ── 1. Header Band ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
        <img
          src="/persyn-logo.jpg"
          alt="Persyn Chemical Engineering and Consulting"
          style={{ width: '140px', objectFit: 'contain' }}
        />
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: 700, color: NAVY, letterSpacing: '0.05em' }}>
            BREW WATER CHEM
          </div>
          <div style={{ fontSize: '9px', color: GRAY, letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '2px' }}>
            Batch Water Treatment Sheet
          </div>
        </div>
      </div>
      <hr style={{ border: 'none', borderTop: `1.5px solid ${BORDER}`, margin: '0 0 7px' }} />

      {/* ── 2. Metadata Row ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '9px' }}>
        <Meta label="Date"          value={today} />
        <Meta label="Style"         value={style.name} />
        <Meta label="Batch Volume"  value={`${volume} ${volumeUnit(unitMode)}`} />
        <Meta label="Primary Acid"  value={ACIDS[primaryAcidType].name} />
        <Meta label="App Version"   value="Brew Water Chem v1.3" />
      </div>

      {/* ── 3. Source Water ─────────────────────────────────────────── */}
      <Heading>Source Water (as tested)</Heading>
      <table style={tbl}>
        <thead>
          <tr style={{ background: HDR_BG }}>
            {['Ca', 'Mg', 'Na', 'SO₄', 'Cl', 'Alk', 'pH', 'RA', 'SO₄:Cl'].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {['Ca','Mg','Na','SO4','Cl','Alkalinity','pH'].map((k) => (
              <td key={k} style={td}>{source[k] !== '' && source[k] != null ? source[k] : '—'}</td>
            ))}
            <td style={td}>{sourceRA.toFixed(0)}</td>
            <td style={td}>{isFinite(sourceRatio) ? sourceRatio.toFixed(2) : '∞'}</td>
          </tr>
        </tbody>
      </table>

      {/* ── 4. Target Profile ───────────────────────────────────────── */}
      <Heading>Target Profile — {style.name}</Heading>
      <table style={tbl}>
        <thead>
          <tr style={{ background: HDR_BG }}>
            {['Ca', 'Mg', 'Na', 'SO₄', 'Cl', 'Alk', 'RA', 'SO₄:Cl'].map(h => (
              <th key={h} style={th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={td}>{target.Ca}</td>
            <td style={td}>{target.Mg}</td>
            <td style={td}>{target.Na}</td>
            <td style={td}>{target.SO4}</td>
            <td style={td}>{target.Cl}</td>
            <td style={td}>{target.Alk}</td>
            <td style={td}>{targetRA >= 0 ? `+${targetRA}` : targetRA}</td>
            <td style={td}>{targetRatio.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* ── 5. Salt Additions ───────────────────────────────────────── */}
      <Heading>Salt Additions</Heading>
      {activeSalts.length === 0
        ? <p style={noData}>No salt additions required.</p>
        : (
          <table style={tbl}>
            <thead>
              <tr style={{ background: HDR_BG }}>
                <th style={{ ...th, textAlign: 'left', width: '72%' }}>Salt</th>
                <th style={th}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {activeSalts.map(([saltKey, grams], i) => {
                const meta = SALT_CONTRIBUTIONS_PER_G_GAL[saltKey];
                return (
                  <tr key={saltKey} style={{ background: i % 2 ? ROW_ALT : 'white' }}>
                    <td style={{ ...td, textAlign: 'left' }}>
                      {meta.name}
                      {saltKey === 'chalk' && (
                        <span style={warnNote}>
                          ⚠ Pre-dissolve in CO₂-saturated mash water (poor solubility)
                        </span>
                      )}
                      {saltKey === 'pickling_lime' && (
                        <span style={warnNote}>
                          ⚠ Strong base — add to mash, never directly to grain
                        </span>
                      )}
                    </td>
                    <td style={td}>{fmtG(grams)} g</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )
      }

      {/* ── 6. Acid Additions ───────────────────────────────────────── */}
      <Heading>Acid Additions</Heading>
      {activeAcids.length === 0
        ? <p style={noData}>No acid additions required.</p>
        : (
          <table style={tbl}>
            <thead>
              <tr style={{ background: HDR_BG }}>
                <th style={{ ...th, textAlign: 'left', width: '52%' }}>Acid</th>
                <th style={th}>Amount</th>
                <th style={th}>mEq</th>
              </tr>
            </thead>
            <tbody>
              {activeAcids.map(([acidKey, amount], i) => (
                <tr key={acidKey} style={{ background: i % 2 ? ROW_ALT : 'white' }}>
                  <td style={{ ...td, textAlign: 'left' }}>{ACIDS[acidKey].name}</td>
                  <td style={td}>{fmtAcid(acidKey, amount)}</td>
                  <td style={td}>{acidContribution(acidKey, amount).toFixed(1)}</td>
                </tr>
              ))}
              <tr style={{ background: HDR_BG }}>
                <td style={{ ...td, textAlign: 'left', fontWeight: 700 }}>Total</td>
                <td style={{ ...td, fontWeight: 700 }}>—</td>
                <td style={{ ...td, fontWeight: 700 }}>
                  {acidTotals.total_meq.toFixed(1)} mEq&ensp;&middot;&ensp;
                  &minus;{acidTotals.ppm_alk_reduced.toFixed(0)} ppm Alk
                </td>
              </tr>
            </tbody>
          </table>
        )
      }

      {/* ── 7. Predicted Final Profile ──────────────────────────────── */}
      <Heading>Predicted Final Water</Heading>
      <table style={tbl}>
        <thead>
          <tr style={{ background: HDR_BG }}>
            <th style={{ ...th, textAlign: 'left', width: '36%' }}>Ion / Parameter</th>
            <th style={th}>Final (ppm)</th>
            <th style={th}>Target (ppm)</th>
            <th style={th}>Deviation</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Calcium (Ca)',          finalIons.Ca,  target.Ca],
            ['Magnesium (Mg)',        finalIons.Mg,  target.Mg],
            ['Sodium (Na)',           finalIons.Na,  target.Na],
            ['Sulfate (SO₄)',    finalIons.SO4, target.SO4],
            ['Chloride (Cl)',         finalIons.Cl,  target.Cl],
            ['Total Alkalinity',      finalIons.Alk, target.Alk],
          ].map(([label, final, tgt], i) => (
            <tr key={label} style={{ background: i % 2 ? ROW_ALT : 'white' }}>
              <td style={{ ...td, textAlign: 'left' }}>{label}</td>
              <td style={td}>{final.toFixed(0)}</td>
              <td style={td}>{tgt}</td>
              <td style={td}>{signF(final - tgt, 0)}</td>
            </tr>
          ))}
          <tr style={{ background: HDR_BG }}>
            <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>Residual Alkalinity (RA)</td>
            <td style={{ ...td, fontWeight: 600 }}>{finalRA.toFixed(0)}</td>
            <td style={{ ...td, fontWeight: 600 }}>{targetRA >= 0 ? `+${targetRA}` : targetRA}</td>
            <td style={{ ...td, fontWeight: 600 }}>{signF(finalRA - targetRA, 0)}</td>
          </tr>
          <tr style={{ background: ROW_ALT }}>
            <td style={{ ...td, textAlign: 'left', fontWeight: 600 }}>SO₄:Cl Ratio</td>
            <td style={{ ...td, fontWeight: 600 }}>{isFinite(finalRatio) ? finalRatio.toFixed(2) : '∞'}</td>
            <td style={{ ...td, fontWeight: 600 }}>{targetRatio.toFixed(2)}</td>
            <td style={{ ...td, fontWeight: 600 }}>
              {isFinite(finalRatio) ? signF(finalRatio - targetRatio, 2) : '—'}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── 8. Footer Band ──────────────────────────────────────────── */}
      <div style={{ marginTop: '10px', borderTop: `1px solid ${BORDER}`, paddingTop: '7px' }}>
        <p style={{ fontSize: '8px', color: GRAY, margin: '0 0 3px', lineHeight: 1.5 }}>
          Calculations per Palmer &amp; Kaminski (2013), Kolbach (1953), Troester (2009). CaCl&#x2082; as dihydrate.
        </p>
        <p style={{ fontSize: '8px', color: GRAY, margin: '0 0 8px', lineHeight: 1.5 }}>
          For process guidance only. Verify against analytical testing before production use.
          Persyn Chemical Engineering and Consulting assumes no liability for brewing outcomes.
        </p>
        <div style={{ fontSize: '10px', color: '#333', borderTop: `1px dashed ${BORDER}`, paddingTop: '6px' }}>
          Brewer:&#x2003;____________________________&#x2003;&#x2003;
          Date brewed:&#x2003;____________________________
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Heading({ children }) {
  return (
    <div style={{
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      color: NAVY,
      borderBottom: `1.5px solid ${NAVY}`,
      paddingBottom: '2px',
      marginTop: '9px',
      marginBottom: '4px',
    }}>
      {children}
    </div>
  );
}

function Meta({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: '7px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: GRAY }}>
        {label}
      </div>
      <div style={{ fontSize: '10px', fontWeight: 600, color: NAVY }}>{value}</div>
    </div>
  );
}

// ── Table style constants ─────────────────────────────────────────

const tbl = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '10px',
  marginBottom: '2px',
};

const th = {
  padding: '3px 5px',
  textAlign: 'center',
  fontWeight: 700,
  color: NAVY,
  border: `1px solid ${BORDER}`,
  fontSize: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const td = {
  padding: '3px 5px',
  textAlign: 'center',
  border: `1px solid ${BORDER}`,
  color: '#222',
};

const noData = {
  fontSize: '9px',
  fontStyle: 'italic',
  color: GRAY,
  margin: '2px 0 4px',
};

const warnNote = {
  display: 'block',
  fontSize: '8px',
  fontStyle: 'italic',
  color: WARN,
  marginTop: '1px',
};
