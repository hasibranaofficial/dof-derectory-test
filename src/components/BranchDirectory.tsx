import type { Officer } from "@/lib/data";
import DirectoryOfficer from "@/components/DirectoryOfficer";

export default function BranchDirectory({ branches }: { branches: [string, Officer[]][] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-4 border-l-4 border-emerald-700 pl-3 text-lg font-bold text-emerald-950">শাখাসমূহ</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map(([name, people], index) => (
          <details key={name || index} className="group overflow-hidden rounded-xl border border-emerald-800 bg-white shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-emerald-900 px-4 py-4 text-left text-white transition-colors hover:bg-emerald-800 [&::-webkit-details-marker]:hidden">
              <span className="font-semibold leading-relaxed">{name || "অন্যান্য শাখা"}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="rounded-full border border-white/40 bg-white/15 px-2.5 py-1 text-xs font-bold text-white">{people.length} জন</span>
                <span className="text-xl leading-none transition-transform group-open:rotate-90">›</span>
              </span>
            </summary>
            <div className="border-t border-emerald-100 bg-slate-50 p-3">
              <h3 className="mb-3 border-l-4 border-emerald-700 pl-3 font-bold text-emerald-950">{name || "অন্যান্য শাখা"} — জনবল</h3>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {people.map((person, personIndex) => (
                  <DirectoryOfficer key={person.id || person.name || personIndex} p={person} />
                ))}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
