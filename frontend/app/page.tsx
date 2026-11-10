import type { Metadata } from "next";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: { absolute: "PrepMap — company-matched placement & interview prep" },
  description:
    "Pick a target company (TCS, Infosys, Google, Amazon and more) and practise questions matched to its public hiring process. 1,770 original questions across 15 subjects.",
};

export default function HomePage() {
  return <HomeClient />;
}
