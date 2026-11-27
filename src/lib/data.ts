import seed from "../../data/seed.json";
import photoMap from "../../data/photo-map.json";

const SUPABASE_PHOTO_BASE = "https://hlgtsigojqmpyqrrypye.supabase.co/storage/v1/object/public/photos/";
const officerPhotoMap = photoMap as Record<string, Record<string, string>>;

export interface Office {
  id: number; slug: string; category: string; name: string; nameEn: string | null;
  url: string | null; email: string | null; phone: string | null; address: string | null;
  district: string | null; division: string | null; upazila: string | null; kind: string | null; sort: number;
}
export interface Officer {
  id: number; officeId: number; branch: string | null; sort: number; name: string;
  designation: string; email: string | null; phone: string | null; mobile: string | null;
  room: string | null; fax: string | null; bcs: string | null; joined: string | null; photo: string | null;
}
type SeedOfficer = Partial<Omit<Officer, "id" | "officeId">> & { name?: string; designation?: string };
type SeedOffice = {
  category: string; slug: string; name: string; name_en?: string | null; url?: string | null;
  email?: string | null; phone?: string | null; address?: string | null; district?: string | null;
  division?: string | null; upazila?: string | null; kind?: string | null; sort?: number;
  officers?: SeedOfficer[];
};
const records = seed as SeedOffice[];
const offices: Office[] = records.map((o, i) => ({
  id: i + 1, slug: o.slug, category: o.category, name: o.name, nameEn: o.name_en ?? null,
  url: o.url ?? null, email: o.email ?? null, phone: o.phone ?? null, address: o.address ?? null,
  district: o.district ?? null, division: o.division ?? null, upazila: o.upazila ?? null,
  kind: o.kind ?? null, sort: o.sort ?? i,
}));
const officers: Officer[] = records.flatMap((o, i) => (o.officers ?? []).map((p, j) => ({
  id: officersId(i, j), officeId: i + 1, branch: p.branch ?? null, sort: j,
  name: p.name ?? "", designation: p.designation ?? "", email: p.email ?? null,
  phone: p.phone ?? null, mobile: p.mobile ?? null, room: p.room ?? null,
  fax: p.fax ?? null, bcs: p.bcs ?? null, joined: p.joined ?? null,
  photo: officerPhotoMap[o.slug]?.[p.name ?? ""]
    ? SUPABASE_PHOTO_BASE + officerPhotoMap[o.slug][p.name ?? ""]
    : p.photo ? (p.photo.startsWith("http") ? p.photo : "/dof-derectory-test" + p.photo) : null,
})));
function officersId(officeIndex: number, officerIndex: number) {
  let id = 1;
  for (let i = 0; i < officeIndex; i++) id += records[i].officers?.length ?? 0;
  return id + officerIndex;
}
export const CATEGORIES = [
  { slug: "hq", label: "সদর দপ্তর", short: "সদর দপ্তর", desc: "মৎস্য অধিদপ্তরের সদর দপ্তরের শাখাভিত্তিক কর্মকর্তাবৃন্দ" },
  { slug: "divisions", label: "বিভাগীয় অফিস", short: "বিভাগীয় অফিস", desc: "৮টি বিভাগীয় মৎস্য দপ্তর ও কর্মকর্তাবৃন্দ" },
  { slug: "quality", label: "মান নিয়ন্ত্রণ দপ্তর", short: "মান নিয়ন্ত্রণ", desc: "এফআইকিউসি ও কোয়ালিটি অ্যাসুরেন্স ম্যানেজারের কার্যালয়" },
  { slug: "academy", label: "মৎস্য প্রশিক্ষণ একাডেমি", short: "প্রশিক্ষণ একাডেমি", desc: "মৎস্য প্রশিক্ষণ একাডেমি, সাভার" },
  { slug: "institutes", label: "ডিপ্লোমা ইনস্টিটিউট ও প্রশিক্ষণ কেন্দ্র", short: "ইনস্টিটিউট ও কেন্দ্র", desc: "ডিপ্লোমা ইনস্টিটিউট ও প্রশিক্ষণ কেন্দ্রসমূহ" },
  { slug: "marine", label: "সামুদ্রিক মৎস্য দপ্তর", short: "সামুদ্রিক মৎস্য", desc: "সামুদ্রিক মৎস্য দপ্তর ও জরিপ ব্যবস্থাপনা ইউনিট" },
  { slug: "districts", label: "জেলা ও উপজেলা সমূহ", short: "জেলা ও উপজেলা", desc: "জেলা ও উপজেলা মৎস্য কার্যালয়সমূহ" },
  { slug: "farms", label: "মৎস্য খামার সমূহ", short: "মৎস্য খামার", desc: "মৎস্য বীজ উৎপাদন খামার, হ্যাচারি ও নার্সারি" },
] as const;
export function categoryBySlug(slug: string) { return CATEGORIES.find(c => c.slug === slug); }
export async function getCounts() {
  return Object.fromEntries(CATEGORIES.map(c => [c.slug, {
    offices: offices.filter(o => o.category === c.slug).length,
    officers: officers.filter(p => offices[p.officeId - 1]?.category === c.slug).length,
  }]));
}
export async function getOfficesByCategory(category: string) {
  return offices.filter(o => o.category === category).sort((a,b) => a.sort-b.sort)
    .map(office => ({ office, officerCount: officers.filter(p => p.officeId === office.id).length }));
}
export async function getOfficeBySlug(slug: string) {
  const office = offices.find(o => o.slug === slug);
  if (!office) return null;
  return { office, people: officers.filter(p => p.officeId === office.id).sort((a,b) => a.sort-b.sort) };
}
export async function getFarmManagers() {
  return officers.filter(p => offices[p.officeId - 1]?.category === "farms")
    .map(p => ({ officeId: p.officeId, name: p.name, photo: p.photo, mobile: p.mobile }));
}
export async function getUpazilasOfDistrict(district: string) {
  return offices.filter(o => o.category === "districts" && o.kind === "upazila" && o.district === district)
    .sort((a,b) => a.sort-b.sort).map(office => ({ office, officerCount: officers.filter(p => p.officeId === office.id).length }));
}
export async function getDistrictOffice(district: string) {
  return offices.find(o => o.kind === "district" && o.district === district) ?? null;
}
export function getAllOffices() { return offices; }
export function getAllOfficers() { return officers; }
