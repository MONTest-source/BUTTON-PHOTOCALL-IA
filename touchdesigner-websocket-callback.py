"""
Código Python para el callback onReceiveText() del WebSocket DAT en TouchDesigner.

INSTRUCCIONES:
1. En TouchDesigner, selecciona el WebSocket DAT (websocket1)
2. Click derecho → "Edit Callbacks" o "Edit Script"
3. Ve a la pestaña "onReceiveText" (o "onReceive" dependiendo de tu versión)
4. Pega este código completo
5. Guarda (Ctrl+S o Cmd+S)
6. Prueba presionando el botón en la aplicación web

NOTA: Asegúrate de que tu botón se llame exactamente "button1" o cambia el nombre en el código.

IMPORTANTE: Si tu versión de TouchDesigner usa "onReceive" en lugar de "onReceiveText",
simplemente cambia el nombre de la función de "onReceiveText" a "onReceive".
"""

def onReceiveText(dat, rowIndex, message):
    """
    Callback que se ejecuta automáticamente cuando llega un mensaje WebSocket de texto.
    Activa el botón button1 cuando recibe un mensaje de tipo 'capture'.
    
    Args:
        dat: El WebSocket DAT (websocket1)
        rowIndex: Índice de la fila del mensaje
        message: El mensaje recibido como string
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
                # MÉTODO 1: Usar callback del botón (MÁS RECOMENDADO - simula click real)
                # Esto debería hacer que el botón Momentary vuelva a OFF automáticamente
                try:
                    button.callback(button, None)
                    print(f"[TouchDesigner] ✅ Pulso usando callback - JobId: {jobId}")
                    return  # Salir si funciona
                except Exception as e:
                    print(f"[TouchDesigner] ⚠️ Callback falló: {e}, intentando método alternativo...")
                
                # MÉTODO 2: Usar parámetro pulse si existe
                try:
                    if hasattr(button.par, 'pulse'):
                        button.par.pulse.pulse()
                        print(f"[TouchDesigner] ✅ Pulso usando parámetro pulse - JobId: {jobId}")
                        return
                except:
                    pass
                
                # MÉTODO 3: Activar y usar delayCall con contexto del DAT (no 'me')
                try:
                    button.par.value0 = 1
                    def deactivateButton():
                        op('button1').par.value0 = 0
                    # Usar 'dat' (el WebSocket DAT) en lugar de 'me'
                    dat.delayCall(deactivateButton, delayFrames=5)
                    print(f"[TouchDesigner] ✅ Pulso usando delayCall - JobId: {jobId}")
                    return
                except Exception as e:
                    print(f"[TouchDesigner] ⚠️ delayCall falló: {e}, intentando run()...")
                
                # MÉTODO 4: Usar run() como último recurso
                try:
                    button.par.value0 = 1
                    run("op('button1').par.value0 = 0", delayFrames=5)
                    print(f"[TouchDesigner] ✅ Pulso usando run() - JobId: {jobId}")
                    return
                except Exception as e:
                    print(f"[TouchDesigner] ⚠️ run() falló: {e}")
                
                # MÉTODO 5: Último recurso - pulso instantáneo
                button.par.value0 = 1
                button.par.value0 = 0
                print(f"[TouchDesigner] ⚠️ Pulso instantáneo (sin delay) - JobId: {jobId}")
                
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

