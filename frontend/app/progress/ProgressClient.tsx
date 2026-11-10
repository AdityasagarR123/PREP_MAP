"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { capitalize, companyHref, DIFFICULTY_ORDER, questionHref } from "@/lib/format";
import { progress, useProgress } from "@/lib/progress";
import { DifficultyBadge, SubjectChip } from "@/components/Badges";
import { EmptyState, ErrorState, Loading } from "@/components/States";
import Tilt from "@/components/Tilt";

function count<T>(items: T[], key: (t: T) => string) {
  const m = new Map<string, number>();
  items.forEach((i) => m.set(key(i), (m.get(key(i)) || 0) + 1));
  return m;
}

function BarList({ rows }: { rows: [string, number, number?][] }) {
  const max = Math.max(1, ...rows.map(([, v, of]) => of ?? v));
  return (
    <div className="bars">
      {rows.map(([k, v, of]) => {
        const denom = of ?? max;
        return (
          <div className="bar-row" key={k}>
            <span>{k}</span>
            <div className="bar" role="img" aria-label={of !== undefined ? `${k}: ${v} of ${of}` : `${k}: ${v}`}>
              <span style={{ width: `${denom ? Math.min(100, (v / denom) * 100) : 0}%` }} />
            </div>
            <span className="bar-value">{of !== undefined ? `${v} / ${of}` : v}</span>
          </div>
        );
      })}
    </div>
  );
}

function TargetPanel({ target }: { target: string | null }) {
  const companies = useAsync(() => api.companies(), []);
  const detail = useAsync(target ? () => api.company(target) : null, [target]);
  const p = useProgress();
  const practisedBySubject = useMemo(() => count(Object.values(p.practised), (q) => q.subject), [p.practised]);

  return (
    <section className="panel" aria-labelledby="target-h">
      <div className="panel-title">
        <h2 id="target-h" style={{ fontSize: "1.2rem" }}>
          Target company
        </h2>
        {target && (
          <Link href={companyHref(target) + "#practice"} className="btn btn-sm btn-primary">
            Practise {target} →
          </Link>
        )}
      </div>
      <div className="field" style={{ maxWidth: 360, marginBottom: 18 }}>
        <label htmlFor="target-select">Choose your target</label>
        <select
          id="target-select"
          className="select"
          value={target ?? ""}
          onChange={(e) => progress.setTarget(e.target.value || null)}
          disabled={companies.loading || !!companies.error}
        >
          <option value="">{companies.loading ? "Loading companies…" : "No target set"}</option>
          {companies.data?.map((c) => (
            <option key={c.company} value={c.company}>
              {c.company}
            </option>
          ))}
          {target && companies.data && !companies.data.some((c) => c.company === target) && <option value={target}>{target}</option>}
        </select>
        {companies.error && (
          <span className="field-error">
            {companies.error}{" "}
            <button type="button" className="btn btn-sm" onClick={companies.reload}>
              Retry
            </button>
          </span>
        )}
      </div>

      {!target && <p className="muted">Set a target company to see how much of its core subjects you&apos;ve covered.</p>}
      {target && detail.loading && <Loading label={`Loading ${target}…`} />}
      {target && detail.error && <ErrorState message={detail.error} onRetry={detail.reload} />}
      {target && detail.data && (
        <>
          <div className="label" style={{ marginBottom: 8 }}>
            Core subjects for {detail.data.company}: practised vs available
          </div>
          {detail.data.core_subjects.length ? (
            <BarList
              rows={detail.data.core_subjects.map((s) => [s, practisedBySubject.get(s) || 0, detail.data!.subject_counts[s] ?? 0] as [string, number, number])}
            />
          ) : (
            <p className="muted">This profile lists no core subjects.</p>
          )}
          <p className="small faint" style={{ marginTop: 10, marginBottom: 0 }}>
            Practised counts include any question you practised in that subject, from any company&apos;s set.
          </p>
        </>
      )}
    </section>
  );
}

export default function ProgressClient() {
  const p = useProgress();
  const [mounted, setMounted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setMounted(true), []);

  const practised = useMemo(() => Object.values(p.practised).sort((a, b) => b.at - a.at), [p.practised]);
  const revise = useMemo(() => Object.values(p.revise).sort((a, b) => b.at - a.at), [p.revise]);
  const bySubject = useMemo(() => [...count(practised, (q) => q.subject).entries()].sort((a, b) => b[1] - a[1]), [practised]);
  const byDiff = useMemo(() => {
    const m = count(practised, (q) => q.difficulty.toLowerCase());
    return DIFFICULTY_ORDER.map((d) => [capitalize(d), m.get(d) || 0] as [string, number]);
  }, [practised]);

  if (!mounted) return <Loading label="Loading your progress…" />;

  return (
    <div className="grid" style={{ gap: 20 }}>
      <div className="grid grid-3">
        <Tilt>
          <div className="panel">
            <div className="stat-value grad-text">{practised.length}</div>
            <div className="stat-label">questions practised</div>
          </div>
        </Tilt>
        <Tilt>
          <div className="panel">
            <div className="stat-value grad-text">{revise.length}</div>
            <div className="stat-label">saved to revise later</div>
          </div>
        </Tilt>
        <Tilt>
          <div className="panel">
            <div className="stat-value grad-text">{bySubject.length}</div>
            <div className="stat-label">subjects covered</div>
          </div>
        </Tilt>
      </div>

      <TargetPanel target={p.target} />

      <div className="grid grid-2">
        <section className="panel" aria-labelledby="subj-h">
          <h2 id="subj-h" style={{ fontSize: "1.2rem" }}>
            Practised by subject
          </h2>
          {bySubject.length ? <BarList rows={bySubject} /> : <p className="muted">Nothing practised yet.</p>}
        </section>
        <section className="panel" aria-labelledby="diff-h">
          <h2 id="diff-h" style={{ fontSize: "1.2rem" }}>
            Practised by difficulty
          </h2>
          {practised.length ? <BarList rows={byDiff} /> : <p className="muted">Nothing practised yet.</p>}
        </section>
      </div>

      <section className="panel" aria-labelledby="rev-h">
        <div className="panel-title">
          <h2 id="rev-h" style={{ fontSize: "1.2rem" }}>
            Revise later
          </h2>
          <span className="muted small">{revise.length} saved</span>
        </div>
        {revise.length === 0 ? (
          <EmptyState title="No saved questions yet">
            <p className="muted">Tap “☆ Revise later” on any question to save it here.</p>
            <Link href="/companies" className="btn" style={{ marginTop: 10 }}>
              Find questions
            </Link>
          </EmptyState>
        ) : (
          <ul className="link-list">
            {revise.map((q) => (
              <li key={q.id}>
                <Link href={questionHref(q.id)} style={{ flex: "1 1 300px", color: "var(--text)" }}>
                  {q.question}
                </Link>
                <span className="chips">
                  <SubjectChip value={q.subject} />
                  <DifficultyBadge value={q.difficulty} />
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => progress.toggleRevise(q)} aria-label={`Remove “${q.question}” from revise later`}>
                    Remove
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {practised.length > 0 && (
        <section className="panel" aria-labelledby="recent-h">
          <h2 id="recent-h" style={{ fontSize: "1.2rem" }}>
            Recently practised
          </h2>
          <ul className="link-list">
            {practised.slice(0, 10).map((q) => (
              <li key={q.id}>
                <Link href={questionHref(q.id)} style={{ flex: "1 1 300px", color: "var(--text)" }}>
                  {q.question}
                </Link>
                <span className="chips">
                  <SubjectChip value={q.subject} />
                  <DifficultyBadge value={q.difficulty} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-labelledby="reset-h">
        <h2 id="reset-h" style={{ fontSize: "1.2rem" }}>
          Reset progress
        </h2>
        {!confirming ? (
          <>
            <p className="muted">Clears your practised and revise-later lists in this browser. Your target company is kept.</p>
            <button type="button" className="btn btn-danger" onClick={() => setConfirming(true)} disabled={!practised.length && !revise.length}>
              Reset progress…
            </button>
          </>
        ) : (
          <div className="notice warn" role="alertdialog" aria-labelledby="confirm-text">
            <div>
              <p id="confirm-text" style={{ margin: "0 0 10px" }}>
                <strong>Are you sure?</strong> This removes {practised.length} practised and {revise.length} revise-later questions. It can&apos;t be undone.
              </p>
              <div className="btn-row">
                <button
                  type="button"
                  className="btn btn-danger"
                  autoFocus
                  onClick={() => {
                    progress.reset();
                    setConfirming(false);
                  }}
                >
                  Yes, reset
                </button>
                <button type="button" className="btn" onClick={() => setConfirming(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
