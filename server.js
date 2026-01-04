// server.js — Photocall IA (Opción 1: QR fijo a carpeta Drive + progreso por WS)
// Node 18+ (ESM)

import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import QRCode from "qrcode";

// -----------------------------
// CONFIG
// -----------------------------
const PORT = process.env.PORT || 3000;

// QR fijo (tu carpeta)
const DRIVE_FOLDER_URL =
  process.env.DRIVE_FOLDER_URL ||
  "https://drive.google.com/drive/folders/129rHzcKt_iJdfKLS9eim05wiYw_pfpMO";

// Ruta local del QR (sirve un PNG que apunta a la carpeta Drive)
const QR_URL_PATH = "/qr.png";

// Threshold para dar “listo”
const DONE_THRESHOLD = 0.99;

// -----------------------------
// STATE (Jobs in-memory)
// -----------------------------
const jobs = new Map(); // jobId -> { status, progress, createdAt }

// -----------------------------
// EXPRESS + STATIC
// -----------------------------
const app = express();
app.use(express.json());
app.use(express.static("public"));

// Healthcheck
app.get("/health", (req, res) => res.json({ ok: true }));

// -----------------------------
// QR PNG (cached)
// -----------------------------
let qrPngBuffer = null;

async function buildQrOnce() {
  qrPngBuffer = await QRCode.toBuffer(DRIVE_FOLDER_URL, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
  });
  console.log("[QR] Generado /qr.png ->", DRIVE_FOLDER_URL);
}

app.get("/qr.png", async (req, res) => {
  try {
    if (!qrPngBuffer) await buildQrOnce();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(qrPngBuffer);
  } catch (e) {
    console.error("[QR] Error generando qr.png:", e);
    res.status(500).send("QR error");
  }
});

// -----------------------------
// HTTP + WEBSOCKET
// -----------------------------
const server = createServer(app);
const wss = new WebSocketServer({ server });
const clients = new Set();

function broadcast(obj) {
  const payload = JSON.stringify(obj);
  let sent = 0;
  for (const c of clients) {
    if (c.readyState === 1) {
      try {
        c.send(payload);
        sent++;
      } catch { }
    }
  }
  return sent;
}

wss.on("connection", (ws, req) => {
  const ip = req.socket.remoteAddress;
  clients.add(ws);

  ws.send(JSON.stringify({ type: "connected", message: "Conectado al servidor Photocall" }));
  console.log(`[WS] Cliente conectado: ${ip} (total ${clients.size})`);

  ws.on("message", (raw) => {
    let data;
    try {
      data = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "JSON inválido" }));
      return;
    }

    // ---- PROGRESS desde TouchDesigner ----
    if (data.type === "progress") {
      const jobId = data.jobId;
      const p = Math.max(0, Math.min(1, Number(data.progress ?? 0)));

      if (!jobId || !jobs.has(jobId)) {
        // Ignorar progreso huérfano
        return;
      }

      const prev = jobs.get(jobId);
      const nextStatus = p >= DONE_THRESHOLD ? "ready" : "processing";
      const next = { ...prev, status: nextStatus, progress: p };

      jobs.set(jobId, next);

      // Rebroadcast al navegador (y a quien esté conectado)
      broadcast({ type: "progress", jobId, progress: p });

      // Ready: emitir solo cuando cruza el umbral (evita spam)
      if (prev.status !== "ready" && nextStatus === "ready") {
        broadcast({ type: "ready", jobId, url: DRIVE_FOLDER_URL, qrUrl: QR_URL_PATH });
      }
      return;
    }

    // ---- ACK opcional (debug) ----
    if (data.type === "started" || data.type === "cancel") {
      ws.send(JSON.stringify({ type: "ack", received: data }));
      return;
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`[WS] Cliente cerrado: ${ip} (total ${clients.size})`);
  });

  ws.on("error", () => {
    clients.delete(ws);
  });
});

// -----------------------------
// API
// -----------------------------
app.post("/api/capture", (req, res) => {
  const jobId = uuidv4();
  jobs.set(jobId, { status: "pending", progress: 0, createdAt: Date.now() });

  // Avisar a TouchDesigner (y quien esté conectado)
  broadcast({ type: "capture", jobId, countdownSec: 5, ts: Date.now() });

  res.status(202).json({ jobId, countdownSec: 5, qrUrl: QR_URL_PATH, url: DRIVE_FOLDER_URL });
});

// (Debug only) Estado del job
app.get("/api/status/:jobId", (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });
  // Siempre devolvemos también dónde está el QR (fijo) y la carpeta de descarga.
  res.json({ ...job, qrUrl: QR_URL_PATH, url: DRIVE_FOLDER_URL });
});
// -----------------------------
// GC (limpiar jobs viejos)
// -----------------------------
setInterval(() => {
  const now = Date.now();
  const TTL = 60 * 60 * 1000; // 1h
  for (const [jobId, job] of jobs.entries()) {
    if (now - (job.createdAt || now) > TTL) jobs.delete(jobId);
  }
}, 5 * 60 * 1000);

// -----------------------------
// START
// -----------------------------
server.listen(PORT, async () => {
  await buildQrOnce();
  console.log(`HTTP  : http://localhost:${PORT}`);
  console.log(`WS    : ws://localhost:${PORT}`);
});
