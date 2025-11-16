# Soluciones Completas para Pulso de Botón en TouchDesigner

## Problema Identificado

El botón en TouchDesigner se activa (ON) pero **NO se desactiva automáticamente**, quedándose en estado ON. El botón es de tipo **"Momentary"** pero cuando se activa programáticamente con `button.par.value0 = 1`, no vuelve a OFF automáticamente.

---

## Análisis del Problema

### Por qué `delayCall()` y `run()` pueden no funcionar:

1. **Contexto de ejecución**: Los callbacks de WebSocket DAT pueden ejecutarse en un contexto diferente donde `me.delayCall()` no está disponible
2. **Threading**: Los callbacks pueden ejecutarse en un thread diferente donde las funciones de delay no funcionan correctamente
3. **Botón Momentary**: Los botones Momentary solo vuelven a OFF automáticamente cuando se hace click manual, NO cuando se activan programáticamente

---

## SOLUCIÓN 1: Usar el Callback del Botón Directamente ⭐ RECOMENDADA

### Descripción
En lugar de cambiar `value0` manualmente, ejecutar el callback del botón que simula un click real.

### Código:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Ejecutar el callback del botón (simula un click real)
                # Esto activará el botón y su callback, y luego volverá a OFF automáticamente
                button.callback(button, None)
                
                print(f"[TouchDesigner] ✅ Botón pulsado usando callback - JobId: {data.get('jobId')}")
            else:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1'")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return
```

### Ventajas:
- ✅ Simula un click real del usuario
- ✅ El botón Momentary volverá a OFF automáticamente
- ✅ Ejecuta cualquier callback que tenga configurado el botón
- ✅ No requiere delays ni timers

### Desventajas:
- ⚠️ Ejecuta el callback del botón (puede tener efectos secundarios)

---

## SOLUCIÓN 2: Usar Timer CHOP (Más Confiable)

### Descripción
Crear un Timer CHOP que controle el pulso del botón de manera más confiable.

### Pasos:

1. **Crear un Timer CHOP** (`timer1`):
   - Click derecho → Create → CHOP → Timer

2. **Configurar el Timer CHOP**:
   - **Length**: 0.1 (duración del pulso en segundos)
   - **Reset**: 0
   - **Start/Stop**: 0

3. **Conectar el Timer al Botón**:
   - Conectar la salida del Timer CHOP al parámetro `value0` del botón
   - O usar un Python CHOP para leer el Timer y activar/desactivar el botón

4. **Código en el WebSocket callback**:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            timer = op('timer1')  # Timer CHOP creado previamente
            
            if button and timer:
                # Activar el botón
                button.par.value0 = 1
                
                # Iniciar el timer (esto activará el timer que luego desactivará el botón)
                timer.par.start = 1
                timer.par.reset = 1
                timer.par.reset = 0
                
                print(f"[TouchDesigner] ✅ Pulso iniciado con Timer - JobId: {data.get('jobId')}")
            else:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1' o 'timer1'")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

5. **Python CHOP para conectar Timer al Botón** (`python1`):
   - Crear un Python CHOP conectado al Timer
   - Código:

```python
def onCook(scriptOp):
    timer = scriptOp.inputs[0]
    button = op('button1')
    
    if timer and button:
        # Cuando el timer está activo (> 0), activar el botón
        # Cuando el timer termina (= 0), desactivar el botón
        timerValue = timer[0].eval()
        
        if timerValue > 0:
            button.par.value0 = 1
        else:
            button.par.value0 = 0
    
    return
```

### Ventajas:
- ✅ Muy confiable
- ✅ Control preciso del tiempo
- ✅ Funciona independientemente del contexto del callback

### Desventajas:
- ⚠️ Requiere crear componentes adicionales (Timer CHOP, Python CHOP)

---

## SOLUCIÓN 3: Usar Python CHOP con Frame Counter

### Descripción
Crear un Python CHOP que revise periódicamente si debe desactivar el botón.

### Pasos:

1. **Crear un Python CHOP** (`python1`):
   - Click derecho → Create → CHOP → Python

2. **Código del Python CHOP**:

```python
# Variable global para trackear cuándo desactivar el botón
if 'buttonDeactivateFrame' not in globals():
    globals()['buttonDeactivateFrame'] = -1

def onCook(scriptOp):
    button = op('button1')
    currentFrame = absTime.frame
    
    if button:
        # Si hay un frame programado para desactivar y ya llegamos a ese frame
        if globals()['buttonDeactivateFrame'] > 0 and currentFrame >= globals()['buttonDeactivateFrame']:
            button.par.value0 = 0
            globals()['buttonDeactivateFrame'] = -1
    
    return
```

3. **Código en el WebSocket callback**:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Activar el botón
                button.par.value0 = 1
                
                # Programar desactivación en 5 frames
                globals()['buttonDeactivateFrame'] = absTime.frame + 5
                
                print(f"[TouchDesigner] ✅ Pulso programado - JobId: {data.get('jobId')}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

### Ventajas:
- ✅ Funciona en cualquier contexto
- ✅ Control preciso por frames

### Desventajas:
- ⚠️ Requiere un Python CHOP ejecutándose constantemente
- ⚠️ Usa variables globales

---

## SOLUCIÓN 4: Usar el Parámetro `pulse` del Botón

### Descripción
Algunos botones en TouchDesigner tienen un parámetro `pulse` que puede ser pulsado directamente.

### Código:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Intentar usar el parámetro pulse si existe
                if hasattr(button.par, 'pulse'):
                    button.par.pulse.pulse()
                    print(f"[TouchDesigner] ✅ Pulso usando parámetro pulse - JobId: {data.get('jobId')}")
                else:
                    # Fallback: activar y desactivar manualmente
                    button.par.value0 = 1
                    # Usar callback del botón como alternativa
                    button.callback(button, None)
                    print(f"[TouchDesigner] ✅ Pulso usando callback (fallback) - JobId: {data.get('jobId')}")
            else:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1'")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

### Ventajas:
- ✅ Método nativo de TouchDesigner
- ✅ Muy simple si el parámetro existe

### Desventajas:
- ⚠️ No todos los botones tienen este parámetro
- ⚠️ Requiere verificar si existe

---

## SOLUCIÓN 5: Usar DAT Execute con Script en el Botón

### Descripción
Configurar el botón para que tenga su propio script que lo desactive automáticamente.

### Pasos:

1. **En el botón (`button1`)**:
   - Click derecho → Edit Script
   - O crear un Text DAT conectado al botón

2. **Código en el callback del botón** (`onValueChange`):

```python
def onValueChange(channel, sampleIndex, val, prev):
    # Cuando el botón se activa (val = 1), programar desactivación
    if val == 1:
        # Desactivar después de 5 frames
        def deactivate():
            me.par.value0 = 0
        
        me.delayCall(deactivate, delayFrames=5)
    
    return
```

3. **Código en el WebSocket callback** (más simple):

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Simplemente activar, el botón se desactivará automáticamente
                button.par.value0 = 1
                print(f"[TouchDesigner] ✅ Botón activado (se desactivará automáticamente) - JobId: {data.get('jobId')}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

### Ventajas:
- ✅ La lógica de pulso está en el botón mismo
- ✅ Funciona para cualquier activación del botón (manual o programática)

### Desventajas:
- ⚠️ Requiere modificar el botón
- ⚠️ Puede afectar el comportamiento normal del botón

---

## SOLUCIÓN 6: Usar `run()` con Sintaxis Correcta y Contexto

### Descripción
Usar `run()` pero asegurándose de que se ejecute en el contexto correcto.

### Código:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Activar el botón
                button.par.value0 = 1
                
                # Usar run() con el contexto correcto (el WebSocket DAT)
                # IMPORTANTE: Usar 'dat' en lugar de 'me'
                def deactivate():
                    op('button1').par.value0 = 0
                
                # Intentar con el DAT como contexto
                dat.delayCall(deactivate, delayFrames=5)
                
                # Si eso no funciona, intentar con run()
                # run('op("button1").par.value0 = 0', delayFrames=5)
                
                print(f"[TouchDesigner] ✅ Pulso iniciado - JobId: {data.get('jobId')}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
        # Si delayCall falla, intentar run()
        try:
            run('op("button1").par.value0 = 0', delayFrames=5)
        except:
            pass
    
    return
```

---

## SOLUCIÓN 7: Activar/Desactivar en el Mismo Frame (Pulso Instantáneo)

### Descripción
Si solo necesitas que el callback del botón se ejecute, puedes activar y desactivar inmediatamente.

### Código:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Activar
                button.par.value0 = 1
                
                # Desactivar inmediatamente (en el mismo frame)
                # Esto ejecutará el callback del botón pero el valor visual será 0
                button.par.value0 = 0
                
                print(f"[TouchDesigner] ✅ Pulso instantáneo - JobId: {data.get('jobId')}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

### Ventajas:
- ✅ Muy simple
- ✅ No requiere delays

### Desventajas:
- ⚠️ El pulso es tan rápido que puede no ser visible visualmente
- ⚠️ Puede no ejecutar el callback correctamente

---

## SOLUCIÓN 8: Usar un CHOP Trigger

### Descripción
Usar un Trigger CHOP que se active brevemente cuando llega el mensaje.

### Pasos:

1. **Crear un Trigger CHOP** (`trigger1`):
   - Click derecho → Create → CHOP → Trigger

2. **Conectar Trigger al Botón**:
   - Conectar la salida del Trigger al parámetro `value0` del botón

3. **Código en el WebSocket callback**:

```python
def onReceiveText(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            trigger = op('trigger1')
            
            if trigger:
                # Activar el trigger (esto creará un pulso)
                trigger.par.trigger = 1
                print(f"[TouchDesigner] ✅ Trigger activado - JobId: {data.get('jobId')}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
    
    return
```

---

## Comparación de Soluciones

| Solución | Complejidad | Confiabilidad | Requiere Componentes Extra | Recomendación |
|----------|-------------|---------------|---------------------------|---------------|
| **1. Callback del botón** | ⭐ Baja | ⭐⭐⭐ Excelente | ❌ No | ⭐⭐⭐ **MEJOR** |
| **2. Timer CHOP** | ⭐⭐⭐ Alta | ⭐⭐⭐ Excelente | ✅ Sí | ⭐⭐⭐ Excelente |
| **3. Python CHOP con frame counter** | ⭐⭐ Media | ⭐⭐⭐ Excelente | ✅ Sí | ⭐⭐ Buena |
| **4. Parámetro pulse** | ⭐ Baja | ⭐⭐ Buena | ❌ No | ⭐⭐ Buena |
| **5. DAT Execute en botón** | ⭐⭐ Media | ⭐⭐⭐ Excelente | ❌ No | ⭐⭐⭐ Excelente |
| **6. run() con contexto** | ⭐ Baja | ⭐ Variable | ❌ No | ⭐⭐ Buena |
| **7. Pulso instantáneo** | ⭐ Baja | ⭐⭐ Buena | ❌ No | ⭐ Limitada |
| **8. Trigger CHOP** | ⭐⭐ Media | ⭐⭐⭐ Excelente | ✅ Sí | ⭐⭐ Buena |

---

## Recomendación Final

### Orden de Prueba Recomendado:

1. **PRIMERO**: Prueba la **SOLUCIÓN 1** (Callback del botón) - Es la más simple y debería funcionar
2. **SEGUNDO**: Si no funciona, prueba la **SOLUCIÓN 5** (DAT Execute en el botón) - Muy confiable
3. **TERCERO**: Si necesitas más control, usa la **SOLUCIÓN 2** (Timer CHOP) - Más componentes pero muy confiable

---

## Código Final Recomendado (Solución 1 + Fallbacks)

```python
def onReceiveText(dat, rowIndex, message):
    """
    Callback que activa el botón con un pulso cuando llega un mensaje de captura.
    Prueba múltiples métodos hasta que uno funcione.
    """
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            jobId = data.get('jobId', 'unknown')
            button = op('button1')
            
            if not button:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1'")
                return
            
            # MÉTODO 1: Usar callback del botón (más confiable)
            try:
                button.callback(button, None)
                print(f"[TouchDesigner] ✅ Pulso usando callback - JobId: {jobId}")
                return
            except Exception as e:
                print(f"[TouchDesigner] ⚠️ Callback falló: {e}")
            
            # MÉTODO 2: Usar parámetro pulse si existe
            try:
                if hasattr(button.par, 'pulse'):
                    button.par.pulse.pulse()
                    print(f"[TouchDesigner] ✅ Pulso usando parámetro pulse - JobId: {jobId}")
                    return
            except Exception as e:
                print(f"[TouchDesigner] ⚠️ Pulse falló: {e}")
            
            # MÉTODO 3: Activar y usar delayCall con contexto del DAT
            try:
                button.par.value0 = 1
                def deactivate():
                    op('button1').par.value0 = 0
                dat.delayCall(deactivate, delayFrames=5)
                print(f"[TouchDesigner] ✅ Pulso usando delayCall - JobId: {jobId}")
                return
            except Exception as e:
                print(f"[TouchDesigner] ⚠️ delayCall falló: {e}")
            
            # MÉTODO 4: Último recurso - pulso instantáneo
            button.par.value0 = 1
            button.par.value0 = 0
            print(f"[TouchDesigner] ⚠️ Pulso instantáneo (sin delay) - JobId: {jobId}")
        
    except json.JSONDecodeError:
        print(f"[TouchDesigner] ⚠️ ERROR: No se pudo parsear JSON: {message}")
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return
```

---

## Troubleshooting

### El botón sigue activo:

1. **Verifica que el callback se esté ejecutando**:
   - Agrega `print()` statements para ver qué método se ejecuta
   - Revisa la consola de TouchDesigner

2. **Verifica el tipo de botón**:
   - Asegúrate de que sea "Momentary"
   - Si es "Toggle", cambiará el comportamiento

3. **Prueba cada solución individualmente**:
   - No mezcles múltiples métodos a la vez
   - Prueba una solución, si no funciona, prueba la siguiente

4. **Verifica que el botón tenga un callback configurado**:
   - Si el botón no tiene callback, `button.callback()` puede no funcionar como esperado

---

## Conclusión

La **SOLUCIÓN 1** (usar `button.callback()`) es la más recomendada porque simula un click real del usuario y debería hacer que el botón Momentary vuelva a OFF automáticamente. Si no funciona, prueba las otras soluciones en el orden recomendado.

