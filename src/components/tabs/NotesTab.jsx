// "Notes" tab — v1.1 scope, references, and validation status.

import Card from '../shared/Card.jsx';
import { colors, tokens } from '../shared/styles.js';

export default function NotesTab() {
  return (
    <>
      <Card>
        <div style={tokens.cardLabel}>v1.1 Scope & Limitations</div>
        <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: colors.textPrimary }}>
          <p style={{ marginTop: 0 }}>
            This calculator computes <strong>salt additions</strong> and{' '}
            <strong>acid dose</strong> to move source water toward a target ion
            profile.
          </p>
          <p>
            <strong>v1.1 does not predict mash pH.</strong> Mash pH prediction
            requires the grain bill (base malt color, crystal %, roast %) to
            estimate buffering. That comes in v2 with the Kaiser/Troester model.
          </p>
          <p>
            What v1.1 <em>does</em> do:
          </p>
          <ul style={{ marginLeft: '1.2rem', lineHeight: 1.7 }}>
            <li>Compute residual alkalinity per Kolbach (1953)</li>
            <li>Hit target ion concentrations (Ca, Mg, Na, SO₄, Cl, Alk)</li>
            <li>Recommend an acid dose to neutralize excess alkalinity</li>
            <li>
              Optionally blend <strong>multiple acids</strong> in one batch
              (acidulated malt + liquid phosphoric, two liquid acids together,
              etc.) — opt-in via the "Use multiple acids" checkbox on the Recipe
              tab. mEq combines linearly across acids with no cross-terms.
            </li>
            <li>Show SO₄:Cl ratio for flavor balance</li>
            <li>Allow user override of any salt or acid amount with live re-calculation</li>
          </ul>
          <p>
            <strong>Multi-acid is a manual override, not a solver capability.</strong>{' '}
            The solver still recommends a single acid (88% lactic by default);
            secondary acids are user-entered. A future settings page (v1.2) will
            let you choose the solver's default acid.
          </p>
          <p>
            New since v1.0: the multi-acid card, the per-row mEq contribution
            hint, and the "Total acid: X mEq → −Y ppm Alk" summary. The
            chemistry engine (constants, capacity formulas, alkalinity-reduction
            math) is unchanged from v1.0 — reference-batch parity vs Bru&apos;n
            Water 1.25 free is preserved exactly.
          </p>
        </div>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>References</div>
        <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: colors.textSecondary }}>
          <p>
            Palmer, J.J., & Kaminski, C. (2013). <em>Water: A Comprehensive
            Guide for Brewers.</em> Brewers Publications. Salt contributions
            Appendix A pp. 281–283; style profiles Ch. 5 pp. 119–162.
          </p>
          <p>
            Kolbach, P. (1953). &ldquo;Der Einfluss des Brauwassers auf die Bierfarbe.&rdquo;{' '}
            <em>Monatsschrift für Brauerei</em>, 6, 167–171. Original residual
            alkalinity formula.
          </p>
          <p>
            Troester, K. (2009). &ldquo;An Overview of pH.&rdquo; Braukaiser.com.
            Phosphoric acid monoprotic treatment at mash pH.
          </p>
          <p>
            Beer Judge Certification Program. (2021). 2021 Style Guidelines.
            bjcp.org/style/2021
          </p>
          <p>
            Janish, S. (2019). <em>IPA: Brewing Tips, Recipes, & Techniques.</em>{' '}
            Modern hazy/NEIPA chloride-forward practice.
          </p>
          <p>
            Weyermann Specialty Malts. Acidulated Malt (Sauermalz) spec sheet. Lactic
            acid content typically 1–2% by weight; app uses 2% as a conservative estimate.
          </p>
          <p>CRC Handbook of Chemistry and Physics, 97th ed. Acid densities and concentrations.</p>
        </div>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Validation Status</div>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.6, color: colors.textWarn }}>
          ⚠ <strong>Validate before production use.</strong> Salt-addition outputs
          should be checked against a reference batch in a trusted tool
          (Bru&apos;n Water, Palmer&apos;s spreadsheet) prior to client delivery.
          Expected agreement: ±5% on each ion delta.
        </div>
      </Card>

      <Card>
        <div style={{ ...tokens.cardLabel, color: colors.textWarn }}>
          Commercial Use &amp; Liability Disclaimer
        </div>
        <div
          style={{
            fontSize: '0.85rem',
            lineHeight: 1.65,
            color: colors.textPrimary,
            borderLeft: `3px solid ${colors.textWarn}`,
            paddingLeft: '0.9rem',
            marginTop: '0.5rem',
          }}
        >
          <p style={{ marginTop: 0 }}>
            <strong>THIS TOOL IS PROVIDED FOR INFORMATIONAL PURPOSES ONLY.</strong>{' '}
            Brew Water Chem is a free, open-source calculator intended to assist
            homebrewers and brewing professionals in estimating water chemistry
            additions. It is <strong>not</strong> a substitute for professional
            engineering judgment, laboratory analysis, or certified process
            validation.
          </p>
          <p>
            <strong>No warranty of any kind</strong> — express, implied, or
            statutory — is made regarding the accuracy, completeness, or fitness
            for a particular purpose of any output produced by this tool. All
            chemical constants, style targets, and algorithmic assumptions are
            based on published literature (Palmer-Kaminski 2013, Kolbach 1953)
            and may not reflect your specific water supply, equipment, or
            ingredients.
          </p>
          <p>
            <strong>Commercial use at your own risk.</strong> If you use this
            tool to formulate water additions for a commercial brewery,
            brewpub, contract brewing operation, or any product sold to the
            public, you are solely responsible for:
          </p>
          <ul style={{ marginLeft: '1.2rem', lineHeight: 1.75 }}>
            <li>
              Verifying outputs against a calibrated reference tool (Bru&apos;n
              Water, Palmer&apos;s spreadsheet, or equivalent) before any
              commercial batch.
            </li>
            <li>
              Confirming your source water chemistry with a certified
              laboratory analysis — municipal reports change seasonally.
            </li>
            <li>
              Complying with all applicable food safety regulations, including
              TTB and state/local requirements for brewing additives.
            </li>
            <li>
              Ensuring salt and acid grades used are food-safe and
              appropriate for potable-product manufacture.
            </li>
          </ul>
          <p>
            <strong>
              Persyn Chemical Engineering and Consulting, PLLC, and the
              contributors to this tool accept no liability for any direct,
              indirect, incidental, or consequential loss or damage arising
              from reliance on outputs produced by Brew Water Chem,
              including but not limited to product quality defects,
              regulatory non-compliance, or economic loss.
            </strong>
          </p>
          <p style={{ marginBottom: 0 }}>
            By using this tool you acknowledge that you have read, understood,
            and agreed to these terms.
          </p>
        </div>
      </Card>
    </>
  );
}
