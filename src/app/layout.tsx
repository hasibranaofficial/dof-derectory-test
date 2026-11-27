import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { SearchBox } from "@/components/ui";

export const metadata: Metadata = {
  title: "মৎস্য অধিদপ্তর — দপ্তর ও কর্মকর্তা তথ্যভান্ডার",
  description: "মৎস্য অধিদপ্তর, বাংলাদেশ-এর দপ্তরসমূহ ও কর্মকর্তাদের তালিকা",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-800 text-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl ring-2 ring-amber-300/70">🐟</span>
              <span>
                <span className="block text-lg font-bold leading-tight md:text-xl">মৎস্য অধিদপ্তর</span>
                <span className="block text-xs text-emerald-100">গণপ্রজাতন্ত্রী বাংলাদেশ সরকার · দপ্তর ও কর্মকর্তা তালিকা</span>
              </span>
            </Link>
            <SearchBox />
          </div>
        </header>
        {children}
        <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          তথ্যসূত্র: <a className="text-sky-700 hover:underline" href="https://fisheries.gov.bd" target="_blank" rel="noopener noreferrer">fisheries.gov.bd</a> ও অধীনস্থ দপ্তরসমূহের অফিসিয়াল ওয়েবসাইট
        </footer>
      </body>
    </html>
  );
}
