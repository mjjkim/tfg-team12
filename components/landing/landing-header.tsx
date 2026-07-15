export default function LandingHeader() {
  return (
    <header>
      <div className="flex h-9 items-center justify-between gap-4">
        <h1 className="font-pixelify text-[30px] font-normal leading-normal text-[#fd5d79]">
          PitchStock
        </h1>
        <span
          className="inline-flex h-[30px] shrink-0 items-center justify-center rounded-[6px] bg-[rgba(253,93,121,0.2)] px-2 py-[6px] text-[15px] font-normal leading-normal text-[#fd5d79]"
          role="status"
          aria-label="터치 모드 켜짐"
        >
          터치모드 ON
        </span>
      </div>
      <p className="mt-[14px] text-[15px] font-normal leading-normal text-white">
        종목을 선택하고 실시간 차트나 과거 분석을 시작하세요
      </p>
    </header>
  );
}
