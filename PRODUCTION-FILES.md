# Archivos para Producción (Render)

Este proyecto está preparado para desplegarse en Render. Solo contiene los archivos esenciales para producción.

## Estructura del Proyecto

```
photocall-backend/
├── server.js              # Servidor principal (Express + WebSocket)
├── package.json           # Dependencias y scripts
├── render.yaml            # Configuración para Render
├── .gitignore             # Archivos a ignorar en Git
├── README.md              # Documentación principal
├── RENDER-DEPLOY.md       # Guía de despliegue en Render
└── public/
    ├── index.html         # Frontend completo (HTML + CSS + JS)
    └── murcielagos_pro.json  # Datos de animación de murciélagos
```

## Archivos Eliminados (Solo Desarrollo)

Los siguientes archivos fueron eliminados porque solo son necesarios para desarrollo local:

- `dev-server.js` - Servidor de desarrollo
- `test-server.js` - Servidor de pruebas
- `test-upload.js` - Script de prueba de upload
- `test-websocket.js` - Script de prueba de WebSocket
- `index.html` (raíz) - Archivo de prueba
- `index.tsx` - Archivo TypeScript de prueba
- `vite.config.ts` - Configuración de Vite
- `tsconfig.json` - Configuración de TypeScript
- `upload_photo.py` - Script Python de prueba
- `metadata.json` - Metadatos de desarrollo
- Documentación de desarrollo (varios archivos .md)
- Archivos de diseño (Figma specs, tokens, etc.)

## Variables de Entorno Requeridas en Render

1. `PUBLIC_BASE_URL` - URL pública del servicio
2. `DRIVE_PARENT_FOLDER_ID` - ID de carpeta en Google Drive
3. `GOOGLE_CREDENTIALS` - JSON completo de credenciales

Ver `RENDER-DEPLOY.md` para instrucciones detalladas.

## Comandos Disponibles

- `npm start` - Inicia el servidor de producción
- `npm install` - Instala dependencias

## ⚠️ IMPORTANTE: Antes de Subir a Git

**NO subas `node_modules/` a Git**. Esta carpeta:
- Es muy pesada (cientos de MB)
- Se regenera automáticamente con `npm install`
- Está en `.gitignore` para que Git la ignore

### Verificar antes de hacer commit:

```bash
# Verificar que node_modules está ignorado
git status

# Si aparece node_modules, asegúrate de que está en .gitignore
```

### Archivos que SÍ deben subirse:
- ✅ `package.json` - Define las dependencias
- ✅ `package-lock.json` - Bloquea versiones exactas (buena práctica)
- ✅ Todo el código fuente
- ✅ Archivos de configuración

### Archivos que NO deben subirse:
- ❌ `node_modules/` - Se regenera con `npm install`
- ❌ `.env` - Variables de entorno (sensibles)
- ❌ Archivos de credenciales

## Listo para Desplegar

Este proyecto está listo para ser desplegado en Render. Solo necesitas:

1. Subir el código a un repositorio Git (sin `node_modules/`)
2. Conectar el repositorio a Render
3. Configurar las variables de entorno en Render
4. Render ejecutará `npm install` automáticamente

¡Listo! 🚀

