"use client";

import { useEffect, useState } from "react";

// 하단 진행 표시줄 — 긴 스크롤 스토리에서 "지금 어디쯤인지" 가늠하게 해 길찾기 안정감을 준다.
// 네잎클로버 그린으로 화면 맨 아래(Enter 단서 영역)에 깔린다.
// 시작(haru:start) 후에만 노출. 스크롤 위치 비율로 너비를 채운다.
export function ProgressBar() {
  const [started, setStarted] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onStart = () => setStarted(true);
    window.addEventListener("haru:start", onStart);

    let raf = 0;
    const update = () => {
      raf = 0;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setPct(p);
    };
    const onScroll = () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("haru:start", onStart);
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[210] h-[3px]"
      style={{ opacity: started ? 1 : 0, transition: "opacity 600ms ease" }}
    >
      <div
        className="h-full origin-left"
        style={{
          transform: `scaleX(${pct})`,
          background: "var(--color-accent-green)",
          boxShadow: "0 0 10px rgba(0, 203, 73, 0.5)",
          transition: "transform 240ms cubic-bezier(0.2, 1, 0.4, 1)",
        }}
      />
    </div>
  );
}
