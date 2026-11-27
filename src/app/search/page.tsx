import Link from "next/link";
import { OfficerCard, OfficeUrl, SearchBox, Tabs } from "@/components/ui";
import { search } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const r = await search(q);
  return (
    <>
      <Tabs />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 rounded-2xl bg-emerald-800 p-4">
          <SearchBox defaultValue={q} big />
          <p className="mt-2 text-xs text-emerald-100">
            বাংলা বা ইংরেজিতে নামের পূর্ণ বা আংশিক অংশ লিখুন। যেমন: <b>রহমান</b>, <b>rahman</b>, <b>md karim</b>, <b>উপপরিচালক</b>, <b>district officer</b>
          </p>
        </div>

        {!q.trim() ? (
          <p className="text-slate-500">কিছু লিখে অনুসন্ধান করুন।</p>
        ) : r.totalOfficers + r.totalOffices === 0 ? (
          <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">“{q}” এর জন্য কোনো ফলাফল পাওয়া যায়নি।</p>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600">
              “{q}” — {r.totalOfficers} জন কর্মকর্তা, {r.totalOffices}টি দপ্তর পাওয়া গেছে
              {r.totalOfficers > r.officers.length ? ` (প্রথম ${r.officers.length} জন দেখানো হচ্ছে)` : ""}
            </p>
            {r.offices.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 border-l-4 border-sky-600 pl-3 text-lg font-bold text-sky-900">দপ্তর</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {r.offices.map(({ office }) => (
                    <div key={office.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <Link href={`/office/${office.slug}`} className="font-semibold text-slate-900 hover:text-emerald-700">
                        {office.name}
                      </Link>
                      <div className="mt-1">
                        <OfficeUrl url={office.url} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {r.officers.length > 0 && (
              <section>
                <h2 className="mb-3 border-l-4 border-emerald-600 pl-3 text-lg font-bold text-emerald-900">কর্মকর্তা</h2>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {r.officers.map(({ officer, office }) => (
                    <OfficerCard key={officer.id} p={officer} office={office} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
