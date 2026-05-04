import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Methodology",
  description:
    "How AdmitEdge calculates admission chances — Academic Index, multiplier calibration, citations, and limitations.",
};

export default function MethodologyPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)] text-text-primary">
        <header className="mb-10">
          <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04]">
            How AdmitEdge Calculates Your Chances
          </h1>
          <p className="text-text-secondary text-base leading-relaxed max-w-2xl">
            AdmitEdge uses a multi-input chance model that combines Academic Index for stats, an
            LLM-classified extracurricular tier, essay quality (when graded), application plan leverage,
            and school-specific selectivity caps. Multipliers are calibrated against published research.
          </p>
        </header>

        <Section heading="Academic Index">
          <p>
            The AI formula combines weighted GPA and standardized test scores into a single 60–240
            score. This is the same formula Ivy League schools use internally for admissions
            evaluation.
          </p>
          <pre className="mt-3 rounded-lg bg-[#0a0a14]/70 border border-border-hair px-4 py-3 text-[12px] font-mono text-text-secondary overflow-x-auto">
{`weightedGPAComponent = (weightedGPA / 5.0) × 80
testComponent        = ((bestSAT − 400) / 1200) × 80
AI = (weightedGPAComponent × 1.5) + (testComponent × 1.5)`}
          </pre>
          <p className="mt-3 text-[13px] text-text-secondary">
            Source: Hernandez, <em>A is for Admission</em> (1997), modernized post-2021 SAT II
            discontinuation by Top Tier Admissions. ACT scores are converted to SAT equivalents using
            the College Board / ACT joint concordance table.
          </p>
        </Section>

        <Section heading="Stat-band multipliers">
          <p>
            Calibrated against Arcidiacono, Kinsler & Ransom (2019), <em>Recruit to Reject? Harvard and
            African American Applicants</em> (HCEO Working Paper). Top decile non-ALDC admit rate at
            Harvard is 15.3% vs. a 4.0% baseline (3.83×). Top quartile average is 2.7× baseline.
          </p>
          <Table
            headers={["AI value", "Stat tier", "Tier 1 multiplier", "Tier 2 multiplier"]}
            rows={[
              ["≥ 230", "Top decile", "3.0×", "1.5×"],
              ["220–229", "Above median", "1.7×", "1.2×"],
              ["210–219", "Mid-range", "1.0×", "1.0×"],
              ["200–209", "Below median", "0.5×", "0.7×"],
              ["< 200", "Below p25", "0.2×", "0.5×"],
            ]}
          />
          <p className="mt-3 text-[13px] text-text-secondary">
            Our top-quartile multiplier of 3.0× is conservative-side defensible against this empirical
            anchor.
          </p>
        </Section>

        <Section heading="Extracurricular multipliers">
          <p>
            Calibrated against qualitative findings from Espenshade & Radford (2009), <em>No Longer
            Separate, Not Yet Equal</em>. Empirical literature confirms direction (more / stronger ECs
            → higher admit rate) but doesn&rsquo;t validate exact multiplier magnitudes. Our values are
            rule-of-thumb, conservative-side calibrated.
          </p>
          <Table
            headers={["EC tier", "Multiplier"]}
            rows={[
              ["Limited (below average)", "0.7×"],
              ["Developing (average)", "1.0×"],
              ["Solid (above average)", "1.2×"],
              ["Strong", "1.4×"],
              ["Exceptional", "1.7×"],
            ]}
          />
        </Section>

        <Section heading="Essay multiplier">
          <p>
            Used only when essays are graded through our V-SPICE / admissions rubric tool.
            Self-reported essay quality is not trusted. Multiplier values are rule-of-thumb pending
            direct empirical research on essay effect sizes — published literature qualitatively
            confirms essays matter at top schools but doesn&rsquo;t quantify exact effect.
          </p>
          <Table
            headers={["Combined score", "Multiplier"]}
            rows={[
              ["90+", "1.15×"],
              ["75–89", "1.05×"],
              ["60–74", "1.0×"],
              ["< 60", "0.9×"],
              ["Not graded", "1.0× (advisory shown)"],
            ]}
          />
        </Section>

        <Section heading="Early decision boost">
          <p>
            Penn ED at 14.22% / RD 4.05% = 3.51×. Avery & Levin (2010), <em>Early Admissions at
            Selective Colleges</em>, finds early application provides a 20–30 percentage point admit
            boost, equivalent to ~100 SAT points. We use 2.5× ED fallback as a conservative middle of
            the empirical range, and prefer school-published ED admit rates whenever available.
          </p>
        </Section>

        <Section heading="Two-tier model">
          <p>
            Top schools (~22 holistic-elite, including all Ivies, Stanford, MIT, Caltech, Duke,
            Northwestern, JHU, UChicago, Notre Dame, Vanderbilt, Rice, Williams, Amherst, Pomona,
            Swarthmore) use compressed stat multipliers because Friedman et al. NBER 2025 shows test
            scores predict outcomes ~4× stronger than GPA at Ivy-Plus colleges, with continuous
            gradient through top deciles (not a step function past threshold).
          </p>
          <p className="mt-3 text-[13px] text-text-secondary">
            Source: Friedman, Sacerdote, Vegelius, Yagan (2025), NBER Working Paper 33570.
          </p>
        </Section>

        <Section heading="Recruited athlete pathway">
          <p>
            Recruited athletes admit at ~80–90% at top schools per Arcidiacono Harvard SFFA exhibits
            showing an 86% admit rate. The schema field is on every UserProfile; the special pathway
            math is currently shelved and re-enables once coach-contact data can ground the
            multipliers.
          </p>
        </Section>

        <Section heading="What our model doesn't capture">
          <p>Honest about limitations. Estimates may be inaccurate for:</p>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-[14px] text-text-secondary leading-relaxed">
            <li>State residency (e.g. Florida residents at UF show lower than reality)</li>
            <li>Program-specific admit rates (Penn M&amp;T, Cornell colleges, Berkeley EECS)</li>
            <li>Demonstrated interest beyond yield-protection flagging</li>
            <li>Recommendation letter strength</li>
            <li>Geographic / institutional priorities</li>
            <li>Test-optional vs test-required nuance per school</li>
          </ul>
          <p className="mt-3 text-[13px] text-text-secondary">
            Use our chance estimate as a strategic framework, not a prediction. Your essays,
            recommendations, and specific application context matter as much as the numbers.
          </p>
        </Section>

        <Section heading="Sources">
          <ul className="list-disc pl-5 space-y-1.5 text-[13px] text-text-secondary leading-relaxed">
            <li>
              <a
                className="underline decoration-accent-line hover:text-accent-text"
                href="http://humcap.uchicago.edu/RePEc/hka/wpaper/Arcidiacono_Kinsler_Ransom_2019_recruit-to-reject.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Arcidiacono, Kinsler & Ransom (2019) — Recruit to Reject? Harvard and African American Applicants
              </a>
            </li>
            <li>
              <a
                className="underline decoration-accent-line hover:text-accent-text"
                href="https://web.stanford.edu/~jdlevin/Papers/EarlyAdmissions.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                Avery & Levin (2010) — Early Admissions at Selective Colleges
              </a>
            </li>
            <li>
              <a
                className="underline decoration-accent-line hover:text-accent-text"
                href="https://www.nber.org/papers/w33570"
                target="_blank"
                rel="noopener noreferrer"
              >
                Friedman, Sacerdote, Vegelius, Yagan (2025) — Test Scores at Ivy-Plus Colleges (NBER 33570)
              </a>
            </li>
            <li>
              <a
                className="underline decoration-accent-line hover:text-accent-text"
                href="https://opportunityinsights.org/paper/collegeadmissions/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Chetty, Deming, Friedman (2023) — Diversifying Society&rsquo;s Leaders
              </a>
            </li>
            <li>Espenshade & Radford (2009) — <em>No Longer Separate, Not Yet Equal</em> (Princeton University Press)</li>
            <li>Hernandez (1997) — <em>A is for Admission</em>; modernized AI calculator via Top Tier Admissions</li>
          </ul>
        </Section>

        <p className="mt-12 text-[12px] text-text-faint leading-relaxed">
          Have a correction or a peer-reviewed source we should cite? Reach out — we update this page
          as new empirical research lands.
        </p>
      </main>
    </>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 sm:mb-12">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-[-0.012em] text-text-primary mb-3">
        {heading}
      </h2>
      <div className="text-[14px] text-text-secondary leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

function Table({ headers, rows }: { headers: readonly string[]; rows: readonly (readonly string[])[] }) {
  return (
    <div className="mt-3 overflow-x-auto rounded-lg border border-border-hair">
      <table className="w-full text-[13px]">
        <thead className="bg-white/[0.03]">
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-hair">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-white/[0.02]">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-text-secondary font-mono tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
