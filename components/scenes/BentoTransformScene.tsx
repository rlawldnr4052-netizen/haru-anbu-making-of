"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lockScrollAt, releaseAndAdvance, ScrollLock } from "@/lib/scrollLock";
import { subscribeAdvance } from "@/lib/scrollAdvance";

// 비포→애프터 변신 릴 — 엔터 스텝 + 박스가 "그 자리에서 전체화면으로 넓어짐"(FLIP 모핑).
//  · 쉬는 상태: 박스는 그냥 하얗게
//  · 엔터 → 박스가 전체화면으로 넓어지고, 1막(무드보드) "비포"가 먼저 뜸
//  · 엔터 → 1막 비포→애프터 조립
//  · 엔터 → 1막이 자연스럽게 페이드 아웃되고 2막(리포트) "비포"가 뜸 (슬라이드 X, 크로스페이드)
//  · 엔터 → 2막 비포→애프터 조립 (전체화면 그대로 유지 — 자동 축소 없음)
//  · 엔터 → gate면 다음 섹션(영상)으로 이동
//  · (Esc로 수동 축소 가능 — closing→rest)
// 두 릴 모두 auto=0 → 'play' 메시지 전까지 비포에서 대기. transform 기반 모핑이라 iframe 리로드 없음.

const A1 = "/making_of/transform/bento-transform.html?v=6&auto=0"; // 비포 대기 → 엔터로 재생
const A2 = "/making_of/transform/bento-transform-2.html?v=8&auto=0"; // 비포 대기 → 엔터로 재생
// 아래 영상(비포/애프터·TTS) 박스와 같은 크기 규칙 — 한 줄 제목 아래로 들어감
const BOXW = "min(96vw, calc((82vh - 96px) * 16 / 9))";

type Phase = "idle" | "a1b" | "a1" | "a2b" | "a2" | "closing" | "rest";

const rectTransform = (r: DOMRect, vw: number, vh: number) =>
  `translate(${r.left}px, ${r.top}px) scale(${r.width / vw}, ${r.height / vh})`;

export function BentoTransformScene({ id, gate }: { id?: string; gate?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const advancingRef = useRef(false);
  const slotRef = useRef<HTMLDivElement>(null);
  const morphRef = useRef<HTMLDivElement>(null);
  const a1Ref = useRef<HTMLIFrameElement>(null);
  const a2Ref = useRef<HTMLIFrameElement>(null);
  const lockRef = useRef<ScrollLock | null>(null);
  const busyRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);

  const [armed, setArmed] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");

  const post = (ref: React.RefObject<HTMLIFrameElement | null>, m: string) => {
    try {
      ref.current?.contentWindow?.postMessage({ haru: m }, "*");
    } catch {
      /* cross-origin guard */
    }
  };

  // 박스 → 전체화면으로 넓힘 (그 자리에서)
  const openMorph = useCallback(() => {
    const slot = slotRef.current;
    const v = morphRef.current;
    if (!slot || !v) return;
    const r = slot.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    v.style.transition = "none";
    v.style.position = "fixed";
    v.style.top = "0";
    v.style.left = "0";
    v.style.width = vw + "px";
    v.style.height = vh + "px";
    v.style.zIndex = "120";
    v.style.transformOrigin = "top left";
    v.style.transform = rectTransform(r, vw, vh); // 슬롯 위치에 겹쳐 시작(점프 없음)
    void v.getBoundingClientRect(); // reflow
    v.style.transition = "transform .55s cubic-bezier(.22,.9,.25,1)";
    v.style.transform = "none"; // → 전체화면으로 넓어짐
    // 전체화면은 모서리 각지게 (영상처럼 가장자리까지)
    v.style.borderRadius = "0px";
    v.style.borderColor = "transparent";
    v.style.boxShadow = "none";
  }, []);

  // 전체화면 모핑 스타일 즉시 제거 → morphRef가 슬롯 박스로 복귀(absolute inset-0)
  const resetMorphStyles = useCallback(() => {
    const v = morphRef.current;
    if (!v) return;
    ["transition", "position", "top", "left", "width", "height", "zIndex", "transformOrigin", "transform", "borderRadius", "borderColor", "boxShadow", "opacity"].forEach(
      (k) => v.style.removeProperty(k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()))
    );
  }, []);

  // 전체화면 → 박스로 다시 좁힘 (Esc 수동 축소용)
  const closeMorph = useCallback(() => {
    const slot = slotRef.current;
    const v = morphRef.current;
    if (!slot || !v) return;
    const r = slot.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    v.style.transition = "transform .5s cubic-bezier(.22,.9,.25,1)";
    v.style.transform = rectTransform(r, vw, vh);
    const onEnd = (e: TransitionEvent) => {
      if (e.target !== v) return;
      v.removeEventListener("transitionend", onEnd);
      resetMorphStyles();
    };
    v.addEventListener("transitionend", onEnd);
    window.setTimeout(() => {
      v.removeEventListener("transitionend", onEnd);
      resetMorphStyles();
    }, 640);
  }, [resetMorphStyles]);

  const close = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    closeMorph();
    lockRef.current?.release();
    lockRef.current = null;
    setPhase("closing");
    resetTimerRef.current = window.setTimeout(() => {
      // 발표 게이트면 rest 동안 스크롤을 다시 락(스페이스로만 다음 섹션 이동)
      if (gate && sectionRef.current) {
        lockRef.current = lockScrollAt(sectionRef.current.offsetTop);
      }
      setPhase("rest"); // 줄어든 박스에 2막 애프터(완성본)가 그대로 남음
    }, 560);
  }, [closeMorph, gate]);

  // 섹션이 화면에 들어오면 armed (스페이스 핸들러 활성)
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (es) => setArmed(es[0]?.isIntersecting ?? false),
      { threshold: 0.45 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 스텝 진행 — 스크롤 제스처(또는 엔터/스페이스/방향키)로. ESC는 키보드로 닫기.
  useEffect(() => {
    if (!armed) return;
    const advanceStep = () => {
      if (busyRef.current) return;
      busyRef.current = true;
      window.setTimeout(() => {
        busyRef.current = false;
      }, 650);

      if ((phase === "a2" || phase === "rest") && gate) {
        // 발표 게이트 — 2막 조립 다 보여준 전체화면 상태에서 엔터 → 다음 섹션(영상)으로 이동
        if (advancingRef.current) return;
        advancingRef.current = true;
        // 전체화면(a2)이면 박스로 줄이지 않고(축소 없음) 그대로 페이드아웃하며 영상으로 컷 전환
        const v = morphRef.current;
        if (v && v.style.position === "fixed") {
          v.style.transition = "opacity .5s ease";
          v.style.opacity = "0";
          window.setTimeout(() => resetMorphStyles(), 520);
        }
        const node = sectionRef.current;
        const nextTop = node ? node.offsetTop + node.offsetHeight : null;
        if (nextTop != null) {
          releaseAndAdvance(lockRef.current, nextTop, () => {});
          lockRef.current = null;
        } else {
          lockRef.current?.release();
          lockRef.current = null;
        }
        return;
      }
      if (phase === "idle" || phase === "rest") {
        // (재)시작 — 박스가 전체화면으로 넓어지며 1막 "비포"가 뜸
        post(a1Ref, "reset"); // 1막을 비포로 되돌림
        window.setTimeout(() => post(a2Ref, "reset"), 500); // 2막은 가려진 뒤 비포로
        lockRef.current = lockScrollAt(Math.round(window.scrollY));
        openMorph();
        setPhase("a1b");
      } else if (phase === "a1b") {
        // 1막 조립
        setPhase("a1");
        post(a1Ref, "play");
      } else if (phase === "a1") {
        // 1막 페이드 아웃 → 2막 "비포" 크로스페이드
        setPhase("a2b");
      } else if (phase === "a2b") {
        // 2막 조립 — 전체화면 그대로 유지(자동 축소 없음). 엔터 누르면 영상 섹션으로.
        setPhase("a2");
        post(a2Ref, "play");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && phase !== "idle" && phase !== "closing") {
        e.preventDefault();
        close();
      }
    };
    const unsub = subscribeAdvance(advanceStep);
    window.addEventListener("keydown", onKey);
    return () => {
      unsub();
      window.removeEventListener("keydown", onKey);
    };
  }, [armed, phase, close, gate, openMorph, resetMorphStyles]);

  // 언마운트 안전 해제
  useEffect(
    () => () => {
      lockRef.current?.release();
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    },
    []
  );

  const whiteOn = phase === "idle";
  const a1Visible = phase === "a1b" || phase === "a1";
  const a2Visible =
    phase === "a2b" || phase === "a2" || phase === "closing" || phase === "rest";

  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative flex min-h-screen w-full items-center justify-center bg-black px-4 py-[4vh]"
    >
      <div className="flex w-full flex-col items-center">
        {/* 아래 '목소리도 프로페셔널하게.' 타이틀과 같은 결 — 한 줄로 화면 폭에 맞게 */}
        <h3 className="mb-[7vh] whitespace-nowrap text-center font-sans text-[length:var(--text-section-title)] font-extrabold tracking-tight text-white md:mb-[9vh]">
          AI가 뱉은 디자인을,{" "}
          <span className="text-[var(--color-accent-green)]">우리가 조립하다</span>
        </h3>

        {/* 박스 슬롯 — 레이아웃 공간 예약 (모핑 중에도 자리 유지) */}
        <div ref={slotRef} className="relative aspect-video" style={{ width: BOXW }}>
          {/* 모핑 비주얼 — 박스 ↔ 전체화면 (같은 요소가 넓어짐). 미리보기는 영상 박스처럼 둥근 모서리 */}
          <div
            ref={morphRef}
            className="absolute inset-0 overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_40px_120px_-24px_rgba(0,0,0,0.85)]"
          >
            {/* 1막 (무드보드) — 비포 대기 → 스페이스로 조립 */}
            <div
              className="absolute inset-0"
              style={{ opacity: a1Visible ? 1 : 0, transition: "opacity .5s ease" }}
            >
              <iframe
                ref={a1Ref}
                src={A1}
                title="무드보드 조립"
                loading="lazy"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            {/* 2막 (리포트) — 1막 페이드 아웃과 함께 크로스페이드로 등장 */}
            <div
              className="absolute inset-0 bg-black"
              style={{
                opacity: a2Visible ? 1 : 0,
                pointerEvents: a2Visible ? "auto" : "none",
                transition: "opacity .5s ease",
              }}
            >
              <iframe
                ref={a2Ref}
                src={A2}
                title="고령화 리포트"
                loading="lazy"
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            {/* 하얀 커버 — 쉬는 상태에선 그냥 하얗게. 넓어진 뒤 걷히며 비포가 드러남 */}
            <div
              className="absolute inset-0 z-[8] bg-white"
              style={{
                opacity: whiteOn ? 1 : 0,
                pointerEvents: "none",
                transitionProperty: "opacity",
                transitionTimingFunction: "ease",
                transitionDuration: whiteOn ? "200ms" : "360ms",
                transitionDelay: whiteOn ? "0ms" : "40ms", // 넓어짐과 동시에 비포 드러남
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
