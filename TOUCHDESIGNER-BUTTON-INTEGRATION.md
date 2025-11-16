# Integración de Botón TouchDesigner con Aplicación Web

## Situación Actual

✅ **WebSocket ya está conectado**: TouchDesigner recibe mensajes cuando se presiona el botón en la aplicación web.

✅ **Mensaje recibido**: `{"type":"capture", "jobId":"...", "timestamp":..., "countdownSec":10}`

✅ **Solución implementada**: El botón en TouchDesigner se activa con un pulso cuando llega el mensaje.

---

## Solución Implementada: Usar `btn.click()`

### Descripción
La solución más simple y efectiva es usar el método `click()` del botón, que simula un click real del usuario (down + up) y funciona perfectamente con botones Momentary.

### Implementación

1. **En el WebSocket DAT (`websocket1`)**:
   - Click derecho → **"Edit Callbacks"** o **"Edit Script"**
   - Selecciona la pestaña **"onReceiveText"**

2. **Código Python para `onReceiveText()`**:

```python
def onReceiveText(dat, rowIndex, message):
    import json

    try:
        data = json.loads(message)

        if data.get('type') == 'capture':
            btn = op('button1')  # tu Button COMP

            if btn is not None:
                # Simula un click real (down+up) del botón momentary
                btn.click()  # NO pases 'val', déjalo vacío

                print("[TouchDesigner] ✅ Botón 'button1' clicado desde WebSocket")

    except Exception as e:
        print("ERROR onReceiveText:", e)

    return
```

### Ventajas
- ✅ **Muy simple**: Solo una línea de código (`btn.click()`)
- ✅ **Funciona perfectamente**: Simula un click real del usuario
- ✅ **Pulso automático**: El botón Momentary vuelve a OFF automáticamente
- ✅ **No requiere configuración adicional**: No necesitas callbacks en el botón
- ✅ **Confiable**: Método nativo de TouchDesigner

### Pasos para Implementar

1. **Abre TouchDesigner**

2. **Selecciona el WebSocket DAT (`websocket1`)**

3. **Click derecho → "Edit Callbacks"** o **"Edit Script"**

4. **Ve a la pestaña "onReceiveText"**

5. **Pega el código completo**:

```python
def onReceiveText(dat, rowIndex, message):
    import json

    try:
        data = json.loads(message)

        if data.get('type') == 'capture':
            btn = op('button1')  # tu Button COMP

            if btn is not None:
                # Simula un click real (down+up) del botón momentary
                btn.click()  # NO pases 'val', déjalo vacío

                print("[TouchDesigner] ✅ Botón 'button1' clicado desde WebSocket")

    except Exception as e:
        print("ERROR onReceiveText:", e)

    return
```

6. **Guarda el script** (Ctrl+S o Cmd+S)

7. **Prueba**: Presiona el botón en la aplicación web y verifica que el botón en TouchDesigner se active con un pulso.

---

## Notas Importantes

### Nombre del Botón
- Asegúrate de que el botón se llame exactamente `button1`
- Si tu botón tiene otro nombre, cambia `op('button1')` por el nombre correcto

### Tipo de Botón
- El botón debe ser de tipo **"Momentary"** para que funcione correctamente el pulso
- Puedes verificar esto en los parámetros del botón: **"Button Type"** → **"Momentary"**

### Método `click()`
- `btn.click()` simula un click completo (presionar y soltar)
- **NO** pases ningún parámetro a `click()` - déjalo vacío: `btn.click()`
- Esto hace que el botón Momentary vuelva a OFF automáticamente después del click

---

## Troubleshooting

### El botón no se activa

1. **Verifica que el WebSocket esté conectado**:
   - Revisa la consola de TouchDesigner para ver mensajes de conexión
   - Verifica que el servidor esté corriendo

2. **Verifica el nombre del botón**:
   - Asegúrate de que el botón se llame exactamente `button1`
   - O cambia `op('button1')` por el nombre correcto de tu botón

3. **Verifica los mensajes recibidos**:
   - Agrega `print(f"Mensaje recibido: {message}")` al inicio del callback
   - Revisa la consola de TouchDesigner

4. **Verifica que el callback esté habilitado**:
   - En el WebSocket DAT, verifica que **"Callbacks"** esté habilitado
   - O usa **"Edit Script"** directamente

### El botón se activa pero no hace nada

1. **Verifica el callback del botón**:
   - El botón puede tener su propio callback que necesitas ejecutar
   - Con `btn.click()`, el callback del botón debería ejecutarse automáticamente

2. **Verifica el tipo de botón**:
   - Asegúrate de que sea **"Momentary"**
   - Si es **"Toggle"**, cambiará el comportamiento

---

## Flujo Completo

1. **Usuario presiona botón en la aplicación web**
   ↓
2. **Aplicación web envía mensaje WebSocket**: `{"type":"capture", "jobId":"...", ...}`
   ↓
3. **Servidor Node.js recibe el mensaje y lo reenvía a TouchDesigner**
   ↓
4. **TouchDesigner recibe el mensaje en `websocket1`**
   ↓
5. **Se ejecuta `onReceiveText()` callback**
   ↓
6. **Se parsea el JSON y se verifica que `type == 'capture'`**
   ↓
7. **Se ejecuta `btn.click()`**
   ↓
8. **El botón se activa con un pulso (ON → OFF automáticamente)**

---

## Conclusión

La solución usando `btn.click()` es la más simple, confiable y efectiva. Simula un click real del usuario y funciona perfectamente con botones Momentary, haciendo que el botón vuelva a OFF automáticamente después del pulso.
