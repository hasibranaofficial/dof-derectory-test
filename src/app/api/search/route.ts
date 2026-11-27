import { search } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const r = await search(q, 30);
  return Response.json({
    totalOfficers: r.totalOfficers,
    totalOffices: r.totalOffices,
    offices: r.offices.map((o) => ({ slug: o.office.slug, name: o.office.name, url: o.office.url })),
    officers: r.officers.map((o) => ({
      id: o.officer.id,
      name: o.officer.name,
      designation: o.officer.designation,
      photo: o.officer.photo,
      officeName: o.office.name,
      officeSlug: o.office.slug,
    })),
  });
}
