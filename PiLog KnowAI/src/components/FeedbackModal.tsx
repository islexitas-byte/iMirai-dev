import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  mode: "UP" | "DOWN";
  onClose: () => void;
  onSubmit: (data: {
    percentage: number;
    reason?: string;
    comment?: string;
  }) => void;
};

const DOWN_REASONS = [
  "Incorrect information",
  "Incomplete answer",
  "Irrelevant response",
  "Formatting issue",
  "Too generic",
  "Other",
];

export default function FeedbackModal({
  open,
  mode,
  onClose,
  onSubmit,
}: Props) {
  const isUp = mode === "UP";

  const [percentage, setPercentage] = useState(isUp ? 80 : 30);
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  
  /* ---- RESET ON OPEN ---- */
  useEffect(() => {
    if (open) {
      setPercentage(isUp ? 80 : 30);
      setReason("");
      setComment("");
      setSubmitted(false);
    }
  }, [open, isUp]);

  /* ---- ESC CLOSE ---- */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const min = isUp ? 50 : 0;
  const max = isUp ? 100 : 49;

  const getColor = () => {
    if (percentage < 30) return "text-red-500";
    if (percentage < 70) return "text-amber-500";
    return "text-emerald-600";
  };

  const canSubmit =
    isUp ||
    (reason && (reason !== "Other" || comment.trim().length > 0));

  const handleSubmit = () => {
    onSubmit({
      percentage,
      reason: reason || undefined,
      comment: comment || undefined,
    });

    setSubmitted(true);

    setTimeout(() => {
      onClose();
    }, 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/60"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-2xl
                   shadow-xl p-6 relative
                   animate-in fade-in zoom-in duration-200"
      >
        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400
                     hover:text-slate-600"
        >
          <X size={18} />
        </button>

        {!submitted ? (
          <>
            {/* HEADER */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-semibold text-slate-900">
                {isUp
                  ? "How helpful was this response?"
                  : "What went wrong?"}
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Your feedback helps improve future answers
              </p>
            </div>

            {/* RATING */}
            <div className="mb-6">
              <div
                className={`text-4xl font-bold text-center ${getColor()}`}
              >
                {percentage}%
              </div>

              <input
                type="range"
                min={min}
                max={max}
                value={percentage}
                onChange={(e) =>
                  setPercentage(Number(e.target.value))
                }
                className="w-full mt-4 accent-slate-700"
              />
            </div>

            {/* 👎 DOWN DETAILS */}
            {!isUp && (
              <div className="space-y-4">
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full rounded-lg border border-slate-300
                             p-2 text-sm"
                >
                  <option value="">Select a reason</option>
                  {DOWN_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                {reason === "Other" && (
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Please describe the issue"
                    className="w-full rounded-lg border border-slate-300
                               p-3 text-sm resize-none
                               focus:ring-2 focus:ring-slate-400"
                    rows={3}
                  />
                )}
              </div>
            )}

            {/* ACTIONS */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg
                           text-sm text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                disabled={!canSubmit}
                onClick={handleSubmit}
                className={`px-5 py-2 rounded-lg text-sm font-medium
                  ${
                    canSubmit
                      ? "bg-slate-800 text-white hover:bg-slate-900"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
              >
                Submit feedback
              </button>
            </div>
          </>
        ) : (
          /* THANK YOU STATE */
          <div className="text-center py-10">
            <div className="text-2xl mb-2">🙏</div>
            <h4 className="text-lg font-semibold text-slate-800">
              Thank you!
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              Your feedback has been recorded
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
