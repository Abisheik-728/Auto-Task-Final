// ============================================================
// whatsapp-bot/index.js (DEBUG VERSION)
// ============================================================

"use strict";
require("dotenv").config();

const http    = require("http");
const express = require("express");
const cors    = require("cors");
const { Server: IOServer } = require("socket.io");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fetch   = require("node-fetch");

// ─── Config ──────────────────────────────────────────────────
const WA_PORT            = parseInt(process.env.WA_PORT  || "3002");
const BACKEND_URL        = process.env.BACKEND_URL       || "http://localhost:8081";
const CALENDAR_URL       = process.env.CALENDAR_URL      || "http://localhost:3001";
const CALENDAR_USER_ID   = process.env.CALENDAR_USER_ID  || "default";
const AUTO_CALENDAR_SYNC = process.env.AUTO_CALENDAR_SYNC !== "false";

// ─── Express + Socket.io ─────────────────────────────────────
const app    = express();
const server = http.createServer(app);
const io     = new IOServer(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

app.use(express.json());
app.use(cors());

app.get("/wa/status", (_, res) => res.json({ status: waStatus, connected: waStatus === "connected" }));

app.post("/wa/start", (_, res) => {
  if (waStatus === "connected") return res.json({ ok: true });
  initClient();
  res.json({ ok: true });
});

app.post("/wa/disconnect", async (_, res) => {
  try {
    if (waClient) await waClient.destroy();
    waClient = null;
    waStatus = "disconnected";
    io.emit("wa:status", { status: "disconnected" });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

let waClient = null;
let waStatus = "disconnected";

// ─── API helpers ──────────────────────────────────────────────
async function postTask(task) {
  try {
    console.log("📤 Sending task to backend...");
    const res = await fetch(`${BACKEND_URL}/tasks`, {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ title:task.title, deadline:task.deadline, source:"whatsapp" }),
    });
    if (!res.ok) throw new Error(`Backend returned ${res.status}`);
    const data = await res.json();
    console.log(`✅ Task saved successfully: "${task.title}"`);
    io.emit("wa:task", { title: task.title, deadline: task.deadline, group: task.group });
    return data;
  } catch (e) { 
    console.error("❌ API Error:", e.message);
    return null; 
  }
}

// ─── WhatsApp client factory ──────────────────────────────────
function initClient() {
  if (waClient) { waClient.destroy().catch(()=>{}); waClient = null; }
  waStatus = "initializing";
  io.emit("wa:status", { status: "initializing" });

  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth_v2" }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
      ],
    },
  });

  // Global crash prevention
  process.on("uncaughtException", (err) => {
    console.error("🔥 UNCAUGHT ERROR:", err.message);
    waStatus = "disconnected";
    io.emit("wa:status", { status: "disconnected" });
  });

  waClient.on("qr", (qr) => {
    console.log("📱 QR generated — broadcasting...");
    waStatus = "qr";
    io.emit("wa:qr", qr);
    io.emit("wa:status", { status: "qr" });
  });

  waClient.on("authenticated", () => {
    console.log("WhatsApp Authenticated 🔐");
    waStatus = "authenticated";
    io.emit("wa:status", { status: "authenticated" });
  });

  waClient.on("auth_failure", (msg) => {
    console.error("❌ WhatsApp Auth Failure:", msg);
    waStatus = "disconnected";
    io.emit("wa:status", { status: "disconnected" });
    io.emit("wa:error", { message: "Auth failure: " + msg });
  });

  waClient.on("ready", () => {
    console.log("WhatsApp Connected ✅");
    waStatus = "connected";
    io.emit("wa:connected");
    io.emit("wa:status", { status: "connected" });
  });

  waClient.on("disconnected", (reason) => {
    console.log("WhatsApp Disconnected 🔌", reason);
    waStatus = "disconnected";
    io.emit("wa:status", { status: "disconnected" });
  });

  waClient.on("message", async (msg) => {
    try {
      console.log("MESSAGE RECEIVED:", msg.body);
      const chat = await msg.getChat();
      console.log(`Chat Type: ${chat.isGroup ? "Group" : "Private"} | From: ${chat.name}`);
      const task = {
        title: msg.body.slice(0, 100),
        deadline: new Date().toISOString().split("T")[0],
        group: chat.name
      };
      console.log("TASK CREATED:", task);
      await postTask(task);
    } catch (e) { 
      console.error("❌ Message Listener Error:", e.message); 
    }
  });

  console.log("Starting WhatsApp client initialization...");
  waClient.initialize().catch(e => {
    console.error("Client init error:", e.message);
    waStatus = "disconnected";
    io.emit("wa:status", { status: "disconnected" });
    io.emit("wa:error", { message: "Start failed: " + e.message });
  });
}

io.on("connection", (socket) => {
  console.log(`🔌 Dashboard connected [${socket.id}]`);
  socket.emit("wa:status", { status: waStatus });
  socket.on("wa:start", () => initClient());
  socket.on("disconnect", () => console.log(`🔌 Dashboard left [${socket.id}]`));
});

const fs = require("fs");
if (fs.existsSync("./.wwebjs_auth_v2")) {
  console.log("💾 Found saved session — auto-connecting WhatsApp…");
  initClient();
}

// ─── Start HTTP / Socket server ───────────────────────────────
server.listen(WA_PORT, () => {
  console.log(`\n🚀 WhatsApp Socket server → http://localhost:${WA_PORT}`);
  console.log(`   Backend  : ${BACKEND_URL}`);
  console.log(`   Calendar : ${CALENDAR_URL}\n`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  if (waClient) await waClient.destroy().catch(()=>{});
  server.close(() => process.exit(0));
});
