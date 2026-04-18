import { AlertTriangle, Clock } from "lucide-react";

interface Props {
  message: string;
  variant?: "error" | "rateLimit";
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, variant = "error", onDismiss }: Props) {
  const isRateLimit = variant === "rateLimit";
  return (
    <div className={[
      "flex items-start gap-2 px-3 py-2 rounded border text-xs",
      isRateLimit
        ? "bg-amber-950/60 border-amber-700 text-amber-300"
        : "bg-red-950/60 border-red-800 text-red-300",
    ].join(" ")}>
      {isRateLimit
        ? <Clock size={13} className="mt-0.5 shrink-0" />
        : <AlertTriangle size={13} className="mt-0.5 shrink-0" />}
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`ml-2 shrink-0 ${isRateLimit ? "text-amber-400 hover:text-amber-200" : "text-red-400 hover:text-red-200"}`}
        >
          ✕
        </button>
      )}
    </div>
  );
}
