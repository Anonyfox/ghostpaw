interface PackTrustPipsProps {
  trust: number;
  size?: "sm" | "md";
}

function pipColor(trust: number): string {
  if (trust >= 0.7) return "bg-info";
  if (trust >= 0.4) return "bg-warning";
  return "bg-secondary";
}

export function PackTrustPips({ trust, size = "sm" }: PackTrustPipsProps) {
  const filled = Math.round(trust * 10);
  const color = pipColor(trust);
  const dim = size === "md" ? 12 : 8;
  const gap = size === "md" ? 3 : 2;

  return (
    <div class="d-flex align-items-center" style={`gap: ${gap}px;`}>
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={i}
          class={`rounded-circle d-inline-block ${i < filled ? color : ""}`}
          style={`width: ${dim}px; height: ${dim}px; ${
            i < filled ? "" : `border: 1px solid var(--bs-secondary); opacity: 0.4;`
          }`}
        />
      ))}
    </div>
  );
}
