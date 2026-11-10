import Link from "next/link";
import { DISCLAIMER } from "@/lib/api";
import { LINKS } from "@/lib/links";
import { BrandCube } from "./Icons";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand" style={{ marginBottom: 12 }}>
              <span className="brand-mark">
                <BrandCube />
              </span>
              prepmap
            </Link>
            <p className="small" style={{ maxWidth: 420, marginTop: 12 }}>
              Placement and interview prep matched to each company&apos;s public hiring process.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <Link href="/companies">Companies</Link>
            <Link href="/analyse">Analyse a question</Link>
            <Link href="/progress">My progress</Link>
            <Link href="/about">About</Link>
          </div>
          <div className="footer-col">
            <h4>Open source</h4>
            <a href={LINKS.github} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            <a href={LINKS.dataset} target="_blank" rel="noopener noreferrer">
              Dataset · Hugging Face
            </a>
            <a href={LINKS.model} target="_blank" rel="noopener noreferrer">
              Model · Hugging Face
            </a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>{DISCLAIMER}</span>
          <span>© {new Date().getFullYear()} PrepMap</span>
        </div>
      </div>
    </footer>
  );
}
