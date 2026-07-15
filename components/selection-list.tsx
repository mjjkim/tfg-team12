type SelectionValue = string | number;

export interface SelectionOption<T extends SelectionValue> {
  label: string;
  value: T;
}

interface SelectionListProps<T extends SelectionValue> {
  ariaLabel: string;
  highlightSelected?: boolean;
  onSelect: (value: T) => void;
  options: readonly SelectionOption<T>[];
  selectedValue: T;
}

export function SelectionList<T extends SelectionValue>({
  ariaLabel,
  highlightSelected = true,
  onSelect,
  options,
  selectedValue
}: SelectionListProps<T>) {
  return (
    <div className="grid gap-[14px]" role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const selected = option.value === selectedValue;

        return (
          <button
            key={option.value}
            type="button"
            className={`h-[47px] min-h-0 w-[calc(100%+2px)] rounded-[10px] border bg-[#2f4258] px-[13px] text-left text-[16px] font-medium leading-[19px] text-white transition-colors hover:bg-[#3a5068] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#00ecfc] ${
              selected && highlightSelected ? "border-[#00ecfc]" : "border-[#60768d]"
            }`}
            onClick={() => onSelect(option.value)}
            aria-pressed={selected}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
