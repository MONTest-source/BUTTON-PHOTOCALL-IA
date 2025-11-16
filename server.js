import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { google } from 'googleapis';
import { Readable } from 'stream';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

// --- CONFIGURACIÓN ---
const PORT = process.env.PORT || 3000;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL;
const DRIVE_PARENT_FOLDER_ID = process.env.DRIVE_PARENT_FOLDER_ID;
const GOOGLE_CREDENTIALS_JSON = process.env.GOOGLE_CREDENTIALS;

if (!PUBLIC_BASE_URL || !DRIVE_PARENT_FOLDER_ID || !GOOGLE_CREDENTIALS_JSON) {
  console.error("Faltan variables de entorno críticas. Revisa PUBLIC_BASE_URL, DRIVE_PARENT_FOLDER_ID, y GOOGLE_CREDENTIALS.");
  process.exit(1);
}

// --- ALMACÉN EN MEMORIA ---
// Para un entorno de producción real y escalable, considera usar Redis.
// Este Map almacena el estado de cada trabajo (job).
const jobs = new Map();

// --- CLIENTE DE GOOGLE DRIVE ---
let drive;
try {
    const credentials = JSON.parse(GOOGLE_CREDENTIALS_JSON);
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive'],
    });
    const authClient = await auth.getClient();
    drive = google.drive({ version: 'v3', auth: authClient });
    console.log("Cliente de Google Drive autenticado correctamente.");
} catch (error) {
    console.error("Error al autenticar con Google Drive. Verifica las credenciales:", error.message);
    process.exit(1);
}


// --- HELPERS DE GOOGLE DRIVE ---

/**
 * Busca o crea una carpeta dentro de una carpeta padre y devuelve su ID.
 * @param {object} drive - Instancia del cliente de Google Drive API.
 * @param {string} name - Nombre de la carpeta a buscar o crear.
 * @param {string} parentId - ID de la carpeta padre.
 * @returns {Promise<string>} ID de la carpeta.
 */
async function ensureFolder(drive, name, parentId) {
    const query = `'${parentId}' in parents and name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    try {
        const res = await drive.files.list({ q: query, fields: 'files(id, name)', pageSize: 1 });
        if (res.data.files.length > 0) {
            return res.data.files[0].id;
        } else {
            const fileMetadata = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            };
            const folder = await drive.files.create({
                resource: fileMetadata,
                fields: 'id',
            });
            return folder.data.id;
        }
    } catch (error) {
        console.error(`Error en ensureFolder (name=${name}, parentId=${parentId}):`, error.message);
        throw error;
    }
}

/**
 * Sube un archivo de imagen a una carpeta específica en Google Drive.
 * @param {object} drive - Instancia del cliente de Google Drive API.
 * @param {string} folderId - ID de la carpeta destino.
 * @param {string} filename - Nombre del archivo a crear.
 * @param {Buffer} buffer - Buffer de datos del archivo.
 * @param {string} mimeType - El tipo MIME de la imagen (ej. 'image/jpeg', 'image/png').
 * @returns {Promise<object>} Objeto del archivo creado en Drive.
 */
async function uploadImageToFolder(drive, folderId, filename, buffer, mimeType) {
    const fileMetadata = {
        name: filename,
        parents: [folderId],
    };
    const media = {
        mimeType: mimeType,
        body: Readable.from(buffer),
    };
    try {
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webContentLink, webViewLink',
        });
        return file.data;
    } catch (error) {
        console.error(`Error en uploadImageToFolder (filename=${filename}, folderId=${folderId}):`, error.message);
        throw error;
    }
}

/**
 * Asigna permiso de lectura público ("anyone") a un archivo en Drive.
 * @param {object} drive - Instancia del cliente de Google Drive API.
 * @param {string} fileId - ID del archivo.
 */
async function makeAnyoneReader(drive, fileId) {
    try {
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });
    } catch (error) {
        console.error(`Error en makeAnyoneReader (fileId=${fileId}):`, error.message);
        throw error;
    }
}


// --- CONFIGURACIÓN DE EXPRESS ---
const app = express();
const upload = multer({ 
    storage: multer.memoryStorage(), // Usar memoria para no tocar el disco efímero
    limits: { fileSize: 10 * 1024 * 1024 }, // Límite de 10 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/png'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
        }
    }
});

app.use(express.json());
app.use(express.static('public')); // Servir el frontend desde la carpeta 'public'

// --- SERVIDOR HTTP PARA WEBSOCKET ---
const server = createServer(app);

// --- SERVIDOR WEBSOCKET PARA TOUCHDESIGNER ---
const wss = new WebSocketServer({ server });

// Almacén de conexiones WebSocket (TouchDesigner clients)
const touchDesignerClients = new Set();

wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress;
    console.log(`[WebSocket] Nueva conexión desde ${clientIp}`);
    touchDesignerClients.add(ws);

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
        type: 'connected',
        message: 'Conectado al servidor Photocall'
    }));

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());
            console.log(`[WebSocket] Mensaje recibido:`, data);
            
            // Responder con confirmación
            ws.send(JSON.stringify({
                type: 'ack',
                received: data
            }));
        } catch (error) {
            console.error(`[WebSocket] Error al procesar mensaje:`, error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Error al procesar mensaje'
            }));
        }
    });

    ws.on('close', () => {
        console.log(`[WebSocket] Cliente desconectado: ${clientIp}`);
        touchDesignerClients.delete(ws);
    });

    ws.on('error', (error) => {
        console.error(`[WebSocket] Error en conexión:`, error);
        touchDesignerClients.delete(ws);
    });
});

/**
 * Función para enviar mensaje a todos los clientes TouchDesigner conectados
 * @param {object} message - Objeto con el mensaje a enviar
 */
function broadcastToTouchDesigner(message) {
    const messageStr = JSON.stringify(message);
    let sentCount = 0;
    
    touchDesignerClients.forEach((client) => {
        if (client.readyState === 1) { // WebSocket.OPEN
            try {
                client.send(messageStr);
                sentCount++;
            } catch (error) {
                console.error(`[WebSocket] Error al enviar mensaje:`, error);
            }
        }
    });
    
    console.log(`[WebSocket] Mensaje enviado a ${sentCount} cliente(s) TouchDesigner`);
    return sentCount;
}


// --- ENDPOINTS DE LA API ---

/**
 * F1: Inicia el proceso de captura.
 * Crea un ID de trabajo y lo devuelve junto con la cuenta atrás.
 * También envía un mensaje WebSocket a TouchDesigner para iniciar la captura.
 */
app.post('/api/capture', (req, res) => {
    const jobId = uuidv4();
    jobs.set(jobId, { status: 'pending', createdAt: Date.now() });
    console.log(`[${jobId}] Creado nuevo job.`);
    
    // Enviar mensaje WebSocket a TouchDesigner
    const captureMessage = {
        type: 'capture',
        jobId: jobId,
        timestamp: Date.now(),
        countdownSec: 10
    };
    
    const clientsNotified = broadcastToTouchDesigner(captureMessage);
    
    if (clientsNotified === 0) {
        console.warn(`[${jobId}] Advertencia: No hay clientes TouchDesigner conectados.`);
    }
    
    res.status(202).json({ jobId, countdownSec: 10 });
});

/**
 * F2: Sube la imagen generada asociada a un jobId.
 * Recibe un multipart/form-data con el campo 'file'. Acepta JPG y PNG.
 */
app.post('/api/upload/:jobId', upload.single('file'), async (req, res) => {
    const { jobId } = req.params;
    if (!jobs.has(jobId)) {
        console.warn(`[${jobId}] Intento de subida para job inexistente.`);
        return res.status(404).json({ error: 'Job not found' });
    }
    if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
    }

    console.log(`[${jobId}] Recibida imagen (${req.file.mimetype}). Procesando subida a Drive...`);

    try {
        const now = new Date();
        const year = now.getFullYear().toString();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');

        // 1. Asegurar estructura de carpetas: YYYY/MM/DD/{jobId}
        const yearFolderId = await ensureFolder(drive, year, DRIVE_PARENT_FOLDER_ID);
        const monthFolderId = await ensureFolder(drive, month, yearFolderId);
        const dayFolderId = await ensureFolder(drive, day, monthFolderId);
        const jobFolderId = await ensureFolder(drive, jobId, dayFolderId);

        // Determinar extensión y nombre del archivo
        const extension = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
        const filename = `final.${extension}`;

        // 2. Subir el archivo
        const file = await uploadImageToFolder(drive, jobFolderId, filename, req.file.buffer, req.file.mimetype);

        // 3. Hacerlo público
        await makeAnyoneReader(drive, file.id);

        // 4. Actualizar el estado del job
        jobs.set(jobId, { 
            status: 'ready', 
            // Usamos webViewLink porque webContentLink puede tener restricciones de descarga directa.
            // webViewLink es más robusto para visualización.
            downloadUrl: file.webViewLink || file.webContentLink,
            createdAt: jobs.get(jobId).createdAt
        });

        console.log(`[${jobId}] Subida completada. URL: ${file.webViewLink}`);
        res.status(200).json({ ok: true });

    } catch (error) {
        // Logueo del error completo para depuración interna
        console.error(`[${jobId}] Error crítico durante la subida a Drive:`, error);
        
        // Marcar el job como fallido con el mensaje de error original
        jobs.set(jobId, { 
            status: 'failed', 
            error: error.message, 
            createdAt: jobs.get(jobId).createdAt 
        });

        // Determinar un mensaje de error más informativo pero seguro para el cliente
        let clientErrorMessage = 'No se pudo subir la foto debido a un error interno.';
        // Los errores de googleapis suelen tener `code` y `errors`
        if (error.code && error.errors) {
            console.error(`[${jobId}] Detalles del error de Google API:`, error.errors);
            clientErrorMessage = 'Hubo un problema de comunicación con el servicio de almacenamiento. Por favor, verifica la configuración.';
        }
        
        res.status(500).json({ error: clientErrorMessage });
    }
});

/**
 * F3: Consulta el estado de un job.
 * Devuelve 'pending' o 'ready' con la URL del QR.
 */
app.get('/api/status/:jobId', async (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'pending') {
        res.status(200).json({ status: 'pending' });
    } else if (job.status === 'ready') {
        const redirectUrl = `${PUBLIC_BASE_URL}/d/${jobId}`;
        try {
            const qrPngDataUrl = await QRCode.toDataURL(redirectUrl, {
                errorCorrectionLevel: 'H',
                margin: 2,
                width: 280
            });
            res.status(200).json({ status: 'ready', qrPngDataUrl, redirectUrl });
        } catch (err) {
            console.error(`[${jobId}] Error al generar QR:`, err);
            res.status(500).json({ error: 'Could not generate QR code' });
        }
    } else {
        // Podríamos manejar estados 'failed'
        res.status(200).json({ status: job.status, error: job.error });
    }
});

/**
 * F4: Redirección al enlace de descarga de la foto.
 */
app.get('/d/:jobId', (req, res) => {
    const { jobId } = req.params;
    const job = jobs.get(jobId);

    if (job && job.status === 'ready' && job.downloadUrl) {
        console.log(`[${jobId}] Redirigiendo a ${job.downloadUrl}`);
        res.redirect(302, job.downloadUrl);
    } else {
        res.status(404).send('<h1>Foto no encontrada o no está lista.</h1>');
    }
});

// Limpieza de jobs viejos para evitar consumo de memoria
setInterval(() => {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    for (const [jobId, job] of jobs.entries()) {
        if (now - job.createdAt > oneHour) {
            jobs.delete(jobId);
            console.log(`[${jobId}] Job antiguo eliminado de la memoria.`);
        }
    }
}, 5 * 60 * 1000); // Cada 5 minutos

// --- INICIO DEL SERVIDOR ---
server.listen(PORT, () => {
    console.log(`Servidor Photocall escuchando en http://localhost:${PORT}`);
    console.log(`WebSocket Server disponible en ws://localhost:${PORT}`);
});