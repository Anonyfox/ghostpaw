import { useEffect, useState } from "preact/hooks";
import { SetupApiKeyInput } from "../components/setup_api_key_input.tsx";
import { SetupComplete } from "../components/setup_complete.tsx";
import { SetupEnvCheck } from "../components/setup_env_check.tsx";
import { SetupProviderPicker } from "../components/setup_provider_picker.tsx";
import { SetupWelcome } from "../components/setup_welcome.tsx";

type Step = "loading" | "welcome" | "provider" | "key" | "env" | "done";

export function SetupPage() {
  const [step, setStep] = useState<Step>("loading");
  const [provider, setProvider] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/setup/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.hasLlmKey) {
          window.location.assign("/dashboard");
        } else {
          setStep("welcome");
        }
      })
      .catch(() => setStep("welcome"));
  }, []);

  const handleFinish = () => {
    window.location.assign("/dashboard");
  };

  if (step === "loading") {
    return (
      <div class="d-flex align-items-center justify-content-center vh-100">
        <p class="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div class="d-flex align-items-center justify-content-center vh-100">
      <div class="card border shadow" style="width: 560px; max-width: 95vw;">
        <div class="card-body p-4">
          {step === "welcome" && <SetupWelcome onNext={() => setStep("provider")} />}
          {step === "provider" && (
            <SetupProviderPicker
              selected={provider}
              onSelect={setProvider}
              onNext={() => setStep("key")}
            />
          )}
          {step === "key" && provider && (
            <SetupApiKeyInput
              provider={provider}
              onDone={() => setStep("env")}
              onBack={() => setStep("provider")}
            />
          )}
          {step === "env" && (
            <SetupEnvCheck onNext={() => setStep("done")} onBack={() => setStep("key")} />
          )}
          {step === "done" && <SetupComplete onFinish={handleFinish} />}
        </div>
      </div>
    </div>
  );
}
