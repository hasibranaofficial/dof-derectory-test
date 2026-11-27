import Link from "next/link";
import { notFound } from "next/navigation";
import { CATEGORIES, categoryBySlug, getAllOffices, getOfficesByCategory } from "@/lib/data";
import { OfficeCard, Tabs } from "@/components/ui";

export const dynamicParams = false;
export function generateStaticParams() { return CATEGORIES.filter(c => c.slug !== "hq").map(c => ({ category: c.slug })); }
export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const cat = categoryBySlug(category);
  if (!cat || category === "hq") notFound();
  const rows = await getOfficesByCategory(category);
  const districts = category === "districts" ? rows.filter(r => r.office.kind === "district") : rows;
  const divisions = category === "districts" ? rows.filter(r => r.office.kind === "upazila") : [];
  return <>
    <Tabs active={category} />
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-950">{cat.label}</h1>
        <p className="mt-1 text-sm text-slate-600">{cat.desc}</p>
        <p className="mt-3 text-sm font-semibold text-emerald-800">মোট {rows.length}টি দপ্তর</p>
      </div>
      {category === "districts" ? <>
        <h2 className="mb-3 text-lg font-bold text-slate-800">জেলা কার্যালয় ({districts.length})</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{districts.map(r => <OfficeCard key={r.office.id} office={r.office} count={r.officerCount} />)}</div>
        <h2 className="mb-3 mt-8 text-lg font-bold text-slate-800">উপজেলা কার্যালয় ({divisions.length})</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{divisions.map(r => <OfficeCard key={r.office.id} office={r.office} count={r.officerCount} />)}</div>
      </> : <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map(r => <OfficeCard key={r.office.id} office={r.office} count={r.officerCount} />)}</div>}
      <p className="mt-8 text-xs text-slate-500"><Link href="/" className="text-emerald-700 hover:underline">সদর দপ্তরে ফিরুন</Link></p>
    </main>
  </>;
}
