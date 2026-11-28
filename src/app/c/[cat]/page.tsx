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
      <section key={div} className="district-division">
        {div !== "অন্যান্য" && (
          <h2 className="district-division-heading">
            <span>{div} বিভাগ</span>
            <span className="district-division-count">{list.length} জেলা</span>
          </h2>
        )}
        <div className="district-grid">
          {list.map(({ office, officerCount }) => {
            const ups = upByDist.get(office.district ?? "") ?? [];
            return (
              <article key={office.id} className="district-card">
                <div className="district-card-top">
                  <Link href={`/office/${office.slug}`} className="district-card-title">
                    {office.name}
                  </Link>
                  <span className="district-staff-count">{officerCount} জন</span>
                </div>
                <p className="district-card-caption">জেলা মৎস্য দপ্তর · কর্মকর্তা</p>
                {ups.length > 0 && (
                  <details className="district-upazila-details">
                    <summary>
                      <span>উপজেলা মৎস্য কার্যালয়</span>
                      <span className="district-upazila-count">{ups.length}টি</span>
                      <span className="district-summary-chevron">›</span>
                    </summary>
                    <ul className="district-upazila-list">
                      {ups.map(({ office: u }) => (
                        <li key={u.id}>
                          <Link href={`/office/${u.slug}`}>{u.upazila || u.name}</Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </article>
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
        {div !== "অন্যান্য" && <h2 className="mb-3 border-l-4 border-emerald-600 pl-3 text-xl font-bold text-emerald-900">
          {div} বিভাগ <span className="text-sm font-normal text-slate-500">({list.length}টি খামার)</span>
        </h2>}
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
