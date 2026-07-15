const SEGMENTS = Array.from({ length: 12 }, (_, index) => `progress-segment-${index + 1}`);

interface SegmentedProgressProps {
  value: number;
  pulse: boolean;
}

export function SegmentedProgress({ value, pulse }: SegmentedProgressProps) {
  const normalizedValue = Math.min(100, Math.max(0, value));
  const filledSegments = Math.round((normalizedValue / 100) * SEGMENTS.length);

  return (
    <div
      className="flex h-5 items-center gap-[7px]"
      role="progressbar"
      aria-label="현재 캔들 진행률"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(normalizedValue)}
    >
      {SEGMENTS.map((segment, index) => {
        const isFilled = index < filledSegments;
        const isActive = isFilled && index === filledSegments - 1;

        return (
          <span
            key={segment}
            className={`h-5 min-w-0 flex-1 rounded-[4px] border ${
              isFilled
                ? `border-[#00ecfc] bg-[#00ecfc] ${isActive && pulse ? "live-progress-pulse" : ""}`
                : "border-[#20324a] bg-[#06142b]"
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
