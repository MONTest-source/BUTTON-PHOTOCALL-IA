# TouchDesigner + ComfyTD (WebSocket Trigger) — Auto-save cuando termina (Record directo)

## Objetivo
Pipeline estable para:
1) Recibir un mensaje por WebSocket (`type=capture` + `jobId`)
2) Lanzar generación en ComfyTD
3) Detectar fin de generación con `uiprogress`
4) Guardar automáticamente 1 imagen en disco usando **Movie File Out TOP → Record** (sin Button COMP)

Resultado: captura consistente, sin clicks manuales y con naming por fecha + `jobId`.

---

## TL;DR (qué terminó funcionando)
- **NO** usar `button1` para controlar `record`.
- **SÍ** controlar `moviefileout1.par.record` por Python desde un `CHOP Execute DAT`.
- Detectar “finished” con `uiprogress` → `logic1` (threshold ~0.99) → `onOffToOn()`.

---

## Estructura de nodos (resumen)
### Entrada y generación
- `websocket2` + `websocket2_callbacks` (DAT)
- `ComfyTD` (COMP)
- TOP final hacia guardado: `null2` → `moviefileout1`

### Progreso (fin de generación)
- `par1` (Parameter CHOP) leyendo parámetros de `ComfyTD`:
  - `uiprogress`
  - `uiqueue` (opcional para cola)

- `select1` (Select CHOP): selecciona `uiprogress`
- `logic1` (Logic CHOP): convierte a booleano “DONE” (umbral ~0.99)
- `chopexec1` (CHOP Execute DAT): dispara el guardado cuando `logic1` pasa 0→1

---

## Configuración clave: Movie File Out TOP (`moviefileout1`)
- **Type**: `Image`
- **Image File Type**: `JPEG` (o PNG si lo prefieres)
- **Record**: controlado por script (no manual)
- Input: conecta el TOP final que quieres guardar (ej. `null2`)

Ejemplo de ruta real usada:
`E:\Unidades compartidas\DPTO. CREATIVO\Photocall\PhotoCall-04-01-2026.jpg`

> Nota: la letra de unidad (`E:`) puede cambiar según máquina/montaje.

---

## WebSocket callback (trigger de generación)
Archivo: `websocket2_callbacks` (DAT). Arma el estado y lanza ComfyTD cuando llega el mensaje `capture`.

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

        comfy = op('ComfyTD')
        if comfy is not None:
            if hasattr(comfy.par, 'Generate'):
                comfy.par.Generate.pulse()
            elif hasattr(comfy.par, 'Regenerate'):
                comfy.par.Regenerate.pulse()

        print(f'[TD] Job {jobId} → Generando con ComfyTD...')

    except Exception as e:
        print('onReceiveText ERROR:', e)
```

---

## Disparo de guardado automático (CHOP Execute DAT: `chopexec1`)
Se engancha al output booleano de `logic1` (0→1 cuando `uiprogress` ~1.0). Ajusta ruta, nombre y activa `record`.

```python
# Evento principal: cuando logic1 pasa de 0 a 1
def onOffToOn(channel, sampleIndex, val, prev):
    import datetime
    root = op('/project1')
    job = root.fetch('pending_job', 'job')
    movie = op('moviefileout1')

    if movie is None:
        print('[TD] moviefileout1 no encontrado')
        return

    # Nombre: fecha + jobId
    stamp = datetime.datetime.now().strftime('%Y-%m-%d-%H-%M-%S')
    movie.par.file = f'E:/Unidades compartidas/DPTO. CREATIVO/Photocall/PhotoCall-{stamp}-{job}.jpg'

    # Disparar captura de imagen
    movie.par.record = 1
    run("op('moviefileout1').par.record = 0", delayFrames=2)  # libera el toggle

    root.store('saved', True)
    print(f'[TD] Guardado OK → {movie.par.file.eval()}')
    return
```

Notas:
- Si quieres PNG, cambia `Image File Type` a PNG y ajusta la extensión.
- Ajusta la ruta base según la unidad en tu máquina.
- Usa `delayFrames` corto para soltar `record` y evitar re-disparos.

---

## Flujo completo
1. Web envía `{"type":"capture","jobId":..., "countdownSec":5}` después de la cuenta atrás.
2. TouchDesigner recibe en `websocket2` → callback almacena `jobId` y pulsa `Generate/Regenerate` en `ComfyTD`.
3. `uiprogress` sube; `logic1` detecta fin (≈0.99/1.0).
4. `chopexec1.onOffToOn` arma nombre y activa `moviefileout1.par.record` para guardar la imagen.
5. Archivo queda nombrado por fecha + `jobId`, sin botón manual.

---

## Troubleshooting rápido
- No guarda: revisa que `logic1` realmente llegue a 1; baja el threshold si hace falta.
- Ruta inválida: confirma la unidad y permisos de la carpeta destino.
- `moviefileout1` no existe: revisa el path de operador en el script.
- Quieres varias colas: usa `uiqueue` para inspeccionar backlog, pero el flujo básico usa solo `uiprogress`.
