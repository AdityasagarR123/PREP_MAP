"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BrandCube, IconClose, IconMenu } from "./Icons";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/companies", label: "Companies" },
  { href: "/analyse", label: "Analyse" },
  { href: "/progress", label: "My progress" },
  { href: "/about", label: "About" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/companies") return pathname.startsWith("/companies") || pathname.startsWith("/company/");
  return pathname.startsWith(href);
}

export default function Header() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`site-header${scrolled ? " scrolled" : ""}`}>
      <nav className="container nav" aria-label="Main">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <BrandCube />
          </span>
          prepmap
        </Link>
        <ul id="main-nav" className={`nav-links${open ? " open" : ""}`}>
          {LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} aria-current={isActive(pathname, l.href) ? "page" : undefined}>
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/companies" className="btn btn-primary btn-sm nav-cta">
          Start practising
        </Link>
        <button
          type="button"
          className="menu-btn"
          aria-expanded={open}
          aria-controls="main-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <IconClose size={22} /> : <IconMenu size={22} />}
        </button>
      </nav>
    </header>
  );
}
