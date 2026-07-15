interface LiveMetricCardProps {
  label: string;
  value: string;
}

export function LiveMetricCard({ label, value }: LiveMetricCardProps) {
  return (
    <article
      className="h-[85px] rounded-[10px] border border-[#20324a] bg-[#06142b] p-[15px]"
      aria-label={`${label}: ${value}`}
    >
      <h2 className="text-[16px] font-medium leading-[19px] text-white">{label}</h2>
      <p className="mt-[10px] text-[20px] font-semibold leading-6 text-white">{value}</p>
    </article>
  );
}
