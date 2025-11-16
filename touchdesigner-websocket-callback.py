"""
Código Python para el callback onReceive() del WebSocket DAT en TouchDesigner.

INSTRUCCIONES:
1. En TouchDesigner, selecciona el WebSocket DAT (websocket1)
2. Click derecho → "Edit Callbacks" o "Edit Script"
3. Ve a la pestaña "onReceive"
4. Pega este código completo
5. Guarda (Ctrl+S o Cmd+S)
6. Prueba presionando el botón en la aplicación web

NOTA: Asegúrate de que tu botón se llame exactamente "button1" o cambia el nombre en el código.
"""

def onReceive(dat, rowIndex, message, bytes):
    """
    Callback que se ejecuta automáticamente cuando llega un mensaje WebSocket.
    Activa el botón button1 cuando recibe un mensaje de tipo 'capture'.
    
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
            jobId = data.get('jobId', 'unknown')
            
            # Obtener referencia al botón
            # CAMBIA 'button1' POR EL NOMBRE DE TU BOTÓN SI ES DIFERENTE
            button = op('button1')
            
            if button:
                # Activar el botón (simular click)
                button.par.value0 = 1
                
                # Log para debugging (aparece en la consola de TouchDesigner)
                print(f"[TouchDesigner] ✅ Botón activado por captura - JobId: {jobId}")
                
                # OPCIONAL: Desactivar el botón después de 1 segundo (60 frames a 60fps)
                # Descomenta la siguiente línea si quieres que el botón se desactive automáticamente:
                # run("op('button1').par.value0 = 0", delayFrames=60)
                
            else:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1'")
                print("[TouchDesigner] 💡 Tip: Verifica que el botón se llame exactamente 'button1' o cambia el nombre en el código")
        
        # Opcional: Manejar mensaje de conexión
        elif data.get('type') == 'connected':
            print("[TouchDesigner] ✅ Conectado al servidor Photocall")
        
        # Opcional: Manejar otros tipos de mensajes
        else:
            print(f"[TouchDesigner] 📨 Mensaje recibido (tipo no manejado): {data.get('type')}")
        
    except json.JSONDecodeError:
        print(f"[TouchDesigner] ⚠️ ERROR: No se pudo parsear JSON")
        print(f"[TouchDesigner] Mensaje recibido: {message}")
    
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return

