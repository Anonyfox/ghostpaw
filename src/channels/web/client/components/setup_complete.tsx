import { useState } from "preact/hooks";

interface SetupCompleteProps {
  onFinish: () => void;
}

export function SetupComplete({ onFinish }: SetupCompleteProps) {
  const [loading, setLoading] = useState(false);

  const finish = async () => {
    setLoading(true);
    try {
      await fetch("/api/haunt", { method: "POST" }).catch(() => {});
    } finally {
      setLoading(false);
      onFinish();
    }
  };

  return (
    <div class="text-center">
      <h2 class="text-info mb-3">You're All Set</h2>
      <p class="text-muted mb-4" style="max-width: 480px; margin: 0 auto;">
        Ghostpaw is ready to go. On first launch it will explore your machine to learn about your
        environment — this happens in the background.
      </p>
      <button type="button" class="btn btn-primary btn-lg" disabled={loading} onClick={finish}>
        {loading ? "Starting..." : "Launch Ghostpaw"}
      </button>
    </div>
  );
}
