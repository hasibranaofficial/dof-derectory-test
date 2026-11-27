import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import "./globals.css";
import { SearchBox } from "@/components/ui";

export const metadata: Metadata = {
  title: "মৎস্য অধিদপ্তর — কর্মকর্তা ও কর্মচারী তথ্যভান্ডার",
  description: "মৎস্য অধিদপ্তর, বাংলাদেশ-এর দপ্তরসমূহ ও কর্মকর্তাদের তালিকা",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body>
        <div className="site-wrap">
          <header className="site-header">
            <Link href="/" className="brand-link" aria-label="হোমপেজে ফিরে যান">
              <small>মৎস্য অধিদপ্তর, বাংলাদেশ</small>
              <h1>কর্মকর্তা ও কর্মচারী তথ্যভান্ডার</h1>
            </Link>
          </header>
        </div>
        <div className="search-bar"><div className="site-wrap">
          <SearchBox />
          <p className="search-hint">নাম, পদবি, জেলা, উপজেলা বা দপ্তরের নাম লিখে অনুসন্ধান করুন</p>
        </div></div>
        {children}
        <footer className="site-footer">
          তথ্য সরকারি ওয়েবসাইট থেকে নিয়মিত সংগ্রহ করা হয় · <a href="https://fisheries.gov.bd" target="_blank" rel="noopener noreferrer">মৎস্য অধিদপ্তর</a>
        </footer>
      </body>
    </html>
  );
}
