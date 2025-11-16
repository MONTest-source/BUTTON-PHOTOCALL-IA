"""
ALTERNATIVAS para crear un pulso en el botón de TouchDesigner.

Si el método con delayCall no funciona, prueba estas alternativas:
"""

# ============================================
# MÉTODO 1: Usando delayCall (Recomendado)
# ============================================
def onReceiveText_METHOD1(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Activar
                button.par.value0 = 1
                
                # Desactivar después de 5 frames usando delayCall
                def deactivate():
                    op('button1').par.value0 = 0
                
                me.delayCall(deactivate, delayFrames=5)
                print("[TouchDesigner] ✅ Pulso enviado (Método 1)")
    
    except Exception as e:
        print(f"ERROR: {e}")
    
    return


# ============================================
# MÉTODO 2: Usando run() con sintaxis correcta
# ============================================
def onReceiveText_METHOD2(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Activar
                button.par.value0 = 1
                
                # Desactivar usando run() - asegúrate de usar comillas simples dentro
                run("op('button1').par.value0 = 0", delayFrames=5)
                print("[TouchDesigner] ✅ Pulso enviado (Método 2)")
    
    except Exception as e:
        print(f"ERROR: {e}")
    
    return


# ============================================
# MÉTODO 3: Activar/Desactivar en el mismo frame (muy rápido)
# ============================================
def onReceiveText_METHOD3(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Activar
                button.par.value0 = 1
                
                # Desactivar inmediatamente (pulso muy corto, casi instantáneo)
                # Esto puede no ser visible visualmente pero activará el callback del botón
                button.par.value0 = 0
                
                print("[TouchDesigner] ✅ Pulso instantáneo (Método 3)")
    
    except Exception as e:
        print(f"ERROR: {e}")
    
    return


# ============================================
# MÉTODO 4: Usando el método pulse() del botón (si existe)
# ============================================
def onReceiveText_METHOD4(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Intentar usar el método pulse() si existe
                if hasattr(button, 'pulse'):
                    button.pulse()
                    print("[TouchDesigner] ✅ Pulso usando método pulse() (Método 4)")
                else:
                    # Fallback al método 1
                    button.par.value0 = 1
                    def deactivate():
                        op('button1').par.value0 = 0
                    me.delayCall(deactivate, delayFrames=5)
                    print("[TouchDesigner] ✅ Pulso usando fallback (Método 4)")
    
    except Exception as e:
        print(f"ERROR: {e}")
    
    return


# ============================================
# MÉTODO 5: Usando callback del botón directamente
# ============================================
def onReceiveText_METHOD5(dat, rowIndex, message):
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            button = op('button1')
            
            if button:
                # Ejecutar el callback del botón directamente (simula un click)
                # Esto activará cualquier lógica que tenga el botón configurada
                button.callback(button, None)
                
                print("[TouchDesigner] ✅ Callback del botón ejecutado (Método 5)")
    
    except Exception as e:
        print(f"ERROR: {e}")
    
    return


# ============================================
# CÓDIGO FINAL RECOMENDADO (usa el que funcione)
# ============================================
def onReceiveText(dat, rowIndex, message):
    """
    Versión final que prueba múltiples métodos hasta que uno funcione.
    """
    import json
    
    try:
        data = json.loads(message)
        
        if data.get('type') == 'capture':
            jobId = data.get('jobId', 'unknown')
            button = op('button1')
            
            if button:
                # MÉTODO RECOMENDADO: Activar y usar delayCall para desactivar
                button.par.value0 = 1
                
                def deactivateButton():
                    try:
                        op('button1').par.value0 = 0
                        print(f"[TouchDesigner] ✅ Botón desactivado después del pulso")
                    except:
                        pass
                
                # Intentar delayCall primero
                try:
                    me.delayCall(deactivateButton, delayFrames=5)
                    print(f"[TouchDesigner] ✅ Pulso enviado (delayCall) - JobId: {jobId}")
                except:
                    # Si delayCall falla, intentar con run()
                    try:
                        run("op('button1').par.value0 = 0", delayFrames=5)
                        print(f"[TouchDesigner] ✅ Pulso enviado (run) - JobId: {jobId}")
                    except:
                        # Último recurso: pulso instantáneo
                        button.par.value0 = 0
                        print(f"[TouchDesigner] ⚠️ Pulso instantáneo (sin delay) - JobId: {jobId}")
            
            else:
                print("[TouchDesigner] ⚠️ ERROR: No se encontró 'button1'")
        
    except Exception as e:
        print(f"[TouchDesigner] ⚠️ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
    
    return

