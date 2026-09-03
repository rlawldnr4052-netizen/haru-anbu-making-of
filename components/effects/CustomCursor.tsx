"use client";

import { useEffect } from "react";

export function CustomCursor() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dot = document.createElement("div");
    dot.className = "cursor-dot";
    const ring = document.createElement("div");
    ring.className = "cursor-ring";
    document.body.append(dot, ring);
    document.body.classList.add("has-custom-cursor");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;

    // 첫 mousemove 전까지는 숨긴다. 초기값이 화면 정중앙이라 그대로 그리면
    // 시작 화면의 CTA 문구("또는 스크롤로 시작") 위에 마크가 얹힌다.
    dot.style.opacity = "0";
    ring.style.opacity = "0";

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dot.style.opacity === "0") {
        // 실제 좌표로 한 번 순간이동시킨 뒤 보여준다(중앙에서 날아오는 것 방지).
        rx = mx;
        ry = my;
        dot.style.opacity = "";
        ring.style.opacity = "";
      }
    };
    window.addEventListener("mousemove", onMove);

    let raf = 0;
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onOver = (e: MouseEvent) => {
      const t = (e.target as HTMLElement | null)?.closest?.(
        "[data-cursor]"
      ) as HTMLElement | null;
      const state = t ? t.dataset.cursor || "link" : "";
      ring.dataset.state = state;
      dot.dataset.state = state;
    };
    const onOut = () => {
      ring.dataset.state = "";
      dot.dataset.state = "";
    };
    document.addEventListener("mouseover", onOver);
    document.addEventListener("mouseout", onOut);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.removeEventListener("mouseout", onOut);
      dot.remove();
      ring.remove();
      document.body.classList.remove("has-custom-cursor");
    };
  }, []);

  return null;
}
