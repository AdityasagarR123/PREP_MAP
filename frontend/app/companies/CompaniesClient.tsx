"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { CATEGORY_GROUPS, capitalize, categoryGroup, companyHref } from "@/lib/format";
import { ConfidenceBadge, SubjectChip } from "@/components/Badges";
import { Disclaimer, EmptyState, ErrorState, Loading } from "@/components/States";
import Tilt from "@/components/Tilt";
import CompanyLogo from "@/components/CompanyLogo";

export default function CompaniesClient() {
  const { data, error, loading, reload } = useAsync(() => api.companies(), []);
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.filter((c) => (cat === "all" || categoryGroup(c.category) === cat) && (!q || c.company.toLowerCase().includes(q)));
  }, [data, cat, query]);

  const groupsPresent = useMemo(() => {
    if (!data) return CATEGORY_GROUPS;
    const keys = new Set(data.map((c) => categoryGroup(c.category)));
    return CATEGORY_GROUPS.filter((g) => keys.has(g.key));
  }, [data]);

  return (
    <>
      <div className="panel" style={{ marginBottom: 22 }}>
        <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr)", gap: 14 }}>
          <div className="field">
            <label htmlFor="company-search">Search by name</label>
            <input
              id="company-search"
              className="input"
              type="search"
              placeholder="e.g. Infosys, ZS Associates"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div>
            <span className="label" id="cat-label">
              Category
            </span>
            <div className="segmented" role="group" aria-labelledby="cat-label" style={{ marginTop: 6 }}>
              <button type="button" aria-pressed={cat === "all"} onClick={() => setCat("all")}>
                All
              </button>
              {groupsPresent.map((g) => (
                <button key={g.key} type="button" aria-pressed={cat === g.key} onClick={() => setCat(g.key)}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && !data && <Loading label="Loading companies…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && filtered.length === 0 && (
        <EmptyState title="No companies match">
          <button
            type="button"
            className="btn"
            onClick={() => {
              setQuery("");
              setCat("all");
            }}
          >
            Clear filters
          </button>
        </EmptyState>
      )}

      {data && filtered.length > 0 && (
        <>
          <p className="small faint" aria-live="polite">
            Showing {filtered.length} of {data.length} companies
          </p>
          <ul className="grid grid-auto" style={{ listStyle: "none", padding: 0, margin: "0 0 28px" }}>
            {filtered.map((c, i) => (
              <li key={c.company} style={{ animation: `rise 0.4s ease ${Math.min(i, 12) * 30}ms both` }}>
                <Tilt style={{ height: "100%" }}>
                  <Link href={companyHref(c.company)} className="company-card">
                    <div className="company-head lift">
                      <CompanyLogo name={c.company} />
                      <div>
                        <h3>{c.company}</h3>
                        <div className="company-cat">{c.category}</div>
                      </div>
                    </div>
                    <div>
                      <div className="kicker" style={{ marginBottom: 8, fontSize: "0.7rem" }}>
                        Core subjects
                      </div>
                      <div className="chips">
                        {c.core_subjects.map((s) => (
                          <SubjectChip key={s} value={s} />
                        ))}
                      </div>
                    </div>
                    <div className="muted small">Difficulty focus: {c.difficulty_focus.map(capitalize).join(", ")}</div>
                    <div className="card-foot">
                      <ConfidenceBadge value={c.data_confidence} />
                      <span className="card-arrow">View profile →</span>
                    </div>
                  </Link>
                </Tilt>
              </li>
            ))}
          </ul>
        </>
      )}
      <Disclaimer />
    </>
  );
}
