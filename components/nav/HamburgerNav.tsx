"use client";

import { useEffect, useState } from "react";

const items = [
  { href: "#nav-brand", label: "Brand" },
  { href: "#nav-process", label: "Build" },
  { href: "#nav-video", label: "Film" },
  { href: "#nav-method", label: "Method" },
  { href: "#nav-field", label: "Field" },
  { href: "#nav-numbers", label: "Numbers" },
];

function HaruSymbol({ color }: { color: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      xmlns="http://www.w3.org/2000/svg"
      className="h-9 w-9"
      style={{
        transition: "color 120ms ease-out, filter 200ms ease-out",
        color,
        filter: `drop-shadow(0 0 10px ${color}88)`,
      }}
    >
      <g transform="translate(50, 50) scale(0.163)" fill="currentColor">
        <path d="M2521.32 2506.66C1239.65 2657.48 1239.65 1895.6 1239.65 1279.34L2497.69 0.000170058C2518.68 494.198 2522.27 1157.92 1658.86 1262.48C2641.88 1314.25 2521.32 2101.84 2521.32 2506.66Z" />
        <path d="M4.6772 19.3353C1286.35 -131.481 1286.35 630.399 1286.35 1246.66L28.3145 2526C7.32194 2031.8 3.73014 1368.08 867.143 1263.52C-115.881 1211.75 4.6772 424.157 4.6772 19.3353Z" />
      </g>
    </svg>
  );
}

export function HamburgerNav() {
  const [open, setOpen] = useState(false);
  const [branded, setBranded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const onLanded = () => setBranded(true);
    const onUnlanded = () => setBranded(false);
    window.addEventListener("haru:logo-landed", onLanded);
    window.addEventListener("haru:logo-unlanded", onUnlanded);

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("haru:logo-landed", onLanded);
      window.removeEventListener("haru:logo-unlanded", onUnlanded);
    };
  }, []);

  const symbolColor = branded ? "#2c7afc" : "#ffffff";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        className="fixed left-5 top-5 z-[210] grid h-12 w-12 place-items-center"
        style={{
          transform: open ? "rotate(90deg)" : "rotate(0deg)",
          transition: "transform 520ms cubic-bezier(0.2, 1, 0.4, 1)",
        }}
      >
        <HaruSymbol color={symbolColor} />
      </button>

      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[190]"
        style={{
          background: "rgba(0, 0, 0, 0.78)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 480ms cubic-bezier(0.2, 1, 0.4, 1)",
        }}
      />

      <nav
        className="fixed inset-0 z-[200] flex items-center"
        style={{ pointerEvents: "none" }}
        aria-hidden={!open}
      >
        <ul className="w-full px-10 md:px-20 lg:px-28">
          {items.map((item, i) => (
            <li
              key={item.href}
              className="overflow-hidden"
              style={{ width: "fit-content" }}
            >
              <a
                href={item.href}
                onClick={() => setOpen(false)}
                className="inline-block font-sans font-bold leading-[1.08] tracking-[-0.02em] text-white transition-colors duration-200 hover:text-[color:var(--color-key)]"
                style={{
                  fontSize: "clamp(2.2rem, 6.4vw, 6rem)",
                  opacity: open ? 1 : 0,
                  transform: open ? "translateY(0)" : "translateY(110%)",
                  pointerEvents: open ? "auto" : "none",
                  transition: `opacity 640ms cubic-bezier(0.2, 1, 0.4, 1) ${
                    open ? i * 55 + 140 : 0
                  }ms, transform 720ms cubic-bezier(0.2, 1, 0.4, 1) ${
                    open ? i * 55 + 140 : 0
                  }ms, color 200ms ease-out`,
                }}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
