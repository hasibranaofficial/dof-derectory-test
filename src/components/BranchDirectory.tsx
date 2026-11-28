import type { Officer } from "@/lib/data";
import DirectoryOfficer from "@/components/DirectoryOfficer";

export default function BranchDirectory({ branches }: { branches: [string, Officer[]][] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 border-l-4 border-emerald-600 pl-3 text-xl font-bold text-emerald-900">
        শাখাসমূহ <span className="text-sm font-normal text-slate-500">({branches.length}টি)</span>
      </h2>

      <div className="divide-y divide-[var(--line)]">
        {branches.map(([name, people], index) => (
          <details key={name || index} className="group border-b border-[var(--line)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-4 text-left [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-[15px] font-medium leading-snug text-[var(--acc)]">
                {name}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-[var(--mute)]">
                {people.length} জন কর্মকর্তা-কর্মচারী
                <span className="text-lg leading-none transition-transform group-open:rotate-90">›</span>
              </span>
            </summary>
            <div className="pb-3 pl-2">
              <div className="mb-2 rounded-lg bg-[var(--accbg)] px-3 py-2 text-sm font-medium text-[var(--acc)]">
                {name} — জনবল তালিকা
              </div>
              <div>
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
