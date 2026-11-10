import type { Metadata } from "next";
import { Suspense } from "react";
import CompaniesClient from "./CompaniesClient";
import { Loading } from "@/components/States";

export const metadata: Metadata = {
  title: "All companies",
  description:
    "Browse 19 company hiring profiles — TCS, Infosys, Wipro, Accenture, Deloitte, ZS Associates, Oracle, Adobe, Google, Amazon and more — with core subjects and difficulty focus.",
};

export default function CompaniesPage() {
  return (
    <>
      <header className="page-head">
        <div className="eyebrow">Companies</div>
        <h1>All companies</h1>
        <p>
          Each profile is built from public information about the company&apos;s hiring process: which subjects matter
          most, and what difficulty to expect.
        </p>
      </header>
      <Suspense fallback={<Loading />}>
        <CompaniesClient />
      </Suspense>
    </>
  );
}
