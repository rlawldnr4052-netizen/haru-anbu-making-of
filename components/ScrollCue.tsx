"use client";

import { useEffect, useState } from "react";
import { triggerAdvance } from "@/lib/scrollAdvance";
import { useCoarsePointer } from "@/lib/useCoarsePointer";

// 하단 진행 단서 — 처음 보는 사람에겐 "스크롤", 발표자에겐 "Enter"를 알려준다.
// 시작(haru:start) 후 떠 있다가, 진행(haru:advance)하는 동안엔 숨고,
// 스크롤을 멈춰 잠시 가만히 있으면(헤매는 신호) 다시 떠서 안내한다.
// 단서 자체가 버튼 — 클릭/탭하면 엔터를 누른 것처럼 다음으로 진행한다.
const REAPPEAR_MS = 1700; // 진행이 멈추고 이만큼 지나면 다시 노출

export function ScrollCue() {
  const [visible, setVisible] = useState(false);
  // 터치 기기엔 Enter 키가 없다 — 안내 문구를 갈아끼운다.
  const touch = useCoarsePointer();

  useEffect(() => {
    let started = false;
    let idleTimer: number | undefined;

    const arm = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => setVisible(true), REAPPEAR_MS);
    };
    const onStart = () => {
      started = true;
      arm();
    };
    const onAdvance = () => {
      if (!started) return;
      setVisible(false); // 진행 중엔 숨김
      arm(); // 멈추면 다시 뜨도록 재무장
    };

    window.addEventListener("haru:start", onStart);
    window.addEventListener("haru:advance", onAdvance);
    return () => {
      window.removeEventListener("haru:start", onStart);
      window.removeEventListener("haru:advance", onAdvance);
      window.clearTimeout(idleTimer);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 bottom-7 z-[200] flex justify-center"
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 500ms ease",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <button
        type="button"
        aria-label={touch ? "다음으로 진행" : "다음으로 진행 (Enter)"}
        onClick={() => triggerAdvance()}
        className="flex cursor-pointer flex-col items-center gap-2 bg-transparent text-white/70 transition-colors hover:text-white/95"
        style={{ animation: "haruCueBounce 2s ease-in-out infinite" }}
      >
        <span
          className="flex items-center gap-2"
          style={{ fontSize: "12px", letterSpacing: "0.16em", fontWeight: 500 }}
        >
          {touch ? (
            <span>스크롤하거나 탭하세요</span>
          ) : (
            <>
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  letterSpacing: "0.04em",
                }}
              >
                Enter
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 6v5a3 3 0 0 1-3 3H5m0 0l4-4m-4 4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span style={{ opacity: 0.7 }}>또는 스크롤</span>
            </>
          )}
        </span>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
