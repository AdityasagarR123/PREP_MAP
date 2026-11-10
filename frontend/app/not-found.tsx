import Link from "next/link";

export default function NotFound() {
  return (
    <div className="state" style={{ minHeight: "50vh" }}>
      <div style={{ fontSize: "3rem" }} aria-hidden="true">
        🧭
      </div>
      <h1 style={{ fontSize: "2rem" }}>Page not found</h1>
      <p>That page isn&apos;t on the map.</p>
      <div className="btn-row" style={{ justifyContent: "center" }}>
        <Link href="/" className="btn btn-primary">
          Go home
        </Link>
        <Link href="/companies" className="btn">
          All companies
        </Link>
      </div>
    </div>
  );
}
