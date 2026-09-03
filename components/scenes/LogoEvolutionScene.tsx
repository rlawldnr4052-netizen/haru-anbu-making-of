"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { lockScrollAt, releaseAndAdvance, ScrollLock } from "@/lib/scrollLock";
import { waitForSpace, SpaceGate } from "@/lib/waitForSpace";

// 타이핑 속도(글자/초) — 로고 얘기하는 대화 부분만 "1.5배 천천히"
const ME_CPS = 28;
const AI_CPS = 44;
const INDICATOR_MS = 630; // AI 응답 전 점점점
const AFTER_SEND_MS = 360; // 내 메시지 전송 후 텀
const AFTER_AI_MS = 480; // AI 메시지 후 텀
const IMG_REVEAL_MS = 690; // 로고 시안 등장 후 텀
const AFTER_ME_TYPE_MS = 225; // 내 메시지 다 친 뒤 전송까지 텀
const BEFORE_IMG_MS = 240; // AI 답변 후 시안 띄우기 전 텀
const CLIMAX_MS = 3400; // 카드 아웃 → 로고 폴더 안착 → 비행 (피날레는 그대로)

const ORB_BG = "linear-gradient(135deg, #2C7AFC, #1D6AF2)";

type Msg = {
  role: "me" | "ai";
  text: string;
  attempt?: 1 | 2 | 3 | 4 | 5;
};

const messages: Msg[] = [
  { role: "me", text: "우리 기획서를 가지고 로고 만들어봐." },
  {
    role: "ai",
    text:
      "네. 핵심 가치 '연결'을 시각화해서 4개 노드가 사선으로 이어지는 다이어그램으로 만들어봤습니다.",
    attempt: 1,
  },
  { role: "me", text: "아니, 이건 로고가 아니라 다이어그램이잖아. 다시." },
  {
    role: "ai",
    text: "네. 친근감을 위해 시니어 캐릭터 일러스트를 중앙에 배치해봤습니다.",
    attempt: 2,
  },
  { role: "me", text: "캐릭터 같아. 의료 신뢰감이 없어. 다시." },
  {
    role: "ai",
    text: "네. 의료 십자가 + 하트 + 가족 실루엣을 합쳐서 만들었습니다.",
    attempt: 3,
  },
  { role: "me", text: "색이 너무 많아 무거워. 단순하게 다시." },
  {
    role: "ai",
    text: "네. 단일 곡선으로 사람과 사람을 잇는 모양만 남겼습니다.",
    attempt: 4,
  },
  { role: "me", text: "기능 그대로네. 시그니처 한 곡선으로 가자." },
  {
    role: "ai",
    text: "네. '안부'의 ㅎ에서 영감을 받아 한 번에 그리는 곡선 심볼로 단순화했습니다.",
    attempt: 5,
  },
];

function AttemptPreview({ kind }: { kind: 1 | 2 | 3 | 4 | 5 }) {
  if (kind === 5) return <FinalLogo />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/making_of/media/logo/attempt-${kind}.png`}
      alt=""
      className="h-full w-full object-contain"
      draggable={false}
    />
  );
}

function FinalLogo() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/making_of/media/logo/final.svg"
      alt="하루안부"
      className="h-full w-full object-contain"
      draggable={false}
    />
  );
}

function HaruSymbol({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 2526 2526" fill="white">
      <path d="M2521.32 2506.66C1239.65 2657.48 1239.65 1895.6 1239.65 1279.34L2497.69 0C2518.68 494.198 2522.27 1157.92 1658.86 1262.48C2641.88 1314.25 2521.32 2101.84 2521.32 2506.66Z" />
      <path d="M4.677 19.335C1286.35-131.481 1286.35 630.399 1286.35 1246.66L28.315 2526C7.322 2031.8 3.73 1368.08 867.143 1263.52C-115.881 1211.75 4.677 424.157 4.677 19.335Z" />
    </svg>
  );
}

// 보호자앱 AI 아바타와 100% 동일
function Orb({ size = 40 }: { size?: number }) {
  return (
    <div
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ORB_BG,
        boxShadow: "0 2px 8px rgba(44,122,252,.25)",
      }}
    >
      <HaruSymbol size={Math.round(size * 0.46)} />
    </div>
  );
}

// ── 협업 캔버스: 큰 파란 폴더 + 팀 커서 ──
function BlueFolder({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 560 420" className={className} style={style} aria-hidden>
      <defs>
        <linearGradient id="folderFront" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#56B7FF" />
          <stop offset="1" stopColor="#2C9CF0" />
        </linearGradient>
        <linearGradient id="folderBack" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E9EF2" />
          <stop offset="1" stopColor="#1C8AE0" />
        </linearGradient>
      </defs>
      <path
        d="M70 58 h150 a18 18 0 0 1 13 6 l26 28 a18 18 0 0 0 13 6 h175 a30 30 0 0 1 30 30 v208 a30 30 0 0 1 -30 30 H70 a30 30 0 0 1 -30 -30 V88 a30 30 0 0 1 30 -30 Z"
        fill="url(#folderBack)"
      />
      <rect x="42" y="150" width="446" height="244" rx="30" fill="url(#folderFront)" />
      <rect x="42" y="150" width="446" height="6" rx="3" fill="rgba(255,255,255,.35)" />
    </svg>
  );
}

type CursorDef = {
  name: string;
  color: string;
  tc?: string;
  top: string;
  left: string;
  anim: "d1" | "d2" | "d3";
  dur: string;
  delay: string;
};

// 김지욱 블루 / 손예찬 퍼플 / 고해은 핑크 / 네잎클로버 그린(=AI)
const CURSORS: CursorDef[] = [
  { name: "김지욱", color: "#2C7AFC", top: "17%", left: "14%", anim: "d1", dur: "8s", delay: "0s" },
  { name: "손예찬", color: "#8B5CF6", top: "13%", left: "79%", anim: "d2", dur: "9.5s", delay: ".5s" },
  { name: "고해은", color: "#FF4D8D", top: "70%", left: "11%", anim: "d3", dur: "8.5s", delay: "1s" },
  { name: "네잎클로버", color: "#00CB49", top: "66%", left: "83%", anim: "d1", dur: "10s", delay: "1.4s" },
];

function Cursor({ c }: { c: CursorDef }) {
  return (
    <div
      className="absolute"
      style={{
        top: c.top,
        left: c.left,
        animation: `${c.anim} ${c.dur} ease-in-out ${c.delay} infinite`,
      }}
    >
      <svg
        width="28"
        height="30"
        viewBox="0 0 24 24"
        fill="none"
        style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.18))" }}
      >
        <path
          d="M4 3.5 L4 20.5 L8.8 15.8 L11.6 21.6 L14 20.4 L11.2 14.8 L17.8 14.2 Z"
          fill={c.color}
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
      <span
        className="ml-3.5 inline-block rounded-[8px] px-2.5 py-1 text-[13px] font-semibold leading-none"
        style={{ background: c.color, color: c.tc ?? "#fff", boxShadow: "0 2px 8px rgba(0,0,0,.14)" }}
      >
        {c.name}
      </span>
    </div>
  );
}

// Figma 선택 핸들
function Handles() {
  const dot = "absolute h-2.5 w-2.5 rounded-[2px] border border-white bg-[#2C7AFC]";
  return (
    <>
      <span className={`${dot} -left-1.5 -top-1.5`} />
      <span className={`${dot} -right-1.5 -top-1.5`} />
      <span className={`${dot} -bottom-1.5 -left-1.5`} />
      <span className={`${dot} -bottom-1.5 -right-1.5`} />
    </>
  );
}

function AttemptCard({ kind }: { kind: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div className="mt-2.5 rounded-2xl border border-black/[0.07] bg-white p-3">
      <div className="mx-auto aspect-square w-[190px] md:w-[220px]">
        <AttemptPreview kind={kind} />
      </div>
      <p className="mt-2.5 text-center font-mono text-[11px] uppercase tracking-[0.24em] text-black/35 md:text-[12px]">
        attempt 0{kind}
      </p>
    </div>
  );
}

function MeBubble({ text }: { text: string }) {
  return (
    <div className="mb-4 flex w-full justify-end">
      <div className="max-w-[80%] rounded-[22px] rounded-br-md bg-[#E7F0FF] px-5 py-3 text-[16px] font-medium leading-snug text-[#1D6AF2] md:text-[18px]">
        {text}
      </div>
    </div>
  );
}

function AiBubble({
  text,
  attempt,
  showImage,
  typing,
}: {
  text: string;
  attempt?: 1 | 2 | 3 | 4 | 5;
  showImage: boolean;
  typing: boolean;
}) {
  return (
    <div className="mb-4 flex w-full items-end justify-start gap-3">
      <Orb />
      <div className="max-w-[82%] rounded-[22px] rounded-bl-md bg-[#F1F3F5] px-5 py-3 text-[16px] leading-snug text-[#15171A] md:text-[18px]">
        <p>
          {text}
          {typing && <span className="caret" aria-hidden />}
        </p>
        {attempt && showImage && <AttemptCard kind={attempt} />}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="mb-4 flex w-full items-end justify-start gap-3">
      <Orb />
      <div className="flex items-center gap-1.5 rounded-[22px] rounded-bl-md bg-[#F1F3F5] px-5 py-4">
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-black/30 [animation-delay:-0.3s]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-black/30 [animation-delay:-0.15s]" />
        <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" />
      </div>
    </div>
  );
}

type AiState = { index: number; typed: number; indicator: boolean; image: boolean };
type Phase = "idle" | "chat" | "climax" | "done";

// 로고가 폴더 위에 안착하는 세로 위치(vh)
const LOGO_TOP_VH = 58;

export function LogoEvolutionScene() {
  const ref = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [revealed, setRevealed] = useState(0);
  const [composing, setComposing] = useState<string | null>(null);
  const [ai, setAi] = useState<AiState | null>(null);
  const [climaxP, setClimaxP] = useState(0);
  const [yOffset, setYOffset] = useState(0);

  const landedRef = useRef(false);
  const startedRef = useRef(false);
  const lockRef = useRef<ScrollLock | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let rafId: number | null = null;
    let gate: SpaceGate | null = null;
    const timers = new Set<number>();

    const sleep = (ms: number) =>
      new Promise<void>((res) => {
        const id = window.setTimeout(() => {
          timers.delete(id);
          res();
        }, ms);
        timers.add(id);
      });

    const typeString = (text: string, cps: number, onUpdate: (s: string) => void) =>
      new Promise<void>((res) => {
        const t0 = performance.now();
        const step = (now: number) => {
          if (cancelled) return res();
          const n = Math.min(text.length, Math.floor(((now - t0) / 1000) * cps));
          onUpdate(text.slice(0, n));
          if (n < text.length) rafId = requestAnimationFrame(step);
          else {
            onUpdate(text);
            res();
          }
        };
        rafId = requestAnimationFrame(step);
      });

    const typeCount = (len: number, cps: number, onN: (n: number) => void) =>
      new Promise<void>((res) => {
        const t0 = performance.now();
        const step = (now: number) => {
          if (cancelled) return res();
          const n = Math.min(len, Math.floor(((now - t0) / 1000) * cps));
          onN(n);
          if (n < len) rafId = requestAnimationFrame(step);
          else {
            onN(len);
            res();
          }
        };
        rafId = requestAnimationFrame(step);
      });

    const fireLanded = () => {
      if (!landedRef.current) {
        landedRef.current = true;
        window.dispatchEvent(new CustomEvent("haru:logo-landed"));
      }
    };

    const finish = () => {
      const node = ref.current;
      if (!node) {
        lockRef.current?.release();
        lockRef.current = null;
        setPhase("done");
        return;
      }
      const nextTop = node.offsetTop + node.offsetHeight;
      releaseAndAdvance(lockRef.current, nextTop, () => setPhase("done"));
      lockRef.current = null;
    };

    const runClimax = () =>
      new Promise<void>((res) => {
        setPhase("climax");
        const t0 = performance.now();
        const step = (now: number) => {
          if (cancelled) return res();
          const cp = Math.min(1, (now - t0) / CLIMAX_MS);
          setClimaxP(cp);
          if (cp >= 0.92) fireLanded();
          if (cp < 1) rafId = requestAnimationFrame(step);
          else {
            setClimaxP(1);
            fireLanded();
            res();
          }
        };
        rafId = requestAnimationFrame(step);
      });

    const sequence = async () => {
      setPhase("chat");
      for (let i = 0; i < messages.length; i++) {
        if (cancelled) return;
        const m = messages[i];
        if (m.role === "me") {
          setComposing("");
          await typeString(m.text, ME_CPS, (s) => setComposing(s));
          await sleep(AFTER_ME_TYPE_MS);
          if (cancelled) return;
          setComposing(null);
          setRevealed(i + 1);
          await sleep(AFTER_SEND_MS);
        } else {
          setAi({ index: i, typed: 0, indicator: true, image: false });
          await sleep(INDICATOR_MS);
          if (cancelled) return;
          setAi((a) => (a ? { ...a, indicator: false } : a));
          await typeCount(m.text.length, AI_CPS, (n) =>
            setAi((a) => (a ? { ...a, typed: n } : a))
          );
          if (m.attempt) {
            await sleep(BEFORE_IMG_MS);
            if (cancelled) return;
            setAi((a) => (a ? { ...a, image: true } : a));
            await sleep(IMG_REVEAL_MS);
          }
          if (cancelled) return;
          setRevealed(i + 1);
          setAi(null);
          await sleep(AFTER_AI_MS);
        }
      }
      if (cancelled) return;
      // 대화가 끝나면 자동으로 "이거다." 피날레로 넘어가지 않고 스페이스바를 기다림.
      gate = waitForSpace();
      await gate.promise;
      if (cancelled) return;
      await runClimax();
      if (cancelled) return;
      // 피날레(로고가 코너로 날아간 뒤)에서도 자동으로 카오스로 넘어가지 않고 스페이스바를 기다림.
      gate = waitForSpace();
      await gate.promise;
      if (cancelled) return;
      finish();
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting && e.intersectionRatio >= 0.85 && !startedRef.current) {
          startedRef.current = true;
          io.disconnect();
          if (reduce) {
            setRevealed(messages.length);
            setPhase("chat");
            fireLanded();
            return;
          }
          const node = ref.current;
          if (node) lockRef.current = lockScrollAt(node.offsetTop);
          sequence();
        }
      },
      { threshold: [0.85, 1] }
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
      gate?.cancel();
      timers.forEach((id) => window.clearTimeout(id));
      lockRef.current?.release();
      lockRef.current = null;
      if (landedRef.current) {
        window.dispatchEvent(new CustomEvent("haru:logo-unlanded"));
      }
    };
  }, []);

  // 스택이 메시지 영역보다 커지면 위로 밀어 최신 버블을 하단에 고정
  useLayoutEffect(() => {
    const stack = stackRef.current;
    const view = viewportRef.current;
    if (!stack || !view) return;
    const recompute = () => {
      const overflow = stack.scrollHeight - view.clientHeight;
      setYOffset(Math.max(0, overflow));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(stack);
    window.addEventListener("resize", recompute);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, []);

  // ── 페이드 + 클라이맥스(피날레) 계산 ──
  const inClimax = phase === "climax" || phase === "done";
  const cp = climaxP;
  const climaxOn = phase === "climax";

  // 채팅 카드: 진입 페이드인 → 클라이맥스 첫 12% 동안 아웃
  const cardOpacity =
    phase === "idle" || phase === "done" ? 0 : climaxOn ? Math.max(0, 1 - cp / 0.12) : 1;

  // 협업 캔버스(폴더+커서): 끝까지 라이트 유지 → 다음 카오스 씬의 폴더로 끊김 없이 이어짐
  const canvasOpacity = phase === "idle" || phase === "done" ? 0 : 1;

  // 로고 안착(0.12→0.30 커지며 등장)
  const settle = !inClimax ? 0 : Math.min(1, Math.max(0, (cp - 0.12) / 0.18));
  const settleEase = 1 - Math.pow(1 - settle, 3);
  const settleScale = 0.82 + 0.18 * settleEase;
  const logoIn = !inClimax ? 0 : Math.min(1, Math.max(0, (cp - 0.12) / 0.08));

  // 선택 프레임(핸들/라벨)
  const selOpacity = !inClimax
    ? 0
    : cp < 0.12
    ? 0
    : cp < 0.2
    ? (cp - 0.12) / 0.08
    : cp < 0.5
    ? 1
    : Math.max(0, 1 - (cp - 0.5) / 0.06);

  // "이거다." (라이트 캔버스 위 다크 텍스트)
  const igeodaOpacity = !inClimax
    ? 0
    : cp < 0.18
    ? 0
    : cp < 0.26
    ? (cp - 0.18) / 0.08
    : cp < 0.48
    ? 1
    : Math.max(0, 1 - (cp - 0.48) / 0.07);

  // 비행(0.55→0.92) — 폴더 위치에서 좌상단 햄버거로
  const flyP = Math.max(0, Math.min(1, (cp - 0.55) / 0.37));
  const fly = flyP < 0.5 ? 4 * flyP * flyP * flyP : 1 - Math.pow(-2 * flyP + 2, 3) / 2;
  const rotateDeg = fly * 360;
  const logoScale = settleScale * (1 - fly * 0.85);
  const tx = `calc((44px - 50vw) * ${fly})`;
  const ty = `calc((44px - ${LOGO_TOP_VH}vh) * ${fly})`;
  const arrivedFade = flyP < 0.85 ? 1 : Math.max(0, 1 - (flyP - 0.85) / 0.12);
  const logoOpacity = logoIn * arrivedFade;

  const sendActive = composing != null && composing.length > 0;

  // 협업 코멘트 핀 (대화 진행에 맞춰 등장)
  const pin1 = revealed >= 6 ? 1 : 0;
  const pin2 = revealed >= 9 ? 1 : 0;

  return (
    <section ref={ref} className="relative w-full" style={{ height: "100vh" }}>
      <div className="absolute inset-0 flex h-screen w-full items-center justify-center overflow-hidden bg-black px-4">
        <style>{`
          @keyframes d1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(22px,-16px)} }
          @keyframes d2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-18px,14px)} }
          @keyframes d3 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(14px,18px)} }
        `}</style>

        {/* ── 협업 캔버스: 라이트 배경 + 큰 폴더 + 팀 커서 + 코멘트 핀 ── */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden bg-[#F0EFED]"
          style={{
            opacity: canvasOpacity,
            transition: climaxOn ? "none" : "opacity 600ms ease",
          }}
        >
          <BlueFolder
            className="absolute left-1/2 w-[760px] -translate-x-1/2"
            style={{ bottom: "-130px" }}
          />
          {CURSORS.map((c, i) => (
            <Cursor key={i} c={c} />
          ))}
          {/* 코멘트 핀 — 내 명령 요약 */}
          <div
            className="absolute left-[11%] top-[40%] rounded-2xl rounded-tl-sm bg-[#FF6A2C] px-4 py-2.5 text-[15px] font-medium text-white shadow-lg"
            style={{ opacity: pin1, transition: "opacity 500ms cubic-bezier(0.2,1,0.4,1)" }}
          >
            단순하게 다시.
          </div>
          <div
            className="absolute right-[10%] top-[56%] rounded-2xl rounded-tr-sm bg-[#2C7AFC] px-4 py-2.5 text-[15px] font-medium text-white shadow-lg"
            style={{ opacity: pin2, transition: "opacity 500ms cubic-bezier(0.2,1,0.4,1)" }}
          >
            시그니처 한 곡선으로 가자.
          </div>
        </div>

        {/* ── 라이트 채팅 카드 (앞, 포커스) ── */}
        <div
          style={{
            opacity: cardOpacity,
            transition: climaxOn ? "none" : "opacity 420ms ease",
            pointerEvents: cardOpacity < 0.5 ? "none" : "auto",
          }}
          className="relative z-10 w-full max-w-[700px]"
        >
          <div
            className="flex w-full flex-col overflow-hidden rounded-[30px] bg-white shadow-[0_40px_120px_-24px_rgba(0,0,0,.45)]"
            style={{ height: "min(90vh, 920px)" }}
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] px-6 py-4">
              <div className="flex items-center gap-2.5">
                <Orb size={30} />
                <span className="font-sans text-[17px] font-semibold text-[#15171A]">
                  AI 디자이너
                </span>
              </div>
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-black/35" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            </div>

            <div
              ref={viewportRef}
              className="relative flex-1 overflow-hidden px-5 pt-5"
              style={{
                maskImage:
                  yOffset > 4
                    ? "linear-gradient(to bottom, transparent 0, #000 14%, #000 100%)"
                    : "none",
                WebkitMaskImage:
                  yOffset > 4
                    ? "linear-gradient(to bottom, transparent 0, #000 14%, #000 100%)"
                    : "none",
              }}
            >
              <div
                ref={stackRef}
                className="flex w-full flex-col"
                style={{
                  transform: `translateY(-${yOffset}px)`,
                  transition: "transform 520ms cubic-bezier(0.2, 1, 0.4, 1)",
                }}
              >
                {messages.slice(0, revealed).map((m, i) =>
                  m.role === "me" ? (
                    <MeBubble key={i} text={m.text} />
                  ) : (
                    <AiBubble
                      key={i}
                      text={m.text}
                      attempt={m.attempt}
                      showImage={!!m.attempt}
                      typing={false}
                    />
                  )
                )}

                {ai &&
                  (ai.indicator ? (
                    <TypingIndicator />
                  ) : (
                    <AiBubble
                      text={messages[ai.index].text.slice(0, ai.typed)}
                      attempt={messages[ai.index].attempt}
                      showImage={ai.image}
                      typing={ai.typed < messages[ai.index].text.length}
                    />
                  ))}
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-5 py-4">
              <div className="flex flex-1 items-center gap-2 rounded-full bg-[#F1F3F5] px-5 py-3.5">
                <span
                  className={`flex-1 overflow-hidden whitespace-nowrap text-[16px] ${
                    composing != null ? "text-[#15171A]" : "text-black/35"
                  }`}
                >
                  {composing != null ? composing : "메시지 입력"}
                  {composing != null && <span className="caret" aria-hidden />}
                </span>
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px] shrink-0 text-black/45" aria-hidden>
                  <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3z" fill="currentColor" />
                  <path
                    d="M19 11a7 7 0 0 1-14 0M12 18v3"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-colors duration-200"
                style={{
                  background: sendActive ? ORB_BG : "#E3E6EA",
                  boxShadow: sendActive ? "0 2px 10px rgba(44,122,252,.35)" : "none",
                }}
              >
                <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" aria-hidden>
                  <path
                    d="M12 19V5M12 5l-6 6M12 5l6 6"
                    stroke={sendActive ? "#fff" : "rgba(0,0,0,.4)"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ── 피날레: "이거다." (라이트 위 다크) ── */}
        <div
          className="pointer-events-none absolute inset-x-0 top-[26%] z-20 flex justify-center"
          style={{ opacity: igeodaOpacity }}
        >
          <p
            className="font-sans font-bold tracking-tight text-[#15171A]"
            style={{ fontSize: "clamp(2.4rem, 7vw, 6rem)" }}
          >
            이거다.
          </p>
        </div>

        {/* ── 피날레: 폴더 위 "선택된" 로고 프레임 (핸들 + 라벨) ── */}
        <div
          className="pointer-events-none absolute left-1/2 z-20"
          style={{
            top: `${LOGO_TOP_VH}%`,
            transform: `translate(-50%, -50%) scale(${settleScale})`,
            opacity: selOpacity,
          }}
        >
          <div className="relative h-[230px] w-[230px] rounded-2xl border-2 border-[#2C7AFC] bg-white shadow-[0_24px_60px_-18px_rgba(0,0,0,.35)]">
            <Handles />
            <span className="absolute -top-7 left-0 rounded bg-[#2C7AFC] px-2 py-0.5 text-[11px] font-semibold text-white">
              로고 / final
            </span>
          </div>
        </div>

        {/* ── 비행하는 로고 (선택 프레임 안 → 좌상단 햄버거) ── */}
        <div
          className="pointer-events-none absolute left-1/2 z-30"
          style={{
            top: `${LOGO_TOP_VH}%`,
            opacity: logoOpacity,
            transform: `translate(-50%, -50%) translate(${tx}, ${ty}) rotate(${rotateDeg}deg) scale(${logoScale})`,
            transformOrigin: "center center",
          }}
        >
          <div
            className="h-[200px] w-[200px]"
            style={{
              filter: `drop-shadow(0 0 ${6 + fly * 26}px rgba(44, 122, 252, ${0.22 + fly * 0.4}))`,
              transition: "filter 80ms linear",
            }}
          >
            <FinalLogo />
          </div>
        </div>
      </div>
    </section>
  );
}
