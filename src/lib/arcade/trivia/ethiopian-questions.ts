import { db } from "@/lib/db";
import { triviaQuestions } from "@/lib/db/schema/trivia";
import { inArray } from "drizzle-orm";

/**
 * Daily Trivia question bank — sourced from the Ethiopian Orthodox Tewahedo
 * canon of 81 books and the tradition that carries it. This is the whole
 * point of Antisocial trivia: Enoch, Jubilees, Meqabyan — the books most
 * platforms have never heard of, held here as scripture.
 *
 * Every question was checked against the tradition before inclusion. When
 * adding questions, keep that bar: no guesses, no pop-theology. correctIndex
 * is 0-based into choices[4].
 *
 * Seeding is idempotent by exact question text — safe to re-run.
 */

type Q = { question: string; choices: [string, string, string, string]; correctIndex: number; category: string };

const ENOCH = "Book of Enoch";
const JUBILEES = "Book of Jubilees";
const CANON = "The 81 Books";
const SCRIPTURE = "Scripture";
const HISTORY = "Church History";

export const ETHIOPIAN_QUESTIONS: Q[] = [
  // ---- Book of Enoch (1 Enoch — canonical in the Tewahedo Bible) ----
  {
    question: "In the Book of Enoch, on which mountain did the Watchers descend and bind themselves by oath?",
    choices: ["Mount Sinai", "Mount Hermon", "Mount Ararat", "Mount Tabor"],
    correctIndex: 1,
    category: ENOCH,
  },
  {
    question: "According to 1 Enoch, which Watcher taught humanity to forge swords, knives, and shields?",
    choices: ["Azazel", "Semjaza", "Uriel", "Raphael"],
    correctIndex: 0,
    category: ENOCH,
  },
  {
    question: "Which New Testament epistle quotes Enoch's prophecy — \"Behold, the Lord comes with ten thousands of his holy ones\"?",
    choices: ["James", "Hebrews", "Jude", "2 Peter"],
    correctIndex: 2,
    category: ENOCH,
  },
  {
    question: "Enoch is described in scripture as which generation from Adam?",
    choices: ["The third", "The seventh", "The tenth", "The fortieth"],
    correctIndex: 1,
    category: ENOCH,
  },
  {
    question: "Which angel guides Enoch and explains the courses of the heavenly luminaries?",
    choices: ["Michael", "Gabriel", "Phanuel", "Uriel"],
    correctIndex: 3,
    category: ENOCH,
  },
  {
    question: "In the Parables of Enoch, what title is given to the heavenly figure who judges kings and the mighty?",
    choices: ["The Son of Man", "The Lion of Judah", "The Root of David", "The Ancient of Wars"],
    correctIndex: 0,
    category: ENOCH,
  },
  {
    question: "Where is Azazel bound and cast into darkness at God's command in 1 Enoch?",
    choices: ["The valley of Hinnom", "The desert of Dudael", "The depths of Sheol", "The waters of the Abyss"],
    correctIndex: 1,
    category: ENOCH,
  },
  {
    question: "What title does the Book of Enoch give Enoch for his heavenly office?",
    choices: ["Priest of Salem", "Judge of the nations", "Scribe of righteousness", "Shepherd of Hermon"],
    correctIndex: 2,
    category: ENOCH,
  },
  // ---- Book of Jubilees (canonical in the Tewahedo Bible) ----
  {
    question: "By what other name is the Book of Jubilees known?",
    choices: ["Little Genesis", "Second Law", "Lesser Exodus", "The Book of Division of Kings"],
    correctIndex: 0,
    category: JUBILEES,
  },
  {
    question: "The Book of Jubilees divides history into jubilee periods of how many years each?",
    choices: ["Fifty", "Seventy", "Forty-nine", "One hundred"],
    correctIndex: 2,
    category: JUBILEES,
  },
  {
    question: "In Jubilees, who dictates the history of the world to Moses on Mount Sinai?",
    choices: ["Gabriel", "The Angel of the Presence", "Raphael", "Enoch himself"],
    correctIndex: 1,
    category: JUBILEES,
  },
  {
    question: "In Jubilees, what is the name of the prince of evil spirits who begs God to leave him a portion of the demons?",
    choices: ["Azazel", "Beliar", "Asmodeus", "Mastema"],
    correctIndex: 3,
    category: JUBILEES,
  },
  // ---- The 81 Books ----
  {
    question: "How many books make up the broader canon of the Ethiopian Orthodox Tewahedo Church?",
    choices: ["66", "73", "78", "81"],
    correctIndex: 3,
    category: CANON,
  },
  {
    question: "How many books of Meqabyan (Ethiopian Maccabees) are held in the Ethiopian canon?",
    choices: ["One", "Two", "Three", "Four"],
    correctIndex: 2,
    category: CANON,
  },
  {
    question: "Which of these books is scripture in the Ethiopian canon but absent from the Protestant 66?",
    choices: ["1 Enoch", "Esther", "Ruth", "Lamentations"],
    correctIndex: 0,
    category: CANON,
  },
  {
    question: "The Ethiopian Psalter includes an additional psalm about David and Goliath. Which is it?",
    choices: ["Psalm 150", "Psalm 151", "Psalm 152", "Psalm 155"],
    correctIndex: 1,
    category: CANON,
  },
  {
    question: "The Kebra Nagast, which tells of Makeda and Menelik bringing the Ark to Ethiopia, is best described as:",
    choices: [
      "One of the 81 canonical books",
      "A book of Meqabyan",
      "A treasured national epic outside the canon",
      "A New Testament epistle",
    ],
    correctIndex: 2,
    category: CANON,
  },
  {
    question: "In what ancient language is the Ethiopian Bible preserved and the liturgy sung?",
    choices: ["Amharic", "Coptic", "Aramaic", "Ge'ez"],
    correctIndex: 3,
    category: CANON,
  },
  // ---- Scripture ----
  {
    question: "Genesis says Enoch \"walked with God, and he was not, for God took him.\" How many years had he lived?",
    choices: ["365", "777", "930", "969"],
    correctIndex: 0,
    category: SCRIPTURE,
  },
  {
    question: "The Ethiopian eunuch baptized by Philip in Acts 8 was treasurer to which queen?",
    choices: ["The Queen of Sheba", "Candace", "Bernice", "Esther"],
    correctIndex: 1,
    category: SCRIPTURE,
  },
  {
    question: "Which prophet was the Ethiopian eunuch reading aloud when Philip ran to his chariot?",
    choices: ["Jeremiah", "Daniel", "Isaiah", "Ezekiel"],
    correctIndex: 2,
    category: SCRIPTURE,
  },
  {
    question: "By what name does Ethiopian tradition know the Queen of Sheba who visited Solomon?",
    choices: ["Makeda", "Bilqis", "Candace", "Tirzah"],
    correctIndex: 0,
    category: SCRIPTURE,
  },
  {
    question: "Enoch's son, the longest-lived man in scripture, was:",
    choices: ["Lamech", "Jared", "Mahalalel", "Methuselah"],
    correctIndex: 3,
    category: SCRIPTURE,
  },
  // ---- Church History ----
  {
    question: "Who became the first bishop of Ethiopia, remembered as Abba Selama, \"Father of Peace\"?",
    choices: ["Athanasius", "Frumentius", "King Ezana", "Lalibela"],
    correctIndex: 1,
    category: HISTORY,
  },
  {
    question: "Ethiopian tradition holds that the Ark of the Covenant rests in which city?",
    choices: ["Lalibela", "Gondar", "Axum", "Addis Ababa"],
    correctIndex: 2,
    category: HISTORY,
  },
  {
    question: "\"Tewahedo,\" the name of the Ethiopian Orthodox faith, means:",
    choices: ["Made one — unified", "The covenant", "Holy fire", "The faithful remnant"],
    correctIndex: 0,
    category: HISTORY,
  },
];

/** Idempotent: inserts only questions whose exact text isn't already present. */
export async function seedEthiopianTrivia() {
  const texts = ETHIOPIAN_QUESTIONS.map((q) => q.question);
  const existing = await db
    .select({ question: triviaQuestions.question })
    .from(triviaQuestions)
    .where(inArray(triviaQuestions.question, texts));
  const have = new Set(existing.map((r) => r.question));
  const missing = ETHIOPIAN_QUESTIONS.filter((q) => !have.has(q.question));

  if (missing.length > 0) {
    await db.insert(triviaQuestions).values(
      missing.map((q) => ({
        question: q.question,
        choices: q.choices as unknown as string[],
        correctIndex: q.correctIndex,
        category: q.category,
      }))
    );
  }
  console.log(`[seed:trivia] ${missing.length} added, ${have.size} already present (${ETHIOPIAN_QUESTIONS.length} total in bank)`);
}
