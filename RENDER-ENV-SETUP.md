# Configurar Variables de Entorno en Render

## Opción 1: Usar el Botón "Add from .env" en Render

Render permite cargar variables desde un archivo `.env`. Sin embargo, **NO subas el archivo `.env` real a Git** (contiene credenciales sensibles).

### Pasos:

1. **Crea un archivo `.env` localmente** (solo en tu máquina, NO lo subas a Git):
   ```bash
   # Copia el ejemplo
   cp .env.example .env
   ```

2. **Edita `.env`** y completa los valores reales:
   ```env
   PUBLIC_BASE_URL=https://photocall-backend.onrender.com
   DRIVE_PARENT_FOLDER_ID=tu_id_real_aqui
   GOOGLE_CREDENTIALS={"type":"service_account",...}
   ```

3. **En Render Dashboard**:
   - Ve a "Environment" de tu servicio
   - Click en el botón **"Add from .env"**
   - Selecciona tu archivo `.env` local
   - Render cargará todas las variables automáticamente

4. **Verifica** que las 3 variables se hayan cargado correctamente

5. **Elimina el archivo `.env` local** después de cargarlo (por seguridad)

## Opción 2: Añadir Manualmente (Más Seguro)

Es más seguro añadir las variables manualmente una por una:

### Variable 1: `PUBLIC_BASE_URL`
- **Key**: `PUBLIC_BASE_URL`
- **Value**: `https://photocall-backend.onrender.com`
- (Actualiza después con la URL real que Render te dé)

### Variable 2: `DRIVE_PARENT_FOLDER_ID`
- **Key**: `DRIVE_PARENT_FOLDER_ID`
- **Value**: `[ID de tu carpeta en Google Drive]`

### Variable 3: `GOOGLE_CREDENTIALS`
- **Key**: `GOOGLE_CREDENTIALS`
- **Value**: `[Todo el JSON de credenciales en una sola línea]`

## ⚠️ Importante sobre .env

- ✅ `.env.example` - SÍ se sube a Git (es solo una plantilla)
- ❌ `.env` - NO se sube a Git (contiene valores reales, está en .gitignore)
- ✅ Usa `.env` solo localmente para cargar en Render
- ✅ Elimina `.env` después de cargarlo en Render

## Formato Correcto de las Claves

Render requiere que las claves de variables de entorno:
- Solo contengan letras, números, `_` o `.`
- NO empiecen con un número
- Ejemplos válidos: `PUBLIC_BASE_URL`, `DRIVE_PARENT_FOLDER_ID`, `GOOGLE_CREDENTIALS`
- Ejemplos inválidos: `1PUBLIC_URL`, `PUBLIC-URL` (guión no permitido)

## Verificación

Después de cargar las variables:
1. Verifica que aparezcan las 3 variables en la lista
2. Verifica que los valores sean correctos
3. Guarda los cambios
4. Render reiniciará el servicio automáticamente

