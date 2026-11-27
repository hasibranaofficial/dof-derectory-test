import Link from "next/link";
export { Avatar } from "@/components/Avatar";
import { Avatar } from "@/components/Avatar";
import type { Office, Officer } from "@/lib/data";
import { CATEGORIES } from "@/lib/data";
import { normDigits } from "@/lib/translit";

export function displayUrl(u: string) {
  return u.replace(/^https?:\\/\\//i, "").replace(/\\/+$/, "");
}
export function hrefOf(u: string) {
  return /^https?:\\/\\//i.test(u) ? u : `http://${u}`;
}
export function OfficeUrl({ url, className = "" }: { url?: string | null; className?: string }) {
  if (!url) return null;
  return <a href={hrefOf(url)} target="_blank" rel="noopener noreferrer" className={`inline-flex items-center gap-1.5 break-all text-sm font-medium office-url ${className}`}>
    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></svg>
    {displayUrl(url)}
  </a>;
}
function Line({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return <div className="flex gap-2 text-[13px] leading-6"><span className="w-14 shrink-0 text-slate-500">{label}</span>{href ? <a href={href} className="break-all text-slate-800 hover:underline">{value}</a> : <span className="break-words text-slate-800">{value}</span>}</div>;
}
export function OfficerCard({ p, office }: { p: Officer; office?: Office }) {
  const mobile = p.mobile?.trim();
  const tel = (s: string) => `tel:${normDigits(s).replace(/[^\\d+]/g, "")}`;
  return <article className="officer-card flex gap-3">
    <Avatar src={p.photo} name={p.name || p.designation} />
    <div className="min-w-0 flex-1">
      <h4>{p.name || <span className="font-normal text-slate-400">নাম প্রদর্শিত নয়</span>}</h4>
      <p className="officer-designation">{p.designation}</p>
      {office && <Link href={`/office/${office.slug}`} className="mb-1 block text-xs text-slate-500 hover:underline">{office.name}</Link>}
      <Line label="মোবাইল" value={mobile} href={mobile ? tel(mobile) : undefined} />
      <Line label="ফোন" value={p.phone} href={p.phone ? tel(p.phone) : undefined} />
      <Line label="ইমেইল" value={p.email} href={p.email ? `mailto:${p.email}` : undefined} />
      <Line label="কক্ষ" value={p.room && p.room !== "-" ? p.room : null} />
      <Line label="ফ্যাক্স" value={p.fax} />
      <Line label="ব্যাচ" value={p.bcs && p.bcs !== "০" && p.bcs !== "0" ? `বিসিএস ${p.bcs}` : null} />
    </div>
  </article>;
}
export function OfficeCard({ office, count }: { office: Office; count?: number }) {
  return <div className="office-card rounded-xl border p-4">
    <Link href={`/office/${office.slug}`} className="block"><h3 className="text-[15px] font-semibold leading-snug">{office.name}</h3>{office.nameEn && <p className="mt-0.5 text-xs text-slate-500">{office.nameEn}</p>}</Link>
    <div className="mt-2"><OfficeUrl url={office.url} /></div>
    <div className="mt-2 flex items-center justify-between text-xs text-slate-500"><span>{office.email ?? ""}</span>{typeof count === "number" && count > 0 && <span>{count} জন কর্মকর্তা</span>}</div>
  </div>;
}
export function Tabs({ active }: { active?: string }) {
  return <nav className="category-tabs"><div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
    {CATEGORIES.map(c => <Link key={c.slug} href={c.slug === "hq" ? "/" : `/c/${c.slug}`} className={active === c.slug ? "active" : ""}>{c.label}</Link>)}
  </div></nav>;
}
export function SearchBox({ defaultValue = "", big = false }: { defaultValue?: string; big?: boolean }) {
  return <form action="/dof-derectory-test/search/" method="get" className="search-form" role="search">
    <input name="q" defaultValue={defaultValue} placeholder="নাম, পদবি বা দপ্তর খুঁজুন — বাংলা বা English" autoComplete="off" />
    <button type="submit">খুঁজুন</button>
  </form>;
}
export function groupBy<T, K>(items: T[], key: (t: T) => K): [K, T[]][] {
  const m = new Map<K, T[]>();
  for (const it of items) { const k = key(it); if (!m.has(k)) m.set(k, []); m.get(k)!.push(it); }
  return [...m.entries()];
}
