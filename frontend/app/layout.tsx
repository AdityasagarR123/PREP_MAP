import type { Metadata, Viewport } from "next";
import { Instrument_Sans } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ServerBanner from "@/components/ServerBanner";
import { SITE } from "@/lib/links";

const instrument = Instrument_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-instrument",
});

export const metadata: Metadata = {
  title: {
    default: "PrepMap — company-matched placement & interview prep",
    template: "%s · PrepMap",
  },
  description: SITE.description,
  applicationName: "PrepMap",
  keywords: ["placement preparation", "interview questions", "TCS NQT", "Infosys", "DSA", "aptitude", "campus placement India"],
  openGraph: {
    title: "PrepMap — company-matched placement & interview prep",
    description: SITE.description,
    type: "website",
    siteName: "PrepMap",
  },
  twitter: { card: "summary", title: "PrepMap", description: SITE.description },
};

export const viewport: Viewport = {
  themeColor: "#fafafa",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={instrument.variable}>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Header />
        <ServerBanner />
        <main id="main">
          <div className="container">{children}</div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
