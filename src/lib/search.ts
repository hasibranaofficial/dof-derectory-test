import { db } from "@/db";
import { offices, officers } from "@/db/schema";
import { ensureSeeded } from "./seed";
import { EN_BN, normDigits, normalizeText, skeleton, tokenize } from "./translit";
import type { Office, Officer } from "./data";

type Doc = {
  kind: "officer" | "office";
  id: number;
  primary: string; // normalised name text (high weight)
  secondary: string; // normalised everything else
  pWords: string[];
  sWords: string[];
  pSkel: string[];
  sSkel: string[];
  pJoined: string;
  sJoined: string;
};

type Index = {
  docs: Doc[];
  officersById: Map<number, Officer>;
  officesById: Map<number, Office>;
  builtAt: number;
};

const g = globalThis as typeof globalThis & { __dofIndex?: Promise<Index> };

function mk(kind: Doc["kind"], id: number, primary: string[], secondary: string[]): Doc {
  const p = normalizeText(primary.filter(Boolean).join(" "));
  const s = normalizeText(secondary.filter(Boolean).join(" "));
  const pWords = tokenize(p);
  const sWords = tokenize(s);
  const d: Doc = {
    kind,
    id,
    primary: p,
    secondary: s,
    pWords,
    sWords,
    pSkel: pWords.map(skeleton),
    sSkel: sWords.map(skeleton),
    pJoined: "",
    sJoined: "",
  };
  d.pJoined = d.pSkel.join("");
  d.sJoined = d.sSkel.join("");
  return d;
}

async function build(): Promise<Index> {
  await ensureSeeded();
  const [offs, people] = await Promise.all([db.select().from(offices), db.select().from(officers)]);
  const officesById = new Map(offs.map((o) => [o.id, o]));
  const officersById = new Map(people.map((p) => [p.id, p]));
  const docs: Doc[] = [];
  for (const o of offs) {
    docs.push(
      mk("office", o.id, [o.name, o.nameEn ?? ""], [o.district ?? "", o.upazila ?? "", o.division ?? "", o.url ?? "", o.email ?? "", o.phone ?? ""]),
    );
  }
  for (const p of people) {
    const o = officesById.get(p.officeId);
    docs.push(
      mk(
        "officer",
        p.id,
        [p.name],
        [p.designation, p.branch ?? "", o?.name ?? "", o?.district ?? "", o?.upazila ?? "", p.email ?? "", p.phone ?? "", p.mobile ?? "", p.room ?? "", p.bcs ?? ""],
      ),
    );
  }
  return { docs, officersById, officesById, builtAt: Date.now() };
}

function getIndex(): Promise<Index> {
  const cur = g.__dofIndex;
  if (cur) return cur;
  const p = build().catch((e) => {
    g.__dofIndex = undefined;
    throw e;
  });
  g.__dofIndex = p;
  // refresh periodically
  setTimeout(() => {
    if (g.__dofIndex === p) g.__dofIndex = undefined;
  }, 10 * 60 * 1000).unref?.();
  return p;
}

/** score of one alternative (raw string) against a doc; 0 = no match */
function scoreAlt(doc: Doc, alt: string): number {
  const raw = normalizeText(alt).trim();
  if (!raw) return 0;
  if (doc.primary.includes(raw)) return 4;
  if (doc.secondary.includes(raw)) return 2.5;
  const isNumeric = /^[\d+\-]+$/.test(raw);
  if (isNumeric) return 0;
  const sk = skeleton(raw);
  if (!sk) return 0;
  if (sk.length >= 2) {
    if (doc.pSkel.some((w) => w.startsWith(sk))) return 3;
    if (doc.sSkel.some((w) => w.startsWith(sk))) return 1.5;
    if (sk.length >= 4 && doc.pJoined.includes(sk)) return 2;
    if (sk.length >= 4 && doc.sJoined.includes(sk)) return 1;
  } else {
    if (doc.pSkel.some((w) => w.startsWith(sk))) return 2;
    if (doc.sSkel.some((w) => w.startsWith(sk))) return 1;
  }
  return 0;
}

export type SearchResult = {
  officers: { officer: Officer; office: Office; score: number }[];
  offices: { office: Office; score: number }[];
  totalOfficers: number;
  totalOffices: number;
};

export async function search(query: string, limit = 80): Promise<SearchResult> {
  const idx = await getIndex();
  const q = normDigits(query || "").trim();
  const tokens = tokenize(q);
  if (!tokens.length) return { officers: [], offices: [], totalOfficers: 0, totalOffices: 0 };

  const alts = tokens.map((t) => [t, ...(EN_BN[t] ?? [])]);
  const phraseRaw = normalizeText(q);

  const hits: { doc: Doc; score: number }[] = [];
  for (const doc of idx.docs) {
    let total = 0;
    let ok = true;
    for (const a of alts) {
      let best = 0;
      for (const alt of a) {
        const s = scoreAlt(doc, alt);
        if (s > best) best = s;
      }
      if (!best) {
        ok = false;
        break;
      }
      total += best;
    }
    if (!ok) continue;
    if (tokens.length > 1 && doc.primary.includes(phraseRaw)) total += 3;
    hits.push({ doc, score: total });
  }
  hits.sort((a, b) => b.score - a.score);

  const offs: SearchResult["offices"] = [];
  const peeps: SearchResult["officers"] = [];
  let totalOfficers = 0;
  let totalOffices = 0;
  for (const h of hits) {
    if (h.doc.kind === "office") {
      totalOffices++;
      if (offs.length < 40) offs.push({ office: idx.officesById.get(h.doc.id)!, score: h.score });
    } else {
      totalOfficers++;
      if (peeps.length < limit) {
        const officer = idx.officersById.get(h.doc.id)!;
        peeps.push({ officer, office: idx.officesById.get(officer.officeId)!, score: h.score });
      }
    }
  }
  return { officers: peeps, offices: offs, totalOfficers, totalOffices };
}
