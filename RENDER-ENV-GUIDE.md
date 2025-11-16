# Guía Rápida: Cargar Variables de Entorno en Render

## Método Recomendado: Usar "Add from .env"

Render tiene un botón **"Add from .env"** que carga todas las variables de una vez.

### Paso 1: Crear archivo `.env` localmente

Crea un archivo llamado `.env` en tu máquina (NO lo subas a Git) con este contenido:

```env
PUBLIC_BASE_URL=https://photocall-backend.onrender.com
DRIVE_PARENT_FOLDER_ID=tu_id_de_google_drive_aqui
GOOGLE_CREDENTIALS={"type":"service_account","project_id":"tu-proyecto","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"tu-servicio@tu-proyecto.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/tu-servicio%40tu-proyecto.iam.gserviceaccount.com"}
```

**Importante:**
- Reemplaza `tu_id_de_google_drive_aqui` con el ID real de tu carpeta
- Reemplaza todo el JSON de `GOOGLE_CREDENTIALS` con tu JSON real
- `GOOGLE_CREDENTIALS` debe estar en **una sola línea** (sin saltos de línea)
- Sin comillas alrededor de los valores

### Paso 2: Cargar en Render

1. En Render Dashboard, ve a tu servicio
2. Click en la pestaña **"Environment"**
3. Click en el botón **"Add from .env"** (botón gris con icono de documento)
4. Selecciona tu archivo `.env` local
5. Render cargará las 3 variables automáticamente
6. Verifica que aparezcan correctamente
7. Guarda

### Paso 3: Actualizar PUBLIC_BASE_URL (después del despliegue)

Una vez que Render te dé la URL real:
1. Ve a "Environment"
2. Edita `PUBLIC_BASE_URL`
3. Pega la URL real (ej: `https://photocall-backend-abc123.onrender.com`)
4. Guarda

### Paso 4: Eliminar archivo `.env` local

Por seguridad, elimina el archivo `.env` de tu máquina después de cargarlo en Render.

---

## Método Alternativo: Añadir Manualmente

Si prefieres añadir las variables una por una:

1. Click en **"Add Environment Variable"**
2. **Key**: `PUBLIC_BASE_URL`
   **Value**: `https://photocall-backend.onrender.com`
3. Click en **"Add Environment Variable"** de nuevo
4. **Key**: `DRIVE_PARENT_FOLDER_ID`
   **Value**: `[tu_id_de_google_drive]`
5. Click en **"Add Environment Variable"** de nuevo
6. **Key**: `GOOGLE_CREDENTIALS`
   **Value**: `[todo_el_json_en_una_linea]`

---

## Formato de las Claves

Render requiere que las claves:
- Solo contengan letras, números, `_` o `.`
- NO empiecen con un número
- ✅ Válido: `PUBLIC_BASE_URL`, `DRIVE_PARENT_FOLDER_ID`
- ❌ Inválido: `1PUBLIC_URL`, `PUBLIC-URL`

Las claves que necesitas son todas válidas:
- `PUBLIC_BASE_URL` ✅
- `DRIVE_PARENT_FOLDER_ID` ✅
- `GOOGLE_CREDENTIALS` ✅

