import type { VideoStyle } from "@/lib/video-plan/schema";

export type VideoTheme = {
  background: string;
  surface: string;
  foreground: string;
  primary: string;
  secondary: string;
  muted: string;
  fontFamily: string;
};

export const themes: Record<VideoStyle, VideoTheme> = {
  simple: { background: "#f7f7f4", surface: "#ffffff", foreground: "#171717", primary: "#2563eb", secondary: "#dbeafe", muted: "#6b7280", fontFamily: "Arial, sans-serif" },
  pop: { background: "#fff8eb", surface: "#ffffff", foreground: "#201a2b", primary: "#ef476f", secondary: "#ffd166", muted: "#725f75", fontFamily: "Arial Rounded MT Bold, Arial, sans-serif" },
  tech: { background: "#07111f", surface: "#0f2038", foreground: "#ecf7ff", primary: "#42d3ff", secondary: "#7857ff", muted: "#8aa4bf", fontFamily: "var(--font-geist-sans), Arial, sans-serif" },
};
