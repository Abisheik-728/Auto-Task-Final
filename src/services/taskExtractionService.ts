import apiClient from "./api";
import { DEMO_MODE, delay } from "./mock/mockMode";
import { WORK_TYPES } from "@/utils/priorityEngine";

export interface ExtractedTaskData {
  title: string;
  workType: string;
  deadline: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// STRICT date resolution helpers
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, number> = {
  january: 0,  jan: 0,
  february: 1, feb: 1,
  march: 2,    mar: 2,
  april: 3,    apr: 3,
  may: 4,
  june: 5,     jun: 5,
  july: 6,     jul: 6,
  august: 7,   aug: 7,
  september: 8, sep: 8, sept: 8,
  october: 9,  oct: 9,
  november: 10, nov: 10,
  december: 11, dec: 11,
};

/** Return today's date at midnight local time. */
function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Shift a date forward by whole years until it is strictly in the future. */
function ensureFuture(date: Date): Date {
  const now = todayMidnight();
  while (date <= now) {
    date.setFullYear(date.getFullYear() + 1);
  }
  return date;
}

/** Format a Date to YYYY-MM-DD using local time (no UTC offset). */
function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Parse a raw date string found inside one sentence into ISO YYYY-MM-DD.
 *
 * STRICT RULES:
 *  1. Explicit year → always preserved (corrected only if < current year).
 *  2. No year → picks next future occurrence of that month/day.
 *  3. Never outputs past-year defaults (2000, 1970, etc.).
 *  4. Returns null if unparseable.
 */
function resolveStrictDate(raw: string): string | null {
  const nowYear = todayMidnight().getFullYear();
  raw = raw.trim();

  // --- Pattern A: "Month DD YYYY" or "Month DDth, YYYY" ---
  const mA = raw.match(
    /^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i
  );
  if (mA) {
    const monthIdx = MONTH_MAP[mA[1].toLowerCase()];
    const day = parseInt(mA[2], 10);
    const year = parseInt(mA[3], 10);
    if (monthIdx !== undefined) {
      const resolvedYear = year < nowYear ? nowYear : year;
      const d = new Date(resolvedYear, monthIdx, day);
      d.setHours(0, 0, 0, 0);
      return toIso(resolvedYear > nowYear ? d : ensureFuture(d));
    }
  }

  // --- Pattern B: "DD Month YYYY" ---
  const mB = raw.match(
    /^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i
  );
  if (mB) {
    const day = parseInt(mB[1], 10);
    const monthIdx = MONTH_MAP[mB[2].toLowerCase()];
    const year = parseInt(mB[3], 10);
    if (monthIdx !== undefined) {
      const resolvedYear = year < nowYear ? nowYear : year;
      const d = new Date(resolvedYear, monthIdx, day);
      d.setHours(0, 0, 0, 0);
      return toIso(resolvedYear > nowYear ? d : ensureFuture(d));
    }
  }

  // --- Pattern C: "Month DD" (no year) ---
  const mC = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (mC) {
    const monthIdx = MONTH_MAP[mC[1].toLowerCase()];
    const day = parseInt(mC[2], 10);
    if (monthIdx !== undefined) {
      const candidate = new Date(nowYear, monthIdx, day);
      candidate.setHours(0, 0, 0, 0);
      return toIso(ensureFuture(candidate));
    }
  }

  // --- Pattern D: "DD Month" (no year) ---
  const mD = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)$/i);
  if (mD) {
    const day = parseInt(mD[1], 10);
    const monthIdx = MONTH_MAP[mD[2].toLowerCase()];
    if (monthIdx !== undefined) {
      const candidate = new Date(nowYear, monthIdx, day);
      candidate.setHours(0, 0, 0, 0);
      return toIso(ensureFuture(candidate));
    }
  }

  // --- Pattern E: YYYY-MM-DD ---
  const mE = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (mE) {
    const year = parseInt(mE[1], 10);
    const resolvedYear = year < nowYear ? nowYear : year;
    const d = new Date(resolvedYear, parseInt(mE[2], 10) - 1, parseInt(mE[3], 10));
    d.setHours(0, 0, 0, 0);
    return toIso(resolvedYear > nowYear ? d : ensureFuture(d));
  }

  // --- Pattern F: DD/MM/YYYY ---
  const mF = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mF) {
    const day = parseInt(mF[1], 10);
    const month = parseInt(mF[2], 10) - 1;
    const year = parseInt(mF[3], 10);
    const resolvedYear = year < nowYear ? nowYear : year;
    const d = new Date(resolvedYear, month, day);
    d.setHours(0, 0, 0, 0);
    return toIso(resolvedYear > nowYear ? d : ensureFuture(d));
  }

  return null;
}

// ---------------------------------------------------------------------------
// Ordered in-sentence date regexes (explicit year patterns searched first)
// ---------------------------------------------------------------------------
const SENTENCE_DATE_PATTERNS: RegExp[] = [
  // "Month DD YYYY" or "Month DDth, YYYY"
  /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  // "DD Month YYYY"
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\b/i,
  // YYYY-MM-DD
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  // DD/MM/YYYY
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
  // "Month DD" (no year)
  /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  // "DD Month" (no year)
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\b/i,
];

const TYPE_KEYWORDS: Record<string, string> = {
  assignment: "Assignment",
  homework: "Assignment",
  submit: "Assignment",
  submission: "Assignment",
  lab: "Assignment",
  report: "Assignment",
  record: "Assignment",
  exam: "Exam",
  test: "Exam",
  quiz: "Exam",
  project: "Project Review",
  review: "Project Review",
  presentation: "Project Review",
  event: "Event",
  fest: "Event",
  hackathon: "Hackathon",
  hack: "Hackathon",
  seminar: "Seminar",
  workshop: "Seminar",
  lecture: "Seminar",
  internship: "Internship",
  intern: "Internship",
  placement: "Placement",
  recruit: "Placement",
  interview: "Placement",
  meeting: "Meeting",
  meet: "Meeting",
  reminder: "Deadline Reminder",
  deadline: "Deadline Reminder",
  "due date": "Deadline Reminder",
};

// ---------------------------------------------------------------------------
// Strict 6-Step Extraction Pipeline
// ---------------------------------------------------------------------------

// STEP 1: Keywords that qualify a LINE as a candidate
const TASK_KEYWORDS = [
  "assignment", "submit", "submission", "deadline", "exam",
  "test", "lab", "record", "project", "viva", "due", "quiz",
  "homework", "report", "presentation", "seminar", "workshop",
  "practical", "internal", "midterm", "mid-term", "thesis",
];

// STEP 2: Noise patterns — sentences matching any of these are discarded
const NOISE_PATTERNS: RegExp[] = [
  // Explanation / first-person submission statements
  /^i\s+(am|have|was|will|had)\s+(submitting|submitted|completed|attached|sending|sent|written|uploading)/i,
  /please\s+find\s+(attached|enclosed)/i,
  /as\s+per\s+the\s+(deadline|submission|requirement)/i,
  // Greetings / closings
  /^(dear|hello|hi|hey|greetings)\b/i,
  /^(thank\s+you|thanks|regards|sincerely|yours|warm\s+regards|best\s+regards)/i,
  /^(yours\s+(truly|sincerely|faithfully))/i,
  // Signatures: single/double-word lines that look like names/dept
  /^[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/,
  // Very short noise
  /^.{0,7}$/,
  // Acknowledge/note phrases
  /^(note\s+that|please\s+note|kindly\s+note|this\s+is\s+to\s+inform)/i,
  /^(i\s+hope|hope\s+this)/i,
];

// STEP 3: Action-command priority words — sentences starting with these rank higher
const ACTION_STARTERS = /^(submit|complete|prepare|finish|upload|send|attend|write|solve|present|deadline|due|last\s+date)/i;

function hasTaskKeyword(line: string): boolean {
  const l = line.toLowerCase();
  return TASK_KEYWORDS.some(k => l.includes(k));
}

function isNoise(line: string): boolean {
  return NOISE_PATTERNS.some(p => p.test(line.trim()));
}

function scoreCandidate(line: string): number {
  let score = 0;
  if (ACTION_STARTERS.test(line.trim())) score += 3;
  for (const [kw] of Object.entries(TYPE_KEYWORDS)) {
    if (line.toLowerCase().includes(kw)) { score += 1; break; }
  }
  // Has a date → stronger signal
  for (const pat of SENTENCE_DATE_PATTERNS) {
    if (pat.test(line)) { score += 2; break; }
  }
  // Shorter, cleaner lines preferred
  if (line.length < 80) score += 1;
  return score;
}

function buildCleanTitle(raw: string): string | null {
  let t = raw.trim();
  // Remove URLs
  t = t.replace(/https?:\/\/\S+/gi, "").trim();
  // Remove date substrings
  for (const pat of SENTENCE_DATE_PATTERNS) {
    t = t.replace(pat, "").trim();
  }
  // Remove trailing prepositions left by date removal
  t = t.replace(/\s+(by|before|on|until|till|due|at|dated)\s*$/i, "").trim();
  // Remove noise prefixes
  t = t.replace(/^(please|kindly)\s+/i, "").trim();
  // Remove trailing punctuation
  t = t.replace(/[.!;,:\-]+$/, "").trim();
  // Validate length (STEP 5)
  if (t.length < 8 || t.length > 120) return null;
  return t;
}

function extractFromTextDemo(text: string): ExtractedTaskData[] {
  // ── STEP 1: Split into lines/sentences ───────────────────────
  const lines = text
    .split(/[\n.;]+/)
    .map(s => s.trim())
    .filter(s => s.length > 3);

  // ── STEP 2 & 3: Filter + score candidates ────────────────────
  const candidates = lines
    .filter(line => hasTaskKeyword(line))   // STEP 1 — keyword gate
    .filter(line => !isNoise(line));         // STEP 2 — noise removal

  if (candidates.length === 0) return [];

  // ── STEP 3: Pick the SINGLE best candidate ───────────────────
  const best = candidates.reduce((a, b) => scoreCandidate(a) >= scoreCandidate(b) ? a : b);

  // ── STEP 4: Extract deadline from the full text (not just best line) ─
  let deadline: string | null = null;
  const searchIn = [best, ...lines]; // check best line first
  outer: for (const line of searchIn) {
    for (const pat of SENTENCE_DATE_PATTERNS) {
      const m = line.match(pat);
      if (m) {
        const resolved = resolveStrictDate(m[0]);
        if (resolved) { deadline = resolved; break outer; }
      }
    }
  }

  // ── STEP 5: Detect type ───────────────────────────────────────
  let workType = "Assignment";
  const bl = best.toLowerCase();
  for (const [kw, type] of Object.entries(TYPE_KEYWORDS)) {
    if (bl.includes(kw)) { workType = type; break; }
  }

  // ── STEP 6: Build & validate title ───────────────────────────
  // Try cleaned version first; fall back to raw best line
  const cleanedTitle = buildCleanTitle(best);
  const finalTitle = cleanedTitle ?? best.slice(0, 100);

  // STEP 5 validation — reject if no clear action / too short
  if (!finalTitle || finalTitle.length < 8) return [];

  return [{ title: finalTitle, workType, deadline, notes: null }];
}

// ---------------------------------------------------------------------------
// Demo OCR stub
// ---------------------------------------------------------------------------

function extractFromImageDemo(fileName: string): ExtractedTaskData[] {
  return [
    {
      title: `Task extracted from ${fileName}`,
      workType: "Assignment",
      deadline: toIso(ensureFuture(new Date(Date.now() + 5 * 86400000))),
      notes: "Extracted via image OCR processing",
    },
  ];
}

// ---------------------------------------------------------------------------
// Exported service
// ---------------------------------------------------------------------------

export const taskExtractionService = {
  extractFromText: async (text: string): Promise<ExtractedTaskData[]> => {
    if (DEMO_MODE) {
      await delay(800);
      return extractFromTextDemo(text);
    }
    const { data } = await apiClient.post<{ tasks: ExtractedTaskData[] }>("/tasks/extract", { message: text });
    return data.tasks;
  },

  extractFromImage: async (file: File): Promise<ExtractedTaskData[]> => {
    if (DEMO_MODE) {
      await delay(1200);
      return extractFromImageDemo(file.name);
    }
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await apiClient.post<{ tasks: ExtractedTaskData[] }>("/tasks/extract-image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.tasks;
  },

  getWorkTypes: () => [...WORK_TYPES],
};
