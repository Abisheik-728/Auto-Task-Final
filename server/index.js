// ============================================================
// server/index.js – Unified Safe Backend System
// Google OAuth + Calendar Sync + Gmail Task Extraction + OCR
// ============================================================

require("dotenv").config({ path: require("path").join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(cors({ origin: process.env.VITE_FRONTEND_URL || "*", credentials: true }));

const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  REDIRECT_URI = process.env.REDIRECT_URI || "http://localhost:3001/auth/google/callback",
  PORT = 3001,
  BACKEND_URL = "http://localhost:3000", // Spring Boot backend
} = process.env;

// ── Persistent token store (survives server restarts) ───────
const TOKENS_FILE = path.join(__dirname, "tokens.json");
const syncStore = new Map();

function loadTokens() {
  try {
    if (fs.existsSync(TOKENS_FILE)) {
      const raw = fs.readFileSync(TOKENS_FILE, "utf-8");
      return new Map(Object.entries(JSON.parse(raw)));
    }
  } catch (e) {
    console.warn("⚠️  Could not load tokens.json:", e.message);
  }
  return new Map();
}

function saveTokens(store) {
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(Object.fromEntries(store), null, 2));
  } catch (e) {
    console.warn("⚠️  Could not save tokens.json:", e.message);
  }
}

const tokenStore = loadTokens();
console.log(`💾 Loaded ${tokenStore.size} saved Google session(s) from disk.`);

// ── Auth helpers ────────────────────────────────────────────
function makeAuthClient(tokens) {
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
  client.setCredentials(tokens);
  client.on("tokens", (newTokens) => {
    const entry = [...tokenStore.entries()].find(([, v]) => v.refresh_token === tokens.refresh_token);
    if (entry) {
      const merged = { ...tokenStore.get(entry[0]), ...newTokens };
      tokenStore.set(entry[0], merged);
      saveTokens(tokenStore); // ← persist after auto-refresh
      console.log(`🔄 Token auto-refreshed and saved for user: ${entry[0]}`);
    }
  });
  return client;
}

function getAuthForUser(userId) {
  const tokens = tokenStore.get(userId);
  if (!tokens) throw new Error("NOT_CONNECTED");
  return makeAuthClient(tokens);
}

// =============================================================
//  OAUTH ENDPOINTS
// =============================================================

app.get("/auth/google/url", (req, res) => {
  const { userId = "default" } = req.query;
  const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
  const authUrl = client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/gmail.readonly",
    ],
    prompt: "consent",
    state: userId,
  });
  res.json({ authUrl });
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, state: userId, error } = req.query;
  if (error || !code) {
    return res.redirect(`http://localhost:8080/calendar-callback?error=${error || "no_code"}`);
  }
  try {
    const client = new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI);
    const { tokens } = await client.getToken(code);
    tokenStore.set(userId || "default", {
      ...tokens,
      expiry_date: tokens.expiry_date || Date.now() + (tokens.expires_in || 3600) * 1000,
    });
    saveTokens(tokenStore); // ← persist to disk immediately
    console.log(`✅ Google connected & saved for user: ${userId}`);
    res.redirect(`http://localhost:8080/calendar-callback?success=true&userId=${userId}`);
  } catch (err) {
    console.error("❌ Auth callback failed:", err.message);
    res.redirect(`http://localhost:8080/calendar-callback?error=token_exchange_failed`);
  }
});

// Check connection status
app.get("/auth/google/status", (req, res) => {
  const { userId = "default" } = req.query;
  res.json({ connected: tokenStore.has(userId) });
});

// Disconnect (revoke in-memory + on disk)
app.post("/auth/google/disconnect", (req, res) => {
  const { userId = "default" } = req.body;
  tokenStore.delete(userId);
  saveTokens(tokenStore);
  res.json({ success: true });
});

// =============================================================
//  COMMON TASK EXTRACTION LOGIC
// =============================================================

const REJECT_PATTERNS = [
  /\b(offer|discount|sale|deal|coupon|buy|price|gift|shopping|promo|limited\s+time)\b/i,
  /\b(newsletter|blog|article|subscribe|digest|read\s+more|weekly|monthly)\b/i,
  /\b(support|ticket|help\s+center|issue|report\b|feedback|customer\s+service)\b/i,
  /\b(verification|verify|login|authorized|security\s+alert|password|sign-in|otp|code\s+is)\b/i,
  /\b(notification|alert|update|system|error|critical|warning|maintenance)\b/i,
  /\b(advertisement|sponsored|marketing|campaign|survey|unheard\s+of)\b/i,
  /click\s+here|visit\s+our\s+website/i,
];

const TASK_KEYWORDS = [
  "assignment", "submit", "submission", "deadline", "exam",
  "test", "lab", "record", "project", "viva", "due", "quiz",
  "homework", "report", "presentation", "seminar", "workshop",
  "practical", "internal", "midterm", "mid-term", "thesis",
];

const NOISE_PATTERNS = [
  /i\s+(am|have|was|will|had)\s+(submitting|submitted|completed|attached|sending|sent|written|uploading|received)/i,
  /please\s+find\s+(attached|enclosed)/i,
  /as\s+per\s+the\s+(deadline|submission|requirement|discussion)/i,
  /^(dear|hello|hi|hey|greetings|regards|thank|thanks|sincerely|yours|warmly|best|attention|fyi|fwd|re)\b/i,
  /thank\s+you|best\s+regards|yours\s+sincerely/i,
  /^[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/m,
  /^.{0,9}$/,
  /note\s+that|please\s+note|kindly\s+note|this\s+is\s+to\s+inform/i,
  /i\s+hope|hope\s+this/i,
];

const ACTION_STARTERS = /^(submit|complete|prepare|finish|upload|send|attend|write|solve|present|deadline|due|last\s+date|academic\s+alert)/i;

const DATE_REGEXES = [
  /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})\b/i,
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})\b/i,
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  /\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/,
  /\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?\b/i,
  /\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\b/i,
  /\b(tomorrow|today|next\s+\w+|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
];

const MONTH_NAMES = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

function toYMD(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseToIsoDate(raw) {
  if (!raw) return null;
  raw = raw.trim();
  const now = new Date(), cy = now.getFullYear();
  let m, mi, d;

  m = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})$/i);
  if (m && (mi = MONTH_NAMES[m[1].toLowerCase()]) !== undefined) return toYMD(new Date(+m[3], mi, +m[2]));
  m = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})$/i);
  if (m && (mi = MONTH_NAMES[m[2].toLowerCase()]) !== undefined) return toYMD(new Date(+m[3], mi, +m[1]));
  m = raw.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (m && (mi = MONTH_NAMES[m[1].toLowerCase()]) !== undefined) { d = new Date(cy, mi, +m[2]); if (d <= now) d.setFullYear(cy + 1); return toYMD(d); }
  m = raw.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)$/i);
  if (m && (mi = MONTH_NAMES[m[2].toLowerCase()]) !== undefined) { d = new Date(cy, mi, +m[1]); if (d <= now) d.setFullYear(cy + 1); return toYMD(d); }
  m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/); if (m) return raw;
  m = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m) return toYMD(new Date(+m[3], +m[2] - 1, +m[1]));
  
  const lower = raw.toLowerCase();
  if (lower === "tomorrow") { d = new Date(now); d.setDate(d.getDate() + 1); return toYMD(d); }
  if (lower === "today") return toYMD(now);
  const days = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
  if (days[lower] !== undefined) {
    d = new Date(now);
    const diff = (days[lower] - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return toYMD(d);
  }
  return null;
}

function scoreLine(line) {
  let score = 0;
  if (ACTION_STARTERS.test(line.trim())) score += 8;
  if (TASK_KEYWORDS.some(k => line.toLowerCase().includes(k))) score += 5;
  for (const regex of DATE_REGEXES) { if (regex.test(line)) { score += 4; break; } }
  if (line.length < 90) score += 2;
  return score;
}

function decodeHTMLEntities(text) {
  if (!text) return "";
  return text
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (m, c) => String.fromCharCode(c));
}

function extractTasksFromText(content, sourceName = "unknown") {
  // STEP 0: CLEAN HTML ENTITIES
  content = decodeHTMLEntities(content);

  // STEP 1 — STRICT EMAIL FILTER (PRE-FILTER)
  const lowerContent = content.toLowerCase();
  const isSuspicious = REJECT_PATTERNS.some(p => p.test(lowerContent));
  const hasAcademicKeyword = TASK_KEYWORDS.some(k => lowerContent.includes(k));

  if (isSuspicious || !hasAcademicKeyword) {
    console.log(`🚫 Email skipped (Subject/Content match rejection pattern or lacks academic keywords)`);
    return [];
  }

  // STEP 2 — CONTENT CLEANING & SPLIT
  const lines = content.split(/[\n.;\r\t]+|\.\s|\?/).map(s => s.trim()).filter(s => s.length > 5);
  
  const candidates = lines.filter(line => {
    if (NOISE_PATTERNS.some(p => p.test(line))) return false;
    return TASK_KEYWORDS.some(k => line.toLowerCase().includes(k));
  });

  if (candidates.length === 0) return [];

  // STEP 3 — TASK IDENTIFICATION
  const sorted = candidates.sort((a, b) => scoreLine(b) - scoreLine(a));
  
  // STEP 5 — VALIDATION (STRICT)
  if (scoreLine(sorted[0]) < 8) return [];
  
  const bestLine = sorted[0];

  // STEP 4 — DATE EXTRACTION
  let deadline = null;
  for (const regex of DATE_REGEXES) {
    const match = bestLine.match(regex);
    if (match) { deadline = parseToIsoDate(match[0]); if (deadline) break; }
  }
  if (!deadline) {
     for (const regex of DATE_REGEXES) {
        const match = content.match(regex);
        if (match) { deadline = parseToIsoDate(match[0]); if (deadline) break; }
     }
  }

  // STEP 6 — FINAL CLEANING & OUTPUT
  let title = bestLine.replace(/^(hi|hello|hey|please|kindly|reminder|fyi|fwd|re|dear|attention)\s*[,:\-]?\s*/gi, "").replace(/https?:\/\/\S+/gi, "").trim();
  for (const regex of DATE_REGEXES) title = title.replace(regex, "").trim();
  title = title.replace(/\s+(by|before|on|until|till|due|at|dated|during|within)\s*$/i, "").trim().replace(/[.!;,:\-]+$/, "").trim();

  if (title.length < 12 || title.includes("Regards") || title.includes("Sincerely")) return [];

  return [{
    title: title.length > 120 ? title.slice(0, 117) + "..." : title,
    deadline: deadline || null,
    source: sourceName
  }];
}

// =============================================================
//  A) MANUAL INPUT API
// =============================================================

app.post("/tasks", async (req, res) => {
  const { title, deadline, source = "manual" } = req.body;
  if (!title) return res.status(400).json({ error: "Title is required." });

  try {
    // If you need to persist to another backend:
    // await axios.post(`${BACKEND_URL}/tasks`, { title, deadline, source });

    console.log(`📋 Manual task created: "${title}" | Due: ${deadline || "none"}`);
    res.json({ success: true, task: { title, deadline, source } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
//  B) GMAIL INTEGRATION
// =============================================================

// Helper to extract plain text body from Gmail payload
function getMessageBody(payload) {
  let body = "";
  if (payload.body && payload.body.data) {
    body = Buffer.from(payload.body.data, "base64").toString("utf-8");
  } else if (payload.parts) {
    for (const part of payload.parts) {
      // Prefer plain text, fall back to html if needed
      if (part.mimeType === "text/plain" && part.body.data) {
        body += Buffer.from(part.body.data, "base64").toString("utf-8");
        break; 
      } else if (part.mimeType === "text/html" && part.body.data) {
        // Simple regex to strip tags
        const html = Buffer.from(part.body.data, "base64").toString("utf-8");
        body += html.replace(/<[^>]*>?/gm, " ");
      } else if (part.parts) {
        body += getMessageBody(part); 
      }
    }
  }
  return body;
}

app.get("/gmail/tasks", async (req, res) => {
  const { userId = "default" } = req.query;
  try {
    const auth = getAuthForUser(userId);
    const gmail = google.gmail({ version: "v1", auth });
    
    // Increased results and smarter query: after:2026/04/01 or just list latest
    const listRes = await gmail.users.messages.list({ 
      userId: "me", 
      q: "category:primary", 
      maxResults: 20 
    });
    const messages = listRes.data.messages || [];

    const allTasks = [];
    console.log(`📩 Scanning ${messages.length} Gmail messages for user: ${userId}`);

    for (const m of messages) {
      try {
        const msg = await gmail.users.messages.get({ userId: "me", id: m.id });
        const subject = msg.data.payload.headers.find(h => h.name === "Subject")?.value || "";
        const body = getMessageBody(msg.data.payload);
        const fullContent = `${subject}\n${body}`;

        // Extraction
        const tasks = extractTasksFromText(fullContent, "gmail");
        if (tasks.length > 0) {
          allTasks.push(...tasks);
        }
      } catch (e) {
        console.warn(`⚠️  Failed to process Gmail message ${m.id}:`, e.message);
      }
    }

    // Deduplicate by title
    const unique = allTasks.filter((v, i, a) => a.findIndex(t => t.title === v.title) === i);
    console.log(`✅ Extracted ${unique.length} task(s) from latest emails.`);
    res.json(unique);
  } catch (err) {
    console.error("❌ Gmail Sync Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
//  C) IMAGE OCR INPUT
// =============================================================

app.post("/extract-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No image uploaded." });

  try {
    console.log(`🖼️ Processing OCR for: ${req.file.originalname}`);
    const { data: { text } } = await Tesseract.recognize(req.file.path, "eng");
    console.log("📝 OCR Text Extracted:", text.slice(0, 50) + "...");

    const tasks = extractTasksFromText(text, "image-ocr");
    res.json({ success: true, tasks });
  } catch (err) {
    console.error("❌ OCR Error:", err.message);
    res.status(500).json({ error: "OCR extraction failed: " + err.message });
  }
});

// =============================================================
//  GOOGLE CALENDAR SYNC
// =============================================================

app.post("/calendar/sync-task", async (req, res) => {
  const { userId = "default", taskId, title, deadline } = req.body;
  if (!title || !deadline) return res.status(400).json({ error: "title and deadline required." });

  try {
    const auth = getAuthForUser(userId);
    const calendar = google.calendar({ version: "v3", auth });
    const startIso = `${deadline}T09:00:00+05:30`;
    const endIso = `${deadline}T10:00:00+05:30`;

    const { data: event } = await calendar.events.insert({
      calendarId: "primary",
      requestBody: {
        summary: title,
        description: "Academic task from BackLog",
        start: { dateTime: startIso, timeZone: "Asia/Kolkata" },
        end: { dateTime: endIso, timeZone: "Asia/Kolkata" },
      },
    });

    console.log(`📅 Calendar Synced: "${title}"`);
    res.json({ success: true, eventId: event.id, link: event.htmlLink });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
app.listen(PORT, () => {
  console.log(`\n🚀 Backend Refactored & Live at http://localhost:${PORT}`);
  console.log(`   Safe Sources: Manual ✅, Gmail ✅, Image OCR ✅`);
  console.log(`   Unsafe Sources: WhatsApp ❌ REMOVED\n`);
});
