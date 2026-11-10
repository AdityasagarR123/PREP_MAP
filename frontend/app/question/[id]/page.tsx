import type { Metadata } from "next";
import QuestionClient from "./QuestionClient";
import { decodeSegment } from "@/lib/params";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = decodeSegment((await params).id);
  return {
    title: `Question ${id}`,
    description: `Interview practice question ${id} on PrepMap: subject, difficulty and the companies whose public hiring process it is recommended for.`,
  };
}

export default async function QuestionPage({ params }: Props) {
  const id = decodeSegment((await params).id);
  return <QuestionClient id={id} />;
}
