// ARQUIVO: PRO/js/modules/audio.js

let audioCtx = null;
let currentPack = localStorage.getItem('synapse_sound_pack') || 'ZEN'; 
let masterVolume = 0.5;

const PACKS = {
    'NEURAL': {
        click: { type: 'sawtooth', freq: 800, duration: 0.05, vol: 0.1 },
        success: { type: 'square', freq: 600, duration: 0.2, vol: 0.1, slide: 1200 },
        error: { type: 'sawtooth', freq: 150, duration: 0.3, vol: 0.2, slide: 50 },
        type: { type: 'sine', freq: 500, duration: 0.03, vol: 0.05 },
        levelup: { type: 'square', melody: [440, 554, 659, 880], speed: 100 }
    },
    'ZEN': { 
        click: { type: 'sine', freq: 600, duration: 0.1, vol: 0.2 }, 
        success: { type: 'sine', melody: [523, 659, 784], speed: 150, vol: 0.2 }, 
        error: { type: 'triangle', freq: 200, duration: 0.4, vol: 0.2 }, 
        type: { type: 'sine', freq: 800, duration: 0.02, vol: 0.02 }, 
        levelup: { type: 'sine', melody: [523, 659, 784, 1046], speed: 200, vol: 0.3 } 
    },
    'OFF': {
        // Mudo
    }
};

export function initAudio() {
    // Inicializa o contexto de áudio na primeira interação do usuário
    document.addEventListener('click', () => {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
        }
    }, { once: true });
}

export function playSFX(name) {
    if (!audioCtx || currentPack === 'OFF') return;
    
    const soundData = PACKS[currentPack][name];
    if (!soundData) return;

    if (soundData.melody) {
        playMelody(soundData);
        return;
    }

    playTone(soundData);
}

function playTone(cfg) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = cfg.type || 'sine';
    osc.frequency.setValueAtTime(cfg.freq, audioCtx.currentTime);

    if (cfg.slide) {
        osc.frequency.exponentialRampToValueAtTime(cfg.slide, audioCtx.currentTime + cfg.duration);
    }

    const volume = (cfg.vol || 0.1) * masterVolume;
    gain.gain.setValueAtTime(0, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, audioCtx.currentTime + 0.01); 
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + cfg.duration); 

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + cfg.duration);
}

function playMelody(cfg) {
    cfg.melody.forEach((note, index) => {
        setTimeout(() => {
            playTone({
                type: cfg.type,
                freq: note,
                duration: 0.3,
                vol: cfg.vol || 0.2
            });
        }, index * (cfg.speed || 100));
    });
}

// --- MENU DE CONFIGURAÇÃO DE ÁUDIO ---
export function openAudioSettings() {
    // 1. Toca o som de clique
    playSFX('click');

    // 2. Remove modal anterior se existir (Definindo a variável ANTES de usar)
    const existing = document.getElementById('audio-modal');
    if (existing) existing.remove();

    // 3. Cria o novo modal
    const overlay = document.createElement('div');
    overlay.id = 'audio-modal';
    overlay.className = 'fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in';

    overlay.innerHTML = `
        <div class="bg-[#121212] border border-white/10 rounded-2xl w-full max-w-sm p-6 shadow-2xl scale-95 animate-fade-in-up">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-white font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                    <i class="fa-solid fa-volume-high text-red-500"></i> Configurar Áudio
                </h3>
                <button id="closeAudioBtn" class="text-gray-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            </div>

            <div class="space-y-3">
                ${renderOption('NEURAL', 'Futurista', 'fa-robot', 'Sons táticos e digitais.')}
                ${renderOption('ZEN', 'Zen (Suave)', 'fa-water', 'Sons orgânicos e relaxantes.')}
                ${renderOption('OFF', 'Silencioso', 'fa-volume-xmark', 'Modo foco total.')}
            </div>
            
             <p class="text-[9px] text-gray-600 text-center mt-6 uppercase tracking-widest">Ajuste salvo automaticamente</p>
        </div>
    `;

    document.body.appendChild(overlay);

    // Eventos
    const closeBtn = document.getElementById('closeAudioBtn');
    if(closeBtn) closeBtn.onclick = () => overlay.remove();
    
    ['NEURAL', 'ZEN', 'OFF'].forEach(pack => {
        const btn = document.getElementById(`btn-audio-${pack}`);
        if(btn) btn.onclick = () => setPack(pack);
    });
}

function renderOption(key, name, icon, desc) {
    const isActive = currentPack === key;
    const borderClass = isActive ? 'border-red-500 bg-red-900/10' : 'border-white/5 hover:bg-white/5';
    const iconClass = isActive ? 'text-red-500' : 'text-gray-500';

    return `
        <button id="btn-audio-${key}" class="w-full text-left p-4 rounded-xl border ${borderClass} transition-all group flex items-center gap-4">
            <div class="w-10 h-10 rounded-full bg-[#0a0a0a] flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform">
                <i class="fa-solid ${icon} ${iconClass}"></i>
            </div>
            <div>
                <div class="text-xs font-bold text-white uppercase tracking-wider">${name}</div>
                <div class="text-[9px] text-gray-500">${desc}</div>
            </div>
            ${isActive ? '<i class="fa-solid fa-check text-red-500 ml-auto"></i>' : ''}
        </button>
    `;
}

function setPack(pack) {
    currentPack = pack;
    localStorage.setItem('synapse_sound_pack', pack);
    
    // Toca um som de teste apenas se não for o modo mudo
    if (pack !== 'OFF') {
        playSFX('success');
    }
    
    // Recarrega o modal para atualizar a seleção visual
    openAudioSettings();
}

// Expõe a função para o HTML usar
window.openAudioSettings = openAudioSettings;