import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { ReducedMotionProvider } from "@/components/providers/ReducedMotionProvider";
import { CustomCursor } from "@/components/effects/CustomCursor";
import { NoiseLayer } from "@/components/effects/NoiseLayer";
import { HamburgerNav } from "@/components/nav/HamburgerNav";

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

const TITLE = "하루안부 — Making Of";
const DESCRIPTION =
  "AI로 만든 시니어 케어 앱 하루안부의 제작 과정. 1,845줄의 대화로그, 12단계 디자인 진화, Higgsfield 4차 영상.";

export const metadata: Metadata = {
  // basePath 를 포함한 공개 주소. 아래 이미지 경로들이 이 끝에서부터 상대 해석된다
  // ("/og-making-of.png" → "https://haruanbu.site/making_of/og-making-of.png").
  metadataBase: new URL("https://haruanbu.site/making_of"),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    url: "https://haruanbu.site/making_of",
    locale: "ko_KR",
    images: [
      {
        url: "/og-making-of.png",
        width: 1200,
        height: 630,
        alt: "하루안부, 이렇게 만들었습니다 — Making Of",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-making-of.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={jetbrains.variable}>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css"
        />
        {/* 로고 진화 씬의 시안 4장은 그 씬이 화면에 올 때 처음 요청된다. 발표 도중
            회선이 끊기면(강연장에선 흔하다) 넉 장이 통째로 빈 칸이 된다 — 실제로
            오프라인 리허설에서 이 넷만 깨졌다. 미리 받아 캐시에 넣어 둔다(합 600KB). */}
        {[1, 2, 3, 4].map((n) => (
          <link
            key={n}
            rel="preload"
            as="image"
            href={`/making_of/media/logo/attempt-${n}.png`}
          />
        ))}
      </head>
      <body>
        <ReducedMotionProvider>
          <LenisProvider>
            <CustomCursor />
            <NoiseLayer />
            <HamburgerNav />
            {children}
          </LenisProvider>
        </ReducedMotionProvider>
      </body>
    </html>
  );
}
