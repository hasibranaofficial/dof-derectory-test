// Bangla <-> English fuzzy matching helpers.
// Idea: reduce every word (Bangla or Latin) to a "consonant skeleton" so that
// "রহমান", "Rahman", "rahaman" all become the same key ("rmn").

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function normDigits(s: string): string {
  return s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

const BN_CONS: Record<string, string> = {
  ক: "k", খ: "k", গ: "g", ঘ: "g", ঙ: "n", চ: "c", ছ: "c", জ: "j", ঝ: "j", ঞ: "n",
  ট: "t", ঠ: "t", ড: "d", ঢ: "d", ণ: "n", ত: "t", থ: "t", দ: "d", ধ: "d", ন: "n",
  প: "p", ফ: "p", ব: "b", ভ: "b", ম: "m", য: "j", র: "r", ল: "l", শ: "s", ষ: "s",
  স: "s", হ: "", ৎ: "t", "ং": "n", "ঃ": "", "ঁ": "",
};

const LATIN: Record<string, string> = {
  b: "b", d: "d", f: "p", g: "g", j: "j", k: "k", l: "l", m: "m", n: "n", p: "p",
  q: "k", r: "r", s: "s", t: "t", v: "b", x: "ks", z: "j",
};

/** Normalise honorific / common prefix spellings before skeletonising. */
export function normalizeText(input: string): string {
  let s = (input || "").normalize("NFC");
  s = s.replace(/[\u200c\u200d]/g, "");
  s = normDigits(s);
  s = s.replace(/মো[ঃ:][\s]*/g, "md ").replace(/মো\.\s*/g, "md ");
  s = s.replace(/(^|\s)ডা?[.\s]+/g, "$1dr ").replace(/ডঃ/g, "dr ");
  s = s.toLowerCase();
  s = s.replace(/\bmd\b\.?/g, "md").replace(/\b(mohd|mohammad|mohammed|muhammad|mohammod|muhammed|mohamad)\b/g, "md");
  s = s.replace(/মোহাম্মদ|মুহাম্মদ|মোহাম্মাদ|মুহম্মদ|মোহাম্মেদ|মোহম্মদ|মুহাম্মাদ/g, "md");
  return s;
}

export function skeleton(word: string): string {
  const w = normalizeText(word);
  let out = "";
  const chars = Array.from(w);
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    const next = chars[i + 1];
    let add = "";
    if (/[\u0980-\u09ff]/.test(ch)) {
      if (ch === "\u09bc") continue; // nukta handled with base
      if ((ch === "ড" || ch === "ঢ") && next === "\u09bc") add = "r";
      else if (ch === "য" && next === "\u09bc") add = "";
      else add = BN_CONS[ch] ?? "";
    } else if (/[a-z]/.test(ch)) {
      if (ch === "c") add = next === "h" ? "c" : "k";
      else add = LATIN[ch] ?? "";
    }
    if (add && out.endsWith(add)) continue;
    out += add;
  }
  return out.replace(/ng/g, "n").replace(/(.)\1+/g, "$1");
}

export function tokenize(s: string): string[] {
  return normalizeText(s)
    .split(/[^\p{L}\p{M}\p{N}@._+-]+/u)
    .map((t) => t.replace(/^[._-]+|[._-]+$/g, ""))
    .filter(Boolean);
}

/** English search words -> Bangla equivalents (designations, office types). */
export const EN_BN: Record<string, string[]> = {
  director: ["পরিচালক"], deputy: ["উপ"], assistant: ["সহকারী"], senior: ["সিনিয়র"], chief: ["প্রধান"],
  officer: ["কর্মকর্তা", "অফিসার"], fisheries: ["মৎস্য"], fishery: ["মৎস্য"], fish: ["মৎস্য", "মাছ"],
  district: ["জেলা"], upazila: ["উপজেলা"], upazilla: ["উপজেলা"], division: ["বিভাগ"], divisional: ["বিভাগীয়"],
  principal: ["অধ্যক্ষ", "প্রিন্সিপাল"], instructor: ["ইন্সট্রাক্টর", "ইনস্ট্রাক্টর"], scientific: ["বৈজ্ঞানিক"],
  research: ["গবেষণা"], farm: ["খামার"], manager: ["ব্যবস্থাপক", "ম্যানেজার"], training: ["প্রশিক্ষণ"],
  marine: ["সামুদ্রিক"], quality: ["কোয়ালিটি", "মান"], control: ["নিয়ন্ত্রণ"], hatchery: ["হ্যাচারি"],
  office: ["কার্যালয়", "অফিস"], head: ["সদর"], headquarters: ["সদর"], general: ["মহাপরিচালক"], dg: ["মহাপরিচালক"],
  diploma: ["ডিপ্লোমা"], institute: ["ইনস্টিটিউট", "ইন্সটিটিউট"], academy: ["একাডেমি"], centre: ["কেন্দ্র"], center: ["কেন্দ্র"],
  seed: ["বীজ"], production: ["উৎপাদন"], extension: ["সম্প্রসারণ"], survey: ["জরিপ"], planning: ["পরিকল্পনা"],
  administration: ["প্রশাসন"], admin: ["প্রশাসন"], budget: ["বাজেট"], finance: ["অর্থ"], audit: ["অডিট"],
  statistics: ["পরিসংখ্যান"], statistical: ["পরিসংখ্যান"], accountant: ["হিসাব"], inspector: ["পরিদর্শক"],
  shrimp: ["চিংড়ি"], hilsa: ["ইলিশ"], inland: ["অভ্যন্তরীণ"], legal: ["লিগ্যাল"], welfare: ["কল্যাণ"],
  staff: ["স্টাফ"], personal: ["ব্যক্তিগত"], computer: ["কম্পিউটার"], operator: ["অপারেটর"], engineer: ["প্রকৌশলী"],
  project: ["প্রকল্প"], reserve: ["রিজার্ভ"], technologist: ["টেকনোলজিস্ট"], cartographer: ["কার্টোগ্রাফার"],
};
