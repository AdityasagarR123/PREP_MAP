"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { companyHref, RELEVANCE_HINT, RELEVANCE_ORDER } from "@/lib/format";
import { DifficultyBadge, RelevanceBadge, SubjectChip } from "@/components/Badges";
import { Disclaimer, ErrorState, Loading } from "@/components/States";
import QuestionActions, { copyText, Toast, useToast } from "@/components/QuestionActions";
import CompanyLogo from "@/components/CompanyLogo";

export default function QuestionClient({ id }: { id: string }) {
  const { data, error, loading, reload } = useAsync(() => api.question(id), [id]);
  const [toast, setToast] = useToast();

  if (loading && !data) return <Loading label="Loading question…" />;
  if (error)
    return (
      <>
        <ErrorState title="Couldn't load this question" message={error} onRetry={reload} />
        <p style={{ textAlign: "center" }}>
          <Link href="/companies">Browse companies</Link>
        </p>
      </>
    );
  if (!data) return null;

  const groups = RELEVANCE_ORDER.map((rel) => ({ rel, items: data.companies.filter((c) => c.relevance.toLowerCase() === rel) })).filter(
    (g) => g.items.length,
  );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <div className="breadcrumb">
        <Link href="/">Home</Link> / Question <span className="kbd">{data.id}</span>
      </div>
      <article className="flashcard" style={{ marginBottom: 22 }}>
        <div className="chips">
          <SubjectChip value={data.subject} />
          <DifficultyBadge value={data.difficulty} />
        </div>
        <h1 className="q-big" style={{ letterSpacing: "-0.01em" }}>
          {data.question}
        </h1>
        <div className="btn-row" style={{ justifyContent: "space-between" }}>
          <QuestionActions q={data} size="md" />
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => setToast((await copyText(window.location.href)) ? "Link copied" : "Couldn't copy the link")}
          >
            🔗 Share link
          </button>
        </div>
      </article>

      <section className="panel" aria-labelledby="rec-h">
        <div className="panel-title">
          <h2 id="rec-h" style={{ fontSize: "1.2rem" }}>
            Recommended for
          </h2>
          <span className="muted small">{data.companies.length} companies</span>
        </div>
        {groups.length === 0 ? (
          <p className="muted">This question isn&apos;t mapped to any company profile.</p>
        ) : (
          groups.map((g) => (
            <div className="rel-group" key={g.rel}>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                <RelevanceBadge value={g.rel} />
                <span className="small faint">{RELEVANCE_HINT[g.rel]}</span>
              </div>
              <div className="chips">
                {g.items.map((c) => (
                  <Link key={c.company} href={companyHref(c.company)} className="chip" style={{ padding: "5px 12px 5px 5px" }}>
                    <CompanyLogo name={c.company} size={22} />
                    {c.company}
                  </Link>
                ))}
              </div>
            </div>
          ))
        )}
        <div style={{ marginTop: 18 }}>
          <Disclaimer />
        </div>
      </section>
      <p className="small faint" style={{ marginTop: 16 }}>
        PrepMap doesn&apos;t include model answers yet — practise answering it yourself, then mark it as practised.
      </p>
      <Toast message={toast} />
    </div>
  );
}
