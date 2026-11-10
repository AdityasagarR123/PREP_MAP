"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { api, friendlyError, type AnalyseResponse } from "@/lib/api";
import { capitalize, companyHref, pct, RELEVANCE_HINT, RELEVANCE_ORDER } from "@/lib/format";
import { DifficultyBadge, RelevanceBadge } from "@/components/Badges";
import { Disclaimer, ErrorState, Loading } from "@/components/States";
import CompanyLogo from "@/components/CompanyLogo";
import Tilt from "@/components/Tilt";

const MIN = 3;
const MAX = 500;

const EXAMPLES = [
  "What is a deadlock in operating systems and what conditions cause it?",
  "Find the length of the longest substring without repeating characters.",
  "A train 150 m long passes a pole in 15 seconds. What is its speed in km/h?",
  "Explain the difference between INNER JOIN and LEFT JOIN with an example.",
  "Design a URL shortener like bit.ly.",
  "Tell me about a time you disagreed with a teammate. How did you handle it?",
  "Estimate the number of cups of tea sold in Bengaluru in a day.",
];

function validate(text: string): string | null {
  const t = text.trim();
  if (t.length === 0) return "Please paste a question to analyse.";
  if (t.length < MIN) return `The question must be at least ${MIN} characters.`;
  if (t.length > MAX) return `The question must be at most ${MAX} characters (currently ${t.length}).`;
  return null;
}

export default function AnalyseClient() {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalyseResponse | null>(null);
  const resultRef = useRef<HTMLElement>(null);

  const validation = validate(text);
  const showValidation = touched && validation;
  const len = text.trim().length;

  async function run(q: string) {
    const v = validate(q);
    setTouched(true);
    if (v) return;
    setLoading(true);
    setError(null);
    try {
      const r = await api.analyse(q.trim());
      setResult(r);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }

  const grouped = result
    ? RELEVANCE_ORDER.map((rel) => ({ rel, items: result.recommended_for.filter((c) => c.relevance.toLowerCase() === rel) })).filter((g) => g.items.length)
    : [];

  return (
    <>
      <form
        className="panel"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          run(text);
        }}
      >
        <div className="field">
          <label htmlFor="q-input">Your question</label>
          <textarea
            id="q-input"
            className="textarea"
            value={text}
            maxLength={MAX + 50}
            placeholder="e.g. What is the difference between a process and a thread?"
            onChange={(e) => setText(e.target.value)}
            onBlur={() => setTouched(true)}
            aria-invalid={Boolean(showValidation)}
            aria-describedby="q-hint q-err"
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <span id="q-err" className="field-error" aria-live="polite">
              {showValidation ? validation : ""}
            </span>
            <span id="q-hint" className="field-hint" style={len > MAX ? { color: "var(--danger)" } : undefined}>
              {len} / {MAX} characters
            </span>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 14 }}>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Analysing…" : "Analyse question"}
          </button>
          {(text || result) && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setText("");
                setResult(null);
                setError(null);
                setTouched(false);
              }}
            >
              Clear
            </button>
          )}
        </div>

        <hr className="divider" />
        <div className="label" style={{ marginBottom: 8 }} id="ex-label">
          Try an example
        </div>
        <div className="example-list" role="group" aria-labelledby="ex-label">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setText(ex);
                run(ex);
              }}
              disabled={loading}
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      <section ref={resultRef} style={{ marginTop: 24, scrollMarginTop: 80 }} aria-live="polite">
        {loading && <Loading label="Running the classifier…" />}
        {!loading && error && <ErrorState title="Couldn't analyse that" message={error} onRetry={() => run(text)} />}
        {!loading && !error && result && (
          <div className="grid" style={{ gap: 20 }}>
            <div className="grid grid-2">
              <Tilt max={5}>
                <div className="panel" style={{ height: "100%" }}>
                  <div className="label">Predicted subject</div>
                  <div className="result-head" style={{ marginTop: 12 }}>
                    <div className="ring" style={{ ["--p" as string]: Math.round(result.subject_confidence * 100) }} aria-hidden="true">
                      <span>{pct(result.subject_confidence)}</span>
                    </div>
                    <div className="lift">
                      <h2 style={{ margin: 0 }}>{result.subject}</h2>
                      <p className="muted small" style={{ margin: "4px 0 0" }}>
                        Model confidence {pct(result.subject_confidence)}
                      </p>
                    </div>
                  </div>
                  <hr className="divider" />
                  <div className="label" style={{ marginBottom: 8 }}>
                    Top {result.subject_candidates.length} candidates
                  </div>
                  <div className="bars">
                    {result.subject_candidates.map((c) => (
                      <div className="bar-row" key={c.subject}>
                        <span>{c.subject}</span>
                        <div className="bar" role="img" aria-label={`${c.subject}: ${pct(c.probability)}`}>
                          <span style={{ width: `${Math.max(2, c.probability * 100)}%` }} />
                        </div>
                        <span className="bar-value">{pct(c.probability)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Tilt>
              <Tilt max={5}>
                <div className="panel" style={{ height: "100%" }}>
                  <div className="label">Predicted difficulty</div>
                  <div style={{ margin: "14px 0", transform: "scale(1.25)", transformOrigin: "left" }}>
                    <DifficultyBadge value={result.difficulty} />
                  </div>
                  <div className="notice warn" role="note">
                    <span className="icon" aria-hidden="true">
                      ⚖️
                    </span>
                    <span>
                      Difficulty predictions are less reliable than subject predictions (macro F1 0.56 vs 0.76). Treat
                      this as a rough estimate.
                    </span>
                  </div>
                  <p className="muted small" style={{ marginTop: 14, marginBottom: 0 }}>
                    Analysed: “{result.question}”
                  </p>
                </div>
              </Tilt>
            </div>

            <div className="panel">
              <div className="panel-title">
                <h2 style={{ fontSize: "1.2rem" }}>Recommended for</h2>
                <span className="muted small">{result.recommended_for.length} companies</span>
              </div>
              {grouped.length === 0 ? (
                <p className="muted">
                  No company profile matches a {capitalize(result.difficulty)} {result.subject} question. Try another
                  question, or <Link href="/companies">browse all companies</Link>.
                </p>
              ) : (
                grouped.map((g) => (
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
                <Disclaimer text={result.disclaimer} />
              </div>
            </div>
          </div>
        )}
        {!loading && !error && !result && (
          <div style={{ marginTop: 4 }}>
            <Disclaimer />
          </div>
        )}
      </section>
    </>
  );
}
