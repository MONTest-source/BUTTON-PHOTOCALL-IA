# Integración de Botón TouchDesigner con Aplicación Web

## Situación Actual

✅ **WebSocket ya está conectado**: TouchDesigner recibe mensajes cuando se presiona el botón en la aplicación web.

✅ **Mensaje recibido**: `{"type":"capture", "jobId":"...", "timestamp":..., "countdownSec":10}`

❓ **Falta**: Activar el botón en TouchDesigner cuando llega este mensaje.

---

## Solución 1: Usar Callback `onReceive()` en WebSocket DAT ⭐ RECOMENDADA

### Descripción
TouchDesigner tiene un callback `onReceive()` en el WebSocket DAT que se ejecuta automáticamente cuando llega un mensaje.

### Implementación

1. **En el WebSocket DAT (`websocket1`)**:
   - Click derecho → **"Edit Callbacks"** o **"Edit Script"**
   - Selecciona la pestaña **"onReceive"**

2. **Código Python para `onReceive()`**:

```python
def onReceive(dat, rowIndex, message, bytes):
    """
    Se ejecuta automáticamente cuando llega un mensaje WebSocket.
    
    Args:
        dat: El WebSocket DAT (websocket1)
        rowIndex: Índice de la fila del mensaje
        message: El mensaje recibido como string
        bytes: El mensaje como bytes
    """
    import json
    
    try:
        # Parsear el mensaje JSON
        data = json.loads(message)
        
        # Verificar si es un mensaje de captura
        if data.get('type') == 'capture':
            # Activar el botón (button1)
            button1 = op('button1')
            if button1:
                # Simular click en el botón
                button1.par.value0 = 1  # Activar
                
                # Opcional: Desactivar después de un tiempo
                # run("op('button1').par.value0 = 0", delayFrames=30)
                
                print(f"[TouchDesigner] Botón activado por mensaje de captura: {data.get('jobId')}")
            else:
                print("[TouchDesigner] ERROR: No se encontró button1")
        
    except json.JSONDecodeError:
        print(f"[TouchDesigner] ERROR: No se pudo parsear el mensaje: {message}")
    except Exception as e:
        print(f"[TouchDesigner] ERROR: {str(e)}")
    
    return
```

### Ventajas
- ✅ Automático: Se ejecuta cuando llega cualquier mensaje
- ✅ No requiere polling
- ✅ Bajo overhead
- ✅ Fácil de mantener

### Desventajas
- ⚠️ Requiere que el WebSocket DAT tenga habilitados los callbacks

---

## Solución 2: Usar Python CHOP con Timer

### Descripción
Crear un Python CHOP que revise periódicamente los mensajes recibidos en el WebSocket DAT.

### Implementación

1. **Crear un Python CHOP** (`python1`):
   - Click derecho → **"Create"** → **"Python"** → **"Python CHOP"**

2. **Código para el Python CHOP**:

```python
def onCook(scriptOp):
    import json
    
    # Obtener el WebSocket DAT
    websocket = op('websocket1')
    if not websocket:
        return
    
    # Obtener el botón
    button = op('button1')
    if not button:
        return
    
    # Revisar el último mensaje recibido
    numRows = websocket.numRows
    if numRows > 0:
        # Obtener la última fila (último mensaje)
        lastMessage = websocket[0, numRows - 1].val
        
        try:
            data = json.loads(lastMessage)
            
            # Si es un mensaje de captura y el botón no está activado
            if data.get('type') == 'capture' and button.par.value0 == 0:
                # Activar el botón
                button.par.value0 = 1
                print(f"[TouchDesigner] Botón activado: {data.get('jobId')}")
                
        except:
            pass
    
    return
```

3. **Configurar el Timer**:
   - En el Python CHOP, ajusta **"Execute"** a **"On Frame"** o **"On Demand"**
   - O usa un **Timer CHOP** para ejecutarlo periódicamente

### Ventajas
- ✅ Más control sobre cuándo se revisa
- ✅ Puede revisar múltiples mensajes

### Desventajas
- ⚠️ Polling (revisa periódicamente, no es reactivo)
- ⚠️ Puede perder mensajes si revisa muy lento
- ⚠️ Más overhead que la Solución 1

---

## Solución 3: Usar DAT Execute con Script

### Descripción
Usar el DAT Execute del WebSocket DAT para procesar mensajes cuando llegan.

### Implementación

1. **En el WebSocket DAT (`websocket1`)**:
   - Click derecho → **"Edit Script"**
   - O crear un **Text DAT** conectado al WebSocket DAT

2. **Código para DAT Execute**:

```python
def onReceive(dat, rowIndex, message, bytes):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            # Activar botón
            op('button1').par.value0 = 1
            
            # Opcional: Log
            print(f"Botón activado: {data.get('jobId')}")
            
    except Exception as e:
        print(f"Error: {e}")
    
    return
```

### Ventajas
- ✅ Similar a Solución 1 pero con más control
- ✅ Puede procesar múltiples mensajes

### Desventajas
- ⚠️ Requiere configuración adicional del DAT Execute

---

## Solución 4: Usar CHOP Network (Recomendado para Proyectos Complejos)

### Descripción
Crear una red de CHOPs que procese los mensajes WebSocket y active el botón.

### Implementación

1. **Estructura**:
   ```
   websocket1 (WebSocket DAT)
     ↓
   select1 (Select CHOP) - Selecciona el último mensaje
     ↓
   python1 (Python CHOP) - Parsea JSON y activa botón
     ↓
   button1 (Button COMP)
   ```

2. **Select CHOP (`select1`)**:
   - Conectado al WebSocket DAT
   - Selecciona la última fila

3. **Python CHOP (`python1`)**:
```python
def onCook(scriptOp):
    import json
    
    # Obtener mensaje del Select CHOP
    message = scriptOp.inputs[0][0, 0].val
    
    if message:
        try:
            data = json.loads(message)
            if data.get('type') == 'capture':
                op('button1').par.value0 = 1
        except:
            pass
    
    return
```

### Ventajas
- ✅ Visual y fácil de entender
- ✅ Escalable para proyectos complejos
- ✅ Fácil de depurar

### Desventajas
- ⚠️ Más componentes en la red
- ⚠️ Puede ser overkill para casos simples

---

## Solución 5: Activar Botón con Parámetros Específicos

### Descripción
En lugar de solo activar el botón, también puedes pasar parámetros específicos o ejecutar acciones personalizadas.

### Implementación Mejorada

```python
def onReceive(dat, rowIndex, message, bytes):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            # Opción 1: Activar el botón
            button.par.value0 = 1
            
            # Opción 2: Cambiar texto del botón temporalmente
            originalText = button.par.label
            button.par.label = f"Capturando... {data.get('jobId', '')[:8]}"
            
            # Opción 3: Cambiar color del botón
            # button.par.bgcolorr = 0
            # button.par.bgcolorg = 1
            # button.par.bgcolorb = 0
            
            # Opción 4: Ejecutar callback del botón manualmente
            # button.callback(button, None)
            
            # Opción 5: Resetear después de X frames
            def resetButton():
                button.par.value0 = 0
                button.par.label = originalText
            
            run("op('button1').par.value0 = 0", delayFrames=60)
            run(f"op('button1').par.label = '{originalText}'", delayFrames=60)
            
            print(f"[TouchDesigner] Botón activado: {data.get('jobId')}")
            
    except Exception as e:
        print(f"[TouchDesigner] ERROR: {e}")
    
    return
```

---

## Solución 6: Enviar Confirmación de Vuelta al Servidor

### Descripción
Después de activar el botón, enviar un mensaje de confirmación de vuelta al servidor.

### Implementación

```python
def onReceive(dat, rowIndex, message, bytes):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            jobId = data.get('jobId')
            
            # Activar botón
            op('button1').par.value0 = 1
            
            # Enviar confirmación de vuelta al servidor
            response = {
                'type': 'button_activated',
                'jobId': jobId,
                'timestamp': absTime.frame,
                'status': 'success'
            }
            
            # Enviar por el mismo WebSocket
            dat.send(json.dumps(response))
            
            print(f"[TouchDesigner] Botón activado y confirmación enviada: {jobId}")
            
    except Exception as e:
        print(f"[TouchDesigner] ERROR: {e}")
    
    return
```

**Nota**: Para esto, el servidor debería estar escuchando mensajes de TouchDesigner (ya lo hace en `server.js`).

---

## Comparación de Soluciones

| Solución | Complejidad | Rendimiento | Reactividad | Recomendación |
|----------|-------------|-------------|-------------|---------------|
| **1. onReceive() callback** | ⭐ Baja | ⭐⭐⭐ Excelente | ⭐⭐⭐ Instantánea | ⭐⭐⭐ **MEJOR** |
| **2. Python CHOP con Timer** | ⭐⭐ Media | ⭐⭐ Buena | ⭐⭐ Con delay | ⭐⭐ Buena |
| **3. DAT Execute** | ⭐ Baja | ⭐⭐⭐ Excelente | ⭐⭐⭐ Instantánea | ⭐⭐⭐ Excelente |
| **4. CHOP Network** | ⭐⭐⭐ Alta | ⭐⭐ Buena | ⭐⭐ Buena | ⭐⭐ Para proyectos complejos |
| **5. Con parámetros** | ⭐⭐ Media | ⭐⭐⭐ Excelente | ⭐⭐⭐ Instantánea | ⭐⭐⭐ Si necesitas más control |
| **6. Con confirmación** | ⭐⭐ Media | ⭐⭐⭐ Excelente | ⭐⭐⭐ Instantánea | ⭐⭐ Si necesitas feedback |

---

## Implementación Recomendada (Solución 1 Mejorada)

### Paso a Paso:

1. **Abre TouchDesigner**

2. **Selecciona el WebSocket DAT (`websocket1`)**

3. **Click derecho → "Edit Callbacks"** o **"Edit Script"**

4. **Ve a la pestaña "onReceive"**

5. **Pega este código**:

```python
def onReceive(dat, rowIndex, message, bytes):
    """
    Callback que se ejecuta automáticamente cuando llega un mensaje WebSocket.
    Activa el botón button1 cuando recibe un mensaje de tipo 'capture'.
    """
    import json
    
    try:
        # Parsear el mensaje JSON
        data = json.loads(message)
        
        # Verificar si es un mensaje de captura
        if data.get('type') == 'capture':
            jobId = data.get('jobId', 'unknown')
            
            # Obtener referencia al botón
            button = op('button1')
            
            if button:
                # Activar el botón (simular click)
                button.par.value0 = 1
                
                # Opcional: Log para debugging
                print(f"[TouchDesigner] ✅ Botón activado por captura - JobId: {jobId}")
                
                # Opcional: Desactivar después de 1 segundo (60 frames a 60fps)
                # run("op('button1').par.value0 = 0", delayFrames=60)
                
            else:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1'")
        
        # Opcional: Manejar otros tipos de mensajes
        elif data.get('type') == 'connected':
            print("[TouchDesigner] ✅ Conectado al servidor")
        
    except json.JSONDecodeError:
        print(f"[TouchDesigner] ⚠️ ERROR: No se pudo parsear JSON: {message}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

6. **Guarda el script** (Ctrl+S o Cmd+S)

7. **Prueba**: Presiona el botón en la aplicación web y verifica que el botón en TouchDesigner se active.

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
   - Prueba: `op('button1').callback(op('button1'), None)`

2. **Verifica los parámetros del botón**:
   - Algunos botones pueden necesitar otros parámetros además de `value0`
   - Revisa la documentación del Button COMP en TouchDesigner

---

## Alternativas Avanzadas

### Alternativa A: Múltiples Botones

Si necesitas activar múltiples botones o componentes:

```python
def onReceive(dat, rowIndex, message, bytes):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            # Activar múltiples botones
            buttons = ['button1', 'button2', 'button3']
            
            for btnName in buttons:
                btn = op(btnName)
                if btn:
                    btn.par.value0 = 1
            
    except Exception as e:
        print(f"ERROR: {e}")
    
    return
```

### Alternativa B: Activar con Delay

Si quieres que el botón se active después de un tiempo:

```python
def onReceive(dat, rowIndex, message, bytes):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            # Activar después de 30 frames (0.5 segundos a 60fps)
            run("op('button1').par.value0 = 1", delayFrames=30)
            
    except Exception as e:
        print(f"ERROR: {e}")
    
    return
```

### Alternativa C: Activar Solo la Primera Vez

Si quieres que el botón solo se active la primera vez que llega un mensaje:

```python
def onReceive(dat, rowIndex, message, bytes):
    import json
    
    # Variable global para trackear si ya se activó
    if 'button_activated' not in globals():
        globals()['button_activated'] = False
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture' and not globals()['button_activated']:
            op('button1').par.value0 = 1
            globals()['button_activated'] = True
            
    except Exception as e:
        print(f"ERROR: {e}")
    
    return
```

---

## Conclusión

**Recomendación**: Usa la **Solución 1 (onReceive callback)** porque es:
- ✅ La más simple
- ✅ La más eficiente
- ✅ La más reactiva
- ✅ La más fácil de mantener

Si necesitas más funcionalidad, combina la Solución 1 con la Solución 5 (parámetros específicos) o la Solución 6 (confirmación al servidor).

