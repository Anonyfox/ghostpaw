interface MentorActionCardProps {
  title: string;
  description: string;
  buttonLabel: string;
  disabled: boolean;
  active: boolean;
  variant?: "default" | "ready";
  statusText?: string;
  onClick: () => void;
}

export function MentorActionCard({
  title,
  description,
  buttonLabel,
  disabled,
  active,
  variant = "default",
  statusText,
  onClick,
}: MentorActionCardProps) {
  const borderClass = active
    ? "border-info"
    : variant === "ready"
      ? "border-warning"
      : "border-secondary";

  return (
    <div
      class={`card h-100 bg-body-tertiary ${borderClass}`}
      style={disabled && !active ? "opacity: 0.5;" : ""}
    >
      <div class="card-body d-flex flex-column">
        <h6 class="card-title mb-1">{title}</h6>
        <p class="card-text text-muted small flex-grow-1 mb-2">{description}</p>
        <button
          type="button"
          class={`btn btn-sm ${variant === "ready" ? "btn-warning" : "btn-outline-info"}`}
          disabled={disabled}
          onClick={onClick}
        >
          {buttonLabel}
        </button>
        {statusText && <div class="text-muted small mt-1">{statusText}</div>}
      </div>
    </div>
  );
}
