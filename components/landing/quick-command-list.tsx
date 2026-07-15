interface QuickCommand {
  label: string;
  value: string;
}

interface QuickCommandListProps {
  commands: readonly QuickCommand[];
  onSelect: (value: string) => void;
}

export default function QuickCommandList({ commands, onSelect }: QuickCommandListProps) {
  return (
    <section aria-labelledby="quick-command-title">
      <h2
        id="quick-command-title"
        className="text-[14px] font-medium leading-normal text-[#888888]"
      >
        빠른 명령 예시
      </h2>
      <ul className="mt-[10px] flex flex-col gap-[10px]" role="list">
        {commands.map((command) => (
          <li key={command.value}>
            <button
              type="button"
              className="landing-quick-command block p-0 text-left text-[14px] font-normal leading-normal text-[#888888] transition-colors hover:text-white"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => onSelect(command.value)}
            >
              {command.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
