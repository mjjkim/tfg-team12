interface VoiceCommandButtonProps {
  onClick: () => void;
}

export default function VoiceCommandButton({ onClick }: VoiceCommandButtonProps) {
  return (
    <button
      type="button"
      className="flex h-16 w-full items-center justify-center rounded-[10px] bg-[#00ecfc] text-[20px] font-semibold leading-normal text-[#010618] transition-[filter,transform] hover:brightness-95 active:scale-[0.99]"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={onClick}
    >
      음성 명령 시작
    </button>
  );
}
