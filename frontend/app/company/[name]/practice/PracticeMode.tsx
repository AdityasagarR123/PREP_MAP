"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { companyHref, questionHref } from "@/lib/format";
import { filtersToQuery, readFilters } from "@/lib/params";
import { progress, useProgress } from "@/lib/progress";
import { DifficultyBadge, RelevanceBadge, SubjectChip } from "@/components/Badges";
import { Disclaimer, EmptyState, ErrorState, Loading } from "@/components/States";

export default function PracticeMode({ name }: { name: string }) {
  const sp = useSearchParams();
  const filters = useMemo(() => readFilters(sp), [sp]);
  const seed = filters.seed ?? 1;
  const set = useAsync(
    () => api.practice({ company: name, subject: filters.subject, relevance: filters.relevance, difficulty: filters.difficulty, n: filters.n, seed }),
    [name, filters.subject, filters.relevance, filters.difficulty, filters.n, seed],
  );
  const p = useProgress();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [finished, setFinished] = useState(false);

  const questions = set.data?.questions ?? [];
  const total = questions.length;
  const q = questions[index];
  const backHref = `${companyHref(name)}?${filtersToQuery({ ...filters, seed })}#practice`;

  const go = useCallback(
    (delta: number) => {
      if (!total) return;
      if (index + delta >= total) {
        setFinished(true);
        return;
      }
      setDir(delta > 0 ? "fwd" : "back");
      setIndex((i) => Math.max(0, Math.min(total - 1, i + delta)));
    },
    [index, total],
  );

  // Keyboard shortcuts: ← / → to move, P to toggle practised, R to toggle revise.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null;
      if (t && ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      if (finished || !q) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key.toLowerCase() === "p") progress.togglePractised(q);
      else if (e.key.toLowerCase() === "r") progress.toggleRevise(q);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, q, finished]);

  if (set.loading && !set.data) return <Loading label="Preparing your practice set…" />;
  if (set.error) return <ErrorState message={set.error} onRetry={set.reload} />;
  if (!set.data) return null;
  if (total === 0) {
    return (
      <EmptyState title="No questions in this set">
        <Link href={backHref} className="btn">
          ← Change filters
        </Link>
      </EmptyState>
    );
  }

  if (finished) {
    const practisedHere = questions.filter((x) => p.practised[x.id]);
    const reviseHere = questions.filter((x) => p.revise[x.id]);
    const bySubject = new Map<string, number>();
    practisedHere.forEach((x) => bySubject.set(x.subject, (bySubject.get(x.subject) || 0) + 1));
    const subjectRows = [...bySubject.entries()].sort((a, b) => b[1] - a[1]);
    return (
      <section className="panel" aria-labelledby="sum-h" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div className="eyebrow">{set.data.company} · session summary</div>
        <h1 id="sum-h" style={{ fontSize: "2rem" }}>
          {practisedHere.length === total ? "Set complete! 🎉" : "Nice work"}
        </h1>
        <div className="grid grid-3" style={{ margin: "18px 0" }}>
          <div className="stat">
            <div className="stat-value grad-text">
              {practisedHere.length}/{total}
            </div>
            <div className="stat-label">practised</div>
          </div>
          <div className="stat">
            <div className="stat-value grad-text">{reviseHere.length}</div>
            <div className="stat-label">marked to revise</div>
          </div>
          <div className="stat">
            <div className="stat-value grad-text">{bySubject.size}</div>
            <div className="stat-label">subjects covered</div>
          </div>
        </div>
        {subjectRows.length > 0 ? (
          <>
            <div className="label" style={{ marginBottom: 8 }}>
              Subjects you practised
            </div>
            <div className="chips" style={{ marginBottom: 18 }}>
              {subjectRows.map(([s, n]) => (
                <span key={s} className="chip subject">
                  {s} · {n}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">You didn&apos;t mark any question as practised in this set.</p>
        )}
        {reviseHere.length > 0 && (
          <>
            <div className="label" style={{ marginBottom: 8 }}>
              To revise
            </div>
            <ul className="link-list" style={{ marginBottom: 18 }}>
              {reviseHere.map((x) => (
                <li key={x.id}>
                  <Link href={questionHref(x.id)}>{x.question}</Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setFinished(false);
              setIndex(0);
            }}
          >
            ↺ Go through again
          </button>
          <Link href={backHref} className="btn">
            ← Back to {set.data.company}
          </Link>
          <Link href="/progress" className="btn btn-primary">
            My progress →
          </Link>
        </div>
      </section>
    );
  }

  const isPractised = Boolean(p.practised[q.id]);
  const isRevise = Boolean(p.revise[q.id]);
  const done = questions.filter((x) => p.practised[x.id]).length;

  return (
    <div style={{ maxWidth: 820, margin: "0 auto" }}>
      <div className="breadcrumb">
        <Link href="/companies">Companies</Link> / <Link href={backHref}>{set.data.company}</Link> / Practice mode
      </div>
      <div className="panel-title">
        <h1 style={{ fontSize: "1.6rem", margin: 0 }}>{set.data.company} practice</h1>
        <span className="muted" aria-live="polite">
          <strong style={{ color: "var(--text)" }}>
            {index + 1} / {total}
          </strong>{" "}
          · {done} practised
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Position in practice set"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={index + 1}
      >
        <span style={{ width: `${((index + 1) / total) * 100}%` }} />
      </div>

      <div className="flashcard-stage">
        <article key={q.id} className={`flashcard${dir === "back" ? " back" : ""}`} aria-live="polite">
          <div className="chips">
            <SubjectChip value={q.subject} />
            <DifficultyBadge value={q.difficulty} />
            <RelevanceBadge value={q.relevance} />
          </div>
          <p className="q-big">{q.question}</p>
          <div className="btn-row">
            <button
              type="button"
              className={`btn ${isPractised ? "on-practised" : ""}`}
              aria-pressed={isPractised}
              onClick={() => progress.togglePractised(q)}
            >
              {isPractised ? "✓ Practised" : "Mark practised"}
            </button>
            <button
              type="button"
              className={`btn ${isRevise ? "on-revise" : ""}`}
              aria-pressed={isRevise}
              onClick={() => progress.toggleRevise(q)}
            >
              {isRevise ? "★ Revise later" : "☆ Revise later"}
            </button>
            <Link href={questionHref(q.id)} className="btn btn-ghost">
              Open question page
            </Link>
          </div>
        </article>
      </div>

      <div className="btn-row" style={{ justifyContent: "space-between" }}>
        <button type="button" className="btn" onClick={() => go(-1)} disabled={index === 0}>
          ← Previous
        </button>
        <button type="button" className="btn btn-primary" onClick={() => go(1)}>
          {index + 1 === total ? "Finish ✓" : "Next →"}
        </button>
      </div>
      <p className="small faint" style={{ marginTop: 14 }}>
        No model answers are shown — try answering out loud or on paper first. Shortcuts: <span className="kbd">←</span>{" "}
        <span className="kbd">→</span> move, <span className="kbd">P</span> practised, <span className="kbd">R</span> revise later.
      </p>
      <div style={{ marginTop: 14 }}>
        <Disclaimer text={set.data.disclaimer} />
      </div>
    </div>
  );
}
