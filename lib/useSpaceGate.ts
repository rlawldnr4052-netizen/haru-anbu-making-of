"use client";

import { RefObject, useEffect, useRef } from "react";
import { lockScrollAt, releaseAndAdvance, ScrollLock } from "@/lib/scrollLock";
import { waitForSpace, SpaceGate } from "@/lib/waitForSpace";

// 발표용 스페이스바 게이트 (후반부 섹션 공용).
//  · 섹션 상단이 뷰포트 최상단에 닿으면(= 이전 씬이 이리로 advance하면) 스크롤을 락.
//  · onEnter() 호출(보통은 씬 자체 애니메이션이 IO로 알아서 시작됨).
//  · 스페이스를 steps번 받음 — 마지막 1번은 다음 섹션으로 이동(releaseAndAdvance),
//    그 전 단계들은 onStep(i)로 콜백(예: TTS 비포/애프터 재생).
//  · 높이 무관: rootMargin "0 0 -99% 0"으로 "상단 도달" 시점에 정확히 1회 발화.
// gate=false면 아무것도 하지 않음 → 컴포넌트 기본 동작 그대로(다른 사용처 안전).

type Options = {
  gate?: boolean;
  steps?: number; // 총 스페이스 횟수(마지막 1회 = 이동). 기본 1.
  onEnter?: () => void;
  onStep?: (i: number) => void; // i = 1..steps-1 (이동 직전 단계들)
  advanceTo?: () => number | null; // 커스텀 목적지. 기본 offsetTop+offsetHeight
};

export function useSpaceGate(ref: RefObject<HTMLElement | null>, opts: Options) {
  const optsRef = useRef(opts);
  const gate = opts.gate ?? false;

  useEffect(() => {
    optsRef.current = opts;
  }, [opts]);

  useEffect(() => {
    if (!gate) return;
    const el = ref.current;
    if (!el) return;

    let started = false;
    let cancelled = false;
    let lock: ScrollLock | null = null;
    let spaceGate: SpaceGate | null = null;

    const advance = () => {
      const node = ref.current;
      const custom = optsRef.current.advanceTo?.();
      const nextTop =
        custom != null ? custom : node ? node.offsetTop + node.offsetHeight : null;
      if (nextTop == null) {
        lock?.release();
        lock = null;
        return;
      }
      releaseAndAdvance(lock, nextTop, () => {});
      lock = null;
    };

    const step = (i: number) => {
      if (cancelled) return;
      spaceGate = waitForSpace();
      spaceGate.promise.then(() => {
        if (cancelled) return;
        const total = optsRef.current.steps ?? 1;
        if (i >= total) {
          advance();
          return;
        }
        optsRef.current.onStep?.(i);
        step(i + 1);
      });
    };

    const begin = () => {
      const node = ref.current;
      if (!node) return;
      lock = lockScrollAt(node.offsetTop);
      optsRef.current.onEnter?.();
      step(1);
    };

    // 섹션 상단이 뷰포트 최상단에 닿는 순간 발화 (높이 무관)
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting && !started) {
          started = true;
          io.disconnect();
          begin();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -99% 0px" }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      spaceGate?.cancel();
      lock?.release();
      lock = null;
    };
  }, [gate, ref]);
}
