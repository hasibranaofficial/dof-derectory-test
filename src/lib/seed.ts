import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { offices, officers } from "@/db/schema";

type SeedOfficer = {
  branch: string | null;
  name: string;
  designation: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  room?: string | null;
  fax?: string | null;
  bcs?: string | null;
  joined?: string | null;
  photo?: string | null;
};

type SeedOffice = {
  category: string;
  slug: string;
  name: string;
  name_en?: string | null;
  url?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  district?: string | null;
  division?: string | null;
  upazila?: string | null;
  kind?: string | null;
  sort: number;
  officers: SeedOfficer[];
};

const g = globalThis as typeof globalThis & { __dofSeedPromise?: Promise<void> };

async function run() {
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(offices);
  if (count > 0) return;
  const file = path.join(process.cwd(), "data", "seed.json");
  const data = JSON.parse(fs.readFileSync(file, "utf-8")) as SeedOffice[];

  for (let i = 0; i < data.length; i += 100) {
    const chunk = data.slice(i, i + 100);
    const inserted = await db
      .insert(offices)
      .values(
        chunk.map((o) => ({
          slug: o.slug,
          category: o.category,
          name: o.name,
          nameEn: o.name_en ?? null,
          url: o.url ?? null,
          email: o.email ?? null,
          phone: o.phone ?? null,
          address: o.address ?? null,
          district: o.district ?? null,
          division: o.division ?? null,
          upazila: o.upazila ?? null,
          kind: o.kind ?? null,
          sort: o.sort,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: offices.id, slug: offices.slug });
    const idBySlug = new Map(inserted.map((r) => [r.slug, r.id]));
    const rows = chunk.flatMap((o) =>
      o.officers.map((p, idx) => ({
        officeId: idBySlug.get(o.slug)!,
        branch: p.branch ?? null,
        sort: idx,
        name: p.name ?? "",
        designation: p.designation ?? "",
        email: p.email || null,
        phone: p.phone || null,
        mobile: p.mobile || null,
        room: p.room || null,
        fax: p.fax || null,
        bcs: p.bcs || null,
        joined: p.joined || null,
        photo: p.photo || null,
      })),
    );
    for (let j = 0; j < rows.length; j += 500) {
      await db.insert(officers).values(rows.slice(j, j + 500));
    }
  }
}

/** Loads data/seed.json into PostgreSQL the first time the app runs. */
export function ensureSeeded(): Promise<void> {
  if (!g.__dofSeedPromise) {
    g.__dofSeedPromise = run().catch((e) => {
      g.__dofSeedPromise = undefined;
      throw e;
    });
  }
  return g.__dofSeedPromise;
}
