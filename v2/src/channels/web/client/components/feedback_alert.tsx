interface FeedbackAlertProps {
  feedback: { type: "success" | "warning" | "danger"; message: string } | null;
}

export function FeedbackAlert({ feedback }: FeedbackAlertProps) {
  if (!feedback) return null;
  return (
    <div class={`alert alert-${feedback.type} mt-2 mb-0 py-1 px-2 small`}>{feedback.message}</div>
  );
}
