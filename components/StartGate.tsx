"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lockScrollAt, ScrollLock } from "@/lib/scrollLock";
import { subscribeAdvance } from "@/lib/scrollAdvance";
import { useCoarsePointer } from "@/lib/useCoarsePointer";

// 로드 직후 자동 시작하지 않고 대기 → 스크롤(또는 클릭/엔터)로 숫자 폭격부터 시작.
type Phase = "wait" | "go" | "gone";

export function StartGate() {
  const [phase, setPhase] = useState<Phase>("wait");
  // 터치 기기엔 Enter 키가 없다 — 안내 문구를 갈아끼운다.
  const touch = useCoarsePointer();
  const lockRef = useRef<ScrollLock | null>(null);
  const goneTimer = useRef<number | null>(null);
  const unsubRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    const w = window as { __haruStarted?: boolean };
    if (w.__haruStarted) return;
    w.__haruStarted = true;
    unsubRef.current?.();
    unsubRef.current = null;
    // AutoStats가 같은 틱에 락을 넘겨받음 → 그 후 게이트 락 해제 (스크롤 풀림 방지)
    window.dispatchEvent(new CustomEvent("haru:start"));
    lockRef.current?.release();
    lockRef.current = null;
    setPhase("go");
    goneTimer.current = window.setTimeout(() => setPhase("gone"), 700);
  }, []);

  useEffect(() => {
    // 시작 전 스크롤/자동재생 잠금
    lockRef.current = lockScrollAt(0);
    // 스크롤 제스처·엔터·스페이스·방향키·스와이프 어느 것으로도 시작
    unsubRef.current = subscribeAdvance(start);
    return () => {
      unsubRef.current?.();
      unsubRef.current = null;
      if (goneTimer.current) window.clearTimeout(goneTimer.current);
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, [start]);

  if (phase === "gone") return null;

  // 검은 화면 + 시작 안내 — 처음 보는 사람이 무엇을 해야 할지 알도록.
  return (
    <div
      onClick={start}
      className="fixed inset-0 z-[300] flex flex-col items-center justify-center bg-black"
      style={{
        opacity: phase === "wait" ? 1 : 0,
        transition: "opacity 650ms ease",
        pointerEvents: phase === "wait" ? "auto" : "none",
        cursor: "pointer",
      }}
    >
      <p
        className="text-white/55"
        style={{
          fontSize: "13px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        하루안부, 이렇게 만들었습니다
      </p>
      <div
        className="mt-6 flex flex-col items-center gap-2.5 text-white/80"
        style={{ animation: "haruCueBounce 2s ease-in-out infinite" }}
      >
        <span
          className="flex items-center gap-2"
          style={{ fontSize: "15px", letterSpacing: "0.04em", fontWeight: 500 }}
        >
          {touch ? (
            <span style={{ opacity: 0.75 }}>스크롤하거나 탭해서 시작</span>
          ) : (
            <>
              <span
                className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5"
                style={{
                  background: "rgba(255,255,255,0.12)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  letterSpacing: "0.04em",
                  fontSize: "14px",
                }}
              >
                Enter
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path
                    d="M20 6v5a3 3 0 0 1-3 3H5m0 0l4-4m-4 4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span style={{ opacity: 0.75 }}>또는 스크롤로 시작</span>
            </>
          )}
        </span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
