// Módulo de Efeitos Sonoros (Sintetizador Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

export const SOUNDS = {
    CLICK: 'click',
    TYPE: 'type',
    SUCCESS: 'success',
    ERROR: 'error',
    HOVER: 'hover',
    BOOT: 'boot'
};

function playTone(freq, type, duration, vol = 0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

export function playSFX(sfx) {
    switch (sfx) {
        case 'click':
            // Som curto e seco de interface (High Tech)
            playTone(800, 'sine', 0.05, 0.05);
            setTimeout(() => playTone(1200, 'triangle', 0.03, 0.03), 10);
            break;
            
        case 'type':
            // Som muito sutil de tecla mecânica
            playTone(600 + Math.random() * 200, 'square', 0.03, 0.02);
            break;
            
        case 'success':
            // Acorde de vitória futurista
            playTone(440, 'sine', 0.3, 0.1); // La
            setTimeout(() => playTone(554, 'sine', 0.3, 0.1), 100); // Do#
            setTimeout(() => playTone(659, 'sine', 0.4, 0.1), 200); // Mi
            break;

        case 'error':
            // Som grave de erro
            playTone(150, 'sawtooth', 0.3, 0.1);
            break;
            
        case 'hover':
            // Som quase inaudível ao passar o mouse
            playTone(2000, 'sine', 0.02, 0.01);
            break;
    }
}

// Inicializa sons nos botões automaticamente
export function initAudio() {
    document.addEventListener('click', (e) => {
        if(e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('clickable')) {
            playSFX(SOUNDS.CLICK);
        }
    });
}