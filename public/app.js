// ============================================
// CONSTANTS & STATE
// ============================================
let countdownInterval = null;
let currentJobId = null;
let resetTimeout = null;
const COUNTDOWN_DURATION = 5; // 5 segundos
const RESET_UI_TIMEOUT = 30000; // 30 segundos (30 minutos = 1800000)

// WebSocket connection
let wsConnection = null;
// WebSocket URL - Se adapta automáticamente a HTTP/HTTPS y ws/wss
const WS_URL = (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + window.location.host;

// ============================================
// PERFORMANCE DETECTION & OPTIMIZATION
// ============================================
let performanceMode = 'normal'; // 'normal', 'reduced'

// Detectar rendimiento del dispositivo
function detectPerformanceMode() {
    // Detectar dispositivos móviles o navegadores lentos
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isLowEnd = navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;
    const hasReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    // Detectar FPS mediante prueba rápida
    let lastTime = performance.now();
    let frameCount = 0;
    let testFrames = 0;
    
    function testFPS() {
        frameCount++;
        testFrames++;
        
        if (testFrames >= 30) {
            const fps = (frameCount / ((performance.now() - lastTime) / 1000));
            if (fps < 30 || isMobile || isLowEnd || hasReducedMotion) {
                performanceMode = 'reduced';
                console.log('[Performance] Modo reducido activado (FPS:', fps.toFixed(1), ')');
            }
            return;
        }
        requestAnimationFrame(testFPS);
    }
    requestAnimationFrame(testFPS);
}

// Iniciar detección de rendimiento
detectPerformanceMode();

// ============================================
// DOM SELECTORS
// ============================================
const captureBtn = document.getElementById('capture-btn');
const retryBtn = document.getElementById('retry-btn');
const openLinkBtn = document.getElementById('open-link-btn');

const stateIdle = document.getElementById('state-idle');
const stateCountdown = document.getElementById('state-countdown');
const stateReady = document.getElementById('state-ready');
const stateError = document.getElementById('state-error');

const countdownDisplay = document.getElementById('countdown-display');
const countdownMessage = document.getElementById('countdown-message');
const loadingSpinner = document.getElementById('loading-spinner');
const qrCodeImg = document.getElementById('qr-code-img');

// ============================================
// READY → MOSTRAR QR (QR fijo a carpeta Drive)
// ============================================
const DEFAULT_QR_URL = '/qr.png';

function buildQrSrc(jobId, qrUrl = DEFAULT_QR_URL) {
    const base = qrUrl || DEFAULT_QR_URL;
    // Cache-bust para kiosks/Chrome kiosk (evita PNG cacheado)
    const sep = base.includes('?') ? '&' : '?';
    const jid = jobId ? encodeURIComponent(jobId) : 'na';
    return `${base}${sep}jobId=${jid}&t=${Date.now()}`;
}

function showReadyState(qrUrlFromServer) {
    // En este proyecto el QR es fijo a carpeta, así que siempre podemos mostrarlo.
    qrCodeImg.src = buildQrSrc(currentJobId, qrUrlFromServer);
    showState(stateReady);
    showToast('Tu foto está lista', 'success');

    // Animación existente
    const qrContainer = document.querySelector('.btn-qr-container');
    if (qrContainer) {
        qrContainer.classList.add('qr-appearing');
        setTimeout(() => qrContainer.classList.remove('qr-appearing'), 2000);
    }

    // Rearm reset
    if (resetTimeout) clearTimeout(resetTimeout);
    resetTimeout = setTimeout(() => resetUI(), RESET_UI_TIMEOUT);
}

const toastContainer = document.getElementById('toast-container');

// ============================================
// STATE MANAGEMENT
// ============================================
function showState(stateElement) {
    [stateIdle, stateCountdown, stateReady, stateError].forEach(el => {
        el.classList.add('hidden');
    });
    stateElement.classList.remove('hidden');
}

function resetUI() {
    // Pedir a backend que ordene a TouchDesigner borrar el último archivo (Drive sync).
    const jobIdToClean = currentJobId;
    if (jobIdToClean) {
        fetch('/api/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobId: jobIdToClean })
        }).catch(() => { /* best-effort */ });
    }
    currentJobId = null;

    // Activar animación de reinicio antes de resetear
    playResetAnimation();
    
    // Esperar a que termine la animación antes de resetear el UI
    setTimeout(() => {
        clearInterval(countdownInterval);
        clearTimeout(resetTimeout);
        countdownInterval = null;
        resetTimeout = null;
        if (countdownDisplay) {
            countdownDisplay.textContent = '';
            countdownDisplay.style.display = 'block';
        }
        if (countdownMessage) countdownMessage.textContent = '';
        if (loadingSpinner) {
            loadingSpinner.classList.remove('active');
        }
        if (qrCodeImg) qrCodeImg.src = '';
        captureBtn.disabled = false;
        showState(stateIdle);
        
        // UI reseteada al estado inicial
    }, 600); // Esperar medio segundo para que la animación se vea bien
}

// ============================================
// ANIMACIÓN DE REINICIO
// ============================================
function playResetAnimation() {
    const overlay = document.getElementById('reset-overlay');
    const circle = document.getElementById('reset-circle');
    const sweep = document.getElementById('reset-sweep');
    const message = document.getElementById('reset-message');
    
    // Activar todas las animaciones simultáneamente
    if (overlay) {
        overlay.classList.remove('active');
        // Forzar reflow para reiniciar la animación
        void overlay.offsetWidth;
        overlay.classList.add('active');
    }
    
    if (circle) {
        circle.classList.remove('active');
        void circle.offsetWidth;
        circle.classList.add('active');
    }
    
    if (sweep) {
        sweep.classList.remove('active');
        void sweep.offsetWidth;
        sweep.classList.add('active');
    }
    
    if (message) {
        message.classList.remove('active');
        void message.offsetWidth;
        message.classList.add('active');
    }
    
    // Dispersar murciélagos al reiniciar (efecto de "reset")
    if (wavesAnimation) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        // Crear murciélagos que se dispersan en todas las direcciones
        wavesAnimation.triggerBats(centerX, centerY, 'high');
    }
    
    // Remover clases después de la animación
    setTimeout(() => {
        if (overlay) overlay.classList.remove('active');
        if (circle) circle.classList.remove('active');
        if (sweep) sweep.classList.remove('active');
        if (message) message.classList.remove('active');
    }, 1200);
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'assertive');
    
    const icon = type === 'success' ? '✓' : '⚠';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideUp 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ============================================
// COUNTDOWN
// ============================================
function startCountdown(duration, onComplete) {
    showState(stateCountdown);
    let timeLeft = duration;
    countdownDisplay.textContent = timeLeft;
    countdownDisplay.setAttribute('aria-label', `Cuenta atrás: ${timeLeft} segundos`);
    
    // Mostrar mensaje durante la cuenta atrás (momento de la captura)
    countdownMessage.textContent = 'Mantén la pose, no te muevas, pronto se capturará tu foto…';

    countdownInterval = setInterval(() => {
        timeLeft--;
        countdownDisplay.textContent = timeLeft;
        countdownDisplay.setAttribute('aria-label', `Cuenta atrás: ${timeLeft} segundos`);
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownInterval = null;
            // Ocultar el número y mostrar el spinner de carga
            countdownDisplay.textContent = '';
            countdownDisplay.style.display = 'none';
            
            // Cambiar el mensaje cuando aparece el spinner
            countdownMessage.textContent = 'Espere, su foto estará lista en unos instantes…';
            
            // Mostrar spinner de carga
            if (loadingSpinner) {
                loadingSpinner.classList.add('active');
            }

            const completionPromise = typeof onComplete === 'function'
                ? Promise.resolve().then(() => onComplete())
                : Promise.resolve();

            completionPromise.catch(() => {
                if (loadingSpinner) {
                    loadingSpinner.classList.remove('active');
                }
            });
            
            // Mantener el mensaje visible por 10 segundos más antes de mostrar QR
            setTimeout(() => {
                completionPromise
                  .then(() => {
                      // Ocultar spinner antes de mostrar QR
                      if (loadingSpinner) {
                          loadingSpinner.classList.remove('active');
                      }
                      showQR();
                  })
                  .catch(() => {
                      // El flujo de error ya fue manejado en onComplete
                  });
            }, 10000); // 10 segundos adicionales con el mensaje
        }
    }, 1000);
}

async function triggerCaptureAfterCountdown() {
    try {
        const resp = await fetch('/api/capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!resp.ok) {
            throw new Error('capture_request_failed');
        }

        const data = await resp.json();
        currentJobId = data.jobId;
    } catch (error) {
        showError('No se pudo iniciar la captura. Reintenta.');
        captureBtn.disabled = false;
        throw error;
    }
}

// ============================================
// GENERATE AND SHOW QR
// ============================================
function showQR(){
    // Necesitamos currentJobId del /api/capture
    if(!currentJobId){
        // fallback visual si algo falló
        showState(stateError);
        showError('No se pudo iniciar la captura. Reintenta.');
        captureBtn.disabled = false;
        return;
    }
    // Polling al backend hasta que el QR esté listo
    const startTs = Date.now();
    const poll = () => {
        fetch(`/api/status/${currentJobId}`)
          .then(r=>r.json())
          .then(s=>{
            if(s.status==='ready'){
                showReadyState(s.qrUrl);
            } else if(s.status==='failed'){
                showState(stateError);
                showError(s.error || 'Fallo procesando tu foto.');
                captureBtn.disabled = false;
            } else {
                // sigue pendiente
                if (Date.now() - startTs < 120000) { // 2 min guardrail
                    setTimeout(poll, 1000);
                } else {
                    showState(stateError);
                    showError('Tiempo de espera agotado. Intenta de nuevo.');
                    captureBtn.disabled = false;
                }
            }
          })
          .catch(()=>{
              setTimeout(poll,1000);
          });
    };
    poll();
}

// ============================================
// ERROR HANDLING
// ============================================
function showError(message) {
    showState(stateError);
    showToast(message, 'error');
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================
let wsReconnectAttempts = 0;
const MAX_WS_RECONNECT_ATTEMPTS = 3;
let wsReconnectTimeout = null;

function connectWebSocket() {
    // No intentar conectar si ya hay demasiados intentos fallidos
    if (wsReconnectAttempts >= MAX_WS_RECONNECT_ATTEMPTS) {
        return; // Silenciosamente dejar de intentar
    }

    try {
        wsConnection = new WebSocket(WS_URL);
        
        wsConnection.onopen = () => {
            console.log('[WebSocket] Conectado al servidor');
            wsReconnectAttempts = 0; // Resetear contador al conectar exitosamente
        };
        
        wsConnection.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                const sameJob = !data.jobId || !currentJobId || data.jobId === currentJobId;

                if (data.type === 'connected') {
                    console.log('[WebSocket] Conectado:', data.message);
                    return;
                }

                // Progreso en tiempo real (opcional)
                if (data.type === 'progress' && sameJob) {
                    const pct = typeof data.progress === 'number'
                        ? Math.round(Math.max(0, Math.min(1, data.progress)) * 100)
                        : null;
                    if (pct !== null && countdownMessage) {
                        countdownMessage.textContent = `Procesando... ${pct}%`;
                    }
                    return;
                }

                // Listo: recibir QR por WebSocket (si el backend lo envía)
                if (data.type === 'ready' && sameJob) {
                    showReadyState(data.qrUrl);
                    return;
                }
            } catch (error) {
                // Silenciosamente manejar errores de parsing
            }
        };
        
        wsConnection.onerror = (error) => {
            // No loggear errores de WebSocket si el servidor no está disponible
            // Esto es normal cuando se usa el modo prototipo sin backend
            wsReconnectAttempts++;
        };
        
        wsConnection.onclose = () => {
            // Solo intentar reconectar si no hemos excedido el límite
            if (wsReconnectAttempts < MAX_WS_RECONNECT_ATTEMPTS) {
                wsReconnectTimeout = setTimeout(() => {
                    connectWebSocket();
                }, 3000);
            }
            // Si excedimos el límite, silenciosamente dejar de intentar
        };
    } catch (error) {
        // Silenciosamente manejar errores de creación de WebSocket
        wsReconnectAttempts++;
    }
}

function sendWebSocketMessage(message) {
    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        try {
            wsConnection.send(JSON.stringify(message));
            return true;
        } catch (error) {
            return false;
        }
    }
    return false; // Silenciosamente fallar si no hay conexión
}

// ============================================
// CAPTURE HANDLER
// ============================================
function handleCaptureClick() {
    if (captureBtn.disabled) return;
    
    captureBtn.disabled = true;
    currentJobId = null;
    // Iniciando captura
    
    // Trigger murciélagos desde el botón (MUCHOS al hacer click)
    if (wavesAnimation) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        wavesAnimation.triggerBats(centerX, centerY, 'high');
    }

    // Iniciar cuenta atrás y, al llegar a 0, lanzar la captura hacia el backend/TouchDesigner
    startCountdown(COUNTDOWN_DURATION, triggerCaptureAfterCountdown);
}

// ============================================
// EVENT LISTENERS
// ============================================
captureBtn.addEventListener('click', handleCaptureClick);
retryBtn.addEventListener('click', () => {
    resetUI();
    setTimeout(() => handleCaptureClick(), 100);
});

// Keyboard support
captureBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleCaptureClick();
    }
});

// ============================================
// WAVES ANIMATION
// ============================================
class WavesAnimation {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.waves = [];
        this.bats = [];
        this.animationId = null;
        this.lastFrameTime = 0;
        this.frameSkip = 0; // Para reducir frames en modo reducido
        
        // Forma del murciélago extraída del JSON Lottie (puntos del path)
        this.batShape = [
            [-70.0, 0.0],
            [-55.0, -20.0],
            [-40.0, -25.0],
            [-20.0, -15.0],
            [-10.0, -5.0],
            [-5.0, -20.0],
            [0.0, -35.0],
            [5.0, -20.0],
            [10.0, -5.0],
            [20.0, -15.0],
            [40.0, -25.0],
            [55.0, -20.0],
            [70.0, 0.0],
            [50.0, 10.0],
            [30.0, 25.0],
            [10.0, 30.0],
            [0.0, 20.0],
            [-10.0, 30.0],
            [-30.0, 25.0],
            [-50.0, 10.0]
        ];
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Crear olas iniciales
        this.createWaves();
        this.animate();
    }
    
    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Recrear olas con nuevas posiciones basadas en el nuevo tamaño
        this.createWaves();
    }
    
    createWaves() {
        // OPTIMIZACIÓN: Reducir número de olas en modo reducido
        const waveCount = performanceMode === 'reduced' ? 2 : 4;
        
        // Olas con perspectiva 3D (vista desde arriba)
        const allWaves = [
            {
                centerX: this.canvas.width * 0.3,
                centerY: this.canvas.height * 0.3,
                radius: 150,
                amplitude: 25,
                frequency: 0.02,
                speed: 0.015,
                phase: 0,
                color: 'rgba(0, 224, 255, 0.25)',
                depth: 0.8
            },
            {
                centerX: this.canvas.width * 0.7,
                centerY: this.canvas.height * 0.5,
                radius: 180,
                amplitude: 30,
                frequency: 0.018,
                speed: 0.012,
                phase: Math.PI / 3,
                color: 'rgba(0, 224, 255, 0.2)',
                depth: 0.7
            },
            {
                centerX: this.canvas.width * 0.5,
                centerY: this.canvas.height * 0.7,
                radius: 200,
                amplitude: 35,
                frequency: 0.015,
                speed: 0.01,
                phase: Math.PI / 2,
                color: 'rgba(0, 224, 255, 0.15)',
                depth: 0.6
            },
            {
                centerX: this.canvas.width * 0.2,
                centerY: this.canvas.height * 0.8,
                radius: 120,
                amplitude: 20,
                frequency: 0.022,
                speed: 0.018,
                phase: Math.PI,
                color: 'rgba(0, 224, 255, 0.12)',
                depth: 0.9
            }
        ];
        
        this.waves = allWaves.slice(0, waveCount);
    }
    
    addBat(startX, startY, count = 1) {
        // OPTIMIZACIÓN: Reducir límite de murciélagos (de 50 a 35)
        if (this.bats.length > 35) {
            return; // No agregar más si ya hay muchos
        }
        
        // Crear múltiples murciélagos con trayectorias mejoradas y naturales
        for (let i = 0; i < count; i++) {
            // Ángulo base con variación para crear efecto de enjambre
            const baseAngle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 4; // Velocidad más variada
            const maxDistance = Math.max(this.canvas.width, this.canvas.height) * 1.5;
            const offsetAngle = (Math.PI * 2 / count) * i;
            const spreadRadius = 30; // Radio de dispersión inicial
            
            // Trayectoria con curva natural (vuelo más realista)
            const curveAmount = 0.3 + Math.random() * 0.4; // Cantidad de curva
            const curveDirection = Math.random() > 0.5 ? 1 : -1;
            
            // Velocidad inicial con componente de curva
            let vx = Math.cos(baseAngle) * speed;
            let vy = Math.sin(baseAngle) * speed;
            
            // Añadir componente de curva para vuelo más natural
            const perpendicularAngle = baseAngle + (Math.PI / 2) * curveDirection;
            vx += Math.cos(perpendicularAngle) * speed * curveAmount * 0.3;
            vy += Math.sin(perpendicularAngle) * speed * curveAmount * 0.3;
            
            // Ángulo inicial basado en dirección de movimiento
            const rotationAngle = Math.atan2(vy, vx);
            
            this.bats.push({
                x: startX + Math.cos(offsetAngle) * spreadRadius,
                y: startY + Math.sin(offsetAngle) * spreadRadius,
                vx: vx,
                vy: vy,
                angle: rotationAngle,
                distance: 0,
                maxDistance: maxDistance,
                size: 20 + Math.random() * 12, // Tamaño más variado
                opacity: 1,
                wingPhase: Math.random() * Math.PI * 2,
                wingSpeed: 0.3 + Math.random() * 0.25, // Animación de alas más rápida
                glow: 0.85 + Math.random() * 0.15, // Glow más variado
                color: `rgba(0, 224, 255, 1)`,
                curveAmount: curveAmount, // Guardar para aplicar curva continua
                curveDirection: curveDirection
            });
        }
    }
    
    drawWave(wave) {
        // OPTIMIZACIÓN: Reducir segmentos para mejor rendimiento (de 64 a 32)
        const segments = 32;
        
        // OPTIMIZACIÓN: Reducir número de anillos concéntricos (de 3 a 2)
        for (let ring = 0; ring < 2; ring++) {
            const ringRadius = wave.radius - (ring * 25);
            const ringAmplitude = wave.amplitude * (1 - ring * 0.3);
            
            this.ctx.beginPath();
            
            // OPTIMIZACIÓN: Calcular solo los puntos necesarios
            for (let i = 0; i <= segments; i++) {
                const angle = (Math.PI * 2 / segments) * i;
                const height = Math.sin((angle * wave.frequency * 10) + wave.phase) * ringAmplitude;
                const x = wave.centerX + Math.cos(angle) * ringRadius;
                const y = wave.centerY + Math.sin(angle) * ringRadius + (height * wave.depth);
                
                if (i === 0) {
                    this.ctx.moveTo(x, y);
                } else {
                    this.ctx.lineTo(x, y);
                }
            }
            
            this.ctx.closePath();
            
            // OPTIMIZACIÓN: Usar fillStyle simple en lugar de gradiente complejo
            const opacityMatch = wave.color.match(/rgba?\([^)]+,\s*([\d.]+)\)/);
            const baseOpacity = opacityMatch ? parseFloat(opacityMatch[1]) : 0.2;
            const ringOpacity = baseOpacity * (1 - ring * 0.25);
            this.ctx.fillStyle = `rgba(0, 224, 255, ${ringOpacity * 0.6})`;
            this.ctx.fill();
        }
        
        // OPTIMIZACIÓN: Dibujar contorno solo si es necesario (reducir complejidad)
        if (this.bats.length === 0) { // Solo dibujar contorno cuando no hay murciélagos
        this.ctx.beginPath();
            for (let i = 0; i <= segments; i += 2) { // Saltar puntos para reducir cálculos
            const angle = (Math.PI * 2 / segments) * i;
            const height = Math.sin((angle * wave.frequency * 10) + wave.phase) * wave.amplitude;
            const x = wave.centerX + Math.cos(angle) * wave.radius;
            const y = wave.centerY + Math.sin(angle) * wave.radius + (height * wave.depth);
            
            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }
        this.ctx.closePath();
        this.ctx.strokeStyle = wave.color;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        }
    }
    
    // OPTIMIZACIÓN: Separar actualización de física del dibujado
    updateBat(bat) {
        // Simplificar física de curva (menos cálculos)
        if (bat.curveAmount !== undefined && Math.floor(bat.distance) % 5 === 0) {
            const perpendicularAngle = Math.atan2(bat.vy, bat.vx) + (Math.PI / 2) * bat.curveDirection;
            const curveForce = bat.curveAmount * 0.1;
            bat.vx += Math.cos(perpendicularAngle) * curveForce;
            bat.vy += Math.sin(perpendicularAngle) * curveForce;
        }
        
        // Actualizar posición y animación de alas
        bat.x += bat.vx;
        bat.y += bat.vy;
        bat.distance += Math.abs(bat.vx) + Math.abs(bat.vy);
        bat.wingPhase += bat.wingSpeed;
        
        // Rotación simplificada
        const targetAngle = Math.atan2(bat.vy, bat.vx);
        let angleDiff = targetAngle - bat.angle;
        if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        else if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        bat.angle += angleDiff * 0.2;
        
        // Reducir opacidad con la distancia
        bat.opacity = Math.max(0, 1 - (bat.distance / bat.maxDistance));
        
        // Retornar si debe eliminarse
        return bat.distance <= bat.maxDistance && bat.opacity >= 0.02;
        }
        
    drawBat(bat) {
        // OPTIMIZACIÓN CRÍTICA: Eliminar shadowBlur completamente (muy costoso)
        // En su lugar, usar stroke más grueso y múltiples capas simples
        
        this.ctx.save();
        this.ctx.globalAlpha = bat.opacity;
        
        // Dibujar murciélago
        this.ctx.translate(bat.x, bat.y);
        this.ctx.rotate(bat.angle);
        
        const scale = bat.size / 140;
        
        // Animación de alas
        const wingSpread = Math.sin(bat.wingPhase) * 0.3 + 0.7;
        const wingScaleY = wingSpread;
        
        // OPTIMIZACIÓN: Path simplificado - usar solo puntos clave (reducir de 20 a 8-10 puntos)
        this.ctx.beginPath();
        const points = this.batShape;
        // Usar solo puntos clave: inicio, picos superiores, centro, picos inferiores, fin
        const keyPoints = [0, 2, 6, 10, 12, 14, 16, 18]; // Índices de puntos clave
        this.ctx.moveTo(points[keyPoints[0]][0] * scale, points[keyPoints[0]][1] * scale * wingScaleY);
        
        for (let i = 1; i < keyPoints.length; i++) {
            const idx = keyPoints[i];
            const [x, y] = points[idx];
            this.ctx.lineTo(x * scale, y * scale * wingScaleY);
        }
        this.ctx.closePath();
        
        // OPTIMIZACIÓN: Glow simplificado sin shadowBlur - usar stroke más grueso y opacidad
        const glowOpacity = bat.opacity * bat.glow * 0.5;
        
        // Dibujar glow exterior (stroke más grueso)
        this.ctx.strokeStyle = `rgba(0, 224, 255, ${glowOpacity * 0.3})`;
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        
        // Dibujar cuerpo principal
        this.ctx.fillStyle = '#000000';
        this.ctx.fill();
        
        // Dibujar contorno brillante
        this.ctx.strokeStyle = `rgba(0, 224, 255, ${bat.opacity * 0.8})`;
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawBats() {
        // OPTIMIZACIÓN: Reducir límite (de 50 a 35 para mejor rendimiento)
        if (this.bats.length > 35) {
            this.bats = this.bats.slice(-35);
        }
        
        // OPTIMIZACIÓN CRÍTICA: Separar actualización de física del dibujado
        // Esto evita que filter() llame drawBat() dos veces (una para verificar, otra para dibujar)
        const aliveBats = [];
        for (let i = 0; i < this.bats.length; i++) {
            const bat = this.bats[i];
            if (this.updateBat(bat)) {
                aliveBats.push(bat);
                this.drawBat(bat);
            }
        }
        this.bats = aliveBats;
    }
    
    animate() {
        const now = performance.now();
        
        // OPTIMIZACIÓN: Saltar frames cuando hay murciélagos activos (mayor carga)
        if (this.bats.length > 0) {
            // Si hay murciélagos, reducir FPS a la mitad para mejor rendimiento
            this.frameSkip++;
            if (this.frameSkip % 2 === 0) {
                this.animationId = requestAnimationFrame(() => this.animate());
                return;
            }
        } else if (performanceMode === 'reduced') {
            // Si no hay murciélagos pero estamos en modo reducido, mantener frame skipping
            this.frameSkip++;
            if (this.frameSkip % 2 === 0) {
                this.animationId = requestAnimationFrame(() => this.animate());
                return;
            }
        }
        
        // Limpiar canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ANIMACIÓN DE OLAS (independiente, siempre activa)
        this.waves.forEach(wave => {
            wave.phase += wave.speed;
            this.drawWave(wave);
        });
        
        // ANIMACIÓN DE MURCIÉLAGOS (independiente, solo cuando hay)
        if (this.bats.length > 0) {
            this.drawBats();
        }
        
        this.lastFrameTime = now;
        this.animationId = requestAnimationFrame(() => this.animate());
    }
    
    triggerBats(x, y, intensity = 'normal') {
        // Usar las coordenadas proporcionadas o el centro del canvas como fallback
        const startX = x !== undefined ? x : this.canvas.width / 2;
        const startY = y !== undefined ? y : this.canvas.height / 2;
        
        // OPTIMIZACIÓN: Reducir número de murciélagos aún más (de 10/18 a 8/12)
        let batCount = 8;
        if (intensity === 'high') batCount = 12;
        
        // Generar murciélagos en ráfagas escalonadas para efecto de enjambre
        for (let i = 0; i < batCount; i++) {
            setTimeout(() => {
                // Crear grupos de 2-4 murciélagos a la vez
                const groupSize = 2 + Math.floor(Math.random() * 3);
                this.addBat(startX, startY, groupSize);
            }, i * 40);
        }
        
        // NO modificar las olas - animaciones independientes
    }
}

let wavesAnimation;

// ============================================
// CURSOR TRACKING & PARTICLE EFFECTS
// ============================================
function setupButtonCursorTracking(button) {
    const particlesContainer = button.querySelector('.particles');
    if (!particlesContainer) return;
    
    let mouseX = 0;
    let mouseY = 0;
    let isInside = false;
    let particleInterval = null;
    
    // Obtener el pseudo-elemento ::before para mover la luz
    const style = window.getComputedStyle(button, '::before');
    
    // Actualizar posición de la luz según el cursor
    function updateLightPosition(e) {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        mouseX = x;
        mouseY = y;
        
        // Actualizar posición del ::before usando CSS custom properties
        button.style.setProperty('--cursor-x', `${x}px`);
        button.style.setProperty('--cursor-y', `${y}px`);
    }
    
    // Crear partícula desde el cursor
    function createParticleFromCursor(x, y) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Posición inicial (donde está el cursor)
        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        
        // Dirección aleatoria desde el cursor
        const angle = Math.random() * Math.PI * 2;
        const distance = 30 + Math.random() * 50;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        particlesContainer.appendChild(particle);
        
        // Remover después de la animación
        setTimeout(() => {
            if (particle.parentNode) {
                particle.remove();
            }
        }, 1500);
    }
    
    // Crear partículas desde el punto de clic/touch
    function createClickParticles(x, y) {
        // OPTIMIZACIÓN: Reducir número de partículas (de 12 a 8)
        const particleCount = 8;
        
        // Crear efecto de ondas
        const ripple = document.createElement('div');
        ripple.className = 'click-ripple';
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;
        button.appendChild(ripple);
        
        setTimeout(() => {
            if (ripple.parentNode) {
                ripple.remove();
            }
        }, 600);
        
        // Crear múltiples partículas desde el punto de clic
        for (let i = 0; i < particleCount; i++) {
            setTimeout(() => {
                createParticleFromCursor(x, y);
            }, i * 30);
        }
    }
    
    // Mouse move - seguir cursor
    button.addEventListener('mousemove', (e) => {
        updateLightPosition(e);
        isInside = true;
    });
    
    // Mouse enter
    button.addEventListener('mouseenter', (e) => {
        isInside = true;
        updateLightPosition(e);
        
        // OPTIMIZACIÓN: Reducir frecuencia de partículas (de 150ms a 250ms)
        particleInterval = setInterval(() => {
            if (isInside && !button.disabled) {
                // OPTIMIZACIÓN: Limitar número máximo de partículas activas
                const activeParticles = particlesContainer.querySelectorAll('.particle');
                if (activeParticles.length < 15) { // Máximo 15 partículas activas
                createParticleFromCursor(mouseX, mouseY);
            }
            }
        }, 250); // Cada 250ms (más lento = menos carga)
    });
    
    // Mouse leave
    button.addEventListener('mouseleave', () => {
        isInside = false;
        if (particleInterval) {
            clearInterval(particleInterval);
            particleInterval = null;
        }
    });
    
    // Click/Touch - crear partículas desde el punto de contacto
    button.addEventListener('click', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        createClickParticles(x, y);
    });
    
    // Touch support
    button.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        const rect = button.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        updateLightPosition({ clientX: touch.clientX, clientY: touch.clientY });
        createClickParticles(x, y);
    });
    
    button.addEventListener('touchmove', (e) => {
        const touch = e.touches[0];
        updateLightPosition({ clientX: touch.clientX, clientY: touch.clientY });
    });
}

// ============================================
// INITIALIZATION
// ============================================
showState(stateIdle);

// Conectar WebSocket al servidor
connectWebSocket();

// Inicializar animación de olas
const wavesCanvas = document.getElementById('waves-canvas');
if (wavesCanvas) {
    wavesAnimation = new WavesAnimation(wavesCanvas);
}

// Configurar seguimiento de cursor y partículas en todos los botones
const allButtons = document.querySelectorAll('.btn-primary');
allButtons.forEach(button => {
    setupButtonCursorTracking(button);
});

// Verificar que QRCode esté cargado (solo en modo desarrollo)
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    window.addEventListener('load', () => {
        if (typeof QRCode === 'undefined' || window.QRCodeLoadFailed) {
            console.info('QRCode library no disponible - usando placeholder (esto es normal en modo prototipo)');
        }
    });
}

// Cleanup on page hide
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Mantener intervalos activos para que el proceso continúe
    }
});
