import Link from "next/link";
import type { Office, Officer } from "@/lib/data";
import { categoryBySlug, getDistrictOffice, getUpazilasOfDistrict } from "@/lib/data";
import { groupBy, OfficeUrl } from "@/components/ui";
import DirectoryOfficer from "@/components/DirectoryOfficer";

export default async function OfficeView({ office, people }: { office: Office; people: Officer[] }) {
  const cat = categoryBySlug(office.category);
  const branches = groupBy(people, (p) => p.branch ?? "");
  const hasBranches = branches.length > 1 || (branches.length === 1 && branches[0][0] !== "");

  const upazilas = office.kind === "district" && office.district ? await getUpazilasOfDistrict(office.district) : [];
  const parentDistrict = office.kind === "upazila" && office.district ? await getDistrictOffice(office.district) : null;

  return (
    <>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <nav className="mb-3 text-sm text-slate-500">
          <Link href="/" className="hover:text-emerald-700">হোম</Link>
          <span className="mx-1.5">/</span>
          {cat && (
            <Link href={cat.slug === "hq" ? "/" : `/c/${cat.slug}`} className="hover:text-emerald-700">
              {cat.label}
            </Link>
          )}
          {parentDistrict && (
            <>
              <span className="mx-1.5">/</span>
              <Link href={`/office/${parentDistrict.slug}`} className="hover:text-emerald-700">
                {parentDistrict.name}
              </Link>
            </>
          )}
        </nav>

        <section className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm">
          <h1 className="text-2xl font-bold leading-snug text-emerald-950">{office.name}</h1>
          {office.nameEn && <p className="text-sm text-slate-500">{office.nameEn}</p>}
          <div className="mt-2">
            <OfficeUrl url={office.url} className="!text-base" />
          </div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-1 text-sm text-slate-700">
            {office.address && (
              <div>
                <dt className="inline text-slate-500">ঠিকানা: </dt>
                <dd className="inline">{office.address}</dd>
              </div>
            )}
            {office.email && (
              <div>
                <dt className="inline text-slate-500">ইমেইল: </dt>
                <dd className="inline">
                  <a className="hover:underline" href={`mailto:${office.email}`}>{office.email}</a>
                </dd>
              </div>
            )}
            {office.phone && (
              <div>
                <dt className="inline text-slate-500">মোবাইল: </dt>
                <dd className="inline">{office.phone}</dd>
              </div>
            )}
            {office.division && office.category !== "hq" && (
              <div>
                <dt className="inline text-slate-500">বিভাগ: </dt>
                <dd className="inline">{office.division}</dd>
              </div>
            )}
          </dl>
          <p className="mt-3 text-sm text-slate-500">মোট কর্মকর্তা: {people.length} জন</p>
        </section>

        {hasBranches && (
          <div className="mt-5 flex flex-wrap gap-2">
            {branches.map(([b, list], i) => (
              <a
                key={i}
                href={`#b-${i}`}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
              >
                {b && <>{b} </>}<span className="text-slate-400">({list.length})</span>
              </a>
            ))}
          </div>
        )}

        {people.length === 0 ? (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            এই দপ্তরের কর্মকর্তাদের তালিকা এখনো যুক্ত করা হয়নি।{" "}
            {office.url && (
              <>
                অফিসিয়াল ওয়েবসাইটে দেখুন: <OfficeUrl url={office.url} />
              </>
            )}
          </div>
        ) : (
          branches.map(([b, list], i) => (
            <section key={i} id={`b-${i}`} className="mt-6">
              {hasBranches && b && (
                <h2 className="mb-3 flex items-center gap-2 border-l-4 border-emerald-600 pl-3 text-lg font-bold text-emerald-900">
                  {b}
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{list.length}</span>
                </h2>
              )}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {list.map((p) => (
                  <DirectoryOfficer key={p.id} p={p} />
                ))}
              </div>
            </section>
          ))
        )}

        {upazilas.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 border-l-4 border-sky-600 pl-3 text-lg font-bold text-sky-900">
              উপজেলা মৎস্য কার্যালয়সমূহ ({upazilas.length})
            </h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {upazilas.map(({ office: u, officerCount }) => (
                <Link key={u.id} href={`/office/${u.slug}`} className="rounded-xl border border-slate-200 bg-white p-3 text-sm shadow-sm hover:border-emerald-400">
                  <span className="font-medium text-slate-900">{u.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{officerCount} জন কর্মকর্তা</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
