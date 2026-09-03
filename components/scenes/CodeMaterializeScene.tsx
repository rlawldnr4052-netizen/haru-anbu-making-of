"use client";

import { useEffect, useRef, useState } from "react";
import { lockScrollAt, releaseAndAdvance, ScrollLock } from "@/lib/scrollLock";
import { waitForSpace, SpaceGate } from "@/lib/waitForSpace";

// v11_보호자앱/g-guardian-live.html 그대로 100% 재현.
// 색·치수·재질 모두 v11 CSS 변수와 동일하게 매칭:
//  --blue:#2C7AFC  --t1:#111827  --t2:rgba(0,0,0,.5)  --t3:rgba(0,0,0,.35)
//  배경 #f8fbff, AI orb 560x560 radial(#1BE7EA → #46A8FF → transparent) blur(24px)
//  greeting padding:46px 4px 0, 28px 700, color:#2a1810
//  sheet margin-top: 37vh, bg rgba(236,242,250,.90)→#ecf2fa, radius 28px 28px 0 0
//  bottom-bar bottom:24px, max-w 370px, tabbar 60px pill + ai-fab 60x60
type Step = "bg" | "orb" | "topnav" | "greet" | "report" | "tabbar";
type Chunk = { code: string; step: Step };

const chunks: Chunk[] = [
  {
    step: "bg",
    code: `<!DOCTYPE html>
<html lang="ko">
<head>
  <title>하루안부 — 보호자 홈</title>
  <style>
    html,body{ background:#f8fbff; }
    :root{ --blue:#2C7AFC; --t1:#111827; }
  </style>
</head>
<body>`,
  },
  {
    step: "orb",
    code: `

  <!-- AI 오브 — 영구 배경 (560x560, blur 24px) -->
  <div class="ai-orb-bg">
    <div class="ai-orb"
         style="background: radial-gradient(
           circle at 50% 32%,
           #1BE7EA 0%,
           rgba(70,195,230,.95) 38%,
           #46A8FF 72%,
           rgba(70,168,255,.3) 88%,
           transparent 100%
         );
         filter: blur(24px);
         animation: orbBreath 7s infinite;" />
  </div>`,
  },
  {
    step: "topnav",
    code: `

  <div class="chat-fixed">
    <nav class="top-nav">
      <button class="logo" aria-label="대화 기록">
        <svg viewBox="0 0 512 512">
          <path fill="#2C7AFC" d="M2521 2506C1239 2657..."/>
        </svg>
      </button>
      <div class="top-nav-right">
        <a class="nav-btn" aria-label="알림">
          <iconify-icon icon="fluent:alert-24-filled"/>
          <span class="notif-dot"/>
        </a>
        <a class="nav-btn" aria-label="프로필">
          <iconify-icon icon="fluent:person-24-filled"/>
        </a>
      </div>
    </nav>`,
  },
  {
    step: "greet",
    code: `

    <div class="greeting-zone">
      <h1 class="greeting-main">
        오늘도 수고하셨어요,<br>
        정희님 잘 있어요
      </h1>
      <p class="greeting-sub">
        저녁 일과도 잘 되고 있어요.
      </p>
    </div>
  </div>`,
  },
  {
    step: "report",
    code: `

  <!-- 리포트 시트 — 37vh 아래부터 슬라이드 업 -->
  <div class="app">
    <div class="report-sheet">
      <div class="sheet-drag">
        <div class="sheet-drag-pill"/>
      </div>
      <div class="report-content">
        <div class="section-header">
          <div class="section-title">일일 리포트</div>
          <div class="section-date">5월 17일 (일)</div>
        </div>
        <a class="moment-card">
          <div class="moment-photo"
               style="background:url(mockup.png) center/cover;
                      height:200px;"/>
          <div class="moment-body">
            <div class="moment-quote">
              "오전 산책 때 햇빛이 좋아서
한참 머무르셨어요.
기분이 정말 좋아 보이셨어요."
            </div>
            <div class="moment-meta">
              김미영 간호사 · 10:24
            </div>
          </div>
        </a>
        <div class="grid">
          <div class="w">
            <div class="w-title"><iconify-icon icon="fluent:pill-24-filled"/> 투약</div>
            <div class="big">33<em>%</em></div>
            <div class="sub">1/3 복용 완료</div>
            <div class="sub">다음 복용 18:00</div>
          </div>
          <div class="w pulse-w">
            <div class="w-title"><iconify-icon icon="fluent:heart-pulse-24-filled"/> 맥박</div>
            <div class="pulse-num">72<u>BPM</u></div>
            <div class="sub">평균 근처 (±74)</div>
          </div>
        </div>
      </div>
    </div>
  </div>`,
  },
  {
    step: "tabbar",
    code: `

  <!-- bottom-bar = tabbar(pill) + ai-fab(원) -->
  <div class="bottom-bar">
    <nav class="tabbar">
      <a class="tab active"><home-24-filled/></a>
      <a class="tab"><book-24-filled/></a>
      <a class="tab"><chat-bubble/></a>
      <a class="tab"><folder-24-filled/></a>
      <a class="tab"><person-24-filled/></a>
    </nav>
    <button class="ai-fab">
      <svg viewBox="0 0 2526 2526">
        <path fill="#2C7AFC" d="M2521 2506C1239 2657..."/>
      </svg>
    </button>
  </div>

</body>
</html>`,
  },
];

const fullCode = chunks.map((c) => c.code).join("");
const TOTAL = fullCode.length;

const checkpoints = chunks.reduce<{ step: Step; at: number }[]>((acc, c) => {
  const prev = acc.length ? acc[acc.length - 1].at : 0;
  acc.push({ step: c.step, at: prev + c.code.length });
  return acc;
}, []);

function syntaxColor(escaped: string) {
  let s = escaped
    .replace(/&quot;([^&]*?)&quot;/g, "§S§&quot;$1&quot;§E§")
    .replace(/(&lt;\/?[\w][\w-]*)/g, "§T§$1§E§")
    .replace(/(\/?&gt;)/g, "§T§$1§E§")
    .replace(/\b([\w-]+)=/g, "§A§$1§E§=")
    .replace(/(\{[^}]*\})/g, "§X§$1§E§");
  s = s
    .replace(/§T§/g, '<span style="color:#ff7b9c">')
    .replace(/§A§/g, '<span style="color:#ffffff">')
    .replace(/§S§/g, '<span style="color:#74a8ff">')
    .replace(/§X§/g, '<span style="color:#fbbf24">')
    .replace(/§E§/g, "</span>");
  return s;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// v11 로고 — 두 path 그대로 (대화 기록 버튼)
function HaruLogo({ size = 30, fill = "#2C7AFC" }: { size?: number; fill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" fill="none" aria-hidden>
      <g transform="translate(50,50) scale(0.163)">
        <path
          d="M2521.32 2506.66C1239.65 2657.48 1239.65 1895.6 1239.65 1279.34L2497.69 0C2518.68 494.198 2522.27 1157.92 1658.86 1262.48C2641.88 1314.25 2521.32 2101.84 2521.32 2506.66Z"
          fill={fill}
        />
        <path
          d="M4.677 19.335C1286.35 -131.481 1286.35 630.399 1286.35 1246.66L28.315 2526C7.322 2031.8 3.73 1368.08 867.143 1263.52C-115.881 1211.75 4.677 424.157 4.677 19.335Z"
          fill={fill}
        />
      </g>
    </svg>
  );
}

// fluent:alert-24-filled (간호 아이콘 라이브러리 동일 아이콘)
function AlertIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M12 22a2 2 0 0 0 2-2h-4a2 2 0 0 0 2 2zm6.36-6l1.64 1.64v.86H4v-.86L5.64 16V11c0-3.07 1.63-5.64 4.5-6.32V4a1.88 1.88 0 0 1 3.75 0v.68C16.74 5.36 18.36 7.92 18.36 11v5z" />
    </svg>
  );
}
function PersonIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}

// fluent:pill-filled / pulse-filled / emoji-filled
function PillIcon({ size = 16, color = "#34D399" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size} aria-hidden>
      <path d="M16.5 3a4.5 4.5 0 0 1 3.18 7.68l-9 9A4.5 4.5 0 1 1 4.32 13.32l9-9A4.48 4.48 0 0 1 16.5 3zm-4 4.07l-6.18 6.18a2.5 2.5 0 1 0 3.54 3.54L16 10.6z" />
    </svg>
  );
}
function PulseIcon({ size = 16, color = "#EF4444" }: { size?: number; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill={color} width={size} height={size} aria-hidden>
      <path d="M3 12h4l2-5 4 10 2-5h6v2h-4l-3 7-4-10-1 3H3z" />
    </svg>
  );
}

// 탭바 아이콘 — fluent filled 매칭
function HomeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M11.3 2.7a1 1 0 0 1 1.4 0l8.3 8.3a1 1 0 0 1-.7 1.7H19v7a2 2 0 0 1-2 2h-3v-6h-4v6H7a2 2 0 0 1-2-2v-7H3.7a1 1 0 0 1-.7-1.7z" />
    </svg>
  );
}
// fluent:book-24-filled — 실제 보호자앱 '기록' 탭과 동일 아이콘
function BookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M6.5 2A2.5 2.5 0 0 0 4 4.5v15A2.5 2.5 0 0 0 6.5 22h13.25a.75.75 0 0 0 0-1.5H6.5a1 1 0 0 1-1-1h14.25a.75.75 0 0 0 .75-.75V4.5A2.5 2.5 0 0 0 18 2zM8 5h8a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1" />
    </svg>
  );
}
function ChatIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M12 2C6.48 2 2 5.81 2 10.5c0 2.65 1.56 5.02 4 6.56V22l4.34-2.41c.54.07 1.1.11 1.66.11 5.52 0 10-3.81 10-8.5S17.52 2 12 2z" />
    </svg>
  );
}
function FolderIcon({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} aria-hidden>
      <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h3.62a2 2 0 0 1 1.41.59L11.83 6H18.5A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" />
    </svg>
  );
}

// 자동재생 총 시간 (ms) — 들어오면 알아서 타이핑되고 다음 씬으로 넘어감
const PLAY_MS = 7000;
const HOLD_AFTER_MS = 700;

export function CodeMaterializeScene() {
  const ref = useRef<HTMLElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);
  const [chars, setChars] = useState(0);
  const [, setPhase] = useState<"idle" | "playing" | "scrolling" | "done">(
    "idle"
  );
  const startedRef = useRef(false);
  const lockRef = useRef<ScrollLock | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let rafId: number | null = null;
    let holdTimer: number | null = null;
    let gate: SpaceGate | null = null;

    const finish = () => {
      const node = ref.current;
      if (!node) {
        lockRef.current?.release();
        lockRef.current = null;
        setPhase("done");
        return;
      }
      setPhase("scrolling");
      const nextTop = node.offsetTop + node.offsetHeight;
      releaseAndAdvance(lockRef.current, nextTop, () => setPhase("done"));
      lockRef.current = null;
    };

    const start = () => {
      if (reduce) {
        setChars(TOTAL);
        finish();
        return;
      }
      setPhase("playing");
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / PLAY_MS);
        // ease-out cubic — 끝으로 갈수록 살짝 감속
        const eased = 1 - Math.pow(1 - p, 2.2);
        setChars(Math.round(eased * TOTAL));
        if (p < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          setChars(TOTAL);
          // 코드가 다 쳐진 뒤 한 박자 → 자동 진행하지 않고 스페이스바를 기다림.
          holdTimer = window.setTimeout(() => {
            gate = waitForSpace();
            gate.promise.then(finish);
          }, HOLD_AFTER_MS);
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (e?.isIntersecting && e.intersectionRatio >= 0.85 && !startedRef.current) {
          startedRef.current = true;
          io.disconnect();
          const node = ref.current;
          // 진입 즉시 섹션 top에 고정 + 락 (reduce면 락 없이 즉시 완료)
          if (node && !reduce) {
            lockRef.current = lockScrollAt(node.offsetTop);
          }
          start();
        }
      },
      { threshold: [0.85, 1] }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
      if (holdTimer != null) window.clearTimeout(holdTimer);
      gate?.cancel();
      lockRef.current?.release();
      lockRef.current = null;
    };
  }, []);

  useEffect(() => {
    const pre = codeRef.current;
    if (!pre) return;
    pre.scrollTop = pre.scrollHeight;
  }, [chars]);

  const visibleCode = fullCode.slice(0, chars);
  const lines = visibleCode.split("\n");
  const renderedHtml =
    lines
      .map((l) => `<div>${syntaxColor(escapeHtml(l)) || "&nbsp;"}</div>`)
      .join("") + '<span class="caret caret-fat" aria-hidden></span>';

  const reached = (step: Step) => {
    const cp = checkpoints.find((c) => c.step === step);
    return cp ? chars >= cp.at : false;
  };
  const partial = (step: Step) => {
    const idx = checkpoints.findIndex((c) => c.step === step);
    if (idx === -1) return 0;
    const prev = idx === 0 ? 0 : checkpoints[idx - 1].at;
    const cur = checkpoints[idx].at;
    return Math.max(0, Math.min(1, (chars - prev) / (cur - prev)));
  };

  const reveal = (
    step: Step,
    base = 0,
    yOffset = 24
  ): React.CSSProperties => ({
    opacity: reached(step) ? 1 : partial(step) > 0.5 ? partial(step) : 0,
    transform: reached(step)
      ? `translateY(${base}px)`
      : `translateY(${base + yOffset}px)`,
    transition:
      "opacity 540ms cubic-bezier(0.2, 1, 0.4, 1), transform 620ms cubic-bezier(0.2, 1, 0.4, 1)",
  });

  return (
    <section ref={ref} className="relative w-full" style={{ height: "100vh" }}>
      <div className="absolute inset-0 flex w-full flex-col overflow-hidden bg-black">
        {/* 1) #f8fbff 흰 캔버스 */}
        <div
          className="absolute inset-0"
          style={{
            background: "#f8fbff",
            opacity: partial("bg"),
            transition: "opacity 480ms ease-out",
          }}
        />

        {/* 2) AI orb — 560x560 가운데, breath animation */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1]"
          style={{
            width: "min(560px, 110vw)",
            height: "min(560px, 110vw)",
            transform: "translate(-50%, -50%)",
            opacity: reached("orb") ? 1 : partial("orb"),
            transition: "opacity 720ms cubic-bezier(0.2, 1, 0.4, 1)",
          }}
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 50% 32%, #1BE7EA 0%, rgba(70,195,230,0.95) 38%, #46A8FF 72%, rgba(70,168,255,0.3) 88%, transparent 100%)",
              filter: "blur(24px)",
              animation: reached("orb")
                ? "orbBreath 7s cubic-bezier(.45,.05,.55,.95) infinite"
                : undefined,
            }}
          />
        </div>

        <style>{`
          @keyframes orbBreath {
            0%   { transform: scale(1) translate(0,0);     opacity:.88; filter:blur(24px); }
            18%  { transform: scale(1.14) translate(8px,-14px); opacity:.98; filter:blur(20px); }
            35%  { transform: scale(.96) translate(-6px,6px);   opacity:.85; filter:blur(28px); }
            52%  { transform: scale(1.22) translate(-4px,-18px);opacity:1;   filter:blur(18px); }
            70%  { transform: scale(1.04) translate(10px,-2px); opacity:.92; filter:blur(23px); }
            85%  { transform: scale(1.16) translate(-8px,-10px);opacity:.97; filter:blur(21px); }
            100% { transform: scale(1) translate(0,0);     opacity:.88; filter:blur(24px); }
          }
        `}</style>

        {/* 모바일 앱 캔버스 — max-w 430px, 흰 캔버스 + orb 위에 z-10 */}
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col">
          {/* 3) chat-fixed > top-nav (px 24px, mt 8px ≒ top safe area) */}
          <div
            className="relative px-6 pt-6"
            style={reveal("topnav", 0, 18)}
          >
            <nav className="flex items-center justify-between">
              <button
                aria-label="대화 기록"
                className="-m-1 flex items-center gap-2 bg-transparent p-1"
              >
                <HaruLogo size={30} fill="#2C7AFC" />
              </button>
              <div className="flex items-center gap-2">
                <a
                  aria-label="알림"
                  className="relative grid h-9 w-9 place-items-center rounded-full bg-white/55 text-[#2C7AFC] ring-[0.5px] ring-white/55"
                  style={{
                    boxShadow:
                      "0 1px 1px rgba(255,255,255,.6) inset, 0 4px 16px rgba(0,0,0,.06)",
                  }}
                >
                  <AlertIcon size={20} />
                  <span
                    className="absolute top-[6px] right-[6px] h-[7px] w-[7px] rounded-full bg-[#FF3B30]"
                    style={{ border: "1.5px solid rgba(255,255,255,.7)" }}
                  />
                </a>
                <a
                  aria-label="프로필"
                  className="grid h-9 w-9 place-items-center rounded-full bg-white/55 text-[#2C7AFC] ring-[0.5px] ring-white/55"
                  style={{
                    boxShadow:
                      "0 1px 1px rgba(255,255,255,.6) inset, 0 4px 16px rgba(0,0,0,.06)",
                  }}
                >
                  <PersonIcon size={20} />
                </a>
              </div>
            </nav>
          </div>

          {/* 4) greeting-zone — padding:46px 4px 0, 28px 700 #2a1810 */}
          <div className="px-6 pt-[46px]" style={reveal("greet", 0, 18)}>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                lineHeight: 1.18,
                letterSpacing: "-0.85px",
                color: "#2a1810",
                textShadow: "0 1px 0 rgba(255,255,255,.2)",
              }}
            >
              오늘도 수고하셨어요,
              <br />
              정희님 잘 있어요
            </h1>
            <p
              style={{
                marginTop: 8,
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.45,
                color: "rgba(42,24,16,.62)",
              }}
            >
              저녁 일과도 잘 되고 있어요.
            </p>
          </div>
        </div>

        {/* 5) report-sheet — v11 정확 재현: margin-top 37vh, 둥근 28px, 우유빛 글래스 */}
        <div
          className="pointer-events-none absolute left-1/2 z-[5] w-full max-w-[430px] -translate-x-1/2"
          style={{
            top: "calc(37vh + 2px)",
            ...reveal("report", 0, 60),
          }}
        >
          <div
            className="px-4 pt-4"
            style={{
              background:
                "linear-gradient(180deg, rgba(236,242,250,0.90) 0%, rgba(236,242,250,0.90) 72px, #ecf2fa 160px, #ecf2fa 100%)",
              backdropFilter: "blur(32px) saturate(150%) brightness(1.02)",
              WebkitBackdropFilter:
                "blur(32px) saturate(150%) brightness(1.02)",
              borderRadius: "28px 28px 0 0",
              borderTop: "0.5px solid rgba(255,255,255,0.88)",
              borderLeft: "0.5px solid rgba(255,255,255,0.72)",
              borderRight: "0.5px solid rgba(255,255,255,0.72)",
              boxShadow:
                "0 -6px 32px rgba(0,0,0,0.08), 0 -1px 0 rgba(255,255,255,0.6)",
              minHeight: "60vh",
              paddingBottom: 112,
            }}
          >
            {/* sheet-drag-pill */}
            <div className="flex justify-center pb-3 pt-2">
              <div
                style={{
                  width: 40,
                  height: 5,
                  borderRadius: 3,
                  background: "rgba(0,0,0,.15)",
                }}
              />
            </div>

            <div className="px-4 pt-4">
              {/* section-header */}
              <div className="mb-2 flex items-center justify-between px-1 pb-2">
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    letterSpacing: "-0.3px",
                    color: "#111827",
                  }}
                >
                  일일 리포트
                </div>
                <div style={{ fontSize: 12, color: "rgba(0,0,0,.35)" }}>
                  5월 17일 (일)
                </div>
              </div>

              {/* moment-card */}
              <div
                className="overflow-hidden"
                style={{
                  background: "rgba(255,255,255,.92)",
                  border: "1px solid rgba(0,0,0,.04)",
                  borderRadius: 20,
                  boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                  marginBottom: 10,
                }}
              >
                <div
                  className="relative"
                  style={{
                    height: 200,
                    background: "#f3e9dc url(/making_of/v11-preview/mockup.png) center/cover no-repeat",
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0"
                    style={{
                      height: "50%",
                      background:
                        "linear-gradient(180deg, transparent 0%, rgba(0,0,0,.18) 100%)",
                    }}
                  />
                </div>
                <div className="px-[18px] pb-4 pt-[14px]">
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      lineHeight: 1.5,
                      letterSpacing: "-0.3px",
                      color: "#111827",
                      marginBottom: 6,
                    }}
                  >
                    &ldquo;오전 산책 때 햇빛이 좋아서 한참 머무르셨어요.
                    <br />
                    기분이 정말 좋아 보이셨어요.&rdquo;
                  </div>
                  <div
                    className="flex items-center gap-[6px]"
                    style={{
                      fontSize: 11.5,
                      color: "rgba(0,0,0,.35)",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-block",
                        width: 14,
                        height: 1,
                        background: "rgba(0,0,0,.15)",
                      }}
                    />
                    김미영 간호사 · 10:24
                  </div>
                </div>
              </div>

              {/* grid (2 cols) — 투약 / 맥박 위젯 */}
              <div className="grid grid-cols-2 gap-[10px]">
                {/* 투약 */}
                <div
                  className="relative overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,.92)",
                    border: "1px solid rgba(0,0,0,.04)",
                    borderRadius: 20,
                    padding: 18,
                    boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                    minHeight: 180,
                  }}
                >
                  <div className="flex items-center gap-[6px]">
                    <PillIcon size={18} color="#6EE7B7" />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        letterSpacing: "-0.3px",
                        color: "#111827",
                      }}
                    >
                      투약
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      fontSize: 38,
                      fontWeight: 800,
                      letterSpacing: "-1.5px",
                      lineHeight: 1,
                      color: "#111827",
                    }}
                  >
                    33
                    <span
                      style={{ fontSize: 18, fontWeight: 600, opacity: 0.4 }}
                    >
                      %
                    </span>
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: "rgba(0,0,0,.35)",
                    }}
                  >
                    1/3 복용 완료
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 11,
                      color: "rgba(0,0,0,.35)",
                    }}
                  >
                    다음 복용 18:00
                  </div>
                </div>

                {/* 맥박 — pulse-w: 상단 아이콘 + 하단 큰 숫자 */}
                <div
                  className="relative flex flex-col overflow-hidden"
                  style={{
                    background: "rgba(255,255,255,.92)",
                    border: "1px solid rgba(0,0,0,.04)",
                    borderRadius: 20,
                    padding: 18,
                    boxShadow: "0 2px 8px rgba(0,0,0,.04)",
                    minHeight: 180,
                  }}
                >
                  <div className="flex items-center gap-[6px]">
                    <PulseIcon size={18} color="#EF4444" />
                    <span
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        letterSpacing: "-0.3px",
                        color: "#111827",
                      }}
                    >
                      맥박
                    </span>
                  </div>
                  <div className="mt-auto">
                    <div className="flex items-baseline gap-[6px]">
                      <span
                        style={{
                          fontSize: 64,
                          fontWeight: 800,
                          letterSpacing: "-3px",
                          lineHeight: 0.88,
                          color: "#111827",
                        }}
                      >
                        72
                      </span>
                      <span
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: "rgba(0,0,0,.35)",
                          letterSpacing: "0.3px",
                        }}
                      >
                        BPM
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 11.5,
                        color: "rgba(0,0,0,.35)",
                        fontWeight: 500,
                      }}
                    >
                      평균 근처 (±74)
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 6) bottom-bar — fixed bottom 24px, max-w 370px, tabbar pill + ai-fab 원 */}
        <div
          className="absolute left-1/2 z-[40] flex w-[calc(100%-48px)] max-w-[370px] -translate-x-1/2 items-center gap-[10px]"
          style={{
            bottom: 24,
            ...reveal("tabbar", 0, 20),
          }}
        >
          {/* tabbar pill */}
          <nav
            className="flex h-[60px] flex-1 items-stretch justify-around"
            style={{
              minWidth: 0,
              background: "rgba(210,225,250,.55)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,.45)",
              borderRadius: 999,
              boxShadow:
                "0 4px 20px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.4)",
              padding: "0 10px",
            }}
          >
            <span
              className="flex flex-1 flex-col items-center justify-center gap-[2px] rounded-full px-[4px] py-[8px]"
              style={{ color: "#2C7AFC" }}
            >
              <HomeIcon size={26} />
            </span>
            <span
              className="flex flex-1 flex-col items-center justify-center gap-[2px] rounded-full px-[4px] py-[8px]"
              style={{ color: "rgba(28,28,30,.45)" }}
            >
              <BookIcon size={26} />
            </span>
            <span
              className="flex flex-1 flex-col items-center justify-center gap-[2px] rounded-full px-[4px] py-[8px]"
              style={{ color: "rgba(28,28,30,.45)" }}
            >
              <ChatIcon size={22} />
            </span>
            <span
              className="flex flex-1 flex-col items-center justify-center gap-[2px] rounded-full px-[4px] py-[8px]"
              style={{ color: "rgba(28,28,30,.45)" }}
            >
              <FolderIcon size={26} />
            </span>
            <span
              className="flex flex-1 flex-col items-center justify-center gap-[2px] rounded-full px-[4px] py-[8px]"
              style={{ color: "rgba(28,28,30,.45)" }}
            >
              <PersonIcon size={26} />
            </span>
          </nav>
          {/* AI FAB — 60x60 원, X 로고 */}
          <button
            aria-label="AI와 대화하기"
            className="flex h-[60px] w-[60px] flex-shrink-0 items-center justify-center"
            style={{
              borderRadius: "50%",
              background: "rgba(210,225,250,.55)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(255,255,255,.45)",
              boxShadow:
                "0 4px 20px rgba(0,0,0,.1), inset 0 1px 0 rgba(255,255,255,.4)",
              padding: 0,
            }}
          >
            <HaruLogo size={22} fill="#2C7AFC" />
          </button>
        </div>

        {/* 코드 패널 — 좌측 하단 플로팅 */}
        <div className="pointer-events-none absolute bottom-6 left-4 z-[50] md:bottom-10 md:left-8">
          <div className="w-[min(40vw,460px)] overflow-hidden rounded-2xl border border-white/15 bg-[#0d1117]/95 font-mono shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
                g-guardian-live.html
              </span>
            </div>
            <pre
              ref={codeRef}
              className="h-[36vh] overflow-hidden whitespace-pre px-4 py-3 text-[11px] leading-[1.55] text-white/85 md:text-[12px]"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
