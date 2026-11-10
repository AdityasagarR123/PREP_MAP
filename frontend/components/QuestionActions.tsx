"use client";

import { useEffect, useState } from "react";
import { progress, useProgress } from "@/lib/progress";

interface Q {
  id: string;
  question: string;
  subject: string;
  difficulty: string;
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 1800);
    return () => clearTimeout(t);
  }, [msg]);
  return [msg, setMsg] as const;
}

/** Practised / Revise later / Copy buttons for one question. */
export default function QuestionActions({ q, showCopy = true, size = "sm" }: { q: Q; showCopy?: boolean; size?: "sm" | "md" }) {
  const p = useProgress();
  const practised = Boolean(p.practised[q.id]);
  const revise = Boolean(p.revise[q.id]);
  const [toast, setToast] = useToast();
  const cls = size === "sm" ? "btn btn-sm" : "btn";

  return (
    <div className="btn-row">
      <button
        type="button"
        className={`${cls} ${practised ? "on-practised" : ""}`}
        aria-pressed={practised}
        onClick={() => progress.togglePractised(q)}
      >
        {practised ? "✓ Practised" : "Mark practised"}
      </button>
      <button
        type="button"
        className={`${cls} ${revise ? "on-revise" : ""}`}
        aria-pressed={revise}
        onClick={() => progress.toggleRevise(q)}
      >
        {revise ? "★ Revise later" : "☆ Revise later"}
      </button>
      {showCopy && (
        <button
          type="button"
          className={`${cls} btn-ghost`}
          onClick={async () => setToast((await copyText(q.question)) ? "Question copied" : "Couldn't copy — select the text instead")}
          aria-label="Copy question text"
        >
          Copy
        </button>
      )}
      <Toast message={toast} />
    </div>
  );
}

export { copyText };
