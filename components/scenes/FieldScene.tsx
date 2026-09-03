"use client";

import { useRef, useState } from "react";
import { useSpaceGate } from "@/lib/useSpaceGate";

// KHF 2026 현장 검증 — 제작 과정(Method)과 마무리("하루안부.") 사이에 놓인다.
//
// 이 앞까지 사이트는 "우리가 AI와 어떻게 만들었나"만 말한다. 전부 내부 공정이라
// "그래서 그 방향이 맞았나"에 대한 답이 없다. 이 씬이 그 답이고, 그래서 제작 과정을
// 전부 보여준 "뒤"에 온다. 앞에 두면 참고한 리서치 자료로 축소된다.
//
// 6비트. 스크롤 제스처·엔터 어느 쪽으로도 한 비트씩 넘어간다(useSpaceGate).
//   0 질문 → 1 현장 → 2 누가 → 3 답 → 4 결론 → 5 청중에게 넘기는 질문
// 마지막 비트에서 한 번 더 진행하면 다음 섹션("하루안부.")으로 나간다.
//
// 사진은 여덟 장, **한 장도 겹치지 않게** 배분한다. 같은 사진이 두 비트에 다시
// 나오면 "그날 찍은 게 이게 다"로 읽혀서, 다녀왔다는 사실 자체가 약해진다.
// 한 프레임에서 뜬 크롭도 같은 사진으로 친다 — 그래서 단체사진과 배너 클로즈업
// 중에서는 배너와 팀이 한 컷에 다 들어 있는 단체사진만 남겼다.
//   0 walk · 1 team · 2 badges · 3 listen+ai-booth+pitch · 4 없음 · 5 card
const BEATS = 6;
const EASE = "cubic-bezier(0.2,1,0.4,1)";
const GRAY = "grayscale(1) contrast(1.06)";

// 전면을 덮는 배경 사진(0·5비트). 나머지 비트의 사진은 레이아웃 안에 직접 놓인다.
const BACKDROPS = [
  { src: "khf-walk.webp", beat: 0, dim: 0.18, pos: "50% 42%" },
  { src: "khf-card.webp", beat: 5, dim: 0.22, pos: "50% 38%" }, // 더 내리면 명함이 화면을 덮어 장면이 안 읽힌다
] as const;

// 3비트 — 확인한 것. 한 줄에 사진 한 장씩, 그 줄의 근거가 되는 장면으로 붙인다.
const FINDINGS = [
  {
    id: "same-problem",
    src: "khf-listen.webp",
    alt: "부스에서 현업 설명을 듣는 팀원들",
    pos: "50% 55%",
    line: (
      <>
        현장이 말하는 문제는,
        <br className="sm:hidden" /> 우리가 본 문제와 같았다.
      </>
    ),
  },
  {
    id: "they-too",
    src: "khf-ai-booth.webp",
    alt: "‘우리 병원만의 인공지능을 만든다’ 문구가 걸린 부스",
    pos: "50% 45%",
    line: (
      <>
        그들도 이미,{" "}
        <span className="text-[var(--color-accent-green)]">AI를 활용해</span> 만들고 있었다.
      </>
    ),
  },
  {
    id: "not-delusion",
    src: "khf-pitch.webp",
    alt: "부스에서 우리 서비스를 직접 설명하고 피드백을 듣는 팀",
    pos: "50% 42%",
    line: <span className="font-semibold text-white">착각은 아니었다.</span>,
  },
] as const;

function reveal(on: boolean, delayMs = 0) {
  return {
    opacity: on ? 1 : 0,
    transform: on ? "translateY(0)" : "translateY(14px)",
    transition: `opacity 620ms ${EASE} ${delayMs}ms, transform 660ms ${EASE} ${delayMs}ms`,
  } as const;
}

// 비트 하나의 무대. absolute 로 겹쳐 두고 opacity 로만 교체한다 —
// 모든 사진이 첫 로드 때 함께 받아지므로 발표 도중 회선이 끊겨도 살아 있다.
function Beat({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
      style={{ ...reveal(on), pointerEvents: on ? "auto" : "none" }}
    >
      {children}
    </div>
  );
}

export function FieldScene({ gate }: { gate?: boolean } = {}) {
  const sectionRef = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);

  useSpaceGate(sectionRef, { gate, steps: BEATS, onStep: (i) => setBeat(i) });

  const hasBackdrop = BACKDROPS.some((b) => b.beat === beat);

  return (
    <section
      ref={sectionRef}
      id="nav-field"
      className="relative w-full overflow-hidden bg-black"
      style={{ height: "100vh" }}
    >
      {/* next/image 를 쓰지 않는다: 이미 손으로 webp 최적화를 마쳤고, 무엇보다
          이건 발표 자료다. 발표 도중 사진이 늦게 뜨는 것보다 페이지 로드 때
          미리 받아두는 편이 낫다 — loading 기본값(eager)을 그대로 둔다.
          전부 흑백으로 깔린다: 원본은 KHF 브랜드 레드와 부스 조명색이 제각각이라
          원색 그대로면 이 씬만 톤이 튄다. */}
      {/* eslint-disable @next/next/no-img-element */}
      {BACKDROPS.map(({ src, beat: b, dim, pos }) => (
        <img
          key={src}
          src={`/making_of/media/khf/${src}`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: beat === b ? dim : 0,
            objectPosition: pos,
            filter: GRAY,
            transition: `opacity 900ms ${EASE}`,
          }}
        />
      ))}
      <div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: hasBackdrop ? 0.4 : 0, transition: `opacity 900ms ${EASE}` }}
      />

      <div className="relative h-full w-full">
        {/* ── 0 · 질문 ───────────────────────────────────────────── */}
        <Beat on={beat === 0}>
          <p
            className="font-sans font-semibold leading-[1.25] tracking-tight text-white"
            style={{ fontSize: "clamp(1.6rem, 4.6vw, 3.8rem)" }}
          >
            AI와 한 학기.
            <br />
            여기까지 왔습니다.
          </p>
          <p
            className="mt-8 font-sans font-medium leading-[1.3] tracking-tight text-white/65"
            style={{ fontSize: "clamp(1.15rem, 2.8vw, 2.2rem)" }}
          >
            그런데 이게, 학생 셋의 <span className="font-semibold text-white">착각</span>은
            아닐까요?
          </p>
        </Beat>

        {/* ── 1 · 현장 — 사진이 곧 카피다. 배너 문구를 타이포로 겹쳐 쓰지 않는다 ── */}
        <Beat on={beat === 1}>
          <img
            src="/making_of/media/khf/khf-team.webp"
            alt="KHF 2026 ‘The Intelligent Hospital — AX와 로보틱스가 이끄는 병원 혁신’ 배너 앞에 선 팀원 세 명"
            className="w-auto"
            style={{ maxHeight: "72vh", maxWidth: "100%", filter: GRAY }}
          />
          <p
            className="mt-7 font-mono uppercase text-white/45"
            style={{ fontSize: "clamp(0.7rem, 1.2vw, 0.9rem)", letterSpacing: "0.18em" }}
          >
            KHF 2026 · COEX · 8.19–21
          </p>
        </Beat>

        {/* ── 2 · 누가 갔나 — 그날 목에 걸고 손에 들었던 것 ────────── */}
        <Beat on={beat === 2}>
          <p
            className="font-sans font-semibold leading-[1.25] tracking-tight text-white"
            style={{ fontSize: "clamp(1.4rem, 3.6vw, 3rem)" }}
          >
            계원예술대학교 학생 셋.
          </p>
          <p
            className="mt-5 font-sans font-medium leading-[1.35] tracking-tight text-white/70"
            style={{ fontSize: "clamp(1rem, 2.2vw, 1.7rem)" }}
          >
            한 학기 동안 AI와 만든 것을 들고 갔다.
          </p>
          <img
            src="/making_of/media/khf/khf-badges.webp"
            alt="‘계원예술대학교 학생’ 이름이 찍힌 KHF 2026 참관 배지 세 개"
            className="mt-10"
            style={{
              height: "min(42vh, 34vw)",
              aspectRatio: "3 / 4",
              objectFit: "cover",
              filter: GRAY,
              ...reveal(beat === 2, 300),
            }}
          />
        </Beat>

        {/* ── 3 · 확인한 것 — 한 줄에 근거 사진 한 장씩, 순서대로 쌓인다 ── */}
        <Beat on={beat === 3}>
          <div className="flex w-full max-w-[62rem] flex-col gap-6 md:gap-8">
            {FINDINGS.map(({ id, src, alt, pos, line }, i) => (
              <div
                key={id}
                className="flex items-center gap-5 text-left md:gap-8"
                style={reveal(beat === 3, i * 520)}
              >
                <img
                  src={`/making_of/media/khf/${src}`}
                  alt={alt}
                  className="shrink-0 object-cover"
                  style={{
                    height: "clamp(78px, 19vh, 230px)",
                    aspectRatio: "4 / 3",
                    objectPosition: pos,
                    filter: GRAY,
                  }}
                />
                <p
                  className="font-sans font-medium leading-[1.4] tracking-tight text-white/80"
                  style={{ fontSize: "clamp(1rem, 2.4vw, 2.1rem)" }}
                >
                  {line}
                </p>
              </div>
            ))}
          </div>
        </Beat>
        {/* eslint-enable @next/next/no-img-element */}

        {/* ── 4 · 결론 — 유일하게 사진 없는 비트. 검정 위 타이포만 남긴다.
             이 씬에서 유일하게 초록 강조도 쓰지 않는다: 앞뒤 비트가 초록을
             쓰기 때문에, 여기만 흰색으로 두면 결론이 저절로 도드라진다. ── */}
        <Beat on={beat === 4}>
          <p
            className="font-sans font-extrabold leading-[1.15] tracking-tight text-white"
            style={{ fontSize: "clamp(1.7rem, 5vw, 4.2rem)" }}
          >
            AI는 도구다.
            <br />
            사람이 해야 할 일은 남는다.
          </p>
        </Beat>

        {/* ── 5 · 청중에게 넘기는 질문 (강연에서 Q&A 진입점) ──────── */}
        <Beat on={beat === 5}>
          <p
            className="font-sans font-semibold leading-[1.25] tracking-tight text-white"
            style={{ fontSize: "clamp(1.6rem, 4.6vw, 3.8rem)" }}
          >
            그럼 그 도구를,
            <br />
            어떻게 <span className="text-[var(--color-accent-green)]">활용</span>하면 될까요?
          </p>
        </Beat>
      </div>
    </section>
  );
}
