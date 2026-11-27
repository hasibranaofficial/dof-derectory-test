import Link from "next/link";
import { CATEGORIES, getCounts, getAllOffices } from "@/lib/data";

export default async function HomePage() {
  const counts = await getCounts();
  const offices = getAllOffices();
  const hq = offices.find((office) => office.category === "hq");
  const items = CATEGORIES.map((category) => ({
    ...category,
    href: category.slug === "hq" ? (hq ? "/office/" + hq.slug : "/") : "/c/" + category.slug,
    count: counts[category.slug]?.offices ?? 0,
  }));
  return (
    <main className="mx-auto max-w-7xl px-4 py-5">
      <div className="home-intro">
        <h2>দপ্তর নির্বাচন করুন</h2>
        <p>মৎস্য অধিদপ্তরের বিভিন্ন পর্যায়ের দপ্তর ও কর্মকর্তা-কর্মচারীর তথ্য দেখুন</p>
      </div>
      <div className="directory-tiles">
        {items.map((item, index) => (
          <Link key={item.slug} href={item.href} className={index === items.length - 1 && items.length % 2 ? "directory-tile wide" : "directory-tile"}>
            <strong>{item.label}</strong>
            <span>{item.count.toLocaleString("bn-BD")} টি দপ্তর <b aria-hidden="true">›</b></span>
          </Link>
        ))}
      </div>
    </main>
  );
}
