import { CONFIG } from '../config.js';

let supabase = null;
if (window.supabase) supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

let focusInterval;
let timeLeft;
let durationMinutes;

export function initFocus() {
    // Expõe globalmente para os botões do HTML chamarem
    window.openFocusModal = openFocusModal;
}

function openFocusModal() {
    const overlay = document.createElement('div');
    overlay.id = 'focus-overlay';
    overlay.className = 'fixed inset-0 bg-[#050505] z-[9999] flex flex-col items-center justify-center animate-fade-in p-4';
    
    overlay.innerHTML = `
        <div class="w-full max-w-2xl text-center">
            <h1 class="text-4xl font-bold text-white font-mono mb-2">Modo Foco</h1>
            <p class="text-gray-400 font-mono text-sm mb-8">Protocolo Pomodoro de Alta Performance</p>
            
            <div id="time-selection" class="grid grid-cols-4 gap-3 mb-8">
                ${[15, 25, 45, 60].map(min => `
                    <button onclick="startTimer(${min})" class="bg-[#111] text-gray-400 border border-[#333] hover:border-[#CC0000] hover:text-white px-4 py-4 rounded font-mono transition-all">
                        <div class="text-2xl font-bold">${min}</div>
                        <div class="text-xs">MIN</div>
                    </button>
                `).join('')}
            </div>

            <div id="active-timer" class="hidden">
                <div class="text-gray-500 font-mono text-sm uppercase tracking-wider mb-4">MISSÃO EM PROGRESSO</div>
                <div id="timer-display" class="text-[6rem] md:text-[10rem] font-mono font-bold text-[#CC0000] leading-none tabular-nums">00:00</div>
                
                <div class="w-full bg-[#222] h-4 rounded-full overflow-hidden mt-8 mb-8">
                    <div id="progress-bar" class="bg-[#CC0000] h-full transition-all duration-1000" style="width: 100%"></div>
                </div>

                <button onclick="abortMission()" class="border-2 border-[#CC0000] text-[#CC0000] hover:bg-[#CC0000] hover:text-white font-mono uppercase tracking-wider text-lg px-8 py-2 rounded">
                    ABORTAR MISSÃO
                </button>
            </div>

            <button onclick="document.getElementById('focus-overlay').remove()" id="close-btn" class="mt-8 text-gray-600 hover:text-white text-sm">Voltar</button>
        </div>
    `;

    document.body.appendChild(overlay);
    
    // Torna as funções acessíveis ao HTML injetado
    window.startTimer = startTimer;
    window.abortMission = abortMission;
}

async function startTimer(minutes) {
    durationMinutes = minutes;
    timeLeft = minutes * 60;
    
    document.getElementById('time-selection').classList.add('hidden');
    document.getElementById('close-btn').classList.add('hidden');
    document.getElementById('active-timer').classList.remove('hidden');
    
    // Tela Cheia
    try { await document.documentElement.requestFullscreen(); } catch(e){}

    updateDisplay();

    focusInterval = setInterval(() => {
        timeLeft--;
        updateDisplay();

        if (timeLeft <= 0) {
            completeSession();
        }
    }, 1000);
}

function updateDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    document.getElementById('timer-display').innerText = `${m}:${s}`;
    
    const totalSeconds = durationMinutes * 60;
    const pct = ((totalSeconds - timeLeft) / totalSeconds) * 100;
    document.getElementById('progress-bar').style.width = `${100 - pct}%`;
}

function abortMission() {
    if(!confirm("Abortar missão resultará em falha (Sem XP). Confirmar?")) return;
    clearInterval(focusInterval);
    exitFullscreen();
    document.getElementById('focus-overlay').remove();
}

async function completeSession() {
    clearInterval(focusInterval);
    exitFullscreen();
    
    // Som de Sucesso
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3'); // Exemplo
    audio.play().catch(()=>{});

    // Salva no Supabase e dá XP
    const user = JSON.parse(localStorage.getItem(CONFIG.USER_KEY));
    if(user && user.id && supabase) {
        await supabase.from('focus_sessions').insert({
            user_id: user.id,
            duration_minutes: durationMinutes,
            completed: true
        });
        
        // Chama função global de XP (que criaremos no dashboard)
        if(window.addXP) window.addXP(Math.floor(durationMinutes / 5) * 5);
    }

    alert(`MISSÃO CUMPRIDA!\n+${Math.floor(durationMinutes / 5) * 5} XP`);
    document.getElementById('focus-overlay').remove();
}

function exitFullscreen() {
    if (document.exitFullscreen) document.exitFullscreen();
}