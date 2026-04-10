import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AdmitEdge — College Prep Suite",
    template: "%s | AdmitEdge",
  },
  description:
    "Grade essays, calculate GPA, evaluate extracurriculars, and estimate admission chances — all in one place.",
  openGraph: {
    title: "AdmitEdge — College Prep Suite",
    description:
      "Grade essays, calculate GPA, evaluate extracurriculars, and estimate admission chances.",
    siteName: "AdmitEdge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "AdmitEdge — College Prep Suite",
    description:
      "Grade essays, calculate GPA, evaluate extracurriculars, and estimate admission chances.",
  },
  metadataBase: new URL("https://admitedge.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${dmSerif.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#06060f] text-zinc-200">
        <a href="#main-content" className="skip-link">Skip to content</a>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
