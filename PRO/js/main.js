import { initGamification } from './modules/gamification.js';
import { initDashboard } from './modules/dashboard.js';
import { initCalendar } from './modules/calendar.js';
import { initChat, loadAgent } from './core/chat.js';
import { showToast } from './modules/ui.js';
import { initAudio, playSFX } from './modules/audio.js';
import { startSOSProtocol, startFocusMode, showWeeklyReport } from './modules/features.js';

// --- INICIALIZAÇÃO DO SISTEMA ---
document.addEventListener('DOMContentLoaded', () => {
    // Verifica qual foi o último boot e inverte
    const lastBoot = localStorage.getItem('synapse_boot_mode');
    const currentMode = lastBoot === 'BIO' ? 'NEURAL' : 'BIO';
    
    // Salva o atual para a próxima vez ser o outro
    localStorage.setItem('synapse_boot_mode', currentMode);

    if (currentMode === 'BIO') {
        runBootBiometria();
    } else {
        runBootNeural();
    }
});

// =================================================================
// OPÇÃO 1: BIOMETRIA TÁTICA (Scanner)
// =================================================================
async function runBootBiometria() {
    const bootOverlay = document.createElement('div');
    bootOverlay.id = 'boot-overlay';
    bootOverlay.className = 'fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center p-8';
    
    bootOverlay.innerHTML = `
        <div class="relative w-32 h-32 mb-8">
            <img src="logo_synapse.png" class="w-full h-full object-contain opacity-40 grayscale">
            <div id="scanner-line" class="absolute top-0 left-0 w-full h-1 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)] opacity-0"></div>
            <div class="absolute inset-0 border border-red-900/30 rounded-lg"></div>
            <div class="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-600"></div>
            <div class="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-600"></div>
            <div class="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-600"></div>
            <div class="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-600"></div>
        </div>
        <div class="text-center font-mono space-y-2">
            <div id="bio-status" class="text-red-500 text-xs tracking-[0.3em] font-bold animate-pulse">AGUARDANDO BIOMETRIA...</div>
            <div id="bio-detail" class="text-gray-600 text-[10px] uppercase tracking-widest h-4"></div>
        </div>
    `;
    document.body.appendChild(bootOverlay);

    const scanner = document.getElementById('scanner-line');
    const status = document.getElementById('bio-status');
    const detail = document.getElementById('bio-detail');
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    try {
        await wait(500);
        // Fase 1: Escaneando
        scanner.style.opacity = '1';
        scanner.style.transition = 'top 1.5s ease-in-out';
        status.innerText = "ESCANEANDO RETINA...";
        scanner.style.top = '100%'; 
        
        // Carrega sistema em background
        await initializeSystemCore();
        
        await wait(1000);
        
        // Fase 2: Identificado
        scanner.style.transition = 'none';
        scanner.style.top = '0';
        scanner.style.opacity = '0';
        
        status.className = "text-green-500 text-xs tracking-[0.3em] font-bold";
        status.innerText = "ACESSO AUTORIZADO";
        detail.innerText = "IDENTIDADE CONFIRMADA";
        
        const img = bootOverlay.querySelector('img');
        img.className = "w-full h-full object-contain opacity-100 grayscale-0 transition-all duration-500";
        
        await wait(800);
        finishBoot(bootOverlay);

    } catch (error) { console.error(error); bootOverlay.remove(); }
}

// =================================================================
// OPÇÃO 2: SINCRONIZAÇÃO NEURAL (Pulso)
// =================================================================
async function runBootNeural() {
    const bootOverlay = document.createElement('div');
    bootOverlay.id = 'boot-overlay';
    bootOverlay.className = 'fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center p-8';
    
    bootOverlay.innerHTML = `
        <div class="relative flex items-center justify-center mb-12">
            <div class="absolute w-32 h-32 bg-red-600/20 rounded-full animate-ping"></div>
            <div class="absolute w-32 h-32 bg-red-900/10 rounded-full animate-pulse"></div>
            <img src="logo_synapse.png" class="relative w-24 h-24 object-contain drop-shadow-[0_0_20px_rgba(220,38,38,0.5)] z-10">
        </div>
        <div class="w-48 h-1 bg-gray-900 rounded-full overflow-hidden mb-4">
            <div id="neural-bar" class="h-full bg-gradient-to-r from-red-900 to-red-600 w-0 transition-all duration-[2000ms] ease-out"></div>
        </div>
        <div id="neural-text" class="text-gray-500 text-[10px] uppercase tracking-[0.4em] font-medium">Sincronizando...</div>
    `;
    document.body.appendChild(bootOverlay);

    const bar = document.getElementById('neural-bar');
    const text = document.getElementById('neural-text');
    const wait = (ms) => new Promise(r => setTimeout(r, ms));

    try {
        setTimeout(() => { bar.style.width = '70%'; }, 100);

        // Carrega sistema em background
        await initializeSystemCore();

        await wait(1500);
        
        bar.style.width = '100%';
        text.innerText = "CONEXÃO ESTABELECIDA";
        text.classList.remove('text-gray-500');
        text.classList.add('text-white', 'font-bold', 'animate-pulse');

        await wait(800);
        finishBoot(bootOverlay);

    } catch (e) { console.error(e); bootOverlay.remove(); }
}

// =================================================================
// LÓGICA COMUM (CARREGAMENTO REAL)
// =================================================================
async function initializeSystemCore() {
    loadUserProfile();
    initAudio();
    
    window.selectTool = selectTool;
    window.switchTab = switchTab;
    window.toggleSidebar = toggleSidebar;
    window.features = {
        startFocusMode: startFocusMode,
        startSOSProtocol: startSOSProtocol,
        showWeeklyReport: window.IS_DEMO ? () => showDemoModal('DOSSIE') : showWeeklyReport
    };
    window.startFocusMode = window.features.startFocusMode;
    window.startSOSProtocol = window.features.startSOSProtocol;
    window.showWeeklyReport = window.features.showWeeklyReport;
    
    const btnSOS = document.getElementById('btn-sos-protocol');
    if (btnSOS) btnSOS.onclick = () => { window.features.startSOSProtocol(); toggleSidebar(false); };

    await initChat();
    await initGamification();
    initDashboard();
    initCalendar();
    
    window.addEventListener('online', updateStatusIndicator);
    window.addEventListener('offline', updateStatusIndicator);
    updateStatusIndicator();
}

function finishBoot(overlay) {
    overlay.style.transition = 'opacity 0.8s ease';
    overlay.style.opacity = '0';
    
    setTimeout(() => {
        overlay.remove();
        switchTab('chat');
        
        setTimeout(() => {
            if (typeof loadAgent === 'function') loadAgent('Diagnostico');
            if (window.IS_DEMO) startDemoBriefing();
        }, 100);
    }, 800);
}

// --- FUNÇÕES DE NAVEGAÇÃO E LÓGICA ---

function selectTool(toolName) {
    const FERRAMENTAS_PRO = ['COMANDANTE', 'GENERAL', 'TATICO']; 

    if (window.IS_DEMO && FERRAMENTAS_PRO.includes(toolName.toUpperCase())) {
        if(typeof playSFX === 'function') playSFX('error');
        showDemoModal(toolName); 
        return; 
    }

    switchTab('chat');
    if (typeof loadAgent === 'function') {
        loadAgent(toolName);
    } else {
        console.error("loadAgent não encontrado.");
    }
}

function switchTab(tabName) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    
    if(typeof playSFX === 'function') playSFX('click');

    if (tabName === 'protocolo') {
        const view = document.getElementById('viewProtocolo');
        if(view) view.classList.remove('hidden');
        
        const btn = document.getElementById('tabJornada');
        if(btn) btn.classList.add('active');
        
        if(typeof renderCalendar === 'function') renderCalendar(); 
    } 
    else if (tabName === 'chat') {
        const view = document.getElementById('viewChat');
        if(view) view.classList.remove('hidden');
        
        const btn = document.getElementById('tabChat');
        if(btn) btn.classList.add('active');
        
        if(window.innerWidth > 768) {
            setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
        }
    }
    toggleSidebar(false);
}

function toggleSidebar(show) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(!sidebar || !overlay) return;

    if (show) {
        sidebar.classList.add('active');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
    } else {
        sidebar.classList.remove('active');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
}

function loadUserProfile() {
    try {
        if (window.IS_DEMO) {
            const sideName = document.getElementById('sidebarName');
            const sideAvatar = document.getElementById('sidebarAvatar');
            const dashName = document.getElementById('dashName');

            if (sideName) sideName.innerText = "VISITANTE";
            if (sideAvatar) sideAvatar.innerText = "V"; 
            if (dashName) dashName.innerText = "OPERADOR CONVIDADO";
            return;
        }

        const sessionRaw = localStorage.getItem('synapse_session_v2') || localStorage.getItem('synapse_user');
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            const userName = session.user || session.nome || session.name || 'OPERADOR';
            const displayName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
            const firstLetter = displayName.charAt(0).toUpperCase();

            const sideName = document.getElementById('sidebarName');
            const sideAvatar = document.getElementById('sidebarAvatar');
            if (sideName) sideName.innerText = displayName;
            if (sideAvatar) sideAvatar.innerText = firstLetter;

            const dashName = document.getElementById('dashName');
            if (dashName) dashName.innerText = displayName.toUpperCase();
        }
    } catch (e) { console.warn("Perfil não carregado."); }
}

function updateStatusIndicator() {
    const statusCards = document.querySelectorAll('.dashboard-card');
    let statusDot = null;
    statusCards.forEach(card => {
        if(card.innerText.includes('STATUS')) statusDot = card.querySelector('.rounded-full');
    });

    if (statusDot) {
        if (navigator.onLine) {
            statusDot.classList.remove('bg-red-500');
            statusDot.classList.add('bg-green-500', 'animate-pulse');
        } else {
            statusDot.classList.remove('bg-green-500', 'animate-pulse');
            statusDot.classList.add('bg-red-500');
            if(typeof showToast === 'function') showToast('CONEXÃO PERDIDA', 'Modo Offline.', 'error');
        }
    }
}

// --- MODAIS (BRIEFING E VENDAS) ---

function showDemoModal(featureName) {
    let title = "Recurso Pro";
    let subtitle = "Acesso Exclusivo";
    let message = `A funcionalidade <span class="text-white font-bold">${featureName}</span> está disponível apenas nos planos avançados.`;
    let btnText = "Fazer Upgrade Agora";
    let iconClass = "fa-solid fa-lock";

    if (featureName === 'DOSSIE') {
        title = "Análise Concluída";
        subtitle = "Documento Pronto";
        message = `A IA processou suas respostas e gerou seu <span class="text-white font-bold"> Relatório </span>. O relatório contém a análise dos seus pontos cegos e o plano de ação.<br><br>Desbloqueie sua conta para acessar o documento completo.`;
        btnText = "Liberar Meu Relatório";
        iconClass = "fa-solid fa-file-shield";
    }
    
    const checkoutLink = 'https://pay.kiwify.com.br/YzOIskc'; 

    let modalInnerHTML = `
        <div class="relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div class="p-8">
                <div class="flex items-start gap-5">
                    <div class="flex-shrink-0 w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                        <i class="${iconClass} text-xl text-gray-300"></i>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-red-500 uppercase tracking-wider mb-1">${subtitle}</p>
                        <h3 class="text-2xl font-bold text-white mb-3">${title}</h3>
                        <p class="text-gray-400 text-sm leading-relaxed">${message}</p>
                    </div>
                </div>
                
                <div class="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
                    <button onclick="window.location.href='${checkoutLink}'" 
                        class="w-full py-3.5 bg-white text-black hover:bg-gray-200 font-bold rounded-lg transition-all flex items-center justify-center gap-2 group">
                        <span>${btnText}</span>
                        <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
                    </button>
                    <button onclick="closeDemoModal()" class="py-3 text-sm text-gray-500 hover:text-white transition-colors">
                        Agora não, voltar para demo
                    </button>
                </div>
            </div>
        </div>`;

    const existingModal = document.getElementById('demo-modal');
    if (existingModal) existingModal.remove();

    // CORREÇÃO AQUI: Alterado de z-[100] para z-[9999] para ficar acima da sidebar (que é 200)
    const modalBaseHTML = `
    <div id="demo-modal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity opacity-0" id="demo-overlay"></div>
        <div class="relative w-full w-[95%] max-w-md scale-95 opacity-0 transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto custom-scrollbar" id="demo-content">
            ${modalInnerHTML}
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalBaseHTML);

    setTimeout(() => {
        document.getElementById('demo-overlay').classList.remove('opacity-0');
        document.getElementById('demo-content').classList.remove('scale-95', 'opacity-0');
    }, 10);
}

function closeDemoModal() {
    const modal = document.getElementById('demo-modal');
    const overlay = document.getElementById('demo-overlay');
    const content = document.getElementById('demo-content');
    if(!modal) return;
    overlay.classList.add('opacity-0');
    content.classList.add('scale-90', 'opacity-0');
    setTimeout(() => { modal.classList.add('hidden'); }, 300);
}

function startDemoBriefing() {
    if (document.getElementById('demo-briefing')) return;
    if (localStorage.getItem('synapse_demo_seen')) return;

    // CORREÇÃO AQUI: Alterado de z-[200] para z-[9999]
    const modalHTML = `
    <div id="demo-briefing" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"></div>
        <div class="relative w-full w-[95%] max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
            <div class="h-24 md:h-32 bg-gradient-to-b from-red-900/20 to-transparent flex items-center justify-center relative overflow-hidden shrink-0">
                <div class="absolute inset-0 bg-[url('PRO/polvo_synapse.png')] bg-center bg-contain bg-no-repeat opacity-20 scale-150"></div>
            </div>
            <div class="p-6 md:p-8 text-center -mt-4 relative z-10 overflow-y-auto custom-scrollbar">
                <span class="inline-block py-1 px-3 rounded-full bg-red-500/10 border border-red-500/20 text-[9px] md:text-[10px] font-mono text-red-400 uppercase tracking-widest mb-4">Modo Visitante Ativo</span>
                <h2 class="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter mb-4">Bem-vindo à Base.</h2>
                <p class="text-gray-400 text-xs md:text-sm leading-relaxed mb-6">
                    Você tem permissão temporária para explorar a interface do <strong>Synapse PRO</strong>.<br><br>
                    <span class="text-white">✅ LIBERADO:</span> Navegação e <strong>Diagnóstico</strong>.<br>
                    <span class="text-gray-500">🔒 RESTRITO:</span> IAs de Elite e Relatórios.
                </p>
                <button onclick="closeBriefing()" class="w-full py-3 md:py-4 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 text-xs md:text-sm">Entendido, Iniciar Tour</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeBriefing() {
    const el = document.getElementById('demo-briefing');
    if (el) {
        el.style.opacity = '0';
        el.style.transition = 'opacity 0.5s ease';
        setTimeout(() => el.remove(), 500);
    }
}

window.showDemoModal = showDemoModal;
window.closeDemoModal = closeDemoModal;
window.startDemoBriefing = startDemoBriefing;
window.closeBriefing = closeBriefing;