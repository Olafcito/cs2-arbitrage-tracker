import { AlertTriangle } from "lucide-react";

interface Props {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: Props) {
  return (
    <div className="flex items-start gap-2 px-3 py-2 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-200 ml-2 shrink-0"
        >
          ✕
        </button>
      )}
    </div>
  );
}
