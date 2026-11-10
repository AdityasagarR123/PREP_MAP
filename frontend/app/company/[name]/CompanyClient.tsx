"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { api, type CompanyDetail } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { capitalize, companyHref, newSeed, questionHref, RELEVANCE_ORDER } from "@/lib/format";
import { filtersToQuery, N_OPTIONS, readFilters, type PracticeFilters } from "@/lib/params";
import { progress, useProgress } from "@/lib/progress";
import { ConfidenceBadge, DifficultyBadge, RelevanceBadge, SubjectChip } from "@/components/Badges";
import { Disclaimer, EmptyState, ErrorState, Loading } from "@/components/States";
import QuestionActions, { copyText, Toast, useToast } from "@/components/QuestionActions";
import CompanyLogo from "@/components/CompanyLogo";

function Bars({ data, total }: { data: [string, number][]; total: number }) {
  const max = Math.max(1, ...data.map(([, v]) => v));
  return (
    <div className="bars">
      {data.map(([k, v]) => (
        <div className="bar-row" key={k}>
          <span>{k}</span>
          <div className="bar" role="img" aria-label={`${k}: ${v} of ${total}`}>
            <span style={{ width: `${(v / max) * 100}%` }} />
          </div>
          <span className="bar-value">{v}</span>
        </div>
      ))}
    </div>
  );
}

function Profile({ c }: { c: CompanyDetail }) {
  const { target } = useProgress();
  const isTarget = target?.toLowerCase() === c.company.toLowerCase();
  const subjectEntries = Object.entries(c.subject_counts).sort((a, b) => b[1] - a[1]);
  const relEntries = RELEVANCE_ORDER.map((r) => [capitalize(r), c.relevance_counts[r] ?? 0] as [string, number]);

  return (
    <>
      <div className="breadcrumb">
        <Link href="/companies">Companies</Link> / {c.company}
      </div>
      <header className="page-head" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <CompanyLogo name={c.company} size={64} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <h1 style={{ marginBottom: 6 }}>{c.company}</h1>
          <div className="chips">
            <span className="chip">{c.category}</span>
            <ConfidenceBadge value={c.data_confidence} />
          </div>
        </div>
        <button
          type="button"
          className={`btn ${isTarget ? "on-practised" : ""}`}
          aria-pressed={isTarget}
          onClick={() => progress.setTarget(isTarget ? null : c.company)}
        >
          {isTarget ? "✓ My target company" : "Set as my target"}
        </button>
      </header>

      {c.data_confidence.toLowerCase() === "low" && (
        <div className="notice warn" role="note" style={{ marginBottom: 20 }}>
          <span className="icon" aria-hidden="true">
            ⚠️
          </span>
          <span>
            <strong>Low-confidence profile.</strong> This profile is based on very little public data about{" "}
            {c.company}&apos;s hiring process. Treat the subject and difficulty mapping as a rough guide.
          </span>
        </div>
      )}

      <div className="grid grid-2">
        <section className="panel" aria-labelledby="profile-h">
          <h2 id="profile-h" style={{ fontSize: "1.2rem" }}>
            Hiring profile
          </h2>
          <dl className="facts">
            <dt>Fresher roles</dt>
            <dd>{c.fresher_roles || "—"}</dd>
            <dt>Hiring rounds</dt>
            <dd>{c.hiring_rounds || "—"}</dd>
            <dt>Core</dt>
            <dd className="chips">
              {c.core_subjects.length ? c.core_subjects.map((s) => <SubjectChip key={s} value={s} />) : "—"}
            </dd>
            <dt>Frequent</dt>
            <dd className="chips">
              {c.frequent_subjects.length ? c.frequent_subjects.map((s) => <SubjectChip key={s} value={s} />) : "—"}
            </dd>
            <dt>Occasional</dt>
            <dd className="chips">
              {c.occasional_subjects.length ? c.occasional_subjects.map((s) => <SubjectChip key={s} value={s} />) : "—"}
            </dd>
            <dt>Difficulty focus</dt>
            <dd className="chips">
              {c.difficulty_focus.map((d) => (
                <DifficultyBadge key={d} value={d} />
              ))}
            </dd>
            {c.notes && (
              <>
                <dt>Notes</dt>
                <dd className="muted">{c.notes}</dd>
              </>
            )}
            {c.sources && (
              <>
                <dt>Source</dt>
                <dd>
                  {c.sources.split(/[\s,;]+/).filter((s) => /^https?:\/\//.test(s)).map((s) => (
                    <div key={s} style={{ wordBreak: "break-all" }}>
                      <a href={s} target="_blank" rel="noopener noreferrer">
                        {s.replace(/^https?:\/\/(www\.)?/, "").slice(0, 60)}
                      </a>
                    </div>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </section>

        <section className="panel" aria-labelledby="counts-h">
          <div className="panel-title">
            <h2 id="counts-h" style={{ fontSize: "1.2rem" }}>
              Recommended questions
            </h2>
            <span className="stat-value grad-text" style={{ fontSize: "1.8rem" }}>
              {c.total_questions.toLocaleString("en-IN")}
            </span>
          </div>
          <div className="label" style={{ marginBottom: 8 }}>
            By relevance
          </div>
          <Bars data={relEntries} total={c.total_questions} />
          <hr className="divider" />
          <div className="label" style={{ marginBottom: 8 }}>
            By subject
          </div>
          {subjectEntries.length ? <Bars data={subjectEntries} total={c.total_questions} /> : <p className="muted">No questions mapped yet.</p>}
        </section>
      </div>
    </>
  );
}

function PracticeSet({ company, subjects }: { company: string; subjects: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const filters = useMemo(() => readFilters(sp), [sp]);
  const p = useProgress();
  const [toast, setToast] = useToast();

  // Every practice set gets a seed in the URL so it can be shared exactly.
  useEffect(() => {
    if (filters.seed === null) {
      router.replace(`${pathname}?${filtersToQuery({ ...filters, seed: newSeed() })}`, { scroll: false });
    }
  }, [filters, pathname, router]);

  const set = useAsync(
    filters.seed === null
      ? null
      : () => api.practice({ company, subject: filters.subject, relevance: filters.relevance, difficulty: filters.difficulty, n: filters.n, seed: filters.seed ?? undefined }),
    [company, filters.subject, filters.relevance, filters.difficulty, filters.n, filters.seed],
  );

  function update(patch: Partial<PracticeFilters>) {
    const next = { ...filters, ...patch };
    router.replace(`${pathname}?${filtersToQuery(next)}`, { scroll: false });
  }

  const qs = filtersToQuery(filters);
  const done = set.data ? set.data.questions.filter((q) => p.practised[q.id]).length : 0;

  return (
    <section id="practice" className="panel" style={{ marginTop: 24, scrollMarginTop: 80 }} aria-labelledby="practice-h">
      <div className="panel-title">
        <h2 id="practice-h">Practice set</h2>
        {set.data && (
          <span className="muted small" aria-live="polite">
            {set.data.returned} of {set.data.total_available} matching · {done} practised
          </span>
        )}
      </div>

      <div className="filters" style={{ marginBottom: 18 }}>
        <div className="field">
          <label htmlFor="f-subject">Subject</label>
          <select id="f-subject" className="select" value={filters.subject} onChange={(e) => update({ subject: e.target.value })}>
            <option value="All">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-rel">Relevance</label>
          <select id="f-rel" className="select" value={filters.relevance} onChange={(e) => update({ relevance: e.target.value })}>
            <option value="All">All</option>
            <option value="core">Core</option>
            <option value="frequent">Frequent</option>
            <option value="occasional">Occasional</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-diff">Difficulty</label>
          <select id="f-diff" className="select" value={filters.difficulty} onChange={(e) => update({ difficulty: e.target.value })}>
            <option value="All">All</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="f-n">Questions</label>
          <select id="f-n" className="select" value={filters.n} onChange={(e) => update({ n: Number(e.target.value) })}>
            {(N_OPTIONS.includes(filters.n) ? N_OPTIONS : [...N_OPTIONS, filters.n].sort((a, b) => a - b)).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => update({ seed: newSeed() })} disabled={set.loading}>
            ↻ New set
          </button>
        </div>
      </div>

      <div className="btn-row" style={{ marginBottom: 18 }}>
        <Link
          href={`${companyHref(company)}/practice?${qs}`}
          className="btn btn-primary"
          aria-disabled={!set.data?.returned}
          style={!set.data?.returned ? { pointerEvents: "none", opacity: 0.5 } : undefined}
        >
          ▶ Start practice mode
        </Link>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={async () => setToast((await copyText(window.location.href)) ? "Link to this set copied" : "Couldn't copy the link")}
        >
          🔗 Copy link to this set
        </button>
      </div>

      {(set.loading || filters.seed === null) && !set.error && <Loading label="Building your practice set…" />}
      {set.error && <ErrorState message={set.error} onRetry={set.reload} />}
      {!set.loading && set.data && set.data.questions.length === 0 && (
        <EmptyState title="No questions match these filters">
          <p className="muted">Try “All” for subject, relevance or difficulty.</p>
          <button type="button" className="btn" onClick={() => update({ subject: "All", relevance: "All", difficulty: "All" })}>
            Reset filters
          </button>
        </EmptyState>
      )}
      {!set.loading && set.data && set.data.questions.length > 0 && (
        <ol className="q-list">
          {set.data.questions.map((q, i) => (
            <li key={q.id} className={`q-item${p.practised[q.id] ? " done" : ""}`} style={{ animationDelay: `${Math.min(i, 15) * 25}ms` }}>
              <span className="q-num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <p className="q-text">
                  <Link href={questionHref(q.id)}>{q.question}</Link>
                </p>
                <div className="q-meta">
                  <div className="chips">
                    <SubjectChip value={q.subject} />
                    <DifficultyBadge value={q.difficulty} />
                    <RelevanceBadge value={q.relevance} />
                  </div>
                  <QuestionActions q={q} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div style={{ marginTop: 18 }}>
        <Disclaimer text={set.data?.disclaimer} />
      </div>
      <Toast message={toast} />
    </section>
  );
}

export default function CompanyClient({ name }: { name: string }) {
  const company = useAsync(() => api.company(name), [name]);
  const subjects = useAsync(() => api.subjects(), []);

  if (company.loading && !company.data) return <Loading label={`Loading ${name}…`} />;
  if (company.error) {
    return (
      <>
        <div className="breadcrumb">
          <Link href="/companies">Companies</Link> / {name}
        </div>
        <ErrorState title={`Couldn't load ${name}`} message={company.error} onRetry={company.reload} />
        <p style={{ textAlign: "center" }}>
          <Link href="/companies">See all companies</Link>
        </p>
      </>
    );
  }
  if (!company.data) return null;

  const fallbackSubjects = Object.keys(company.data.subject_counts).sort();
  return (
    <>
      <Profile c={company.data} />
      <PracticeSet company={company.data.company} subjects={subjects.data ?? fallbackSubjects} />
    </>
  );
}
