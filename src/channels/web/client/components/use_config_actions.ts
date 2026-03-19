import type { RefObject } from "preact";
import type { ConfigInfo } from "../../shared/config_types.ts";
import { apiDelete } from "../api_delete.ts";
import { apiPost } from "../api_post.ts";

type Feedback = { type: "success" | "danger"; message: string };
type SetState<T> = (value: T) => void;

export function useConfigActions(
  config: ConfigInfo,
  inputRef: RefObject<HTMLInputElement>,
  setEditing: SetState<boolean>,
  setSubmitting: SetState<boolean>,
  setFeedback: SetState<Feedback | null>,
  onChanged: () => void,
) {
  const handleSave = async () => {
    const raw = inputRef.current?.value ?? "";
    setSubmitting(true);
    try {
      await apiPost<{ ok: boolean }>("/api/config", {
        key: config.key,
        value: raw,
        ...(config.category === "custom" ? { type: config.type } : {}),
      });
      setEditing(false);
      setFeedback({ type: "success", message: "Saved." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : String(err) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndo = async () => {
    try {
      await apiPost(`/api/config/${encodeURIComponent(config.key)}/undo`);
      setFeedback({ type: "success", message: "Undone." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleReset = async () => {
    try {
      await apiDelete(`/api/config/${encodeURIComponent(config.key)}`);
      setFeedback({ type: "success", message: "Reset." });
      onChanged();
    } catch (err: unknown) {
      setFeedback({ type: "danger", message: err instanceof Error ? err.message : String(err) });
    }
  };

  return { handleSave, handleUndo, handleReset };
}
