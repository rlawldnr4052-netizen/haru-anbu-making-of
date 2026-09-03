"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

// 팀원이 준 "AI 음성 글로우" 효과를 메이킹 사이트(검정 배경)에 맞춰 포팅.
// 원본은 흰 배경 + mix-blend-mode:multiply → 여기선 screen 블렌드로 검정 위에 빛으로 뜨게 함.
// body 포털 + position:fixed 라서 섹션이 아니라 디바이스 화면 전체 가장자리를 감싼다.
// active=true(개선된 AI 음성 재생) 일 때만 차오름.

// 변을 따라 보간할 색 — 초반 "네잎클로버" 그린(#00CB49) 계열로 통일
const STOPS = [
  [0, 203, 73],
  [94, 224, 127],
  [0, 203, 73],
  [48, 209, 88],
  [0, 203, 73],
  [167, 243, 192],
  [0, 203, 73],
];

const CSS = `
.eg{position:fixed;inset:0;z-index:60;pointer-events:none;overflow:hidden;mix-blend-mode:screen;opacity:0;transform:scale(1.05);transform-origin:center;transition:opacity .7s ease, transform .9s cubic-bezier(.22,1,.36,1);--amp:14px;--dur:1.8s;--thick:34px;--len:180px;--blur:18px}
.eg.is-on{opacity:1;transform:scale(1)}
.eg .eg-edge{position:absolute}
.eg .eg-edge--top{top:0;left:0;right:0;height:0}
.eg .eg-edge--bottom{bottom:0;left:0;right:0;height:0}
.eg .eg-edge--left{left:0;top:0;bottom:0;width:0}
.eg .eg-edge--right{right:0;top:0;bottom:0;width:0}
.eg .eg-edge span{--i:0;--p:0;--af:1;--df:1;--dl:0;--a:calc(var(--amp) * var(--af));position:absolute;background:radial-gradient(closest-side at center, currentColor, currentColor 28%, transparent 100%);filter:blur(var(--blur));animation:var(--dur) ease-in-out infinite;animation-duration:calc(var(--dur) * var(--df));animation-delay:calc(var(--dur) * var(--dl) * -1);will-change:transform,opacity}
.eg .eg-edge--top span,.eg .eg-edge--bottom span{width:var(--len);height:var(--thick);margin:calc(var(--thick)/-2) calc(var(--len)/-2);left:calc(var(--p)*100%);top:0}
.eg .eg-edge--left span,.eg .eg-edge--right span{width:var(--thick);height:var(--len);margin:calc(var(--len)/-2) calc(var(--thick)/-2);top:calc(var(--p)*100%);left:0}
.eg .eg-edge--top span{animation-name:eg-bobT}
.eg .eg-edge--bottom span{animation-name:eg-bobB}
.eg .eg-edge--left span{animation-name:eg-bobL}
.eg .eg-edge--right span{animation-name:eg-bobR}
.eg .eg-corner{position:absolute;--af:1;--csz:calc(var(--thick)*1.7);width:var(--csz);height:var(--csz);margin:calc(var(--csz)/-2);border-radius:50%;background:radial-gradient(closest-side at center,currentColor,currentColor 20%,transparent 100%);filter:blur(calc(var(--blur) + 2px));animation:eg-cornerPulse var(--dur) ease-in-out infinite;will-change:transform,opacity}
@keyframes eg-bobT{0%,100%{transform:translateY(calc(var(--a)*-.12)) scaleY(.9);opacity:.85}50%{transform:translateY(var(--a)) scaleY(1.08);opacity:1}}
@keyframes eg-bobB{0%,100%{transform:translateY(calc(var(--a)*.12)) scaleY(.9);opacity:.85}50%{transform:translateY(calc(var(--a)*-1)) scaleY(1.08);opacity:1}}
@keyframes eg-bobL{0%,100%{transform:translateX(calc(var(--a)*-.12)) scaleX(.9);opacity:.85}50%{transform:translateX(var(--a)) scaleX(1.08);opacity:1}}
@keyframes eg-bobR{0%,100%{transform:translateX(calc(var(--a)*.12)) scaleX(.9);opacity:.85}50%{transform:translateX(calc(var(--a)*-1)) scaleX(1.08);opacity:1}}
@keyframes eg-cornerPulse{0%,100%{transform:scale(.82);opacity:.7}50%{transform:scale(calc(1 + var(--af,1)*.16));opacity:1}}
@media (prefers-reduced-motion:reduce){.eg .eg-edge span,.eg .eg-corner{animation:none!important}}
`;

function colorAt(t: number) {
  const s = t * (STOPS.length - 1);
  const i = Math.min(Math.floor(s), STOPS.length - 2);
  const f = s - i;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  return `rgb(${Math.round(a[0] + (b[0] - a[0]) * f)},${Math.round(
    a[1] + (b[1] - a[1]) * f
  )},${Math.round(a[2] + (b[2] - a[2]) * f)})`;
}

// 매끄러운 노이즈 — 사인 몇 개를 합성해 이웃끼리 부드럽게 이어지는 랜덤 곡선
function noiseFn() {
  const c: number[][] = [];
  for (let i = 0; i < 3; i++)
    c.push([0.5 + Math.random() * 1.0, Math.random() * 6.283, Math.random()]);
  const tot = c.reduce((s, x) => s + x[2], 0) || 1;
  return (t: number) => {
    let v = 0;
    c.forEach((x) => (v += x[2] * (0.5 + 0.5 * Math.sin(t * 6.283 * x[0] + x[1]))));
    return v / tot;
  };
}

export function EdgeGlow({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  useEffect(() => {
    const glowEl = ref.current;
    if (!glowEl) return;

    // 재마운트/StrictMode 대비: 기존 생성물 비우고 다시 채움
    glowEl.querySelectorAll(".eg-edge").forEach((edge) => {
      edge.innerHTML = "";
      const el = edge as HTMLElement;
      const vert =
        el.classList.contains("eg-edge--left") ||
        el.classList.contains("eg-edge--right");
      const n = vert ? 16 : 26;
      const an = noiseFn();
      const pn = noiseFn();
      const dn = noiseFn();
      for (let k = 0; k < n; k++) {
        const sp = document.createElement("span");
        const p = n > 1 ? k / (n - 1) : 0.5;
        sp.style.setProperty("--i", String(k));
        sp.style.setProperty("--p", String(p));
        sp.style.setProperty("--af", (0.4 + an(p) * 1.3).toFixed(2));
        sp.style.setProperty("--df", (0.88 + dn(p) * 0.3).toFixed(2));
        sp.style.setProperty("--dl", pn(p).toFixed(2));
        sp.style.color = colorAt(p);
        edge.appendChild(sp);
      }
    });

    glowEl.querySelectorAll(".eg-corner").forEach((c) => c.remove());
    (
      [
        ["0", "0"],
        ["100%", "0"],
        ["0", "100%"],
        ["100%", "100%"],
      ] as const
    ).forEach(([x, y]) => {
      const c = document.createElement("span");
      c.className = "eg-corner";
      c.style.left = x;
      c.style.top = y;
      c.style.setProperty("--af", (0.3 + Math.random() * 1.5).toFixed(2));
      c.style.animationDelay = (-Math.random() * 1.8).toFixed(2) + "s";
      c.style.color = colorAt(0.3 + Math.random() * 0.4);
      glowEl.appendChild(c);
    });
  }, [mounted]);

  if (!mounted) return null;

  // body 포털 — 어떤 조상의 transform/overflow에도 잘리지 않고 뷰포트 전체를 덮음
  return createPortal(
    <div ref={ref} className={`eg ${active ? "is-on" : ""}`} aria-hidden>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <i className="eg-edge eg-edge--top" />
      <i className="eg-edge eg-edge--right" />
      <i className="eg-edge eg-edge--bottom" />
      <i className="eg-edge eg-edge--left" />
    </div>,
    document.body
  );
}
