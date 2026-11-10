import { capitalize, RELEVANCE_HINT } from "@/lib/format";

export function DifficultyBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  return (
    <span className={`chip chip-dot ${v}`} title={`Difficulty: ${v}`}>
      {capitalize(v)}
    </span>
  );
}

export function RelevanceBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  return (
    <span className={`chip ${v}`} title={RELEVANCE_HINT[v] || v}>
      {capitalize(v)}
    </span>
  );
}

export function SubjectChip({ value }: { value: string }) {
  return <span className="chip subject">{value}</span>;
}

export function ConfidenceBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  return (
    <span className={`chip chip-dot conf-${v}`} title="How much public information this profile is based on">
      {capitalize(v)} confidence
    </span>
  );
}
