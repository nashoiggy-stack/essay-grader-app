"use client";

import { useState } from "react";
import { TranscriptUpload } from "@/components/TranscriptUpload";
import { useBackground } from "@/components/BackgroundProvider";

export default function GPAPage() {
  const [iframeKey, setIframeKey] = useState(0);
  const { background } = useBackground();
  const iframeColorScheme: "light" | "dark" =
    background === "light" ? "light" : "dark";

  const reloadIframe = () => setIframeKey((k) => k + 1);

  return (
    <main id="main-content" className="mx-auto max-w-[1180px] px-4 sm:px-6 pt-8 sm:pt-12 pb-16 sm:pb-24 font-[family-name:var(--font-geist-sans)]">
      {/* Masthead — Linear-derived eyebrow + heavy sans headline + standfirst */}
      <header className="mb-10 sm:mb-12">
        <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted mb-3">
          Tools / GPA Calculator
        </p>
        <h1 className="text-[2rem] sm:text-[2.5rem] font-semibold tracking-[-0.022em] leading-[1.04] text-text-primary">
          Calculate your GPA.
        </h1>
        <p className="mt-3 max-w-[60ch] text-[15px] text-text-secondary leading-relaxed">
          Both unweighted and weighted, on the high-school 4.0 scale and the
          college recalculated scale. Numbers update as you enter grades.
        </p>
      </header>

      {/* Reference — how the weighting actually works. Two side-by-side
          tables of bonuses, plus a worked example. Hairline borders, no
          decorative cards. */}
      <section className="mb-10 sm:mb-12">
        <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted mb-4">
          How weighting works
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-x-10 gap-y-8 lg:gap-y-0">
          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint mb-3">
              High school scale
            </h2>
            <table className="w-full font-[family-name:var(--font-geist-mono)] text-[13px]">
              <tbody className="divide-y divide-border-hair">
                {[
                  { level: "College Prep", bonus: "+0.0" },
                  { level: "Honors", bonus: "+1.0" },
                  { level: "AP", bonus: "+2.0" },
                ].map((l) => (
                  <tr key={l.level}>
                    <td className="py-2 text-text-secondary">{l.level}</td>
                    <td className="py-2 text-right tabular-nums text-text-primary">
                      {l.bonus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint mb-3">
              College recalculated
            </h2>
            <table className="w-full font-[family-name:var(--font-geist-mono)] text-[13px]">
              <tbody className="divide-y divide-border-hair">
                {[
                  { level: "College Prep", bonus: "+0.0" },
                  { level: "Honors", bonus: "+0.5" },
                  { level: "Dual Enroll", bonus: "+1.0" },
                  { level: "AP", bonus: "+1.0" },
                ].map((l) => (
                  <tr key={l.level}>
                    <td className="py-2 text-text-secondary">{l.level}</td>
                    <td className="py-2 text-right tabular-nums text-text-primary">
                      {l.bonus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-[0.08em] text-text-faint mb-3">
              Worked example
            </h2>
            <p className="text-[12px] text-text-muted mb-3 leading-relaxed">
              An <span className="text-text-primary">A</span> in an AP class
              produces three values:
            </p>
            <table className="w-full font-[family-name:var(--font-geist-mono)] text-[13px]">
              <tbody className="divide-y divide-border-hair">
                <tr>
                  <td className="py-2 text-text-secondary">Unweighted</td>
                  <td className="py-2 text-right tabular-nums text-text-primary">
                    4.00
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-text-secondary">HS weighted</td>
                  <td className="py-2 text-right tabular-nums text-accent-text">
                    6.00
                  </td>
                </tr>
                <tr>
                  <td className="py-2 text-text-secondary">College weighted</td>
                  <td className="py-2 text-right tabular-nums text-accent-text">
                    5.00
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Auto-fill from transcript */}
      <section className="mb-8 sm:mb-10">
        <TranscriptUpload onSuccess={reloadIframe} />
      </section>

      {/* Calculator widget. The iframe is themed via ?theme=light|dark and
          carries its own visual tokens — see public/gpa-calculator.html. */}
      <section>
        <h2 className="text-xs font-medium uppercase tracking-[0.08em] text-text-muted mb-4">
          Enter your grades
        </h2>
        <div className="border border-border-hair rounded-md overflow-hidden">
          <iframe
            key={`${iframeKey}-${iframeColorScheme}`}
            src={`/gpa-calculator.html?theme=${iframeColorScheme}`}
            className="w-full block bg-transparent"
            style={{
              height: "2400px",
              minHeight: "100vh",
              colorScheme: iframeColorScheme,
              border: 0,
            }}
            title="GPA Calculator"
          />
        </div>
      </section>
    </main>
  );
}
