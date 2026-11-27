import { notFound } from "next/navigation";
import OfficeView from "@/components/OfficeView";
import { getAllOffices, getOfficeBySlug } from "@/lib/data";

export const dynamicParams = false;
export function generateStaticParams() {
  return getAllOffices().map(office => ({ slug: office.slug }));
}
export default async function OfficePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getOfficeBySlug(decodeURIComponent(slug));
  if (!data) notFound();
  return <OfficeView office={data.office} people={data.people} />;
}
