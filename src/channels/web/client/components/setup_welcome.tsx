interface SetupWelcomeProps {
  onNext: () => void;
}

export function SetupWelcome({ onNext }: SetupWelcomeProps) {
  return (
    <div class="text-center">
      <h2 class="text-info mb-3">Welcome to Ghostpaw</h2>
      <p class="text-muted mb-4" style="max-width: 480px; margin: 0 auto;">
        Ghostpaw is your personal AI agent — it learns, remembers, and grows over time. Let's get
        you set up with an LLM provider so your wolf can think.
      </p>
      <button type="button" class="btn btn-primary btn-lg" onClick={onNext}>
        Get Started
      </button>
    </div>
  );
}
