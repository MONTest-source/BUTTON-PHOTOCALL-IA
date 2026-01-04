# Photocall Interactivo con Google Drive

Este proyecto implementa un sistema de photocall para eventos que permite a los usuarios capturar una foto (generada por un sistema externo como TouchDesigner), subirla a Google Drive y obtener un código QR para su descarga inmediata.

## ✨ Características Principales

- **Interfaz Minimal-Futurista**: Diseño dark con acentos neón (cian y magenta)
- **Animaciones Dinámicas**: 
  - Olas animadas en el fondo (vista 3D desde arriba)
  - Murciélagos con glow neón que aparecen en momentos clave
  - Animación especial cuando aparece el QR
  - Animación de reinicio visualmente impactante
- **Spinner de Carga**: Círculo de carga animado después del countdown
- **Prototipo Frontend-Only**: Funciona sin backend para pruebas rápidas
- **Accesibilidad**: Diseño accesible con soporte para lectores de pantalla
- **Responsive**: Optimizado para tablet (1024×768, horizontal)

## Arquitectura

El sistema se compone de tres partes principales:

1.  **Frontend (Tablet)**: Una página web simple y accesible que controla el flujo de captura.
2.  **Backend (Node.js/Express)**: Un servidor que gestiona los trabajos, la subida de archivos a Google Drive y la generación de códigos QR.
3.  **Sistema de Generación de Imagen (Externo)**: Un software como TouchDesigner o ComfyUI que genera la imagen y la envía al backend.

```ascii
          +----------------+      1. POST /api/capture     +-----------------+
          | Frontend/Tablet| ----------------------------> | Backend (Node.js)|
          +----------------+                               +-----------------+
                  |                                                  | 2. Crea JobID
                  | 3. Inicia cuenta atrás                           |
                  |                                                  |
          +---------------------+   4. Genera JPG y POST     +-----------------+
          | TouchDesigner/ComfyUI | ---- /api/upload/:jobId --> | Backend (Node.js)|
          +---------------------+                              +-----------------+
                  |                                                  | 5. Sube a GDrive
                  |                                                  | 6. Marca Job 'ready'
          +----------------+      7. GET /api/status/:jobId  +-----------------+
          | Frontend/Tablet| ----------------------------> | Backend (Node.js)|
          +----------------+      <-- 8. {status:'ready', qr} +-----------------+
                  |
                  | 9. Muestra QR
                  |
           +-------------+     10. Escanea QR (GET /d/:jobId)
           | Móvil Usuario | --------------------------------> Redirección a Google Drive
           +-------------+
```

## Requisitos Previos

-   Node.js v18 o superior.
-   Una cuenta de Google y un proyecto en Google Cloud Platform.
-   Credenciales de una **Cuenta de Servicio (Service Account)** de Google Cloud con la API de Google Drive habilitada.
-   Software de generación de imagen (ej. TouchDesigner) capaz de realizar peticiones HTTP POST.

## Despliegue en Render

Para desplegar el servidor en Render, consulta la guía completa en [`RENDER-DEPLOY.md`](RENDER-DEPLOY.md).

### Resumen Rápido:
1. Conecta tu repositorio a Render
2. Crea un nuevo Web Service
3. Configura las variables de entorno:
   - `PUBLIC_BASE_URL`: URL pública de tu servicio
   - `DRIVE_PARENT_FOLDER_ID`: ID de carpeta en Google Drive
   - `GOOGLE_CREDENTIALS`: JSON completo de credenciales
4. Despliega

## Instalación Local

1.  **Clonar el repositorio:**
    ```bash
    git clone <url-del-repositorio>
    cd photocall-backend
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno:**
    Crea un archivo `.env` en la raíz del proyecto con el siguiente contenido:

    ```env
    # URL pública donde correrá el servicio (para desarrollo local puede ser http://localhost:3000)
    PUBLIC_BASE_URL=http://localhost:3000

    # ID de la carpeta raíz "Photocall" en tu Google Drive
    DRIVE_PARENT_FOLDER_ID=<ID_DE_LA_CARPETA_DE_GOOGLE_DRIVE>

    # Contenido completo del archivo JSON de credenciales de la Service Account
    GOOGLE_CREDENTIALS='{"type": "service_account", "project_id": "...", ...}'
    ```
    > **Importante**: El valor de `GOOGLE_CREDENTIALS` debe ser el contenido del JSON en una sola línea.

4.  **Iniciar el servidor:**
    ```bash
    npm start
    ```
    El servidor se iniciará en `http://localhost:3000`.

> **Nota**: En producción (Render), el servidor iniciará automáticamente con `npm start` en el puerto especificado por la variable de entorno `PORT`.

## API Endpoints

-   `POST /api/capture`
    -   Inicia un nuevo trabajo de photocall.
    -   **Respuesta (202 Accepted):** `{ "jobId": "...", "countdownSec": 10 }`

-   `POST /api/upload/:jobId`
    -   Sube la imagen. Debe ser una petición `multipart/form-data` con un campo `file`.
    -   **Respuesta (200 OK):** `{ "ok": true }`
    -   **Respuesta (404 Not Found):** Si el `jobId` no existe.

-   `GET /api/status/:jobId`
    -   Consulta el estado de un trabajo.
    -   **Respuesta (200 OK):**
        -   Si pendiente: `{ "status": "pending" }`
        -   Si listo: `{ "status": "ready", "qrPngDataUrl": "data:image/png;base64,...", "redirectUrl": "..." }`
    -   **Respuesta (404 Not Found):** Si el `jobId` no existe.

-   `GET /d/:jobId`
    -   Redirige al usuario al archivo en Google Drive.
    -   **Respuesta (302 Found):** Redirección a la `webViewLink` del archivo.

## Flujo de Evento (Resumen)

1.  **Tablet**: El usuario pulsa "CAPTURAR". Se llama a `POST /api/capture` y se obtiene un `jobId`. Comienza una cuenta atrás (configurada a 5 s).
2.  **Generador de Imagen (TouchDesigner/ComfyTD)**: Durante/tras la cuenta atrás, genera la imagen final.
3.  **Generador de Imagen**: Al terminar, sube la imagen con `POST /api/upload/:jobId`.
4.  **(Opcional) Progreso**: TouchDesigner puede enviar `{"type":"progress","jobId","progress":0..1}` por WebSocket; el backend refleja `status=processing` y `progress`.
5.  **Tablet**: Tras la cuenta atrás, aparece spinner y empieza a consultar `GET /api/status/:jobId` cada segundo.
6.  **Tablet**: Cuando el estado es `ready`, recibe `qrPngDataUrl` y lo muestra con animación; el QR apunta a `/d/:jobId` (redirect a Drive).
7.  **Móvil del Usuario**: Escanea el QR y descarga la foto desde Drive.
8.  **Reseteo**: Después de 30 s, la app se reinicia con la animación de reset.

### Flujo TouchDesigner + ComfyTD (sin Button COMP)

**Objetivo**: Recibir `capture`, disparar `Generate/Regenerate`, detectar fin con `uiprogress` y guardar 1 frame con `moviefileout1.par.record` (sin `button1.click()`).

- **Nodos mínimos**:
  - Trigger: `websocket2` + `websocket2_callbacks` recibe `{type:"capture", jobId:"..."}`
  - Progreso: `par1` (lee `uiprogress` de `ComfyTD`) → `select1` → `logic1` (threshold ~0.99) → `chopexec_progress` (envía progreso por WS)
  - Fin/guardado: `chopexec1` (onOffToOn de `logic1`) arma ruta, pone `moviefileout1.par.record = 1`, y suelta tras 1–2 frames
  - TOP final: `null2` → `moviefileout1`

- **Callback WS (websocket2_callbacks)**:
```python
def onReceiveText(dat, rowIndex, message):
    import json
    try:
        data = json.loads(message)
        if data.get('type') != 'capture':
            return
        jobId = data.get('jobId')
        if not jobId:
            print('[TD] WS sin jobId, ignorando')
            return
        root = op('/project1')
        root.store('pending_job', jobId)
        root.store('armed', True)
        root.store('saved', False)
        # reset de throttle de progreso
        root.store('last_prog_t', 0.0)
        root.store('last_prog_p', -1.0)
        comfy = op('ComfyTD')
        if comfy is not None:
            if hasattr(comfy.par, 'Generate'):
                comfy.par.Generate.pulse()
            elif hasattr(comfy.par, 'Regenerate'):
                comfy.par.Regenerate.pulse()
        print(f'[TD] Job {jobId} → Generando...')
    except Exception as e:
        print('onReceiveText ERROR:', e)
```

- **Progreso (chopexec_progress)**:
```python
def onValueChange(channel, sampleIndex, val, prev):
    import json, time
    root = op('/project1')
    if not root.fetch('armed', False):
        return
    jobId = root.fetch('pending_job', None)
    if not jobId:
        return
    p = max(0.0, min(1.0, float(val)))
    now = time.time()
    last_t = root.fetch('last_prog_t', 0.0)
    last_p = root.fetch('last_prog_p', -1.0)
    if (now - last_t) < 0.10 and abs(p - last_p) < 0.02:
        return
    root.store('last_prog_t', now)
    root.store('last_prog_p', p)
    ws = op('websocket2')
    if ws is None:
        return
    ws.sendText(json.dumps({
        "type": "progress",
        "jobId": jobId,
        "progress": p
    }))
```

> Nota: Ajusta el nombre del WebSocket DAT (`websocket2` en el ejemplo) si difiere en tu red.

## Animaciones y Efectos Visuales

### Animación de Fondo (Olas)
- Olas animadas con perspectiva 3D (vista desde arriba)
- Efecto de profundidad con gradientes radiales
- Animación continua e independiente

### Murciélagos con Glow Neón
- Aparecen en dos momentos específicos:
  - Al hacer clic en "CAPTURAR"
  - Cuando aparece el QR
- Silueta negra sólida con glow neón cian
- Se dispersan y desaparecen automáticamente

### Animación del QR
Cuando aparece el QR:
- Efecto de pulso y zoom
- Glow neón intenso (cian y magenta)
- Ondas concéntricas que se expanden
- Rotación sutil durante la aparición

### Animación de Reinicio
Cuando la aplicación se reinicia:
- Flash de overlay neón
- Círculo expansivo desde el centro
- Barrido horizontal con gradiente neón
- Mensaje "REINICIANDO..." con efecto de zoom
- Murciélagos dispersándose

### Spinner de Carga
- Triple anillo giratorio (cian y magenta)
- Glow pulsante en el centro
- Aparece después del countdown
- Se oculta cuando aparece el QR

## Estructura en Google Drive

Los archivos se organizan automáticamente en la carpeta principal definida en `DRIVE_PARENT_FOLDER_ID` con la siguiente estructura:

```
/Photocall (Carpeta Raíz)
  └── /2024
      └── /07
          └── /26
              └── /{jobId}
                  └── final.jpg
```

## Resolución de Problemas

-   **Error de autenticación con Google Drive**:
    -   Verifica que la variable `GOOGLE_CREDENTIALS` contiene el JSON completo y válido.
    -   Asegúrate de que has compartido la carpeta raíz de "Photocall" con el email de la cuenta de servicio (`...gserviceaccount.com`) dándole permisos de **Editor**.
    -   Comprueba que la API de Google Drive está habilitada en tu proyecto de Google Cloud.

-   **El QR no aparece**:
    -   Revisa los logs del servidor para ver si hay errores durante la subida del archivo.
    -   Asegúrate de que el sistema generador de imágenes está llamando correctamente a `/api/upload/:jobId`.
    -   Verifica que la variable `PUBLIC_BASE_URL` es correcta y accesible desde la red.

-   **Las animaciones no funcionan**:
    -   Verifica que estás usando un navegador moderno (Chrome, Firefox, Edge)
    -   Asegúrate de que JavaScript está habilitado
    -   Revisa la consola del navegador para errores

## Documentación Adicional

- `RENDER-DEPLOY.md` - Guía completa para desplegar en Render
