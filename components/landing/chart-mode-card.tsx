interface ChartModeCardProps {
  title: string;
  ariaLabel: string;
  onClick: () => void;
}

export default function ChartModeCard({ title, ariaLabel, onClick }: ChartModeCardProps) {
  return (
    <button
      type="button"
      className="flex h-[200px] w-full items-center justify-center rounded-[10px] border border-[#20324a] bg-[#06142b] text-center text-[20px] font-semibold leading-normal text-white transition-colors hover:border-[#00ecfc] active:bg-[#0a1c39]"
      aria-label={ariaLabel}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      {title}
    </button>
  );
}
