import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, groupBy, OfficeCard } from "@/components/ui";
import { CATEGORIES, categoryBySlug, getFarmManagers, getOfficesByCategory } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return CATEGORIES.filter((category) => category.slug !== "hq").map((category) => ({ cat: category.slug }));
}

const DIV_ORDER = ["ঢাকা", "চট্টগ্রাম", "খুলনা", "রাজশাহী", "রংপুর", "বরিশাল", "ময়মনসিংহ", "সিলেট"];
const divRank = (d: string | null) => {
  const i = DIV_ORDER.indexOf(d ?? "");
  return i < 0 ? 99 : i;
};

export default async function CategoryPage({ params }: { params: Promise<{ cat: string }> }) {
  const { cat: slug } = await params;
  const cat = categoryBySlug(slug);
  if (!cat) notFound();
  const rows = await getOfficesByCategory(slug);

  let body;
  if (slug === "districts") {
    const districts = rows.filter((r) => r.office.kind === "district");
    const upazilas = rows.filter((r) => r.office.kind === "upazila");
    const upByDist = new Map<string, typeof upazilas>();
    for (const u of upazilas) {
      const k = u.office.district ?? "";
      if (!upByDist.has(k)) upByDist.set(k, []);
      upByDist.get(k)!.push(u);
    }
    const byDiv = groupBy(districts, (r) => r.office.division ?? "অন্যান্য").sort((a, b) => divRank(a[0]) - divRank(b[0]));
    body = byDiv.map(([div, list]) => (
      <section key={div} className="mt-8">
        <h2 className="mb-3 border-l-4 border-emerald-600 pl-3 text-xl font-bold text-emerald-900">
          {div} বিভাগ <span className="text-sm font-normal text-slate-500">({list.length} জেলা)</span>
        </h2>
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map(({ office, officerCount }) => {
            const ups = upByDist.get(office.district ?? "") ?? [];
            return (
              <div key={office.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Link href={`/office/${office.slug}`} className="text-[15px] font-semibold text-slate-900 hover:text-emerald-700">
                  {office.name}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {officerCount} জন কর্মকর্তা{office.email ? ` · ${office.email}` : ""}
                </p>
                {ups.length > 0 && (
                  <details className="mt-3 rounded-lg bg-slate-50 p-2">
                    <summary className="cursor-pointer text-sm font-medium text-sky-800">উপজেলা মৎস্য কার্যালয় ({ups.length})</summary>
                    <ul className="mt-2 space-y-1.5">
                      {ups.map(({ office: u }) => (
                        <li key={u.id} className="text-sm">
                          <Link href={`/office/${u.slug}`} className="text-slate-800 hover:text-emerald-700 hover:underline">
                            {u.upazila}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            );
          })}
        </div>
      </section>
    ));
  } else if (slug === "farms") {
    const managers = await getFarmManagers();
    const mgr = new Map(managers.map((m) => [m.officeId, m]));
    const byDiv = groupBy(rows, (r) => r.office.division ?? "অন্যান্য").sort((a, b) => divRank(a[0]) - divRank(b[0]));
    body = byDiv.map(([div, list]) => (
      <section key={div} className="mt-8">
        <h2 className="mb-3 border-l-4 border-emerald-600 pl-3 text-xl font-bold text-emerald-900">
          {div === "অন্যান্য" ? div : `${div} বিভাগ`} <span className="text-sm font-normal text-slate-500">({list.length}টি খামার)</span>
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map(({ office }) => {
            const m = mgr.get(office.id);
            return (
              <div key={office.id} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm hover:border-emerald-400">
                <Avatar src={m?.photo} name={m?.name ?? office.name} size={64} />
                <div className="min-w-0 flex-1">
                  <Link href={`/office/${office.slug}`} className="text-[15px] font-semibold leading-snug text-slate-900 hover:text-emerald-700">
                    {office.name}
                  </Link>
                  <p className="text-xs text-slate-500">
                    মৎস্য বীজ উৎপাদন খামার{office.district ? ` · জেলা: ${office.district}` : ""}
                  </p>
                  {m?.name && <p className="mt-1 text-sm text-emerald-800">ব্যবস্থাপক: {m.name}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    ));
  } else {
    body = (
      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ office, officerCount }) => (
          <OfficeCard key={office.id} office={office} count={officerCount} />
        ))}
      </div>
    );
  }

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-2xl font-bold text-emerald-950">{cat.label}</h1>
        <p className="text-sm text-slate-600">
          {cat.desc} · মোট {rows.length}টি দপ্তর
        </p>
        {body}
      </main>
    </>
  );
}
