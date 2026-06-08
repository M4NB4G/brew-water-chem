// "Notes" tab — v1.2 scope, references, and validation status.

import Card from '../shared/Card.jsx';
import { colors, tokens } from '../shared/styles.js';

export default function NotesTab() {
  return (
    <>
      <Card>
        <div style={tokens.cardLabel}>v1.2 Scope & Limitations</div>
        <div style={{ fontSize: '0.92rem', lineHeight: 1.6, color: colors.textPrimary }}>
          <p style={{ marginTop: 0 }}>
            This calculator computes <strong>salt additions</strong> and{' '}
            <strong>acid dose</strong> to move source water toward a target ion
            profile.
          </p>
          <p>
            <strong>v1.2 does not predict mash pH.</strong> Mash pH prediction
            requires the grain bill (base malt color, crystal %, roast %) to
            estimate buffering. That comes in v2 with the Kaiser/Troester model.
          </p>
          <p>
            What v1.2 <em>does</em> do:
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
            secondary acids are user-entered. A future settings page (v1.3) will
            let you choose the solver's default acid.
          </p>
          <p>
            New in v1.1: the multi-acid card, the per-row mEq contribution
            hint, and the "Total acid: X mEq → −Y ppm Alk" summary. The
            chemistry engine (constants, capacity formulas, alkalinity-reduction
            math) is unchanged from v1.0 — reference-batch parity vs Bru&apos;n
            Water 1.25 free is preserved exactly.
          </p>
        </div>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Scientific References &amp; Data Sources</div>
        <ol style={{ fontSize: '0.85rem', lineHeight: 1.65, color: colors.textPrimary, paddingLeft: '1.4rem', margin: 0 }}>
          <li style={{ marginBottom: '0.85rem' }}>
            Beer Judge Certification Program. (2021). <em>BJCP Style Guidelines.</em>{' '}
            <span style={{ color: colors.textSecondary }}>https://www.bjcp.org/style/2021/</span>
            <br />
            <span style={{ fontSize: '0.8rem', color: colors.textSecondary, fontStyle: 'italic' }}>
              Style family definitions and categories.
            </span>
          </li>
          <li style={{ marginBottom: '0.85rem' }}>
            Palmer, J. J., &amp; Kaminski, C. (2013). <em>Water: A Comprehensive Guide for
            Brewers.</em> Brewers Publications. ISBN 978-0937381991.
            <br />
            <span style={{ fontSize: '0.8rem', color: colors.textSecondary, fontStyle: 'italic' }}>
              Salt ion contributions (Appendix C, p. 263); style water adjustment
              (Chapter 7, &ldquo;Adjusting Water for Style,&rdquo; pp. 139–178).
            </span>
          </li>
          <li style={{ marginBottom: '0.85rem' }}>
            Palmer, J. J. (2017). <em>How to Brew: Everything You Need to Know to Brew
            Great Beer Every Time</em> (4th ed.). Brewers Publications.
            ISBN 978-1938469350.
            <br />
            <span style={{ fontSize: '0.8rem', color: colors.textSecondary, fontStyle: 'italic' }}>
              Style recommendations (Chapter 23, &ldquo;Some of My Favorite Beer Styles
              and Recipes,&rdquo; pp. 375–426).
            </span>
          </li>
          <li style={{ marginBottom: '0.85rem' }}>
            Kolbach, P. (1953). Der Einfluss des Brauwassers auf die Bierfarbe.{' '}
            <em>Monatsschrift für Brauerei</em>, 6, 167–171.
            <br />
            <span style={{ fontSize: '0.8rem', color: colors.textSecondary, fontStyle: 'italic' }}>
              Residual alkalinity formula: RA = Total Alkalinity &minus; (Ca/1.4 + Mg/1.7),
              all as CaCO₃.
            </span>
          </li>
          <li style={{ marginBottom: '0.85rem' }}>
            Janish, S. (2019). <em>The New IPA: Scientific Guide to Hop Aroma and
            Flavor.</em> Self-published. ISBN 978-0578477862.
            <br />
            <span style={{ fontSize: '0.8rem', color: colors.textSecondary, fontStyle: 'italic' }}>
              Water chemistry and sulfate-to-chloride ratios for hazy / hop-forward
              styles (Ch. 4).
            </span>
          </li>
          <li style={{ marginBottom: 0 }}>
            <em>CRC Handbook of Chemistry and Physics.</em> CRC Press.
            <br />
            <span style={{ fontSize: '0.8rem', color: colors.textSecondary, fontStyle: 'italic' }}>
              Standard aqueous acid solution densities at 25 °C (e.g., 85% phosphoric
              acid ≈ 1.685 g/mL).
            </span>
          </li>
        </ol>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Application Assumptions</div>
        <p style={{ fontSize: '0.82rem', fontStyle: 'italic', color: colors.textSecondary, marginTop: 0, marginBottom: '0.9rem', lineHeight: 1.55 }}>
          The following are engineering choices made by this application where
          published values vary between manufacturers, malt lots, or brewing
          conditions. They are documented here for transparency and are not
          presented as published facts.
        </p>
        <ol style={{ fontSize: '0.85rem', lineHeight: 1.65, color: colors.textPrimary, paddingLeft: '1.4rem', margin: 0 }}>
          <li style={{ marginBottom: '0.8rem' }}>
            Acidulated malt (Sauermalz) lactic acid content is modeled at 2.0% by
            weight. Weyermann publishes a range of approximately 1–2%; this app uses
            2.0% as a documented, conservative value.
          </li>
          <li style={{ marginBottom: '0.8rem' }}>
            Calcium chloride is modeled as the dihydrate form (CaCl₂·2H₂O), the form
            most commonly sold for brewing, consistent with Palmer &amp; Kaminski (2013).
            Tools that model anhydrous CaCl₂ (e.g., Bru&apos;n Water) will show
            different chloride and calcium contributions for the same mass.
          </li>
          <li style={{ marginBottom: '0.8rem' }}>
            Phosphoric acid is treated as effectively monoprotic at mash pH. Only the
            first dissociation (pK<sub>a1</sub> ≈ 2.15) is active in the mash pH range;
            the second (pK<sub>a2</sub> ≈ 7.20) is not. This follows standard aqueous
            acid–base chemistry, not a single proprietary source.
          </li>
          <li style={{ marginBottom: '0.8rem' }}>
            Residual alkalinity is calculated per the Kolbach (1953) formulation.
          </li>
          <li style={{ marginBottom: 0 }}>
            This application calculates salt and acid additions to reach a target ion
            profile. It does not predict mash pH (which requires grain bill data).
            All outputs are process guidance and should be verified against direct
            analytical testing and pH measurement before production use.
          </li>
        </ol>
      </Card>

      <Card>
        <div style={tokens.cardLabel}>Validation &amp; Methodology</div>
        <div style={{ fontSize: '0.88rem', lineHeight: 1.65, color: colors.textPrimary }}>
          <p style={{ marginTop: 0 }}>
            Salt and acid chemistry has been validated against Bru&apos;n Water 1.25 and
            Palmer&apos;s water adjustment spreadsheet across multiple reference water
            profiles. Predicted ion concentrations agree within approximately ±5% on
            most ions.
          </p>
          <p>
            Two differences from Bru&apos;n Water arise from deliberate modeling choices,
            not errors, and are documented under Application Assumptions above:
            calcium chloride is modeled as the dihydrate form (CaCl₂·2H₂O), and
            acidulated malt at 2.0% lactic acid by weight. These produce expected,
            explainable deviations in chloride and alkalinity respectively.
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>As with any water chemistry model,</strong> verify results against
            direct analytical testing and pH measurement before production brewing.
            Persyn Chemical Engineering and Consulting, PLLC assumes no liability for
            brewing outcomes.
          </p>
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
