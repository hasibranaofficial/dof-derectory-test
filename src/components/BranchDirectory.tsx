"use client";

import { useState } from "react";
import type { Officer } from "@/lib/data";
import DirectoryOfficer from "@/components/DirectoryOfficer";

export default function BranchDirectory({ branches }: { branches: [string, Officer[]][] }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <section className="mt-6">
      <h2 className="mb-3 border-l-4 border-emerald-600 pl-3 text-lg font-bold text-emerald-950">শাখাসমূহ</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map(([name, people]) => {
          const selected = active === name;
          return (
            <button key={name} type="button" onClick={() => setActive(selected ? null : name)}
              aria-expanded={selected}
              className={"flex items-center justify-between gap-3 rounded-xl border p-4 text-left shadow-sm transition " +
                (selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50")}>
              <span className="font-semibold text-slate-800">{name || "অন্যান্য শাখা"}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">{people.length} জন</span>
                <span className={"text-emerald-800 transition-transform " + (selected ? "rotate-90" : "")}>›</span>
              </span>
            </button>
          );
        })}
      </div>
      {active !== null && (() => {
        const selected = branches.find(([name]) => name === active);
        if (!selected) return null;
        return (
          <div className="mt-6" id="branch-staff">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="border-l-4 border-emerald-600 pl-3 text-lg font-bold text-emerald-950">{selected[0] || "অন্যান্য শাখা"} — জনবল</h3>
              <button type="button" onClick={() => setActive(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100">বন্ধ করুন ×</button>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {selected[1].map(person => <DirectoryOfficer key={person.id || person.name} p={person} />)}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
