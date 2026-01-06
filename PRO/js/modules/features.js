import { addXP, logActivity, getRPGState } from './gamification.js';
import { showToast } from './ui.js';
import { playSFX } from './audio.js'; 

// --- VARIÁVEIS DO TOUR ---
let tourStep = 0;
let tourActive = false;
const TOUR_STEPS = [
    { 
        target: '#sidebar', 
        title: 'MENU TÁTICO', 
        text: 'Acesse suas ferramentas, IAs e configurações por aqui.',
        action: () => { 
            console.log("Tour: Abrindo Sidebar...");
            if(window.toggleSidebar) window.toggleSidebar(true); 
        }
    },
    { 
        target: '#tabJornada', 
        title: 'BASE DE DADOS', 
        text: 'Alterne para a visão de Protocolo para ver suas missões e nível.',
        action: () => { if(window.switchTab) window.switchTab('protocolo'); }
    },
    { 
        target: '#levelDisplay', 
        title: 'SEU RANKING', 
        text: 'Ganhe XP completando tarefas para subir de patente.',
        offset: 10 
    },
    { 
        target: '#missionList', 
        title: 'MISSÕES', 
        text: 'Suas ordens diárias. Complete-as para manter a sequência.',
        action: () => { 
            document.getElementById('missionList')?.scrollIntoView({behavior: 'smooth', block: 'center'});
        }
    },
    { 
        target: '#tabChat', 
        title: 'COMANDO NEURAL', 
        text: 'Volte ao chat para dar ordens às IAs ou fazer diagnósticos.',
        action: () => { if(window.switchTab) window.switchTab('chat'); }
    }
];

// --- FUNÇÃO PRINCIPAL DO TOUR ---
export function startTour() {
    console.log("🚀 TOUR INICIADO!");
    if (tourActive) return;
    tourActive = true;
    tourStep = 0;

    // Remove qualquer tour anterior travado
    const oldOverlay = document.getElementById('synapse-tour-overlay');
    if (oldOverlay) oldOverlay.remove();

    // 1. Cria a estrutura visual
    const overlay = document.createElement('div');
    overlay.id = 'synapse-tour-overlay';
    // FORÇANDO Z-INDEX MÁXIMO (Acima de tudo)
    overlay.style.cssText = "position: fixed; inset: 0; z-index: 2147483647; pointer-events: auto; background: transparent;";
    
    // Caixa de Destaque (Spotlight)
    const highlight = document.createElement('div');
    highlight.id = 'tour-highlight';
    highlight.className = 'synapse-highlight-box';
    // Força visibilidade e posição
    highlight.style.cssText = "position: fixed; z-index: 2147483646; pointer-events: none; opacity: 1; transition: all 0.4s ease;";

    // Card de Texto (HUD)
    const hud = document.createElement('div');
    hud.id = 'tour-hud';
    hud.className = 'synapse-hud';
    hud.style.zIndex = "2147483647"; // Z-index máximo também

    hud.innerHTML = `
        <div class="synapse-title"><i class="fa-solid fa-crosshairs"></i> <span id="tour-title">INICIANDO...</span></div>
        <div class="synapse-text" id="tour-text">Preparando interface...</div>
        <div class="flex gap-2 justify-between mt-3">
            <button id="btn-tour-skip" class="text-[10px] text-gray-500 hover:text-white uppercase font-bold py-2 px-2 cursor-pointer">Pular</button>
            <button id="btn-tour-next" class="synapse-btn px-6 flex-grow cursor-pointer">Próximo</button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(highlight);
    document.body.appendChild(hud);

    // Bind dos botões (Manual para garantir funcionamento)
    document.getElementById('btn-tour-skip').onclick = endTour;
    document.getElementById('btn-tour-next').onclick = nextTourStep;

    // Inicia o passo 0
    renderTourStep();
}

export function nextTourStep() {
    if(typeof playSFX === 'function') playSFX('click');
    tourStep++;
    
    if (tourStep >= TOUR_STEPS.length) {
        endTour();
    } else {
        renderTourStep();
    }
}

export function endTour() {
    tourActive = false;
    const overlay = document.getElementById('synapse-tour-overlay');
    const highlight = document.getElementById('tour-highlight');
    const hud = document.getElementById('tour-hud');
    
    if(highlight) highlight.style.opacity = '0';
    if(hud) hud.style.opacity = '0';
    
    setTimeout(() => {
        if(overlay) overlay.remove();
        if(highlight) highlight.remove();
        if(hud) hud.remove();
        if(typeof playSFX === 'function') playSFX('success');
        if(typeof showToast === 'function') showToast('TOUR FINALIZADO', 'Sistema pronto para uso.', 'success');
        localStorage.setItem('synapse_demo_seen', 'true');
    }, 500);
}

function renderTourStep() {
    const step = TOUR_STEPS[tourStep];
    if (!step) return;

    if (step.action) step.action();

    // Delay para UI se ajustar
    setTimeout(() => {
        const targetEl = document.querySelector(step.target);
        const highlight = document.getElementById('tour-highlight');
        const hud = document.getElementById('tour-hud');
        
        if (!targetEl || !highlight || !hud) {
            console.warn("Tour: Alvo não encontrado ->", step.target);
            // Se não achar, tenta centralizar na tela como fallback ou pula
            if (tourStep === 0) { // Se for o sidebar e falhar (mobile fechado)
                 highlight.style.top = "50%"; highlight.style.left = "50%"; highlight.style.width = "0"; highlight.style.height = "0";
            } else {
                nextTourStep();
            }
            return;
        }

        const rect = targetEl.getBoundingClientRect();
        const padding = step.offset || 10;

        // Efeito Spotlight (Box Shadow Gigante)
        highlight.style.width = `${rect.width + (padding * 2)}px`;
        highlight.style.height = `${rect.height + (padding * 2)}px`;
        highlight.style.top = `${rect.top - padding}px`;
        highlight.style.left = `${rect.left - padding}px`;
        highlight.style.boxShadow = "0 0 0 2px #cc0000, 0 0 30px rgba(204, 0, 0, 0.5), 0 0 0 4000px rgba(0, 0, 0, 0.85)";

        // Posiciona HUD
        let hudTop = rect.bottom + 20;
        if (hudTop + 150 > window.innerHeight) hudTop = rect.top - 180;
        
        // Garante que o HUD não saia da tela lateralmente
        let hudLeft = rect.left;
        if (hudLeft + 260 > window.innerWidth) hudLeft = window.innerWidth - 280;
        if (hudLeft < 10) hudLeft = 10;

        hud.style.top = `${hudTop}px`;
        hud.style.left = `${hudLeft}px`;
        hud.classList.add('visible');

        document.getElementById('tour-title').innerText = step.title;
        document.getElementById('tour-text').innerText = step.text;
        
        targetEl.scrollIntoView({behavior: 'smooth', block: 'center', inline: 'center'});

    }, 400); // Aumentei um pouco o delay para garantir animações
}

// Expõe globalmente
window.features = window.features || {};
window.features.startTour = startTour;

// --- MANTENDO AS OUTRAS FUNÇÕES DO ARQUIVO (FOCO, SOS, ETC) ---
// (Certifique-se de que o restante do arquivo com startFocusMode, etc, continua aqui embaixo)
// Vou recolocar o startFocusMode e SOS para garantir que você tenha o arquivo completo:

// --- MODO FOCO ---
export function startFocusMode() {
    // ... (mesmo código anterior)
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
        if(typeof playSFX === 'function') playSFX('click');
    };

    document.getElementById('btn-start-focus').onclick = () => {
        overlay.remove();
        runFocusTimer(minutes * 60);
        if(typeof playSFX === 'function') playSFX('success');
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
            addXP(xpGained);
            if(typeof playSFX === 'function') playSFX('success');
            logActivity('FOCUS', `Sessão de Foco (${totalMinutes}m)`, xpGained, totalMinutes);
            if(typeof showToast === 'function') showToast('DADOS COMPUTADOS', `${totalMinutes}min adicionados ao histórico.`, 'success');
            setTimeout(() => overlay.remove(), 3000);
        }
        timeLeft--;
    }, 1000);

    document.getElementById('exitFocus').onclick = () => {
        clearInterval(interval);
        overlay.remove();
        if(typeof playSFX === 'function') playSFX('error');
        if(typeof showToast === 'function') showToast('FALHA DE DISCIPLINA', 'Sessão não registada.', 'warning');
    };
}

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

const SOS_QUOTES = [
    "A vontade passa. O arrependimento fica.",
    "Você não é o seu desejo. Você é quem decide.",
    "Neurociência: Um impulso dura apenas 15 minutos. Resista e o cérebro desiste.",
    "Não troque o que você mais quer pelo que você quer agora.",
    "A dor da disciplina é menor que a dor do fracasso.",
    "Seu cérebro está apenas pedindo dopamina. Não dê de graça.",
    "Isso não é uma necessidade. É apenas um hábito morrendo.",
    "Seja o Comandante da sua mente, não o passageiro."
];

export function startSOSProtocol() {
    let currentQuoteIndex = Math.floor(Math.random() * SOS_QUOTES.length);
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black z-[10000] flex flex-col items-center justify-center text-center p-6 animate-fade-in';
    overlay.id = 'sos-overlay';
    
    overlay.innerHTML = `
        <h1 class="text-3xl md:text-4xl font-black text-red-600 mb-2 tracking-widest animate-pulse pointer-events-none">ALERTA DE CONTROLE</h1>
        <p class="text-gray-500 text-xs md:text-sm mb-8 uppercase tracking-widest pointer-events-none">Recalibrando Córtex Pré-Frontal...</p>
        <div class="h-24 md:h-32 flex items-center justify-center mb-8 px-4 w-full max-w-2xl pointer-events-none">
            <p id="sos-quote-display" class="text-white text-lg md:text-2xl font-serif italic leading-relaxed transition-opacity duration-1000 opacity-100">
                "${SOS_QUOTES[currentQuoteIndex]}"
            </p>
        </div>
        <div class="relative flex items-center justify-center mb-12 pointer-events-none">
            <div id="breath-circle" class="w-48 h-48 md:w-64 md:h-64 border-4 border-red-600 rounded-full flex items-center justify-center transition-all shadow-[0_0_30px_rgba(200,0,0,0.3)] z-10">
                <span id="breath-text" class="text-white text-2xl font-mono font-black tracking-wider">PREPARE</span>
            </div>
            <div class="absolute w-48 h-48 md:w-64 md:h-64 border border-red-900 rounded-full animate-ping opacity-30 pointer-events-none"></div>
        </div>
        <button id="close-sos" class="relative z-50 cursor-pointer px-8 py-4 border border-gray-800 text-gray-500 hover:text-white hover:border-white hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-xs font-bold rounded-lg active:scale-95">Vontade Controlada (Sair)</button>
    `;

    document.body.appendChild(overlay);

    let isActive = true;
    const closeBtn = document.getElementById('close-sos');
    
    closeBtn.onclick = () => {
        isActive = false; 
        clearInterval(breathInterval); 
        overlay.remove();
        addXP(100); 
        if(typeof playSFX === 'function') playSFX('success'); 
        if(typeof showToast === 'function') showToast('NEUROPLASTICIDADE ATIVADA', 'Impulso vencido.', 'success');
    };

    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    const quoteDisplay = document.getElementById('sos-quote-display');
    const breathInterval = setInterval(() => {
        if (!isActive) return;
        text.innerText = "INSPIRE"; 
        circle.style.transform = "scale(1.3)"; circle.style.borderColor = "#ffffff";
        setTimeout(() => {
            if (!isActive) return; text.innerText = "SEGURE"; circle.style.borderColor = "#cc0000";
            setTimeout(() => {
                if (!isActive) return; text.innerText = "EXPIRE"; circle.style.transform = "scale(1.0)";
            }, 4000); 
        }, 4000); 
    }, 12000);
}

export function showPaywallModal() {
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm';
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-red-900/50 w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
            <div class="bg-red-900/10 p-6 border-b border-red-900/30 flex justify-between items-center">
                <div class="flex items-center gap-3"><i class="fa-solid fa-file-medical-alt text-red-500 text-xl animate-pulse"></i><div><h3 class="text-white font-bold uppercase tracking-widest text-sm">Diagnóstico Finalizado</h3></div></div>
            </div>
            <div class="p-8 space-y-6">
                <div><h2 class="text-2xl text-white font-black font-brand leading-none">Dopamina <span class="text-red-500">Resistente</span></h2><p class="text-gray-400 text-sm mt-2 leading-relaxed">Seu sistema límbico assumiu o controle.</p></div>
                <div class="relative group cursor-pointer" onclick="window.location.href='https://pay.kiwify.com.br/YzOIskc'"><div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent z-10"><button class="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase py-3 px-6 rounded-full shadow-[0_0_20px_rgba(204,0,0,0.5)] tracking-widest transition-all transform hover:scale-105 flex items-center gap-2">Desbloquear Solução <i class="fa-solid fa-lock-open"></i></button></div><div class="filter blur-sm select-none opacity-50 text-sm text-gray-300 space-y-2"><p>1. Iniciar jejum...</p></div></div>
            </div>
            <div class="bg-[#050505] p-4 text-center border-t border-white/5"><button onclick="this.closest('.fixed').remove()" class="text-[10px] text-gray-600 hover:text-white uppercase tracking-wider">Fechar (Modo Demo)</button></div>
        </div>
    `;
    document.body.appendChild(overlay);
}
window.showPaywallModal = showPaywallModal;