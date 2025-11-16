# Despliegue en Render

Esta guía explica cómo desplegar el servidor Photocall en Render.

## Requisitos Previos

1. Cuenta en [Render](https://render.com)
2. Cuenta de Google Cloud con Google Drive API habilitada
3. Credenciales de servicio de Google Drive (archivo JSON)

## Paso 1: Preparar Credenciales de Google Drive

1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un proyecto o selecciona uno existente
3. Habilita la API de Google Drive
4. Crea una cuenta de servicio:
   - Ve a "IAM & Admin" > "Service Accounts"
   - Crea una nueva cuenta de servicio
   - Descarga el archivo JSON de credenciales
5. Comparte la carpeta de Google Drive con el email de la cuenta de servicio

## Paso 2: Crear Servicio en Render

1. Ve a tu [Dashboard de Render](https://dashboard.render.com)
2. Click en "New +" > "Web Service"
3. Conecta tu repositorio Git (GitHub, GitLab, etc.)
4. Configura el servicio:
   - **Name**: `photocall-backend` (o el nombre que prefieras)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free (o el plan que prefieras)

## Paso 3: Configurar Variables de Entorno

En la sección "Environment" del servicio en Render, añade las siguientes variables:

### Variables Requeridas

1. **`PUBLIC_BASE_URL`**
   - Valor: La URL pública de tu servicio en Render
   - Ejemplo: `https://photocall-backend.onrender.com`
   - ⚠️ **IMPORTANTE**: No incluyas barra final (`/`)

2. **`DRIVE_PARENT_FOLDER_ID`**
   - Valor: El ID de la carpeta padre en Google Drive
   - Cómo obtenerlo:
     - Abre la carpeta en Google Drive
     - Copia el ID de la URL: `https://drive.google.com/drive/folders/[ESTE_ES_EL_ID]`

3. **`GOOGLE_CREDENTIALS`**
   - Valor: El contenido completo del archivo JSON de credenciales
   - ⚠️ **IMPORTANTE**: 
     - Debe estar en una sola línea
     - Escapa las comillas dobles si es necesario
     - O usa el formato de texto plano completo
   - Ejemplo de formato:
     ```json
     {"type":"service_account","project_id":"tu-proyecto","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/...%40....iam.gserviceaccount.com"}
     ```

### Variables Opcionales

- **`NODE_ENV`**: `production` (Render lo configura automáticamente)
- **`PORT`**: Render lo configura automáticamente (no necesitas configurarlo)

## Paso 4: Desplegar

1. Guarda la configuración
2. Render comenzará automáticamente el despliegue
3. Espera a que termine el build y el servicio esté "Live"
4. Verifica los logs para asegurarte de que todo funciona correctamente

## Paso 5: Verificar el Despliegue

1. Visita la URL de tu servicio: `https://tu-servicio.onrender.com`
2. Deberías ver la interfaz de Photocall
3. Prueba hacer una captura para verificar que todo funciona

## Configuración del Frontend

Una vez que tengas la URL del backend en Render, actualiza el frontend:

1. En `public/index.html`, busca la constante `WS_URL`
2. Cambia `ws://localhost:3000` por `wss://tu-servicio.onrender.com` (nota el `wss://` para WebSocket seguro)

## Troubleshooting

### Error: "Faltan variables de entorno críticas"
- Verifica que todas las variables de entorno estén configuradas en Render
- Asegúrate de que `GOOGLE_CREDENTIALS` esté en formato JSON válido

### Error: "Error al autenticar con Google Drive"
- Verifica que el JSON de credenciales sea correcto
- Asegúrate de que la cuenta de servicio tenga permisos en la carpeta de Drive

### WebSocket no conecta
- Render requiere `wss://` (WebSocket seguro) en lugar de `ws://`
- Verifica que la URL del WebSocket sea correcta

### El servicio se duerme (plan Free)
- Render pone a dormir servicios gratuitos después de 15 minutos de inactividad
- La primera petición después de dormir puede tardar ~30 segundos
- Considera usar un plan de pago para evitar esto

## Estructura de Carpetas en Google Drive

El servidor crea automáticamente esta estructura:
```
📁 Carpeta Padre (DRIVE_PARENT_FOLDER_ID)
  └── 📁 YYYY (año)
      └── 📁 MM (mes)
          └── 📁 DD (día)
              └── 📁 {jobId}
                  └── 📄 final.jpg (o final.png)
```

## Seguridad

- ✅ Las credenciales de Google están en variables de entorno (seguro)
- ✅ Los archivos se hacen públicos automáticamente para descarga
- ✅ Límite de tamaño de archivo: 10MB
- ✅ Solo acepta imágenes JPEG y PNG
- ⚠️ Los jobs se limpian automáticamente después de 1 hora

## Monitoreo

Render proporciona logs en tiempo real:
- Ve a tu servicio en Render
- Click en "Logs" para ver los logs en tiempo real
- Útil para debugging y monitoreo

## Actualizaciones

Para actualizar el servicio:
1. Haz push a tu repositorio Git
2. Render detectará los cambios automáticamente
3. Iniciará un nuevo despliegue
4. El servicio se actualizará sin downtime (con plan de pago)

