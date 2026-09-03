"use client";

// 스크롤 제스처 기반 "다음으로" 신호.
// 발표용 엔터/스페이스를 모르는 처음 보는 사람도 본능적으로 하는 스크롤(휠/트랙패드/터치)로
// 한 스텝씩 진행하게 한다. 엔터/스페이스/방향키도 그대로 인정(발표자 호환).
//
// 진행 속도:
//   "한 번 스크롤 = 한 스텝"이면 스텝 많은 씬에서 스크롤을 너무 자주 끊어 해야 한다.
//   그래서 아래로 스크롤하는 동안 COOLDOWN 간격으로 계속 진행시킨다 — 쭉 스크롤하면
//   여러 스텝이 금방 줄줄 넘어가고, 멈추면 멈춘다. (트랙패드 관성도 같은 박자로 흘러감.)
//   보고 싶은 장면에서 스크롤을 멈추면 그 박자에서 머문다.
//
// 소비 방식 2가지:
//   waitForAdvance() — 1회성 Promise(게이트 한 단계). lib/waitForSpace가 이걸 쓴다.
//   subscribeAdvance(cb) — 지속 구독(자체 스텝 머신이 있는 BentoTransform·StartGate).

type Waiter = { resolve: () => void; done: boolean };

const COOLDOWN = 230; // ms — 진행 간 최소 간격(연속 스크롤 시 약 4~5스텝/초)
const SWIPE_PX = 34; // px — 터치 스와이프 한 스텝 인정 거리

let installed = false;
const waiters = new Set<Waiter>();
const subscribers = new Set<() => void>();

let lastAdvanceTs = 0;
let touchStartY: number | null = null;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function active(): boolean {
  return waiters.size > 0 || subscribers.size > 0;
}

function fire() {
  const t = nowMs();
  if (t - lastAdvanceTs < COOLDOWN) return;
  if (!active()) return;
  lastAdvanceTs = t;

  // 1회성 대기자: 스냅샷 뜨고 비운 뒤 resolve (정상적으론 동시에 1개뿐)
  const snapshot = [...waiters];
  waiters.clear();
  for (const w of snapshot) {
    if (!w.done) {
      w.done = true;
      w.resolve();
    }
  }
  // 지속 구독자: 그대로 유지하며 콜백
  for (const cb of [...subscribers]) cb();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("haru:advance"));
  }
}

function onWheel(e: WheelEvent) {
  if (!active()) return;
  if (e.deltaY <= 4) return; // 아래로 미는 것만(미세 노이즈 제외)
  fire(); // fire()가 COOLDOWN으로 박자 제한 → 쭉 스크롤 = 연속 진행
}

function onKey(e: KeyboardEvent) {
  if (!active()) return;
  const adv =
    e.code === "Enter" ||
    e.code === "NumpadEnter" ||
    e.key === "Enter" ||
    e.code === "Space" ||
    e.key === " " ||
    e.key === "ArrowDown" ||
    e.key === "PageDown";
  if (!adv) return;
  e.preventDefault();
  fire();
}

function onTouchStart(e: TouchEvent) {
  touchStartY = e.touches[0]?.clientY ?? null;
}

function onTouchMove(e: TouchEvent) {
  if (touchStartY == null || !active()) return;
  const y = e.touches[0]?.clientY ?? touchStartY;
  if (touchStartY - y > SWIPE_PX) {
    // 손가락이 위로 = 콘텐츠 아래로 스크롤 의도. 길게 끌면 SWIPE_PX마다 한 스텝씩(쿨다운 제한).
    touchStartY = y;
    fire();
  }
}

function onTouchEnd() {
  touchStartY = null;
}

function install() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.addEventListener("wheel", onWheel, { passive: true, capture: true });
  window.addEventListener("keydown", onKey, true);
  window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
  window.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
  window.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
}

export type AdvanceGate = { promise: Promise<void>; cancel: () => void };

// 다음 스크롤 제스처(또는 엔터/스페이스/방향키/스와이프) 1회를 기다린다.
export function waitForAdvance(): AdvanceGate {
  install();
  const waiter: Waiter = { resolve: () => {}, done: false };
  const promise = new Promise<void>((resolve) => {
    waiter.resolve = resolve;
  });
  waiters.add(waiter);
  const cancel = () => {
    if (waiter.done) return;
    waiter.done = true;
    waiters.delete(waiter);
    waiter.resolve(); // 기존 동작 호환 — cancel 시에도 resolve
  };
  return { promise, cancel };
}

// 진행 제스처마다 cb 호출. 반환된 함수로 구독 해제.
export function subscribeAdvance(cb: () => void): () => void {
  install();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

// 화면의 힌트(버튼) 클릭 등으로 한 스텝 강제 진행. 엔터/스크롤과 동일하되 쿨다운은 무시.
// 진행을 기다리는 게이트가 없으면(active=false) 아무 일도 하지 않음.
export function triggerAdvance(): void {
  if (!active()) return;
  lastAdvanceTs = 0; // 쿨다운 리셋 → 즉시 발화
  fire();
}
