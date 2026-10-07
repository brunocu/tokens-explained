// The same text in six languages (D-14, TOK-08): the whole of Article 1 of the Universal
// Declaration of Human Rights, in the six official UN languages. These are the official
// translations, not author-written. Pure data; the token rows for each sentence are in
// comparison.json, so a sentence is corrected here and nowhere else (then re-run
// `npm run precompute:comparison`).
//
// Why the whole article and not "the first sentence": in Spanish Article 1 is one sentence,
// while English, French, Russian, Arabic and Chinese have two, so "first sentence" would not
// be the same meaning in every row (RESEARCH Gap 3, UI-SPEC revision R-02).
//
// Each string was read from its retrievalUrl on the retrieved date and compared with that
// page (NFC-normalised). Where OHCHR publishes a PDF it was compared with that as well.
// The Arabic sentence has no OHCHR PDF; it was read from un.org only and is queued for a
// human comparison with the OHCHR Arabic page (RESEARCH A4, A5).

export type Language = {
  id: "en" | "es" | "fr" | "ru" | "ar" | "zh";
  /** Name shown to the reader, in English. */
  name: string;
  /** BCP 47 code for the lang attribute of the sentence element. */
  lang: string;
  dir: "ltr" | "rtl";
  /** Article 1, whole, in NFC. */
  sentence: string;
  /** The un.org page the text was read from. */
  retrievalUrl: string;
  /** YYYY-MM-DD the text was read. */
  retrieved: string;
  /** The OHCHR PDF it was cross-checked against, or null where OHCHR has none. */
  ohchrPdfUrl: string | null;
};

/** The OHCHR page that explains the translation project and asks for a link as the source. */
export const SOURCE_PAGE =
  "https://www.ohchr.org/en/human-rights/universal-declaration/universal-declaration-human-rights/about-universal-declaration-human-rights-translation-project";

const PDF_DIR = "https://www.ohchr.org/sites/default/files/UDHR/Documents/UDHR_Translations/";
const RETRIEVED = "2026-10-06";

export const LANGUAGES: ReadonlyArray<Language> = [
  {
    id: "en",
    name: "English",
    lang: "en",
    dir: "ltr",
    sentence:
      "All human beings are born free and equal in dignity and rights. They are endowed with reason and conscience and should act towards one another in a spirit of brotherhood.",
    retrievalUrl: "https://www.un.org/en/about-us/universal-declaration-of-human-rights",
    retrieved: RETRIEVED,
    ohchrPdfUrl: `${PDF_DIR}eng.pdf`,
  },
  {
    id: "es",
    name: "Spanish",
    lang: "es",
    dir: "ltr",
    sentence:
      "Todos los seres humanos nacen libres e iguales en dignidad y derechos y, dotados como están de razón y conciencia, deben comportarse fraternalmente los unos con los otros.",
    retrievalUrl: "https://www.un.org/es/about-us/universal-declaration-of-human-rights",
    retrieved: RETRIEVED,
    ohchrPdfUrl: `${PDF_DIR}spn.pdf`,
  },
  {
    id: "fr",
    name: "French",
    lang: "fr",
    dir: "ltr",
    sentence:
      "Tous les êtres humains naissent libres et égaux en dignité et en droits. Ils sont doués de raison et de conscience et doivent agir les uns envers les autres dans un esprit de fraternité.",
    retrievalUrl: "https://www.un.org/fr/about-us/universal-declaration-of-human-rights",
    retrieved: RETRIEVED,
    ohchrPdfUrl: `${PDF_DIR}frn.pdf`,
  },
  {
    id: "ru",
    name: "Russian",
    lang: "ru",
    dir: "ltr",
    sentence:
      "Все люди рождаются свободными и равными в своем достоинстве и правах. Они наделены разумом и совестью и должны поступать в отношении друг друга в духе братства.",
    retrievalUrl: "https://www.un.org/ru/about-us/universal-declaration-of-human-rights",
    retrieved: RETRIEVED,
    ohchrPdfUrl: `${PDF_DIR}rus.pdf`,
  },
  {
    id: "ar",
    name: "Arabic",
    lang: "ar",
    dir: "rtl",
    sentence: "يولد جميع الناس أحراراً ومتساوين في الكرامة والحقوق. وهم قد وهبوا العقل والوجدان وعليهم أن يعاملوا بعضهم بعضاً بروح الإخاء.",
    retrievalUrl: "https://www.un.org/ar/about-us/universal-declaration-of-human-rights",
    retrieved: RETRIEVED,
    ohchrPdfUrl: null,
  },
  {
    id: "zh",
    name: "Chinese (Simplified)",
    lang: "zh-Hans",
    dir: "ltr",
    sentence: "人人生而自由，在尊严和权利上一律平等。他们赋有理性和良心，并应以兄弟关系的精神相对待。",
    retrievalUrl: "https://www.un.org/zh/about-us/universal-declaration-of-human-rights",
    retrieved: RETRIEVED,
    ohchrPdfUrl: `${PDF_DIR}chn.pdf`,
  },
];
