"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

import { StartGate } from "@/components/StartGate";
import { ScrollCue } from "@/components/ScrollCue";
import { ProgressBar } from "@/components/ProgressBar";
import { CloverLineScene } from "@/components/scenes/CloverLineScene";
import { OpeningPromptScene } from "@/components/scenes/OpeningPromptScene";
import { TeammateLineScene } from "@/components/scenes/TeammateLineScene";
import { CommandScene } from "@/components/scenes/CommandScene";
import { AutoStatsScene } from "@/components/scenes/AutoStatsScene";
import { FinalScene } from "@/components/scenes/FinalScene";
import { FieldScene } from "@/components/scenes/FieldScene";
import { CreditsScene } from "@/components/scenes/CreditsScene";

const LogoEvolutionScene = dynamic(() =>
  import("@/components/scenes/LogoEvolutionScene").then(
    (m) => m.LogoEvolutionScene
  )
);
const CodeMaterializeScene = dynamic(() =>
  import("@/components/scenes/CodeMaterializeScene").then(
    (m) => m.CodeMaterializeScene
  )
);
const PromptGrammarScene = dynamic(() =>
  import("@/components/scenes/PromptGrammarScene").then(
    (m) => m.PromptGrammarScene
  )
);
const ChaosToOrderScene = dynamic(() =>
  import("@/components/scenes/ChaosToOrderScene").then(
    (m) => m.ChaosToOrderScene
  )
);
const BeforeAfterScene = dynamic(
  () =>
    import("@/components/scenes/BeforeAfterScene").then(
      (m) => m.BeforeAfterScene
    ),
  { ssr: false }
);
const TtsCompareScene = dynamic(
  () =>
    import("@/components/scenes/TtsCompareScene").then((m) => m.TtsCompareScene),
  { ssr: false }
);
const BentoTransformScene = dynamic(
  () =>
    import("@/components/scenes/BentoTransformScene").then(
      (m) => m.BentoTransformScene
    ),
  { ssr: false }
);

export function Scenes() {
  return (
    <main className="relative w-full bg-black text-white">
      {/* 시작 게이트 — 스크롤(또는 클릭/엔터)로 숫자 폭격부터 시작 */}
      <StartGate />
      {/* 하단 스크롤 단서 — 처음 보는 사람용, 멈추면 다시 떠서 안내 */}
      <ScrollCue />
      {/* 상단 진행 표시줄 — 지금 어디쯤인지 가늠 */}
      <ProgressBar />
      <Suspense fallback={<div className="h-screen bg-black" />}>
        {/* 00 — 규모 폭격: 숫자 (12,236 / 612 / 228) */}
        <div id="nav-numbers" className="block" />
        <AutoStatsScene />

        {/* 01.5 — 전환: "저희에겐 네잎클로버가 있었거든요" */}
        <CloverLineScene />

        {/* 02 — 명령 */}
        <OpeningPromptScene />

        {/* 02.5 — 전환: "그러나 우리는 AI를 수동적으로 이용하지 않았다 / 한 명의 팀원으로서…" */}
        <TeammateLineScene />

        {/* === 증거 묶음: 브랜드 (메시지/로고 채팅) === */}
        <div id="nav-brand" className="block" />
        <LogoEvolutionScene />

        {/* === 그 뒤로 이어짐: 폴더가 시안을 쏟아냄 → 살아남은 하나 === */}
        <div id="nav-process" className="block" />
        <ChaosToOrderScene />

        {/* === 어떻게: 명령이 화면이 되는 순간 (정체성, 클라이맥스) === */}
        <CodeMaterializeScene />

        {/* 비포→애프터 변신 릴 — AI 슬롭이 해체되고 하루안부 애프터가 조립됨 (영상 섹션 바로 위) */}
        {/* gate: 다 보여준 뒤 스페이스 → 영상 섹션으로 이동 */}
        <BentoTransformScene id="s-bento-transform" gate />

        {/* === 영상 === */}
        <div id="nav-video" className="block" />
        {/* 스페이스 → "한 줄로 시작해, 수없이 고쳤다."(비포/애프터)로 이동 */}
        <CommandScene
          id="s-cmd-video"
          text="영상까지 가자."
          fontSize="var(--text-section-title)"
          gate
        />

        {/* 비포/애프터 — 가운데를 드래그: 좌 초기 버전 / 우 수많은 수정을 거친 최종본 */}
        {/* 스페이스 → TTS(목소리) 섹션으로 이동 */}
        <BeforeAfterScene id="s-before-after" gate />

        {/* TTS 비포/애프터 — 영상 아래, 음성만 비교 (검정 배경 통일) */}
        {/* 스페이스: 기존 음성 → 개선된 음성 → 다음 섹션 */}
        <TtsCompareScene id="s-tts-compare" gate />

        {/* === 회고/방법: 우리가 자주 보낸 말들 === */}
        <div id="nav-method" className="block" />
        {/* 스페이스 → KHF 현장 검증으로 이동 */}
        <PromptGrammarScene gate />

        {/* === 현장: KHF 2026에서 방향을 확인하다 === */}
        {/* 제작 과정을 다 보여준 "뒤"에 온다. 앞에 두면 참고 자료로 축소된다 */}
        <FieldScene gate />

        {/* 끝 — 타이틀 카드 + 영화 크레딧 */}
        {/* 스페이스 → 엔딩 크레딧으로 이동 */}
        <FinalScene gate />
        <CreditsScene />
      </Suspense>
    </main>
  );
}
