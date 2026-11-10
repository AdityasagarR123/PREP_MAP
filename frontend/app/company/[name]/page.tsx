import type { Metadata } from "next";
import { Suspense } from "react";
import CompanyClient from "./CompanyClient";
import { Loading } from "@/components/States";
import { decodeSegment } from "@/lib/params";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeSegment((await params).name);
  return {
    title: `${name} — hiring profile & practice questions`,
    description: `${name} hiring process, core subjects and difficulty focus, plus a shareable practice set of questions recommended for ${name}'s public hiring process.`,
  };
}

export default async function CompanyPage({ params }: Props) {
  const name = decodeSegment((await params).name);
  return (
    <Suspense fallback={<Loading />}>
      <CompanyClient name={name} />
    </Suspense>
  );
}
