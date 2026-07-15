import Image from "next/image";

interface MonthOption {
  label: string;
  value: string;
}

interface MonthSelectProps {
  id: string;
  label: string;
  options: readonly MonthOption[];
  value: string;
  onChange: (value: string) => void;
}

function stopTapPropagation(event: React.PointerEvent) {
  event.stopPropagation();
}

export function MonthSelect({ id, label, options, value, onChange }: MonthSelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-[16px] font-medium leading-[19px] text-white">
        {label}
      </label>
      <div className="relative mt-[14px] h-[47px] w-[calc(100%+2px)]">
        <select
          id={id}
          className="h-full w-full appearance-none rounded-[10px] border border-[#60768d] bg-[#06142b] px-[13px] pr-12 text-[16px] font-medium leading-normal text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00ecfc] focus-visible:ring-offset-2 focus-visible:ring-offset-[#06142b]"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onPointerDown={stopTapPropagation}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Image
          className="pointer-events-none absolute right-[14px] top-1/2 -translate-y-1/2"
          src="/assets/figma/select-chevron.png"
          width={18}
          height={10}
          alt=""
          aria-hidden="true"
        />
      </div>
    </div>
  );
}
