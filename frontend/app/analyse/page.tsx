import type { Metadata } from "next";
import AnalyseClient from "./AnalyseClient";

export const metadata: Metadata = {
  title: "Analyse a question",
  description:
    "Paste any interview or placement question. An ML model predicts its subject, difficulty and which companies' hiring processes it is recommended for.",
};

export default function AnalysePage() {
  return (
    <>
      <header className="page-head">
        <div className="eyebrow">ML question analyser</div>
        <h1>Analyse a question</h1>
        <p>
          Paste any interview question. The model predicts its subject and difficulty, then matches it against every
          company profile to show where it is recommended.
        </p>
      </header>
      <AnalyseClient />
    </>
  );
}
