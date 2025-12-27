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
const SOS_QUOTES = [
    "A vontade passa. O arrependimento fica.",
    "Você não é o seu desejo. Você é quem decide.",
    "Neurociência: Um impulso dura apenas 15 minutos. Resista e o cérebro desiste.",
    "Não troque o que você mais quer pelo que você quer agora.",
    "O prazer imediato é o inimigo da felicidade eterna.",
    "Quem é escravo dos seus desejos nunca será livre.",
    "A dor da disciplina é menor que a dor do fracasso.",
    "Seu cérebro está apenas pedindo dopamina. Não dê de graça.",
    "Isso não é uma necessidade. É apenas um hábito morrendo.",
    "Seja o Comandante da sua mente, não o passageiro.",
    "O conforto é uma armadilha. Abrace o desconforto.",
    "A cada 'NÃO' que você diz ao vício, sua força de vontade sobe de nível.",
    "Lembre-se do porquê você começou.",
    "A única saída é através. Respire e aguente.",
    "Não negocie com a fraqueza.",
    "Sêneca dizia: 'Sofremos mais na imaginação do que na realidade'.",
    "Você já venceu 100% dos seus dias ruins. Vai vencer este também.",
    "O vício mente. Ele diz que vai aliviar, mas só vai aprisionar.",
    "Assuma o controle. O piloto automático está desligado.",
    "Calma. É apenas uma onda química no seu cérebro. Deixe passar.",
    "A liberdade custa caro. O preço é dizer não a si mesmo.",
    "Respire fundo. Onde está sua atenção, está sua energia.",
    "Não destrua seu progresso por 5 minutos de prazer.",
    "Você é mais forte do que essa vontade passageira.",
    "O triunfo sobre si mesmo é a maior de todas as vitórias."
];

// --- PROTOCOLO SOS ATUALIZADO ---
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

        <button id="close-sos" class="relative z-50 cursor-pointer px-8 py-4 border border-gray-800 text-gray-500 hover:text-white hover:border-white hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-xs font-bold rounded-lg active:scale-95">
            Vontade Controlada (Sair)
        </button>
    `;

    document.body.appendChild(overlay);

    // Lógica do botão
    const closeBtn = document.getElementById('close-sos');
    closeBtn.onclick = () => {
        isActive = false; 
        clearInterval(breathInterval); 
        overlay.remove();
        
        addXP(100); 
        playSFX('success'); 
        showToast('NEUROPLASTICIDADE ATIVADA', 'Impulso vencido. Você ficou mais forte.', 'success');
    };

    // ... (O restante da lógica de respiração permanece igual) ...
    const circle = document.getElementById('breath-circle');
    const text = document.getElementById('breath-text');
    const quoteDisplay = document.getElementById('sos-quote-display');
    let isActive = true;

    const rotateQuote = () => {
        if (!isActive) return;
        quoteDisplay.style.opacity = '0';
        setTimeout(() => {
            if (!isActive) return;
            currentQuoteIndex = (currentQuoteIndex + 1) % SOS_QUOTES.length;
            quoteDisplay.innerText = `"${SOS_QUOTES[currentQuoteIndex]}"`;
            quoteDisplay.style.opacity = '1';
        }, 1000);
    };

    const runCycle = () => {
        if (!isActive) return;
        rotateQuote(); 
        text.innerText = "INSPIRE"; 
        circle.style.transform = "scale(1.3)"; 
        circle.style.borderColor = "#ffffff"; 
        circle.style.boxShadow = "0 0 50px rgba(255,255,255,0.2)";
        circle.style.transition = "all 4s ease-in-out";
        
        setTimeout(() => {
            if (!isActive) return;
            text.innerText = "SEGURE"; 
            circle.style.borderColor = "#cc0000"; 
            circle.style.boxShadow = "0 0 20px rgba(200,0,0,0.5)";
            
            setTimeout(() => {
                if (!isActive) return;
                text.innerText = "EXPIRE"; 
                circle.style.transform = "scale(1.0)"; 
                circle.style.transition = "all 4s ease-in-out";
                
                setTimeout(() => {
                    if (!isActive) return;
                    text.innerText = "MANTENHA";
                }, 4000); 
            }, 4000); 
        }, 4000); 
    };

    runCycle();
    const breathInterval = setInterval(runCycle, 16000);
}
// PRO/js/modules/features.js
window.showPaywallModal = showPaywallModal;
export function showPaywallModal() {
    // 1. Cria o Overlay Escuro
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/90 z-[99999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm';
    
    // 2. O Conteúdo do Modal (Estilo "Relatório Confidencial")
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-red-900/50 w-full max-w-md rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(204,0,0,0.2)] relative">
            
            <div class="bg-red-900/10 p-6 border-b border-red-900/30 flex justify-between items-center">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-file-medical-alt text-red-500 text-xl animate-pulse"></i>
                    <div>
                        <h3 class="text-white font-bold uppercase tracking-widest text-sm">Diagnóstico Finalizado</h3>
                        <p class="text-red-400 text-[10px] font-mono">ID: USER_NEURAL_FAIL_01</p>
                    </div>
                </div>
            </div>

            <div class="p-8 space-y-6">
                
                <div>
                    <p class="text-gray-500 text-xs uppercase font-bold mb-2">Problema Identificado:</p>
                    <h2 class="text-2xl text-white font-black font-brand leading-none">
                        Dopamina <span class="text-red-500">Resistente</span>
                    </h2>
                    <p class="text-gray-400 text-sm mt-2 leading-relaxed">
                        Seu sistema límbico assumiu o controle. Você perdeu a capacidade biológica de sentir prazer no esforço.
                    </p>
                </div>

                <div class="bg-[#111] p-4 rounded-lg border border-white/5">
                    <div class="flex justify-between text-xs text-gray-400 mb-2">
                        <span>Nível de Gravidade</span>
                        <span class="text-red-500 font-bold">CRÍTICO (89%)</span>
                    </div>
                    <div class="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full bg-red-600 w-[89%] animate-[width_1s_ease-out]"></div>
                    </div>
                </div>

                <div class="relative group cursor-pointer" onclick="window.location.href='#planos'"> <p class="text-gray-500 text-xs uppercase font-bold mb-2 flex items-center gap-2">
                        <i class="fa-solid fa-lock text-red-500"></i> Protocolo de Cura:
                    </p>
                    
                    <div class="filter blur-sm select-none opacity-50 text-sm text-gray-300 space-y-2">
                        <p>1. Iniciar o jejum de dopamina de 12h para resetar receptores.</p>
                        <p>2. Ativar o módulo Córtex para bloquear redes sociais.</p>
                        <p>3. Usar a técnica de respiração 4-7-8 para...</p>
                    </div>

                    <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent">
                        <button class="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase py-3 px-6 rounded-full shadow-[0_0_20px_rgba(204,0,0,0.5)] tracking-widest transition-all transform hover:scale-105 flex items-center gap-2">
                            Desbloquear Solução <i class="fa-solid fa-lock-open"></i>
                        </button>
                    </div>
                </div>

            </div>

            <div class="bg-[#050505] p-4 text-center border-t border-white/5">
                <p class="text-[10px] text-gray-600">Apenas membros PRO têm acesso aos protocolos neurocientíficos.</p>
            </div>

        </div>
    `;

    document.body.appendChild(overlay);
}