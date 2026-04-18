interface Props {
  label: string;
  className?: string;
}

export default function Badge({ label, className = "" }: Props) {
  return (
    <span
      className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-medium ${className}`}
    >
      {label}
    </span>
  );
}
