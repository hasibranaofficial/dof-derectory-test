import { notFound } from "next/navigation";
import OfficeView from "@/components/OfficeView";
import { getOfficeBySlug } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function OfficePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getOfficeBySlug(decodeURIComponent(slug));
  if (!data) notFound();
  return <OfficeView office={data.office} people={data.people} />;
}
