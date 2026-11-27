import { index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const offices = pgTable(
  "offices",
  {
    id: serial("id").primaryKey(),
    slug: text("slug").notNull().unique(),
    category: text("category").notNull(),
    name: text("name").notNull(),
    nameEn: text("name_en"),
    url: text("url"),
    email: text("email"),
    phone: text("phone"),
    address: text("address"),
    district: text("district"),
    division: text("division"),
    upazila: text("upazila"),
    kind: text("kind"),
    sort: integer("sort").notNull().default(0),
  },
  (t) => [index("offices_category_idx").on(t.category, t.sort)],
);

export const officers = pgTable(
  "officers",
  {
    id: serial("id").primaryKey(),
    officeId: integer("office_id")
      .notNull()
      .references(() => offices.id, { onDelete: "cascade" }),
    branch: text("branch"),
    sort: integer("sort").notNull().default(0),
    name: text("name").notNull().default(""),
    designation: text("designation").notNull().default(""),
    email: text("email"),
    phone: text("phone"),
    mobile: text("mobile"),
    room: text("room"),
    fax: text("fax"),
    bcs: text("bcs"),
    joined: text("joined"),
    photo: text("photo"),
  },
  (t) => [index("officers_office_idx").on(t.officeId, t.sort)],
);
