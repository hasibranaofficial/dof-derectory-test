import Link from "next/link";
import type { Office, Officer } from "@/lib/data";
import { CATEGORIES } from "@/lib/data";
import { normDigits } from "@/lib/translit";

export function displayUrl(u: string) {
  return u.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
}

export function hrefOf(u: string) {
  return /^https?:\/\//i.test(u) ? u : `http://${u}`;
}

export function OfficeUrl({ url, className = "" }: { url?: string | null; className?: string }) {
  if (!url) return null;
  return (
    <a
      href={hrefOf(url)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 break-all text-sm font-medium text-sky-700 hover:underline ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" />
      </svg>
      {displayUrl(url)}
    </a>
  );
}

export function Avatar({ src, name, size = 80 }: { src?: string | null; name: string; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={Math.round(size * 1.2)}
        loading="lazy"
        className="shrink-0 rounded-lg bg-slate-100 object-cover ring-1 ring-slate-200"
        style={{ width: size, height: Math.round(size * 1.2) }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-300 ring-1 ring-emerald-100"
      style={{ width: size, height: Math.round(size * 1.2) }}
      aria-label="ছবি নেই"
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="currentColor">
        <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.4 0-8 2.2-8 5v1h16v-1c0-2.8-3.6-5-8-5Z" />
      </svg>
    </div>
  );
}

function Line({ label, value, href }: { label: string; value?: string | null; href?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-[13px] leading-6">
      <span className="w-14 shrink-0 text-slate-500">{label}</span>
      {href ? (
        <a href={href} className="break-all text-slate-800 hover:text-emerald-700 hover:underline">
          {value}
        </a>
      ) : (
        <span className="break-words text-slate-800">{value}</span>
      )}
    </div>
  );
}

export function OfficerCard({ p, office }: { p: Officer; office?: Office }) {
  const mobile = p.mobile?.trim();
  const tel = (s: string) => `tel:${normDigits(s).replace(/[^\d+]/g, "")}`;
  return (
    <article className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <Avatar src={p.photo} name={p.name || p.designation} />
      <div className="min-w-0 flex-1">
        <h4 className="text-[15px] font-semibold leading-snug text-slate-900">
          {p.name || <span className="font-normal text-slate-400">নাম প্রদর্শিত নয়</span>}
        </h4>
        <p className="mb-1 text-[13px] leading-snug text-emerald-800">{p.designation}</p>
        {office && (
          <Link href={`/office/${office.slug}`} className="mb-1 block text-xs text-slate-500 hover:text-emerald-700 hover:underline">
            {office.name}
          </Link>
        )}
        <Line label="মোবাইল" value={mobile} href={mobile ? tel(mobile) : undefined} />
        <Line label="ফোন" value={p.phone} href={p.phone ? tel(p.phone) : undefined} />
        <Line label="ইমেইল" value={p.email} href={p.email ? `mailto:${p.email}` : undefined} />
        <Line label="কক্ষ" value={p.room && p.room !== "-" ? p.room : null} />
        <Line label="ফ্যাক্স" value={p.fax} />
        <Line label="ব্যাচ" value={p.bcs && p.bcs !== "০" && p.bcs !== "0" ? `বিসিএস ${p.bcs}` : null} />
      </div>
    </article>
  );
}

export function OfficeCard({ office, count }: { office: Office; count?: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-emerald-400 hover:shadow">
      <Link href={`/office/${office.slug}`} className="block">
        <h3 className="text-[15px] font-semibold leading-snug text-slate-900 hover:text-emerald-700">{office.name}</h3>
        {office.nameEn && <p className="mt-0.5 text-xs text-slate-500">{office.nameEn}</p>}
      </Link>
      <div className="mt-2">
        <OfficeUrl url={office.url} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
        <span>{office.email ?? ""}</span>
        {typeof count === "number" && count > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{count} জন কর্মকর্তা</span>}
      </div>
    </div>
  );
}

export function Tabs({ active }: { active?: string }) {
  return (
    <nav className="sticky top-0 z-30 border-b border-emerald-900/20 bg-emerald-800 shadow">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-3">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={c.slug === "hq" ? "/" : `/c/${c.slug}`}
            className={`whitespace-nowrap border-b-4 px-3 py-3 text-sm font-medium transition ${
              active === c.slug
                ? "border-amber-300 bg-emerald-900 text-white"
                : "border-transparent text-emerald-50/90 hover:bg-emerald-700 hover:text-white"
            }`}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function SearchBox({ defaultValue = "", big = false }: { defaultValue?: string; big?: boolean }) {
  return (
    <form action="/search" method="get" className="flex w-full max-w-2xl" role="search">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="নাম, পদবি বা দপ্তর খুঁজুন — বাংলা বা English (যেমন: রহমান / rahman / director)"
        className={`w-full rounded-l-lg border-0 bg-white px-4 text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-amber-300 ${big ? "py-3.5 text-base" : "py-2.5 text-sm"}`}
        autoComplete="off"
      />
      <button type="submit" className={`rounded-r-lg bg-amber-400 px-5 font-semibold text-emerald-950 hover:bg-amber-300 ${big ? "text-base" : "text-sm"}`}>
        খুঁজুন
      </button>
    </form>
  );
}

export function groupBy<T, K>(items: T[], key: (t: T) => K): [K, T[]][] {
  const m = new Map<K, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  return [...m.entries()];
}
