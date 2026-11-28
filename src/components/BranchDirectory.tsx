import type { Officer } from "@/lib/data";
import DirectoryOfficer from "@/components/DirectoryOfficer";

export default function BranchDirectory({ branches }: { branches: [string, Officer[]][] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-3 border-l-4 border-emerald-600 pl-3 text-xl font-bold text-emerald-900">
        শাখাসমূহ <span className="text-sm font-normal text-slate-500">({branches.length}টি)</span>
      </h2>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {branches.map(([name, people], index) => (
          <a
            key={name || index}
            href={`#branch-${index}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
          >
            <h3 className="text-[15px] font-semibold leading-snug text-slate-900 hover:text-emerald-700">
              {name}
            </h3>
            <p className="mt-2 text-xs text-slate-500">{people.length} জন কর্মকর্তা-কর্মচারী</p>
          </a>
        ))}
      </div>

      {branches.map(([name, people], index) => (
        <section key={name || index} id={`branch-${index}`} className="mt-8 scroll-mt-24">
          <h2 className="mb-3 flex items-center gap-2 border-l-4 border-emerald-600 pl-3 text-lg font-bold text-emerald-900">
            {name}
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{people.length} জন</span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {people.map((person, personIndex) => (
              <DirectoryOfficer key={person.id || person.name || personIndex} p={person} />
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
