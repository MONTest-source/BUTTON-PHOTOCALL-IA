# Configuración en Render - Guía Rápida

## Configuración del Servicio Web

Cuando crees el servicio en Render, usa estos valores:

### Configuración Básica

| Campo | Valor |
|-------|-------|
| **Name** | `photocall-backend` (o el nombre que prefieras) |
| **Environment** | `Node` |
| **Region** | Elige la más cercana a tus usuarios |
| **Branch** | `main` (o la rama que uses) |
| **Root Directory** | (dejar vacío - raíz del proyecto) |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Plan** | `Free` (o el plan que prefieras) |

### Variables de Entorno (Environment Variables)

Ve a la sección **"Environment"** y añade estas 3 variables:

#### 1. `PUBLIC_BASE_URL`
- **Valor**: La URL que Render te dará después del despliegue
- **Formato**: `https://tu-servicio.onrender.com`
- **Ejemplo**: `https://photocall-backend.onrender.com`
- ⚠️ **IMPORTANTE**: 
  - Sin barra final (`/`)
  - Usa `https://`
  
- **¿Qué poner si aún no conoces la URL?**
  - **Opción 1 (Recomendada)**: Usa el nombre que pusiste en "Name":
    ```
    https://photocall-backend.onrender.com
    ```
    (Reemplaza `photocall-backend` con el nombre que pusiste en Render)
  
  - **Opción 2**: Usa un placeholder temporal:
    ```
    https://placeholder.onrender.com
    ```
    Luego, después del primer despliegue:
    1. Copia la URL real que Render te dé (ej: `https://photocall-backend-abc123.onrender.com`)
    2. Ve a "Environment" → Edita `PUBLIC_BASE_URL`
    3. Pega la URL real
    4. Guarda (Render reiniciará automáticamente)

#### 2. `DRIVE_PARENT_FOLDER_ID`
- **Valor**: ID de la carpeta en Google Drive
- **Cómo obtenerlo**:
  1. Abre Google Drive
  2. Abre la carpeta donde quieres guardar las fotos
  3. Copia el ID de la URL:
     ```
     https://drive.google.com/drive/folders/1ABC123xyz... ← ESTE ES EL ID
     ```
- **Ejemplo**: `1ABC123xyz456DEF789ghi012JKL345mno`

#### 3. `GOOGLE_CREDENTIALS`
- **Valor**: Contenido completo del archivo JSON de credenciales
- **Formato**: Todo el JSON en una sola línea
- **Cómo obtenerlo**:
  1. Abre el archivo JSON de credenciales que descargaste de Google Cloud
  2. Copia TODO el contenido
  3. Conviértelo a una sola línea (sin saltos de línea)
  4. Pégalo en Render

- **Ejemplo de formato**:
```json
{"type":"service_account","project_id":"mi-proyecto-123","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"mi-servicio@mi-proyecto-123.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/mi-servicio%40mi-proyecto-123.iam.gserviceaccount.com"}
```

- ⚠️ **IMPORTANTE**: 
  - Debe ser JSON válido
  - En una sola línea
  - Con todos los campos del archivo original
  - Los `\n` dentro de `private_key` deben mantenerse

### Variables Automáticas (No configurar manualmente)

Render configura automáticamente:
- `NODE_ENV` = `production`
- `PORT` = (puerto asignado automáticamente)

## Pasos en Render Dashboard

1. **Crear Servicio**:
   - Dashboard → "New +" → "Web Service"
   - Conecta tu repositorio Git

2. **Configuración Básica**:
   - Name: `photocall-backend`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

3. **Variables de Entorno**:
   - Ve a la pestaña "Environment"
   - Añade las 3 variables requeridas
   - Guarda

4. **Desplegar**:
   - Click en "Create Web Service"
   - Render comenzará el despliegue automáticamente

5. **Obtener URL**:
   - Una vez desplegado, Render te dará una URL como:
     `https://photocall-backend-xxxx.onrender.com`
   - **Actualiza** `PUBLIC_BASE_URL` con esta URL exacta

## Verificación

Después del despliegue:

1. ✅ Visita la URL de tu servicio
2. ✅ Deberías ver la interfaz de Photocall
3. ✅ Revisa los logs en Render para verificar que no hay errores
4. ✅ Prueba hacer una captura para verificar que todo funciona

## Notas Importantes

- **Plan Free**: El servicio se "duerme" después de 15 minutos de inactividad
- **Primera petición**: Puede tardar ~30 segundos si el servicio estaba dormido
- **WebSocket**: Se adapta automáticamente a `wss://` en HTTPS
- **Logs**: Revisa los logs en Render si hay problemas

## Checklist Pre-Despliegue

- [ ] Repositorio Git conectado a Render
- [ ] `PUBLIC_BASE_URL` configurada (puedes actualizarla después con la URL real)
- [ ] `DRIVE_PARENT_FOLDER_ID` configurada
- [ ] `GOOGLE_CREDENTIALS` configurada (JSON completo en una línea)
- [ ] Carpeta de Google Drive compartida con el email de la cuenta de servicio
- [ ] API de Google Drive habilitada en Google Cloud Console

¡Listo para desplegar! 🚀

