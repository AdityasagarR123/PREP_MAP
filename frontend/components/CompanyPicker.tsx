"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { api } from "@/lib/api";
import { companyHref } from "@/lib/format";
import { useProgress } from "@/lib/progress";
import { useAsync } from "@/lib/useApi";

/** Select a company and jump straight to its practice page. */
export default function CompanyPicker({ label = "Target company", cta = "Start practising" }: { label?: string; cta?: string }) {
  const id = useId();
  const router = useRouter();
  const { data, error, loading, reload } = useAsync(() => api.companies(), []);
  const { target } = useProgress();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!value && target) setValue(target);
  }, [target, value]);

  return (
    <form
      className="quickstart"
      onSubmit={(e) => {
        e.preventDefault();
        if (value) router.push(companyHref(value) + "#practice");
      }}
    >
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select id={id} className="select" value={value} onChange={(e) => setValue(e.target.value)} disabled={loading || !!error}>
        <option value="">{loading ? "Loading companies…" : error ? "Couldn't load companies" : "Choose a company…"}</option>
        {data?.map((c) => (
          <option key={c.company} value={c.company}>
            {c.company}
          </option>
        ))}
      </select>
      {error ? (
        <button type="button" className="btn" onClick={reload}>
          Retry
        </button>
      ) : (
        <button type="submit" className="btn btn-primary" disabled={!value}>
          {cta} →
        </button>
      )}
    </form>
  );
}
