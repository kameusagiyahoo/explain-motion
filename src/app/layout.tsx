import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "@fontsource-variable/noto-sans-jp";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "ExplainMotion", description: "Turn explanations into deterministic Remotion videos." };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="ja" className={`${geistSans.variable} ${geistMono.variable}`}><body>{children}</body></html>; }
