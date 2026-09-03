"use client";

import { useEffect, useRef, useState } from "react";
import { EdgeGlow } from "@/components/effects/EdgeGlow";
import { DotRing } from "@/components/effects/DotRing";
import { useSpaceGate } from "@/lib/useSpaceGate";

// TTS 비포/애프터 — 도트(파티클) 링으로 비교. 영상 섹션과 통일감 있게 검정 배경.
// 위: 회색 링(기존 음성) / 아래: 그린 링(개선된 음성). 누르면 음성이 흐르며 도트가 원을 따라 생동감 있게 움직인다.
// AFTER 재생 중엔 헤딩 글로우(1회) + 화면 가장자리 엣지 글로우가 함께 차오른다.

type Side = "before" | "after";

// 헤딩 강조어 — 기본 흰색, AFTER 재생 시 그린으로 + 숫자 폭격 씬과 같은 글로우 한 번만(one-shot)
const SCENE_CSS = `
.tts-word{color:#fff;transition:color .35s ease}
.tts-word.is-on{color:var(--color-accent-green);animation:tts-glow-once 1.15s ease-out}
@keyframes tts-glow-once{0%{text-shadow:0 0 0 rgba(0, 203, 73,0)}42%{text-shadow:0 0 28px rgba(0, 203, 73,.95), 0 0 12px rgba(0, 203, 73,.7)}66%{text-shadow:0 0 14px rgba(0, 203, 73,.45)}100%{text-shadow:0 0 0 rgba(0, 203, 73,0)}}
@media (prefers-reduced-motion:reduce){.tts-word.is-on{animation:none!important}}
`;

// Web Audio 분석기 — 도트 링이 실제 음성 레벨에 반응하도록. 컨텍스트는 페이지 전체에서 공유.
let sharedCtx: AudioContext | null = null;

function Player({
  side,
  src,
  label,
  title,
  accent,
  palette,
  variant,
  count,
  dynamics,
  registerStop,
  registerPlay,
  onPlay,
  onPlayingChange,
}: {
  side: Side;
  src: string;
  label: string;
  title: string;
  accent: string;
  palette: "gray" | "green";
  variant?: "compact" | "galaxy";
  count?: number;
  dynamics?: number;
  registerStop: (side: Side, stop: () => void) => void;
  registerPlay?: (side: Side, play: () => void) => void;
  onPlay: (side: Side) => void;
  onPlayingChange?: (playing: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const wiredRef = useRef(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    registerStop(side, () => {
      const a = audioRef.current;
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    });
  }, [side, registerStop]);

  // 오디오 → 분석기 → 스피커 그래프 구성 (요소당 1회). 실패해도 도트는 시간 기반으로 움직임.
  const wireAudio = () => {
    if (wiredRef.current) return;
    const a = audioRef.current;
    if (!a) return;
    try {
      const Ctx: typeof AudioContext =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      if (!sharedCtx) sharedCtx = new Ctx();
      const srcNode = sharedCtx.createMediaElementSource(a);
      const an = sharedCtx.createAnalyser();
      an.fftSize = 128;
      an.smoothingTimeConstant = 0.8;
      srcNode.connect(an);
      an.connect(sharedCtx.destination);
      analyserRef.current = an;
      wiredRef.current = true;
    } catch {
      /* 분석 불가 — 도트는 시간 기반 모션으로 동작 */
    }
  };

  // 처음부터 재생 (버튼/스페이스 게이트 공용)
  const play = () => {
    const a = audioRef.current;
    if (!a) return;
    wireAudio();
    void sharedCtx?.resume?.();
    onPlay(side);
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  // 발표 게이트가 직접 재생을 트리거할 수 있게 등록
  useEffect(() => {
    registerPlay?.(side, play);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, registerPlay]);

  // 재생 ↔ 정지(처음으로 리셋). 정지 후 다시 누르면 처음부터 재생.
  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) play();
    else {
      a.pause();
      a.currentTime = 0;
    }
  };

  return (
    <div className="flex w-full flex-col items-center">
      {/* 라벨 + 제목 */}
      <div className="mb-7 flex items-center gap-3">
        <span
          className="inline-block rounded-md px-2.5 py-1 text-[12px] font-bold text-black"
          style={{ background: accent }}
        >
          {label}
        </span>
        <h4 className="font-sans text-xl font-bold tracking-tight text-white md:text-2xl">
          {title}
        </h4>
      </div>

      {/* 도트 링 — 전체가 재생/정지 버튼 */}
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "정지" : "재생"}
        className="group relative aspect-square w-full max-w-[480px] cursor-pointer bg-transparent"
      >
        <DotRing
          active={playing}
          palette={palette}
          analyserRef={analyserRef}
          count={count}
          variant={variant}
          dynamics={dynamics}
        />

        {/* 중앙 재생/정지 버튼 — accent 색(BEFORE 회색 / AFTER 그린), 스트로크 없음 */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition-transform duration-200 group-hover:scale-110"
          style={{ background: accent, color: "#06080c", boxShadow: "0 10px 28px rgba(0,0,0,.45)" }}
        >
          {playing ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <rect x="6.5" y="5.5" width="4" height="13" rx="1.6" />
              <rect x="13.5" y="5.5" width="4" height="13" rx="1.6" />
            </svg>
          ) : (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden
              style={{ marginLeft: 2 }}
            >
              <path d="M7 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 7 5.5z" />
            </svg>
          )}
        </span>
      </button>

      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          onPlayingChange?.(true);
        }}
        onPause={() => {
          setPlaying(false);
          onPlayingChange?.(false);
        }}
        onEnded={() => {
          setPlaying(false);
          onPlayingChange?.(false);
        }}
      />
    </div>
  );
}

export function TtsCompareScene({ id, gate }: { id?: string; gate?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stopFns = useRef<Partial<Record<Side, () => void>>>({});
  const playFns = useRef<Partial<Record<Side, () => void>>>({});
  const [glow, setGlow] = useState(false);

  const registerStop = (side: Side, stop: () => void) => {
    stopFns.current[side] = stop;
  };
  const registerPlay = (side: Side, play: () => void) => {
    playFns.current[side] = play;
  };
  // 한 쪽 재생 시 다른 쪽 정지
  const handlePlay = (side: Side) => {
    (Object.keys(stopFns.current) as Side[]).forEach((s) => {
      if (s !== side) stopFns.current[s]?.();
    });
  };

  // 발표용 스페이스바 게이트 — 1) 기존 음성 2) 개선된 음성 3) 다음 섹션으로 이동
  useSpaceGate(sectionRef, {
    gate,
    steps: 3,
    onStep: (i) => {
      if (i === 1) playFns.current.before?.();
      else if (i === 2) playFns.current.after?.();
    },
  });

  // 이 섹션을 벗어나면 음성을 멈추고 글로우를 끈다.
  //
  // glow 는 AFTER 플레이어의 재생 상태만 따라간다. 발표자가 음성이 끝나기 전에
  // 다음으로 넘기면(발표에선 그게 보통이다) 재생 상태가 false 로 떨어질 일이 없어,
  // EdgeGlow 가 position:fixed + body 포털 + z-index 60 인 탓에 **남은 발표 내내**
  // 모든 씬 위에 초록 테두리가 덮인 채로 간다. 음성도 다음 씬까지 흘러나온다.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e && !e.isIntersecting) {
          (Object.keys(stopFns.current) as Side[]).forEach((s) => stopFns.current[s]?.());
          setGlow(false);
        }
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id={id}
      className="relative flex min-h-screen w-full items-start justify-center bg-black px-4 pb-[16vh] pt-[16vh]"
    >
      <style dangerouslySetInnerHTML={{ __html: SCENE_CSS }} />

      {/* 엣지 글로우 — 디바이스 화면 전체. AFTER 재생 중에만 차오름 */}
      <EdgeGlow active={glow} />

      <div className="relative z-10 flex w-full max-w-6xl flex-col items-center">
        <h3 className="mb-[7vh] whitespace-nowrap text-center font-sans text-[length:var(--text-section-title)] font-extrabold tracking-tight text-white md:mb-[9vh]">
          목소리도 <span className={`tts-word ${glow ? "is-on" : ""}`}>프로페셔널하게.</span>
        </h3>

        <div className="grid w-full grid-cols-1 items-start gap-8 md:grid-cols-2 md:gap-10">
          <Player
            side="before"
            src="/making_of/media/audio/tts-before.mp3"
            label="BEFORE"
            title="기존 음성"
            accent="#8A9099"
            palette="gray"
            variant="galaxy"
            count={1000}
            dynamics={0.12}
            registerStop={registerStop}
            registerPlay={registerPlay}
            onPlay={handlePlay}
          />
          <Player
            side="after"
            src="/making_of/media/audio/tts-after.mp3"
            label="AFTER"
            title="개선된 음성"
            accent="var(--color-accent-green)"
            palette="green"
            variant="galaxy"
            count={1000}
            registerStop={registerStop}
            registerPlay={registerPlay}
            onPlay={handlePlay}
            onPlayingChange={setGlow}
          />
        </div>
      </div>
    </section>
  );
}
