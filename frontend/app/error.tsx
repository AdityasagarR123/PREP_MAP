"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="state" role="alert" style={{ minHeight: "50vh" }}>
      <div style={{ fontSize: "3rem" }} aria-hidden="true">
        ⚠️
      </div>
      <h1 style={{ fontSize: "2rem" }}>Something went wrong</h1>
      <p>This page hit an unexpected problem. Please try again.</p>
      <div className="btn-row" style={{ justifyContent: "center" }}>
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link href="/" className="btn">
          Go home
        </Link>
      </div>
    </div>
  );
}
