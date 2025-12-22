// PRO/js/modules/features.js
import { addXP, logActivity, getRPGState } from './gamification.js';
import { showToast } from './ui.js';
import { playSFX } from './audio.js'; // <--- IMPORTA O AUDIO

// --- MODO FOCO ---
export function startFocusMode() {
    const overlay = document.createElement('div');
    overlay.id = 'focus-setup-overlay';
    overlay.className = 'fixed inset-0 bg-black/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 animate-fade-in';
    
    overlay.innerHTML = `
        <h2 class="text-gray-400 text-xs tracking-[0.3em] uppercase mb-8">CONFIGURAR SESSÃO</h2>
        <div class="flex items-center gap-4 mb-12">
            <button onclick="adjustTime(-5)" class="text-gray-500 hover:text-white p-4 text-2xl"><i class="fa-solid fa-minus"></i></button>
            <div class="text-center">
                <div id="focus-minutes" class="text-8xl font-black text-white font-mono tracking-tighter">25</div>
                <p class="text-xs text-red-600 font-bold uppercase tracking-widest mt-2">MINUTOS</p>
            </div>
            <button onclick="adjustTime(5)" class="text-gray-500 hover:text-white p-4 text-2xl"><i class="fa-solid fa-plus"></i></button>
        </div>
        <button id="btn-start-focus" class="w-full max-w-xs py-4 bg-red-900/20 border border-red-900 text-red-500 hover:bg-red-600 hover:text-white hover:border-red-500 transition-all rounded-lg font-bold tracking-[0.2em]">INICIAR FOCO</button>
        <button onclick="document.getElementById('focus-setup-overlay').remove()" class="mt-6 text-gray-600 hover:text-white text-xs uppercase tracking-widest">CANCELAR</button>
    `;

    document.body.appendChild(overlay);

    let minutes = 25;
    window.adjustTime = (amount) => {
        minutes = Math.max(5, Math.min(120, minutes + amount));
        document.getElementById('focus-minutes').innerText = minutes;
        playSFX('click'); // Som ao ajustar tempo
    };

    document.getElementById('btn-start-focus').onclick = () => {
        overlay.remove();
        runFocusTimer(minutes * 60);
        playSFX('success'); // Som de início
    };
}

function runFocusTimer(durationSeconds) {
    const totalMinutes = durationSeconds / 60;
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black z-[9999] flex flex-col items-center justify-center animate-fade-in';
    overlay.innerHTML = `
        <div class="absolute top-5 right-5">
            <button id="exitFocus" class="text-gray-600 hover:text-white border border-gray-800 hover:border-white px-4 py-2 rounded-full text-xs tracking-widest transition">ABORTAR</button>
        </div>
        <div class="text-center">
            <h2 class="text-red-600 text-xs tracking-[0.5em] uppercase mb-8 animate-pulse">MODO HIPER-FOCO</h2>
            <div id="focusTimer" class="text-[25vw] md:text-9xl font-black text-white font-mono tracking-tighter leading-none mb-4">00:00</div>
            <div class="w-64 h-1 bg-gray-900 rounded-full mx-auto overflow-hidden"><div id="focusProgress" class="h-full bg-red-600 w-full"></div></div>
        </div>
    `;
    document.body.appendChild(overlay);

    let timeLeft = durationSeconds;
    const interval = setInterval(() => {
        let m = Math.floor(timeLeft / 60);
        let s = timeLeft % 60;
        document.getElementById('focusTimer').innerText = `${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
        document.getElementById('focusProgress').style.width = `${(timeLeft / durationSeconds) * 100}%`;

        if (timeLeft <= 0) {
            clearInterval(interval);
            const xpGained = totalMinutes * 2;
            
            // --- SUCESSO ---
            addXP(xpGained);
            playSFX('success'); // <--- SOM DE VITÓRIA AQUI
            logActivity('FOCUS', `Sessão de Foco (${totalMinutes}m)`, xpGained, totalMinutes);
            showToast('DADOS COMPUTADOS', `${totalMinutes}min adicionados ao histórico.`, 'success');
            
            setTimeout(() => overlay.remove(), 3000);
        }
        timeLeft--;
    }, 1000);

    document.getElementById('exitFocus').onclick = () => {
        clearInterval(interval);
        overlay.remove();
        playSFX('error'); // Som de falha
        showToast('FALHA DE DISCIPLINA', 'Sessão não registada.', 'warning');
    };
}

// --- RELATÓRIO EVOLUTIVO ---
export function showWeeklyReport() {
    const state = getRPGState();
    const history = state.history || [];
    let totalFocusMinutes = 0;
    history.forEach(h => { if(h.type === 'FOCUS') totalFocusMinutes += (h.duration || 0); });
    
    const historyHTML = history.length > 0 ? history.map(h => `
        <div class="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
            <div>
                <p class="text-xs text-white font-bold">${h.detail}</p>
                <p class="text-[10px] text-gray-500">${h.day} • ${h.type}</p>
            </div>
            <span class="text-xs font-mono text-green-500">+${h.xp} XP</span>
        </div>
    `).join('') : '<p class="text-gray-600 text-xs py-4 text-center">Nenhum registo encontrado.</p>';

    const modal = document.createElement('div');
    modal.id = 'report-modal';
    modal.className = 'fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in';
    
    modal.innerHTML = `
        <div class="bg-[#0a0a0a] border border-[#222] w-full max-w-md rounded-2xl p-6 relative shadow-2xl h-[80vh] flex flex-col">
            <button onclick="this.closest('#report-modal').remove()" class="absolute top-4 right-4 text-gray-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-white font-bold text-lg mb-1 tracking-wide">REGISTO NEURAL</h3>
            <div class="grid grid-cols-2 gap-3 mb-6 mt-6">
                <div class="bg-red-900/10 border border-red-900/30 p-4 rounded-xl text-center">
                    <p class="text-[10px] text-red-400 uppercase font-bold">Tempo Focado</p>
                    <p class="text-2xl text-white font-mono font-bold">${totalFocusMinutes}<span class="text-xs text-gray-500">min</span></p>
                </div>
                <div class="bg-blue-900/10 border border-blue-900/30 p-4 rounded-xl text-center">
                    <p class="text-[10px] text-blue-400 uppercase font-bold">Nível Atual</p>
                    <p class="text-2xl text-white font-mono font-bold">${state.level}</p>
                </div>
            </div>
            <p class="text-xs text-gray-400 font-bold mb-3 uppercase">Timeline de Atividade</p>
            <div class="flex-grow overflow-y-auto custom-scrollbar bg-black/30 rounded-xl border border-white/5 p-4">
                ${historyHTML}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// --- PROTOCOLO SOS ---
export function startSOSProtocol() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black z-[10000] flex flex-col items-center justify-center text-center p-6 animate-fade-in';
    overlay.id = 'sos-overlay';
    
    overlay.innerHTML = `
        <h1 class="text-4xl font-bold text-red-600 mb-2 tracking-widest animate-pulse">ALERTA DE SISTEMA</h1>
        <p class="text-gray-400 text-sm mb-12 uppercase tracking-widest">Recalibragem Neural em Progresso</p>
        <div class="relative flex items-center justify-center mb-16">
            <div id="breath-circle" class="w-48 h-48 border-4 border-red-600 rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_rgba(200,0,0,0.3)]">
                <span id="breath-text" class="text-white text-2xl font-mono font-bold tracking-wider">PREPARE</span>
            </div>
            <div class="absolute w-48 h-48 border border-red-900 rounded-full animate-ping opacity-30"></div>
        </div>
        <button id="close-sos" class="px-8 py-4 border border-gray-800 text-gray-500 hover:text-white hover:border-white hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-xs font-bold rounded-lg">Retornar ao Controlo</button>
    `;

    document.body.appendChild(overlay);

    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    let isActive = true;

    const runCycle = () => {
        if (!isActive) return;
        text.innerText = "INSPIRE"; circle.style.transform = "scale(1.5)"; circle.style.borderColor = "#ffffff"; circle.style.transition = "all 4s ease-in-out";
        setTimeout(() => {
            if (!isActive) return;
            text.innerText = "SEGURE"; circle.style.borderColor = "#cc0000"; 
            setTimeout(() => {
                if (!isActive) return;
                text.innerText = "EXPIRE"; circle.style.transform = "scale(1.0)"; circle.style.transition = "all 4s ease-in-out";
                setTimeout(() => {
                    if (!isActive) return;
                    text.innerText = "MANTENHA";
                }, 4000); 
            }, 4000); 
        }, 4000); 
    };

    runCycle();
    const breathInterval = setInterval(runCycle, 16000);

    document.getElementById('close-sos').addEventListener('click', () => {
        isActive = false; clearInterval(breathInterval); overlay.remove();
        addXP(50); 
        playSFX('success'); // <--- SOM DE SUCESSO AO COMPLETAR
        showToast('SISTEMA ESTABILIZADO', 'Recalibragem completa. +50 XP.', 'success');
    });
}