import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "웜톤쿨톤 — 셀카로 찾는 퍼스널 컬러",
  description: "셀카 한 장으로 웜톤·쿨톤 진단, 메이크업 예시, 컨셉별 코디까지.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fdf1f8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
