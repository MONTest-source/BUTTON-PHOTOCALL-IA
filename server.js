import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// -----------------------------
// CONFIG (ENV VARS)
// -----------------------------
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL; // Ejemplo: https://www.mappingon.es
const DRIVE_PARENT_FOLDER_ID = process.env.DRIVE_PARENT_FOLDER_ID; // Tu ID de carpeta en Google Drive
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const FALLBACK_QR_URL = process.env.FALLBACK_QR_URL || 'https://drive.google.com/drive/folders/129rHzcKt_iJdfKLS9eim05wiYw_pfpMO';

if (!PUBLIC_BASE_URL || !DRIVE_PARENT_FOLDER_ID || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
  console.error('Faltan variables: PUBLIC_BASE_URL, DRIVE_PARENT_FOLDER_ID, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN.');
  process.exit(1);
}

// -----------------------------
// STATE (Jobs)
// -----------------------------
const jobs = new Map(); // jobId -> { status, downloadUrl?, createdAt, error? }

// -----------------------------
// GOOGLE DRIVE (OAuth2 de usuario)
// -----------------------------
let drive;
try {
  const oAuth2 = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    'http://localhost'
  );
  oAuth2.setCredentials({ refresh_token: GOOGLE_REFRESH_TOKEN });
  drive = google.drive({ version: 'v3', auth: oAuth2 });
  console.log('Google Drive (OAuth) autenticado.');
} catch (err) {
  console.error('Error configurando OAuth Drive:', err?.message || err);
  process.exit(1);
}

// -----------------------------
// HELPERS DRIVE
// -----------------------------
async function ensureFolder(driveClient, name, parentId) {
  const q = [
    `'${parentId}' in parents`,
    `name='${name.replace(/'/g, "\\'")}'`,
    "mimeType='application/vnd.google-apps.folder'",
    'trashed=false',
  ].join(' and ');

  const { data } = await driveClient.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 1,
  });

  if (data.files?.length) return data.files[0].id;

  const { data: created } = await driveClient.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  });
  return created.id;
}

async function uploadImageToFolder(driveClient, folderId, filename, buffer, mimeType) {
  const { data } = await driveClient.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: 'id, webContentLink, webViewLink', // Links de Google Drive
  });
  return data;
}

async function makeAnyoneReader(driveClient, fileId) {
  await driveClient.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });
}

// -----------------------------
// EXPRESS + MULTER + STATIC
// -----------------------------
const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg', 'image/png'].includes(file.mimetype);
    cb(ok ? null : new Error('Invalid file type. Only JPEG and PNG are allowed.'), ok);
  },
});

app.use(express.json());
app.use(express.static('public'));

// -----------------------------
// HTTP + WEBSOCKET (TouchDesigner)
// -----------------------------
const server = createServer(app);
const wss = new WebSocketServer({ server });

const touchDesignerClients = new Set();

wss.on('connection', (ws, req) => {
  const ip = req.socket.remoteAddress;
  console.log(`[WS] Conexión desde ${ip}`);
  touchDesignerClients.add(ws);

  ws.send(JSON.stringify({ type: 'connected', message: 'Conectado al servidor Photocall' }));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg.toString());
      if (data?.type === 'progress') {
        const { jobId, progress } = data || {};
        if (!jobId) return;

        const job = jobs.get(jobId);
        if (!job) return;

        const pct = Math.max(0, Math.min(1, Number(progress) || 0));
        const next = { ...job, progress: pct };

        // Si llega a 100%, marca ready y usa URL fallback si no hay aún downloadUrl real.
        if (pct >= 1) {
          next.status = 'ready';
          next.downloadUrl = next.downloadUrl || FALLBACK_QR_URL;
        } else {
          next.status = 'processing';
        }

        jobs.set(jobId, next);

        // Avisar al frontend de los cambios
        broadcastToTouchDesigner({
          type: 'progress',
          jobId,
          progress: pct,
          status: next.status,
          downloadUrl: next.downloadUrl,
        });
      }

      console.log('[WS] Mensaje:', data);
      ws.send(JSON.stringify({ type: 'ack', received: data }));
    } catch (e) {
      console.error('[WS] Error en mensaje:', e);
      ws.send(JSON.stringify({ type: 'error', message: 'Formato no válido' }));
    }
  });

  ws.on('close', () => {
    touchDesignerClients.delete(ws);
    console.log(`[WS] Cliente cerrado (${ip})`);
  });

  ws.on('error', (e) => {
    touchDesignerClients.delete(ws);
    console.error('[WS] Error conexión:', e);
  });
});

// Broadcast a todos los clientes conectados
function broadcastToTouchDesigner(message) {
  const payload = JSON.stringify(message);
  let sent = 0;
  for (const c of touchDesignerClients) {
    if (c.readyState === 1) {
      try { c.send(payload); sent++; } catch (e) { console.error('[WS] Error send:', e); }
    }
  }
  console.log(`[WS] Enviado a ${sent} cliente(s) TD`);
  return sent;
}

// -----------------------------
// API
// -----------------------------
app.post('/api/capture', (req, res) => {
  const jobId = uuidv4();
  jobs.set(jobId, { status: 'pending', createdAt: Date.now() });
  console.log(`[${jobId}] Job creado.`);

  const msg = { type: 'capture', jobId, timestamp: Date.now(), countdownSec: 5 };
  const notified = broadcastToTouchDesigner(msg);
  if (notified === 0) console.warn(`[${jobId}] Sin clientes TouchDesigner conectados.`);

  res.status(202).json({ jobId, countdownSec: 5 });
});

app.post('/api/upload/:jobId', upload.single('file'), async (req, res) => {
  const { jobId } = req.params;

  if (!jobs.has(jobId)) return res.status(404).json({ error: 'Job not found' });
  if (!req.file) return res.status(400).json({ error: 'File is required' });

  console.log(`[${jobId}] Imagen recibida (${req.file.mimetype}). Subiendo a Drive...`);

  try {
    const now = new Date();
    const yyyy = `${now.getFullYear()}`;
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');

    const yearId = await ensureFolder(drive, yyyy, DRIVE_PARENT_FOLDER_ID);
    const monthId = await ensureFolder(drive, mm, yearId);
    const dayId = await ensureFolder(drive, dd, monthId);
    const jobFolderId = await ensureFolder(drive, jobId, dayId);

    const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
    const filename = `final.${ext}`;

    const file = await uploadImageToFolder(
      drive,
      jobFolderId,
      filename,
      req.file.buffer,
      req.file.mimetype
    );

    await makeAnyoneReader(drive, file.id);

    const prev = jobs.get(jobId) || {};
    jobs.set(jobId, {
      ...prev,
      status: 'ready',
      progress: 1,
      downloadUrl: file.webViewLink || file.webContentLink,
      driveFileId: file.id,
      createdAt: prev.createdAt,
    });

    console.log(`[${jobId}] Subida OK. URL: ${file.webViewLink || file.webContentLink}`);
    res.json({ ok: true });
  } catch (error) {
    console.error(`[${jobId}] Error subida Drive:`, error);
    jobs.set(jobId, { status: 'failed', error: error.message, createdAt: jobs.get(jobId).createdAt });
    const msg = (error.code && error.errors)
      ? 'Error con el servicio de almacenamiento. Revisa configuración.'
      : 'No se pudo subir la foto (error interno).';
    res.status(500).json({ error: msg });
  }
});

app.get('/api/status/:jobId', async (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  if (job.status === 'pending') return res.json({ status: 'pending' });

  if (job.status === 'ready') {
    const redirectUrl = `${PUBLIC_BASE_URL}/d/${jobId}`;
    try {
      const qrPngDataUrl = await QRCode.toDataURL(redirectUrl, {
        errorCorrectionLevel: 'H',
        margin: 2,
        width: 280,
      });
      return res.json({
        status: 'ready',
        qrPngDataUrl,
        redirectUrl,
        progress: job.progress ?? 1,
      });
    } catch (e) {
      console.error(`[${jobId}] Error generando QR:`, e);
      return res.status(500).json({ error: 'Could not generate QR code' });
    }
  }

  return res.json({ status: job.status, error: job.error, progress: job.progress ?? 0 });
});

app.get('/d/:jobId', (req, res) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);
  if (job && job.status === 'ready' && job.downloadUrl) {
    console.log(`[${jobId}] Redirect -> ${job.downloadUrl}`);
    return res.redirect(302, job.downloadUrl);
  }
  return res.status(404).send('<h1>Foto no encontrada o no está lista.</h1>');
});

// -----------------------------
// GC de jobs
// -----------------------------
setInterval(() => {
  const now = Date.now();
  const TTL = 60 * 60 * 1000; // 1 hora
  for (const [jobId, job] of jobs.entries()) {
    if (now - (job.createdAt || now) > TTL) {
      jobs.delete(jobId);
      console.log(`[${jobId}] Job limpiado de memoria.`);
    }
  }
}, 5 * 60 * 1000);

// -----------------------------
// START
// -----------------------------
server.listen(PORT, () => {
  console.log(`HTTP  : http://localhost:${PORT}`);
  console.log(`WS    : ws://localhost:${PORT}`);
});
