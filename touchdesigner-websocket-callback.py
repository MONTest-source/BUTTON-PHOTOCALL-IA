"""
Código Python para el callback onReceiveText() del WebSocket DAT en TouchDesigner.

INSTRUCCIONES:
1. En TouchDesigner, selecciona el WebSocket DAT (websocket1)
2. Click derecho → "Edit Callbacks" o "Edit Script"
3. Ve a la pestaña "onReceiveText"
4. Pega este código completo
5. Guarda (Ctrl+S o Cmd+S)
6. Prueba presionando el botón en la aplicación web

NOTA: Asegúrate de que tu botón se llame exactamente "button1" o cambia el nombre en el código.
"""

def onReceiveText(dat, rowIndex, message):
    """
    Callback que se ejecuta automáticamente cuando llega un mensaje WebSocket de texto.
    Activa el botón button1 cuando recibe un mensaje de tipo 'capture'.
    
    Args:
        dat: El WebSocket DAT (websocket1)
        rowIndex: Índice de la fila del mensaje
        message: El mensaje recibido como string
    
    Nota: 'op' es una función global proporcionada por TouchDesigner.
    """
    import json

    try:
        data = json.loads(message)

        if data.get('type') == 'capture':
            btn = op('button1')  # tu Button COMP - 'op' es función global de TouchDesigner

            if btn is not None:
                # Simula un click real (down+up) del botón momentary
                btn.click()  # NO pases 'val', déjalo vacío

                print("[TouchDesigner] ✅ Botón 'button1' clicado desde WebSocket")

    except Exception as e:
        print("ERROR onReceiveText:", e)

    return

