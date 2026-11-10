"use client";

import Link from "next/link";
import { useMemo, useRef } from "react";
import { api } from "@/lib/api";
import { useAsync } from "@/lib/useApi";
import { companyHref, pct, questionHref } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { DifficultyBadge, RelevanceBadge } from "./Badges";
import { IconBookmark, IconBrain, IconChart, IconCheck, IconLayers } from "./Icons";

/** Analyser output observed for this example question (shown as a labelled example). */
const EXAMPLE = {
  q: "What is a deadlock in operating systems and what conditions cause it?",
  top: [
    { s: "Operating Systems", p: 0.98 },
    { s: "DBMS & SQL", p: 0.004 },
    { s: "System Design", p: 0.004 },
  ],
};

/**
 * Floating stack of "dashboard" widgets for the hero. Tilts in 3D toward the
 * pointer. The practice set is live from the API; progress is from this browser.
 */
export default function HeroStack() {
  const ref = useRef<HTMLDivElement>(null);
  const p = useProgress();
  const company = p.target || "TCS";
  const set = useAsync(() => api.practice({ company, n: 4, seed: 2024 }), [company]);
  const practised = Object.keys(p.practised).length;
  const revise = Object.keys(p.revise).length;
  const subjects = useMemo(() => new Set(Object.values(p.practised).map((q) => q.subject)).size, [p.practised]);

  function onMove(e: React.PointerEvent) {
    const el = ref.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--sy", `${-10 + x * 14}deg`);
    el.style.setProperty("--sx", `${6 - y * 10}deg`);
  }
  function onLeave() {
    ref.current?.style.setProperty("--sy", "-10deg");
    ref.current?.style.setProperty("--sx", "6deg");
  }

  const max = Math.max(1, practised, revise, subjects);

  return (
    <div className="stack" onPointerMove={onMove} onPointerLeave={onLeave}>
      <div className="stack-inner" ref={ref}>
        {/* Live practice set */}
        <div className="widget" style={{ left: 0, top: 120, width: "58%", transform: "translateZ(0px)" }}>
          <div className="widget-head">
            <span className="wi">
              <IconLayers /> {company} practice set
            </span>
            <span className="widget-dots">•••</span>
          </div>
          {set.loading &&
            [0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 36, marginTop: i ? 6 : 0 }} />)}
          {set.error && <p className="w-sub">Practice set will appear once the server is awake.</p>}
          {set.data?.questions.map((q) => (
            <Link key={q.id} href={questionHref(q.id)} className="w-row" style={{ textDecoration: "none" }}>
              <span className="w-ico">
                {p.practised[q.id] ? <IconCheck size={15} /> : <IconBrain size={15} />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="t" style={{ display: "block" }}>
                  {q.question}
                </span>
                <span className="w-sub">{q.subject}</span>
              </span>
            </Link>
          ))}
          <div className="w-sub" style={{ marginTop: 10, display: "flex", justifyContent: "space-between" }}>
            <span>{set.data ? `${set.data.total_available} recommended questions` : " "}</span>
            <Link href={companyHref(company) + "#practice"} style={{ fontWeight: 600 }}>
              Open →
            </Link>
          </div>
        </div>

        {/* Analyser example */}
        <div className="widget" style={{ right: 0, top: 0, width: "48%", animationDelay: "-2s", transform: "translateZ(60px)" }}>
          <div className="widget-head">
            <span className="wi">
              <IconBrain /> Question analyser
            </span>
            <span className="chip" style={{ fontSize: "0.68rem", padding: "1px 8px" }}>
              Example
            </span>
          </div>
          <div className="w-row" style={{ background: "var(--accent-soft)" }}>
            <span className="t" style={{ whiteSpace: "normal" }}>
              “{EXAMPLE.q}”
            </span>
          </div>
          <div style={{ marginTop: 10 }}>
            {EXAMPLE.top.map((c) => (
              <div key={c.s} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                <span style={{ flex: 1, color: "var(--text-2)" }}>{c.s}</span>
                <span className="w-bar">
                  <span style={{ width: `${Math.max(4, c.p * 100)}%` }} />
                </span>
                <span className="w-sub" style={{ width: 30, textAlign: "right" }}>
                  {pct(c.p)}
                </span>
              </div>
            ))}
          </div>
          <div className="chips" style={{ marginTop: 12 }}>
            <DifficultyBadge value="medium" />
            <RelevanceBadge value="core" />
            <span className="w-sub" style={{ alignSelf: "center" }}>
              for ION Group
            </span>
          </div>
        </div>

        {/* Progress summary */}
        <div className="widget" style={{ right: "2%", bottom: 0, width: "46%", animationDelay: "-4s", transform: "translateZ(90px)" }}>
          <div className="widget-head">
            <span className="wi">
              <IconChart /> Your progress
            </span>
            <span className="widget-dots">•••</span>
          </div>
          {[
            { label: "Practised", v: practised, icon: <IconCheck size={14} /> },
            { label: "Revise later", v: revise, icon: <IconBookmark size={14} /> },
            { label: "Subjects covered", v: subjects, icon: <IconLayers size={14} /> },
          ].map((r) => (
            <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
              <span style={{ color: "var(--accent)", display: "inline-flex" }}>{r.icon}</span>
              <span style={{ flex: 1, color: "var(--text-2)" }}>{r.label}</span>
              <strong style={{ fontWeight: 600, minWidth: 22, textAlign: "right" }}>{r.v}</strong>
              <span className="w-bar">
                <span style={{ width: `${(r.v / max) * 100}%` }} />
              </span>
            </div>
          ))}
          <div className="w-sub" style={{ marginTop: 10 }}>
            Saved in this browser · <Link href="/progress">View</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
