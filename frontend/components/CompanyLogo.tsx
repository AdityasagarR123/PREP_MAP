import { hueFor } from "@/lib/format";

/** Initials tile with a per-company tint (no third-party logos). */
export default function CompanyLogo({ name, size = 44 }: { name: string; size?: number }) {
  const h = hueFor(name);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="logo"
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(140deg, hsl(${h} 62% 58%), hsl(${(h + 35) % 360} 58% 46%))`,
      }}
    >
      {initials}
    </span>
  );
}
