"use client";

import Link from "next/link";
import { useMemo } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { companyHref } from "@/lib/format";
import Orb from "@/components/Orb";
import Tilt from "@/components/Tilt";
import HeroStack from "@/components/HeroStack";
import CompanyPicker from "@/components/CompanyPicker";
import CompanyLogo from "@/components/CompanyLogo";
import { DifficultyBadge, RelevanceBadge, SubjectChip } from "@/components/Badges";
import { Disclaimer } from "@/components/States";
import { IconArrow, IconBrain, IconBuilding, IconChart, IconCheck, IconLayers, IconTarget } from "@/components/Icons";

const FALLBACK_COMPANIES = [
  "TCS", "Infosys", "Wipro", "Accenture", "Cognizant", "Capgemini", "HCLTech", "Deloitte", "ZS Associates",
  "ION Group", "Oracle", "Adobe", "Blinkit", "Google", "Microsoft", "Amazon", "Meta", "Apple", "Netflix",
];

const FAQ = [
  {
    q: "Are these questions actually asked by these companies?",
    a: "No — and PrepMap never claims they are. Each company has a profile built from public information about its hiring process (test pattern, rounds, roles). A question is recommended for a company when its subject and difficulty match that profile. It's a study guide, not a leak.",
  },
  {
    q: "Where do the questions come from?",
    a: "All 1,770 questions were written for this project across 15 subjects — they are not copied from any website. The dataset is public on Hugging Face.",
  },
  {
    q: "Are there model answers?",
    a: "Not yet. The dataset has questions only, so PrepMap never shows or invents answers. Practise answering out loud or on paper, then mark the question as practised.",
  },
  {
    q: "How accurate is the question analyser?",
    a: "The subject classifier scores 0.762 macro F1 across 15 subjects. Difficulty is harder to predict (0.564 macro F1), so treat difficulty as a rough estimate.",
  },
  {
    q: "Do I need an account? Where is my progress stored?",
    a: "No account. Your practised questions, revise-later list and target company are saved only in this browser (localStorage). Nothing is sent to a server.",
  },
];

function Stat({ value, label, loading }: { value?: number | string; label: string; loading: boolean }) {
  return (
    <li>
      <IconCheck size={18} />
      {loading ? (
        <span className="skeleton" style={{ display: "inline-block", width: 160, height: 16 }} />
      ) : (
        <span>
          <strong style={{ fontWeight: 600 }}>{typeof value === "number" ? value.toLocaleString("en-IN") : value ?? "—"}</strong> {label}
        </span>
      )}
    </li>
  );
}

export default function HomeClient() {
  const health = useAsync(() => api.health(), []);
  const companies = useAsync(() => api.companies(), []);
  const names = useMemo(() => companies.data?.map((c) => c.company) ?? FALLBACK_COMPANIES, [companies.data]);

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="hero">
        <div className="reveal">
          <div className="eyebrow">Placement prep, matched to your company</div>
          <h1>
            Practise for the company <span className="accent">you&apos;re actually targeting</span>
          </h1>
          <p className="hero-lead">
            PrepMap matches practice questions to each company&apos;s public hiring process — from TCS NQT aptitude to
            Big Tech DSA rounds. Pick a company, work through a focused set, and track what you&apos;ve covered.
          </p>
          <CompanyPicker />
          <div className="btn-row" style={{ marginTop: 12 }}>
            <Link href="/analyse" className="btn">
              <IconBrain /> Analyse a question
            </Link>
            <Link href="/companies" className="btn btn-ghost">
              Browse all companies <IconArrow size={15} />
            </Link>
          </div>
          <ul className="hero-points" aria-live="polite">
            <Stat value={health.data?.questions} label="original practice questions" loading={health.loading} />
            <Stat
              value={health.data ? `${health.data.companies} company profiles` : undefined}
              label={health.data ? `· ${health.data.subjects} subjects` : ""}
              loading={health.loading}
            />
          </ul>
          {health.error && (
            <p className="small faint" style={{ marginTop: 8 }}>
              Live stats unavailable right now.{" "}
              <button type="button" className="btn btn-sm btn-ghost" onClick={health.reload}>
                Retry
              </button>
            </p>
          )}
          <div className="avatar-row">
            <div className="avatars">
              {names.slice(0, 5).map((n) => (
                <CompanyLogo key={n} name={n} size={32} />
              ))}
            </div>
            <span className="small muted">
              Profiles for {names.slice(0, 3).join(", ")} and {Math.max(0, names.length - 3)} more
            </span>
          </div>
        </div>
        <div className="reveal" style={{ animationDelay: "120ms" }}>
          <HeroStack />
        </div>
      </section>

      {/* ------------------------------------------------------------ marquee */}
      <div className="marquee" aria-label="Companies with profiles">
        <p className="marquee-caption">Hiring-process profiles for</p>
        <div className="marquee-track">
          {[...names, ...names].map((n, i) => (
            <Link key={`${n}-${i}`} href={companyHref(n)} tabIndex={i >= names.length ? -1 : undefined} aria-hidden={i >= names.length ? true : undefined}>
              <CompanyLogo name={n} size={26} />
              {n}
            </Link>
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------ problem / steps */}
      <section className="section" aria-labelledby="how-h">
        <div className="section-head">
          <span className="pill">How it works</span>
          <h2 id="how-h">
            Generic question banks <span className="accent">waste your prep time</span>
          </h2>
          <p>An aptitude-heavy mass recruiter and a DSA-heavy product company need very different preparation.</p>
        </div>
        <div className="grid grid-3">
          {[
            {
              icon: <IconTarget size={20} />,
              title: "Pick your target",
              text: "Choose from 19 companies — IT services, consulting, fintech, enterprise, product and Big Tech.",
            },
            {
              icon: <IconLayers size={20} />,
              title: "Practise a focused set",
              text: "Questions ranked core → frequent → occasional for that company, filtered by subject and difficulty.",
            },
            {
              icon: <IconChart size={20} />,
              title: "Track your coverage",
              text: "Mark questions as practised or revise later, and see how much of each core subject you've covered.",
            },
          ].map((s, i) => (
            <Tilt key={s.title} max={5}>
              <div className="feature-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div className="feature-icon">{s.icon}</div>
                  <span className="step-num">0{i + 1}</span>
                </div>
                <h3 className="lift">{s.title}</h3>
                <p className="muted">{s.text}</p>
              </div>
            </Tilt>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ showcase */}
      <section className="section" aria-labelledby="show-h">
        <div className="section-head">
          <span className="pill">Showcase</span>
          <h2 id="show-h">
            Everything for placement prep, <span className="accent">in one place</span>
          </h2>
          <p>Company profiles, focused practice, an ML question analyser and progress tracking.</p>
        </div>

        <div className="showcase">
          <div>
            <div className="kicker">Company profiles</div>
            <h3>Know what each process actually tests</h3>
            <p>
              Fresher roles, hiring rounds, core / frequent / occasional subjects and difficulty focus — with a link to
              the public source for every profile.
            </p>
            <Link href="/companies" className="btn btn-outline">
              Explore companies <IconArrow size={15} />
            </Link>
          </div>
          <div className="mock" aria-hidden="true">
            <div className="widget">
              <div className="widget-head">
                <span className="wi">
                  <IconBuilding /> TCS · subject weights
                </span>
                <span className="chip conf-medium chip-dot" style={{ fontSize: "0.7rem" }}>
                  Medium confidence
                </span>
              </div>
              {[
                ["Quantitative Aptitude", "core", 100],
                ["Logical Reasoning", "core", 100],
                ["Programming Fundamentals", "core", 100],
                ["DSA", "frequent", 66],
                ["DBMS & SQL", "frequent", 66],
                ["Operating Systems", "occasional", 33],
              ].map(([s, r, w]) => (
                <div key={s as string} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <span style={{ flex: 1 }}>{s}</span>
                  <RelevanceBadge value={r as string} />
                  <span className="w-bar">
                    <span style={{ width: `${w}%` }} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="showcase flip">
          <div>
            <div className="kicker">Practice mode</div>
            <h3>One question at a time, no distractions</h3>
            <p>
              Step through a set with keyboard shortcuts, mark what you&apos;ve practised, and get a summary of the
              subjects you covered. Every set has a shareable link.
            </p>
            <Link href={companyHref("Infosys") + "#practice"} className="btn btn-outline">
              Try a practice set <IconArrow size={15} />
            </Link>
          </div>
          <div className="mock" aria-hidden="true">
            <div className="widget" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <span className="w-sub">Infosys practice</span>
                <span className="w-sub">
                  <strong style={{ color: "var(--text)" }}>3 / 20</strong>
                </span>
              </div>
              <div className="progress-track" style={{ marginBottom: 18 }}>
                <span style={{ width: "15%" }} />
              </div>
              <div className="chips" style={{ marginBottom: 12 }}>
                <SubjectChip value="DBMS & SQL" />
                <DifficultyBadge value="easy" />
                <RelevanceBadge value="frequent" />
              </div>
              <p style={{ fontSize: "1.2rem", letterSpacing: "-0.03em", margin: "0 0 18px", color: "var(--text)" }}>
                What is normalization and why is it used?
              </p>
              <div className="btn-row">
                <span className="btn btn-sm on-practised">✓ Practised</span>
                <span className="btn btn-sm">☆ Revise later</span>
              </div>
            </div>
          </div>
        </div>

        <div className="showcase">
          <div>
            <div className="kicker">Question analyser</div>
            <h3>Paste any question, see where it fits</h3>
            <p>
              A machine-learning model predicts the subject and difficulty, then matches the question against all 19
              company profiles.
            </p>
            <Link href="/analyse" className="btn btn-outline">
              Analyse a question <IconArrow size={15} />
            </Link>
          </div>
          <div className="mock" aria-hidden="true">
            <div className="widget">
              <div className="widget-head">
                <span className="wi">
                  <IconBrain /> Recommended for
                </span>
                <span className="w-sub">Example</span>
              </div>
              {(
                [
                  ["core", ["ION Group"]],
                  ["frequent", ["Adobe", "HCLTech", "Microsoft", "Oracle"]],
                  ["occasional", ["Amazon", "Apple", "TCS"]],
                ] as [string, string[]][]
              ).map(([rel, cos]) => (
                <div key={rel} style={{ marginTop: 10 }}>
                  <RelevanceBadge value={rel} />
                  <div className="chips" style={{ marginTop: 6 }}>
                    {cos.map((c) => (
                      <span key={c} className="chip" style={{ paddingLeft: 4 }}>
                        <CompanyLogo name={c} size={18} /> {c}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ 3D map */}
      <section className="section">
        <div className="map-section">
          <div>
            <span className="pill">The map</span>
            <h2>
              19 companies, <span className="accent">one map</span>
            </h2>
            <p className="muted" style={{ fontSize: "1.05rem" }}>
              Drag the globe to spin it and click any company to open its hiring profile and practice set.
            </p>
            <CompanyPicker cta="Go" />
          </div>
          <Orb companies={names} />
        </div>
      </section>

      {/* ------------------------------------------------------------ numbers */}
      <section className="section" aria-labelledby="num-h">
        <div className="section-head">
          <span className="pill">By the numbers</span>
          <h2 id="num-h">
            Open data, <span className="accent">honest models</span>
          </h2>
          <p>Everything behind PrepMap is public — the dataset, the model and the code.</p>
        </div>
        <div className="grid grid-4">
          {[
            ["Questions", health.data?.questions?.toLocaleString("en-IN") ?? "1,770", "Original questions, written for this project"],
            ["Subjects", String(health.data?.subjects ?? 15), "From DSA and DBMS to aptitude and guesstimates"],
            ["Companies", String(health.data?.companies ?? 19), "Profiles from public hiring information"],
            ["Subject F1", "0.762", "Macro F1 of the subject classifier"],
          ].map(([k, v, d]) => (
            <div key={k} className="stat-card">
              <div className="kicker">{k}</div>
              <div className="stat-value">{v}</div>
              <div className="stat-label">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------ FAQ */}
      <section className="section" aria-labelledby="faq-h">
        <div className="section-head">
          <span className="pill">FAQ</span>
          <h2 id="faq-h">
            You asked, <span className="accent">we answered</span>
          </h2>
        </div>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
          <div style={{ marginTop: 8 }}>
            <Disclaimer />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ CTA */}
      <section className="section">
        <div className="cta-band">
          <h2>Start with your target company</h2>
          <p>Pick a company and get a focused practice set in seconds. No sign-up, nothing to install.</p>
          <CompanyPicker cta="Start practising" />
        </div>
      </section>
    </>
  );
}
