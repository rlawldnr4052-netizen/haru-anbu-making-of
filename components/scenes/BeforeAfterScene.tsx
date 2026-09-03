"use client";

import { useEffect, useRef, useState } from "react";
import { useSpaceGate } from "@/lib/useSpaceGate";

// 영상 비포/애프터 — 가운데 디바이더를 좌우로 드래그.
// 왼쪽: 초기 버전(한 줄 프롬프트의 첫 결과)  /  오른쪽: 수많은 수정을 거친 최종본.

export function BeforeAfterScene({ id, gate }: { id?: string; gate?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLVideoElement>(null);
  const afterRef = useRef<HTMLVideoElement>(null);
  const draggingRef = useRef(false);
  const [pos, setPos] = useState(78); // 디바이더 위치 (%) — 디폴트로 초기 버전(좌측)이 더 많이 보이게 우측에 둠
  const [active, setActive] = useState(false);

  // 저속 회선이면 480p
  const lowRes =
    typeof navigator !== "undefined" &&
    "connection" in navigator &&
    // @ts-expect-error connection types
    (navigator.connection?.saveData ||
      // @ts-expect-error connection types
      /2g|3g/.test(navigator.connection?.effectiveType ?? ""));
  const beforeSrc = lowRes ? "/making_of/media/video/before-480.mp4" : "/making_of/media/video/before.mp4";
  const afterSrc = lowRes ? "/making_of/media/video/after-480.mp4" : "/making_of/media/video/after.mp4";

  // 발표용 스페이스바 게이트 — 스페이스 1회로 다음 섹션(TTS)으로 이동
  useSpaceGate(sectionRef, { gate, steps: 1 });

  // 화면에 들어오면 둘 다 재생, 벗어나면 정지
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting) {
          setActive(true);
          beforeRef.current?.play().catch(() => {});
          afterRef.current?.play().catch(() => {});
        } else {
          beforeRef.current?.pause();
          afterRef.current?.pause();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 드래그
  useEffect(() => {
    const setFromX = (clientX: number) => {
      const r = stageRef.current?.getBoundingClientRect();
      if (!r) return;
      const x = ((clientX - r.left) / r.width) * 100;
      setPos(Math.max(4, Math.min(96, x)));
    };
    const move = (e: PointerEvent) => {
      if (draggingRef.current) setFromX(e.clientX);
    };
    const up = () => {
      draggingRef.current = false;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, []);

  const onDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    const r = stageRef.current?.getBoundingClientRect();
    if (r) setPos(Math.max(4, Math.min(96, ((e.clientX - r.left) / r.width) * 100)));
  };

  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative flex min-h-screen w-full items-center justify-center bg-black px-4 py-[5vh]"
    >
      <div className="flex w-full flex-col items-center">
        {/* 타이틀 — TTS '목소리도 프로페셔널하게.'와 같은 크기·여백 */}
        <h3 className="mb-[7vh] text-center font-sans text-[length:var(--text-section-title)] font-extrabold tracking-tight text-white md:mb-[9vh]">
          한 줄로 시작해, 수없이 고쳤다.
        </h3>

        {/* 비교 스테이지 — 16:9 유지하며 화면을 최대로 채움 (가로/세로 중 작은 쪽 기준) */}
        <div
          ref={stageRef}
          onPointerDown={onDown}
          className="group relative aspect-video select-none overflow-hidden rounded-2xl border border-white/10 bg-[#0e1117] shadow-[0_40px_120px_-24px_rgba(0,0,0,0.85)]"
          style={{
            touchAction: "pan-y",
            cursor: "ew-resize",
            width: "min(96vw, calc((72vh - 96px) * 16 / 9))",
          }}
        >
          {/* AFTER — 베이스 (오른쪽) */}
          <video
            ref={afterRef}
            src={afterSrc}
            poster="/making_of/media/poster/after.jpg"
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 h-full w-full object-contain"
          />
          {/* BEFORE — 위에서 좌측만 보이게 클립 (왼쪽) */}
          <div
            className="absolute inset-0"
            style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          >
            <video
              ref={beforeRef}
              src={beforeSrc}
              poster="/making_of/media/poster/before.jpg"
              muted
              loop
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-contain"
            />
          </div>

          {/* 라벨 */}
          <div className="pointer-events-none absolute left-4 top-4 md:left-5 md:top-5">
            <span className="inline-block rounded-md bg-white/90 px-2.5 py-1 text-[12px] font-bold text-black">
              초기 버전
            </span>
          </div>
          <div className="pointer-events-none absolute right-4 top-4 text-right md:right-5 md:top-5">
            <span className="inline-block rounded-md bg-[var(--color-accent-green)] px-2.5 py-1 text-[12px] font-bold text-black">
              최종본
            </span>
          </div>

          {/* 디바이더 */}
          <div
            className="pointer-events-none absolute inset-y-0"
            style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          >
            <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 bg-white shadow-[0_0_14px_rgba(255,255,255,0.6)]" />
            <div className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/95 shadow-[0_4px_18px_rgba(0,0,0,0.45)]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" stroke="#0e1117" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          {!active && <div className="absolute inset-0 bg-black/40" />}
        </div>
      </div>
    </section>
  );
}
