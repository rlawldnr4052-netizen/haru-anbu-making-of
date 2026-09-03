"use client";

// 터치 기기 판정. 폰엔 Enter 키가 없어서 "Enter 를 누르세요" 안내가 실행 불가능하다.
//
// useEffect + setState 로 하면 react-hooks/set-state-in-effect 에 걸린다. 미디어 쿼리는
// 리액트 바깥의 외부 상태이므로 useSyncExternalStore 가 정석이다. 서버 스냅샷은 false —
// SSR HTML 은 데스크탑 문구로 나가고, 하이드레이션 직후 터치면 바뀐다.
import { useSyncExternalStore } from "react";

const QUERY = "(pointer: coarse)";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;

export function useCoarsePointer(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
