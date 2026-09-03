"use client";

// 자동재생 씬 사이의 "진행 게이트".
// 예전엔 엔터만 받았지만, 이제 스크롤 제스처(휠/트랙패드/터치 스와이프)·엔터·스페이스·방향키를
// 모두 lib/scrollAdvance에서 받아 다음 단계로 진행한다. 처음 보는 사람은 스크롤로,
// 발표자는 엔터로 박자를 통제할 수 있다.
//
// promise — 진행 신호를 받으면(또는 cancel 시) resolve.
// cancel  — 언마운트 등으로 정리할 때 호출. 리스너 제거 + promise 즉시 resolve.
import { waitForAdvance } from "@/lib/scrollAdvance";

export type SpaceGate = { promise: Promise<void>; cancel: () => void };

export function waitForSpace(): SpaceGate {
  return waitForAdvance();
}
