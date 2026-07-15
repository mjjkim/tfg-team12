import { FormEvent, useState } from "react";

interface FallbackControlsProps {
  title: string;
  onSubmit: (text: string) => void;
  examples: readonly string[];
}

export default function FallbackControls({ title, onSubmit, examples }: FallbackControlsProps) {
  const [value, setValue] = useState("");

  const onFormSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim());
    setValue("");
  };

  return (
    <section className="card" aria-live="polite">
      <h2 className="text-lg font-bold">텍스트 입력</h2>
      <p className="text-sm mb-2">{title}</p>

      <form className="flex flex-col gap-2" onSubmit={onFormSubmit}>
        <label htmlFor="fallback-command" className="sr-only">
          보조 입력
        </label>
        <input
          id="fallback-command"
          className="rounded-lg border border-slate-500 bg-slate-900 px-3 py-2 text-lg min-h-[48px]"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="텍스트로 직접 입력"
          aria-label="텍스트로 명령 입력"
        />
        <button
          type="submit"
          className="rounded-lg bg-cyan-400 text-slate-950 px-4 py-3 min-h-[48px] font-bold"
        >
          실행
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2" role="list">
        {examples.map((example) => (
          <button
            key={example}
            type="button"
            className="rounded-full border border-cyan-300 px-3 py-2 text-sm min-h-[48px]"
            onClick={() => onSubmit(example)}
            role="listitem"
          >
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}
