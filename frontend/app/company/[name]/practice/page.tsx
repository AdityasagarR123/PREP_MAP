import type { Metadata } from "next";
import { Suspense } from "react";
import PracticeMode from "./PracticeMode";
import { Loading } from "@/components/States";
import { decodeSegment } from "@/lib/params";

type Props = { params: Promise<{ name: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const name = decodeSegment((await params).name);
  return {
    title: `Practice mode — ${name}`,
    description: `Go through a ${name} practice set one question at a time and track what you've practised.`,
  };
}

export default async function PracticePage({ params }: Props) {
  const name = decodeSegment((await params).name);
  return (
    <Suspense fallback={<Loading />}>
      <PracticeMode name={name} />
    </Suspense>
  );
}
