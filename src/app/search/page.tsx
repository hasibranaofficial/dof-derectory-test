"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import seed from "../../../data/seed.json";
import { SearchBox, OfficeDomain, OfficerCard, OfficeCard } from "@/components/ui";
import { EN_BN, normalizeText, normDigits, skeleton, tokenize } from "@/lib/translit";

type Raw = typeof seed[number];
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const q = normalizeText(normDigits(query)).trim();
  const results = useMemo(() => {
    if (!q) return { offices: [], officers: [] };
    const terms = tokenize(q).map(token => [token, ...(EN_BN[token] ?? [])]);
    const matches = (value: string) => {
      const normalized = normalizeText(value);
      const key = skeleton(normalized);
      return terms.every(alternatives => alternatives.some(term =>
        normalized.includes(normalizeText(term)) || (skeleton(term).length >= 2 && key.includes(skeleton(term)))
      ));
    };
    const officeRows = (seed as Raw[]).filter(o => matches([o.name,o.name_en,o.district,o.upazila,o.division].filter(Boolean).join(" ")));
    const officerRows = (seed as Raw[]).flatMap(o => (o.officers ?? []).filter(p => matches([p.name,p.designation,p.branch,o.name,o.district,o.upazila].filter(Boolean).join(" "))).map((p,i) => ({p,o,i})));
    return { offices: officeRows.slice(0,60), officers: officerRows.slice(0,120) };
  }, [q]);
  return <>
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 rounded-2xl bg-emerald-800 p-4">
        <form onSubmit={e => { e.preventDefault(); }} className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} autoFocus placeholder="নাম, পদবি, জেলা বা দপ্তর খুঁজুন" className="min-w-0 flex-1 rounded-lg px-4 py-3 text-slate-900" />
          <button className="rounded-lg bg-amber-400 px-5 font-semibold text-emerald-950">খুঁজুন</button>
        </form>
        <p className="mt-2 text-xs text-emerald-100">বাংলা বা ইংরেজিতে নাম, পদবি, জেলা, উপজেলা ও দপ্তরের নাম লিখুন।</p>
      </div>
      {!q ? <p className="text-slate-500">অনুসন্ধানের জন্য লিখুন।</p> : <>
        <p className="mb-4 text-sm text-slate-600">“{query}” — {results.offices.length}টি দপ্তর এবং {results.officers.length} জন কর্মকর্তা (সর্বোচ্চ ১২০টি ফলাফল)</p>
        {results.offices.length > 0 && <section className="mb-8"><h2 className="mb-3 text-lg font-bold text-sky-900">দপ্তর</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.offices.map(o => <div key={o.slug} className="rounded-xl border bg-white p-3"><Link href={`/office/${o.slug}`} className="font-semibold hover:text-emerald-700">{o.name}</Link><div className="mt-1"><OfficeDomain url={o.url} /></div></div>)}</div></section>}
        {results.officers.length > 0 && <section><h2 className="mb-3 text-lg font-bold text-emerald-900">কর্মকর্তা</h2><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{results.officers.map(({p,o,i}) => <article key={o.slug+"-"+i} className="flex gap-3 rounded-xl border bg-white p-3"><div className="min-w-0"><div className="font-semibold">{p.name}</div><div className="text-sm text-emerald-800">{p.designation}</div><Link className="text-xs text-slate-500 hover:underline" href={`/office/${o.slug}`}>{o.name}</Link>{p.mobile && <div className="text-sm">{p.mobile}</div>}{p.email && <div className="text-sm">{p.email}</div>}</div></article>)}</div></section>}
      </>}
    </main>
  </>;
}
