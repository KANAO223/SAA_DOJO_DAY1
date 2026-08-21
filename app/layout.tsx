import type { Metadata } from "next";
import "./globals.css";

// ▼ サイトのタイトル・説明。Claude Code に「タイトルを◯◯に変えて」と頼めば書き換わる。
export const metadata: Metadata = {
  title: "空想路線ノート",
  description: "考えた路線を1本ずつ記録して、どの段階で止まっているかを一覧で見るツール",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
