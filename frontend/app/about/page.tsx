import type { Metadata } from "next";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/api";
import { LINKS } from "@/lib/links";

export const metadata: Metadata = {
  title: "About the data & models",
  description:
    "How PrepMap works: 1,770 original interview questions across 15 subjects, 19 company profiles from public hiring information, and the ML models behind the question analyser.",
};

const SUBJECTS = [
  "DSA", "Operating Systems", "DBMS & SQL", "Computer Networks", "OOP", "System Design", "Machine Learning",
  "Statistics & Analytics", "Behavioral / HR", "Programming Fundamentals", "Quantitative Aptitude", "Logical Reasoning",
  "Verbal Ability", "Guesstimates & Case Studies", "Cloud & Security",
];

export default function AboutPage() {
  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      <header className="page-head">
        <div className="eyebrow">About</div>
        <h1>How PrepMap works</h1>
        <p>
          PrepMap helps students — especially in India — prepare for placements by matching practice questions to the
          public hiring process of the company they&apos;re targeting.
        </p>
      </header>

      <section className="panel" aria-labelledby="data-h">
        <h2 id="data-h">The data</h2>
        <ul>
          <li>
            <strong>1,770 original questions</strong>, written for this project — not copied from any website.
          </li>
          <li>
            <strong>15 subjects</strong>:
            <div className="chips" style={{ margin: "8px 0" }}>
              {SUBJECTS.map((s) => (
                <span key={s} className="chip subject">
                  {s}
                </span>
              ))}
            </div>
          </li>
          <li>Each question has a difficulty: easy, medium or hard.</li>
          <li>
            <strong>19 company profiles</strong> built from public information about each company&apos;s hiring process
            (test patterns, interview rounds, role descriptions). Each profile links its public source.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="map-h">
        <h2 id="map-h">How the company mapping works</h2>
        <p>
          Each company profile gives every subject a weight, plus a <em>difficulty focus</em> (the difficulty levels
          its process tends to test):
        </p>
        <div className="chips" style={{ marginBottom: 14 }}>
          <span className="chip core">Core = 3</span>
          <span className="chip frequent">Frequent = 2</span>
          <span className="chip occasional">Occasional = 1</span>
        </div>
        <p style={{ marginBottom: 0 }}>
          A question is <strong>recommended for</strong> a company when its subject has a weight in that company&apos;s
          profile <em>and</em> its difficulty is in the company&apos;s difficulty focus. The weight becomes the
          question&apos;s relevance for that company. This is a recommendation, not a record of what any company asked.
        </p>
      </section>

      <section className="panel" aria-labelledby="model-h">
        <h2 id="model-h">The models</h2>
        <p>
          Three model families were compared on the dataset: a Random Forest baseline, Logistic Regression and XGBoost.
          The best-performing model for each task is used by the analyser:
        </p>
        <div className="grid grid-2" style={{ marginBottom: 14 }}>
          <div className="panel" style={{ boxShadow: "none" }}>
            <div className="label">Subject classifier</div>
            <div className="stat-value grad-text" style={{ margin: "8px 0" }}>
              0.762
            </div>
            <div className="muted small">Logistic Regression · macro F1 over 15 subjects</div>
          </div>
          <div className="panel" style={{ boxShadow: "none", marginTop: 0 }}>
            <div className="label">Difficulty classifier</div>
            <div className="stat-value grad-text" style={{ margin: "8px 0" }}>
              0.564
            </div>
            <div className="muted small">Random Forest · macro F1 over 3 levels</div>
          </div>
        </div>
        <div className="btn-row">
          <a className="btn" href={LINKS.dataset} target="_blank" rel="noopener noreferrer">
            🤗 Dataset
          </a>
          <a className="btn" href={LINKS.model} target="_blank" rel="noopener noreferrer">
            🤗 Model
          </a>
          <a className="btn" href={LINKS.github} target="_blank" rel="noopener noreferrer">
            GitHub repo
          </a>
        </div>
      </section>

      <section className="panel" aria-labelledby="lim-h">
        <h2 id="lim-h">Limitations</h2>
        <ul style={{ marginBottom: 0 }}>
          <li>
            <strong>Recommended, not reported.</strong> {DISCLAIMER}
          </li>
          <li>
            <strong>No answers yet.</strong> The dataset has questions only, so PrepMap never shows model answers.
          </li>
          <li>
            <strong>Difficulty is approximate.</strong> Both the labels and the difficulty classifier (macro F1 0.564)
            are rough guides.
          </li>
          <li>
            <strong>Blinkit has low confidence.</strong> Its profile is based on very little public information.{" "}
            <Link href="/company/Blinkit">See the Blinkit profile</Link>.
          </li>
        </ul>
      </section>

      <section className="panel" aria-labelledby="share-h">
        <h2 id="share-h">Share your interview experience</h2>
        <p>
          Went through a placement drive or interview recently? Real reports help make the company profiles more
          accurate for the next batch of students.
        </p>
        {LINKS.experienceForm ? (
          <a className="btn btn-primary" href={LINKS.experienceForm} target="_blank" rel="noopener noreferrer">
            Share your experience →
          </a>
        ) : (
          <button type="button" className="btn" disabled>
            Form coming soon
          </button>
        )}
      </section>
    </div>
  );
}
