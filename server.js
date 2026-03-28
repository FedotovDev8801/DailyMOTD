const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const TYPEFORM_URL = process.env.TYPEFORM_URL || "https://form.typeform.com/to/ixt4TcJo";
const DATA_DIR = path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const MOTDS_FILE = path.join(DATA_DIR, "motds.json");
const SUGGESTIONS_FILE = path.join(DATA_DIR, "suggestions.json");

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ensureFile(filePath, defaultValue) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
  }
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function stableIndex(key, length) {
  if (length <= 0) return 0;
  const hash = crypto.createHash("sha256").update(String(key)).digest();
  let num = 0;
  for (let i = 0; i < 4; i++) num = (num << 8) + hash[i];
  return Math.abs(num) % length;
}

function getDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getMotd(dateStr, type = "") {
  const motds = readJson(MOTDS_FILE, []);
  const filtered = type
    ? motds.filter(m => Array.isArray(m.tags) && m.tags.includes(type))
    : motds;

  if (!filtered.length) {
    return {
      id: "fallback",
      text: "No MOTD available today. Try again tomorrow.",
      author: "Daily MOTD",
      tags: ["fallback"],
      date: dateStr
    };
  }

  const index = stableIndex(dateStr + ":" + type, filtered.length);
  return { ...filtered[index], date: dateStr };
}

function defaultMotds() {
  return [
    { id: 1, text: "You don’t need to be perfect to be useful.", author: "Daily MOTD", tags: ["motivation", "dev"], active: true },
    { id: 2, text: "One small step, then another. Suddenly it’s done.", author: "Daily MOTD", tags: ["motivation"], active: true },
    { id: 3, text: "Bad code can be fixed. Empty files are philosophical.", author: "Daily MOTD", tags: ["funny", "dev"], active: true },
    { id: 4, text: "Don’t compare your draft to someone else's release.", author: "Daily MOTD", tags: ["motivation"], active: true },
    { id: 5, text: "Today's goal: don’t burn out and don’t break production.", author: "Daily MOTD", tags: ["dev", "dark"], active: true },
    { id: 6, text: "If it works - don’t touch it. If it doesn’t - backup first.", author: "Daily MOTD", tags: ["dev", "funny"], active: true }
  ];
}

ensureDir(DATA_DIR);
ensureFile(MOTDS_FILE, defaultMotds());
ensureFile(SUGGESTIONS_FILE, []);

app.get("/api/motd", (req, res) => {
  const date = req.query.date || getDateString();
  const type = (req.query.type || "").toLowerCase();
  res.json(getMotd(date, type));
});

app.get("/api/motd/today", (req, res) => {
  const type = (req.query.type || "").toLowerCase();
  res.json(getMotd(getDateString(), type));
});

app.get("/api/motds", (req, res) => {
  const motds = readJson(MOTDS_FILE, []);
  res.json(motds.filter(m => m.active !== false));
});

app.get("/api/suggest-link", (req, res) => {
  res.json({ url: TYPEFORM_URL });
});

app.post("/api/suggest", (req, res) => {
  const { text, author = "Anonymous", tags = [] } = req.body;

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const suggestions = readJson(SUGGESTIONS_FILE, []);
  const item = {
    id: crypto.randomUUID(),
    text,
    author,
    tags,
    createdAt: new Date().toISOString()
  };

  suggestions.unshift(item);
  writeJson(SUGGESTIONS_FILE, suggestions);

  res.json({ ok: true });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
