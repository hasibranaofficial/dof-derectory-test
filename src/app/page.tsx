import { notFound } from "next/navigation";
import OfficeView from "@/components/OfficeView";
import { getOfficeBySlug } from "@/lib/data";

export default async function HomePage() {
  const data = await getOfficeBySlug("hq");
  if (!data) notFound();
  return <OfficeView office={data.office} people={data.people} />;
}
