# Instrucciones para Generar Favicon PNG

## Favicon SVG Creado

He creado un favicon SVG (`public/favicon.svg`) con las iniciales "PI" (Photocall IA) con efecto anaglífico que coincide con el estilo del logo MON.

## Generar Versiones PNG (Opcional)

Para máxima compatibilidad con todos los navegadores, puedes generar versiones PNG del favicon. Aquí tienes varias opciones:

### Opción 1: Herramientas Online Gratuitas

1. **Favicon.io** (https://favicon.io/favicon-converter/)
   - Sube el archivo `favicon.svg`
   - Descarga el paquete completo con todos los tamaños
   - Incluye: favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png

2. **RealFaviconGenerator** (https://realfavicongenerator.net/)
   - Sube el archivo `favicon.svg`
   - Genera todos los tamaños necesarios
   - Incluye código HTML listo para copiar

3. **Favicon Generator** (https://www.favicon-generator.org/)
   - Sube una imagen PNG de 260x260px o más
   - Genera todos los formatos necesarios

### Opción 2: Usando Node.js (si tienes ImageMagick o Sharp instalado)

```bash
# Instalar sharp (si no está instalado)
npm install sharp

# Crear script para generar favicons
node generate-favicons.js
```

### Opción 3: Usando Python (si tienes Pillow instalado)

```python
from PIL import Image
import cairosvg

# Convertir SVG a PNG
cairosvg.svg2png(url='favicon.svg', write_to='favicon-32x32.png', output_width=32, output_height=32)
cairosvg.svg2png(url='favicon.svg', write_to='favicon-16x16.png', output_width=16, output_height=16)
```

## Archivos Necesarios (si quieres compatibilidad completa)

Si generas los PNG, actualiza el HTML con:

```html
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
<link rel="manifest" href="site.webmanifest">
```

## Estado Actual

✅ **Favicon SVG creado**: `public/favicon.svg`  
✅ **HTML actualizado**: El favicon SVG está configurado  
⚠️ **PNG opcionales**: Puedes generarlos usando las herramientas mencionadas arriba

## Nota

El favicon SVG funciona perfectamente en navegadores modernos (Chrome, Firefox, Safari, Edge). Los PNG solo son necesarios para navegadores muy antiguos o para iconos de escritorio.

