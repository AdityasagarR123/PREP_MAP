import type { Metadata } from "next";
import ProgressClient from "./ProgressClient";

export const metadata: Metadata = {
  title: "My progress",
  description: "Track the questions you've practised and saved to revise, by subject and difficulty. Stored only in your browser.",
};

export default function ProgressPage() {
  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Your prep</div>
        <h1>My progress</h1>
        <p>Everything here is saved only in this browser — no account, nothing sent to a server.</p>
      </header>
      <ProgressClient />
    </>
  );
}
