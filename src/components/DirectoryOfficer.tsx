"use client";

import { useState } from "react";
import type { Officer } from "@/lib/data";
import { normDigits } from "@/lib/translit";

export default function DirectoryOfficer({ p }: { p: Officer }) {
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageSrc, setImageSrc] = useState(p.photo);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const handleImageError = () => {
    if (!fallbackUsed && p.fallbackPhoto && p.fallbackPhoto !== imageSrc) {
      setFallbackUsed(true);
      setImageSrc(p.fallbackPhoto);
    } else {
      setImageFailed(true);
    }
  };
  const tel = (s: string) => "tel:" + normDigits(s).replace(/[^\d+]/g, "");
  const designationBcs = (p.designation || "").match(/(?:বিসিএস|BCS|ক্যাডার)\\s*(?:ব্যাচ\\s*)?[-–—:：]?\\s*([০-৯\\d]{1,3}\\s*(?:তম|th)?)/i)?.[1] || "";\n  const bcsValue = p.bcs && p.bcs !== "০" && p.bcs !== "0" && p.bcs !== "-" ? p.bcs : designationBcs;\n  const allRows: [string, string, (string | undefined)?][] = [
    ["মোবাইল", p.mobile || "" , p.mobile ? tel(p.mobile) : undefined],
    ["ফোন", p.phone || "", p.phone ? tel(p.phone) : undefined],
    ["ইমেইল", p.email || "", p.email ? "mailto:" + p.email : undefined],
    ["কক্ষ", p.room && p.room !== "-" ? p.room : ""],
    ["ফ্যাক্স", p.fax || ""],
    ["বিসিএস ব্যাচ", bcsValue ? "বিসিএস " + bcsValue : ""]
  ];
  const rows = allRows.filter((row) => Boolean(row[1]));
  const listDesignation = (p.designation || "").replace(/\s*[（(]\s*বিসিএস\s*[-–—:]?\s*[^）)]*[）)]/gi, "").replace(/\s+/g, " ").trim();
  const initial = (p.name || p.designation || "?").trim().charAt(0);
  return (
    <article className={"directory-person" + (open ? " open" : "")}>
      <div className="directory-person-row">
        <button className="directory-person-main" onClick={() => setOpen(!open)} aria-expanded={open}>
          {imageSrc && !imageFailed ? <img className="directory-avatar" src={imageSrc} alt="" loading="lazy" decoding="async" onError={handleImageError} /> : <span className="directory-avatar directory-avatar-fallback">{initial}</span>}
          <span className="directory-person-text">
            <span className="directory-person-name">{p.name || "নাম প্রদর্শিত নয়"}</span>
            <span className="directory-person-designation">{listDesignation || p.designation}</span>
          </span>
          <svg className="directory-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
      {open && <div className="directory-person-details">
        {rows.length ? rows.map(([label, value, href]) => <div className="directory-detail" key={label}><b>{label}</b><span>{href ? <a href={href}>{value}</a> : value}</span></div>) : <p>অতিরিক্ত তথ্য নেই</p>}
      </div>}
    </article>
  );
}
