import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { offices, officers } from "@/db/schema";
import { ensureSeeded } from "./seed";

export type Office = typeof offices.$inferSelect;
export type Officer = typeof officers.$inferSelect;

export const CATEGORIES = [
  { slug: "hq", label: "সদর দপ্তর", short: "সদর দপ্তর", desc: "মৎস্য অধিদপ্তরের সদর দপ্তরের শাখাভিত্তিক কর্মকর্তাবৃন্দ" },
  { slug: "divisions", label: "বিভাগীয় অফিস", short: "বিভাগীয় অফিস", desc: "৮টি বিভাগীয় মৎস্য দপ্তর ও কর্মকর্তাবৃন্দ" },
  { slug: "quality", label: "মান নিয়ন্ত্রণ দপ্তর", short: "মান নিয়ন্ত্রণ", desc: "এফআইকিউসি ও কোয়ালিটি অ্যাসুরেন্স ম্যানেজারের কার্যালয় (মোট ৬টি)" },
  { slug: "academy", label: "মৎস্য প্রশিক্ষণ একাডেমি", short: "প্রশিক্ষণ একাডেমি", desc: "মৎস্য প্রশিক্ষণ একাডেমি, সাভার" },
  { slug: "institutes", label: "ডিপ্লোমা ইনস্টিটিউট ও প্রশিক্ষণ কেন্দ্র", short: "ইনস্টিটিউট ও কেন্দ্র", desc: "মৎস্য ডিপ্লোমা ইনস্টিটিউট, প্রশিক্ষণ ইনস্টিটিউট ও প্রশিক্ষণ কেন্দ্রসমূহ" },
  { slug: "marine", label: "সামুদ্রিক মৎস্য দপ্তর", short: "সামুদ্রিক মৎস্য", desc: "সামুদ্রিক মৎস্য দপ্তর ও জরিপ ব্যবস্থাপনা ইউনিট, চট্টগ্রাম" },
  { slug: "districts", label: "জেলা ও উপজেলা সমূহ", short: "জেলা ও উপজেলা", desc: "৬৪টি জেলা মৎস্য কার্যালয় ও সিনিয়র উপজেলা/উপজেলা মৎস্য কার্যালয়" },
  { slug: "farms", label: "মৎস্য খামার সমূহ", short: "মৎস্য খামার", desc: "মৎস্য বীজ উৎপাদন খামার, হ্যাচারি ও নার্সারি" },
] as const;

export function categoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}

export async function getCounts() {
  await ensureSeeded();
  const rows = await db
    .select({ category: offices.category, count: sql<number>`count(*)::int` })
    .from(offices)
    .groupBy(offices.category);
  const officerRows = await db
    .select({ category: offices.category, count: sql<number>`count(${officers.id})::int` })
    .from(officers)
    .innerJoin(offices, eq(offices.id, officers.officeId))
    .groupBy(offices.category);
  const out: Record<string, { offices: number; officers: number }> = {};
  for (const c of CATEGORIES) out[c.slug] = { offices: 0, officers: 0 };
  for (const r of rows) out[r.category] = { ...out[r.category], offices: r.count };
  for (const r of officerRows) out[r.category] = { ...out[r.category], officers: r.count };
  return out;
}

export async function getOfficesByCategory(category: string) {
  await ensureSeeded();
  return db
    .select({
      office: offices,
      officerCount: sql<number>`(select count(*)::int from officers o where o.office_id = ${offices.id})`,
    })
    .from(offices)
    .where(eq(offices.category, category))
    .orderBy(asc(offices.sort), asc(offices.id));
}

export async function getOfficeBySlug(slug: string) {
  await ensureSeeded();
  const [office] = await db.select().from(offices).where(eq(offices.slug, slug)).limit(1);
  if (!office) return null;
  const people = await db
    .select()
    .from(officers)
    .where(eq(officers.officeId, office.id))
    .orderBy(asc(officers.sort), asc(officers.id));
  return { office, people };
}

export async function getFarmManagers() {
  await ensureSeeded();
  return db
    .select({ officeId: officers.officeId, name: officers.name, photo: officers.photo, mobile: officers.mobile })
    .from(officers)
    .innerJoin(offices, eq(offices.id, officers.officeId))
    .where(eq(offices.category, "farms"))
    .orderBy(asc(officers.id));
}

export async function getUpazilasOfDistrict(district: string) {
  await ensureSeeded();
  return db
    .select({
      office: offices,
      officerCount: sql<number>`(select count(*)::int from officers o where o.office_id = ${offices.id})`,
    })
    .from(offices)
    .where(sql`${offices.category} = 'districts' and ${offices.kind} = 'upazila' and ${offices.district} = ${district}`)
    .orderBy(asc(offices.sort), asc(offices.id));
}

export async function getDistrictOffice(district: string) {
  await ensureSeeded();
  const [o] = await db
    .select()
    .from(offices)
    .where(sql`${offices.kind} = 'district' and ${offices.district} = ${district}`)
    .limit(1);
  return o ?? null;
}
