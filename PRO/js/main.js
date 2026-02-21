import { initGamification } from './modules/gamification.js';
import { initDashboard } from './modules/dashboard.js';
import { initCalendar } from './modules/calendar.js';
import { initChat, loadAgent } from './core/chat.js';
import { showToast } from './modules/ui.js';
import { initAudio, playSFX } from './modules/audio.js';
import { startSOSProtocol, startFocusMode, showWeeklyReport } from './modules/features.js';
import Auth from './modules/auth.js';
import './modules/database.js'; // Carrega para registrar window.Database

// --- INICIALIZAÇÃO DO SISTEMA (BOOT) ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Inicializa Autenticação e Verificação de Status
    const authorized = await Auth.init();

    if (!authorized) {
        window.location.href = "login.html";
        return;
    }

    // Verifica qual foi o último boot e inverte para variar a animação
    const lastBoot = localStorage.getItem('synapse_boot_mode');
    const currentMode = lastBoot === 'BIO' ? 'NEURAL' : 'BIO';

    localStorage.setItem('synapse_boot_mode', currentMode);

    if (currentMode === 'BIO') {
        runBootBiometria();
    } else {
        runBootNeural();
    }
});

// =================================================================
// BOOT 1: BIOMETRIA TÁTICA
// =================================================================
async function runBootBiometria() {
    const bootOverlay = document.createElement('div');
    bootOverlay.id = 'boot-overlay';
    bootOverlay.className = 'fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center p-8';

    // VOLTEI PARA O ORIGINAL: src="logo_synapse.png"
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

        // --- CARREGA O SISTEMA ---
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
        if (img) img.className = "w-full h-full object-contain opacity-100 grayscale-0 transition-all duration-500";

        await wait(800);
        finishBoot(bootOverlay);

    } catch (error) { console.error(error); bootOverlay.remove(); }
}

// =================================================================
// BOOT 2: SINCRONIZAÇÃO NEURAL
// =================================================================
async function runBootNeural() {
    const bootOverlay = document.createElement('div');
    bootOverlay.id = 'boot-overlay';
    bootOverlay.className = 'fixed inset-0 bg-black z-[99999] flex flex-col items-center justify-center p-8';

    // VOLTEI PARA O ORIGINAL: src="logo_synapse.png"
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

        // --- CARREGA O SISTEMA ---
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
// CARREGAMENTO REAL DO SISTEMA (CORE)
// =================================================================
async function initializeSystemCore() {
    loadUserProfile();

    // 1. Define funções globais
    window.selectTool = selectTool;
    window.switchTab = switchTab;
    window.toggleSidebar = toggleSidebar;

    const isPro = true; // Plataforma 100% PRO
    window.IS_DEMO = false;

    // Configura os recursos (features) — todos desbloqueados
    window.features = {
        startFocusMode,
        startSOSProtocol,
        showWeeklyReport
    };

    // Atalhos globais
    window.startFocusMode = startFocusMode;
    window.startSOSProtocol = startSOSProtocol;
    window.showWeeklyReport = showWeeklyReport;

    // Configura o botão SOS da sidebar
    const btnSOS = document.getElementById('btn-sos-protocol');
    if (btnSOS) btnSOS.onclick = () => {
        startSOSProtocol();
        toggleSidebar(false);
    };

    // 2. INICIALIZAÇÃO DO BANCO E VERIFICAÇÃO AUTOMÁTICA
    try {
        if (window.Database) {
            await window.Database.init();
        }
    } catch (e) {
        console.error("Erro ao iniciar banco:", e);
    }

    // 3. CONFIGURA LINKS DE VENDA (Checkout Inteligente)
    setupCheckoutLinks();

    // 4. Inicializa módulos
    initAudio();
    await initChat();
    await initGamification();
    initDashboard();
    initCalendar();

    // Monitor de Conexão
    window.addEventListener('online', updateStatusIndicator);
    window.addEventListener('offline', updateStatusIndicator);
    updateStatusIndicator();

    if (window.Database) {
        window.Database.logEvent("LOGIN_SISTEMA", "App Iniciado");
    }
}

// --- [NOVO] Adiciona o e-mail nos links de checkout ---
function setupCheckoutLinks() {
    try {
        const sessionRaw = localStorage.getItem('synapse_user');
        if (!sessionRaw) return;

        const session = JSON.parse(sessionRaw);
        const userEmail = session.email;

        if (!userEmail) return;

        // Pega todos os links que apontam para a Kiwify
        const kiwifyLinks = document.querySelectorAll("a[href*='pay.kiwify.com.br']");

        kiwifyLinks.forEach(link => {
            let originalUrl = link.getAttribute('href');
            if (originalUrl && !originalUrl.includes('email=')) {
                const separator = originalUrl.includes('?') ? '&' : '?';
                link.setAttribute('href', `${originalUrl}${separator}email=${encodeURIComponent(userEmail)}`);
            }
        });
        console.log("🔗 Checkout links sincronizados.");
    } catch (e) { console.error(e); }
}


function finishBoot(overlay) {
    overlay.style.transition = 'opacity 0.8s ease';
    overlay.style.opacity = '0';

    setTimeout(() => {
        overlay.remove();
        switchTab('chat');
        setTimeout(() => {
            if (typeof loadAgent === 'function') loadAgent('Diagnostico');
        }, 100);
    }, 800);
}

// --- FUNÇÕES DE NAVEGAÇÃO E LÓGICA ---

function selectTool(toolName) {
    if (typeof playSFX === 'function') playSFX('click');
    const FERRAMENTAS_PRO = ['COMANDANTE', 'GENERAL', 'TATICO'];

    // Se for DEMO e tentar acessar ferramenta PRO -> Bloqueia
    if (window.IS_DEMO && FERRAMENTAS_PRO.includes(toolName.toUpperCase())) {
        if (typeof playSFX === 'function') playSFX('error');

        // --- CORREÇÃO AQUI: Fecha a sidebar antes de abrir o modal ---
        toggleSidebar(false);
        // -----------------------------------------------------------

        showDemoModal(toolName);
        return;
    }

    if (window.Database) window.Database.logEvent("USO_FERRAMENTA", toolName);

    switchTab('chat');
    if (typeof loadAgent === 'function') {
        loadAgent(toolName);
    } else {
        console.error("loadAgent não encontrado.");
    }
}

// No arquivo js/main.js

// APP/PRO/js/main.js

function switchTab(tabName) {
    if (typeof playSFX === 'function') playSFX('click');

    // 1. Esconde todas as seções
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    // 2. Lógica do Botão NOVO CHAT
    const newChatBtn = document.getElementById('newChatContainer');
    if (newChatBtn) {
        newChatBtn.style.display = (tabName === 'chat') ? 'block' : 'none';
    }

    // 3. Ativa a aba correta
    if (tabName === 'protocolo') {
        const view = document.getElementById('viewProtocolo');
        if (view) view.classList.remove('hidden');

        const btn = document.getElementById('tabJornada');
        if (btn) btn.classList.add('active');

        if (typeof renderCalendar === 'function') renderCalendar();
    }
    else if (tabName === 'chat') {
        const view = document.getElementById('viewChat');
        if (view) view.classList.remove('hidden');

        const btn = document.getElementById('tabChat');
        if (btn) btn.classList.add('active');

        if (window.innerWidth > 768) {
            setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
        }
    }
    // --- ADICIONE ESTE BLOCO ABAIXO ---
    else if (tabName === 'tatico') {
        const view = document.getElementById('viewTatico');
        if (view) view.classList.remove('hidden');

        const btn = document.getElementById('tabTatico');
        if (btn) btn.classList.add('active');

        // Chama a renderização manual do módulo tático (exposto pelo tactical.js)
        if (window.initTacticalModule) window.initTacticalModule();
    }
    // ----------------------------------

    toggleSidebar(false);
}

function toggleSidebar(show) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

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
        if (window.IS_DEMO && false) { // Desabilitado para focar no Auth real
            // Lógica antiga de visitante
        }

        const session = Auth.getUser();

        if (session) {
            let userName = session.nome || session.name || session.user;
            if (!userName && session.email) {
                userName = session.email.split('@')[0];
            }
            userName = userName || 'OPERADOR';

            const displayName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
            const firstLetter = displayName.charAt(0).toUpperCase();

            const sideName = document.getElementById('sidebarName');
            const sideAvatar = document.getElementById('sidebarAvatar');
            if (sideName) sideName.innerText = displayName;
            if (sideAvatar) sideAvatar.innerText = firstLetter;

            const dashName = document.getElementById('dashName');
            if (dashName) dashName.innerText = displayName.toUpperCase();
        }
    } catch (e) {
        console.warn("Erro ao carregar perfil:", e);
    }
}



function updateStatusIndicator() {
    const statusCards = document.querySelectorAll('.dashboard-card');
    let statusDot = null;
    statusCards.forEach(card => {
        if (card.innerText.includes('STATUS')) statusDot = card.querySelector('.rounded-full');
    });

    if (statusDot) {
        if (navigator.onLine) {
            statusDot.classList.remove('bg-red-500');
            statusDot.classList.add('bg-green-500', 'animate-pulse');
        } else {
            statusDot.classList.remove('bg-green-500', 'animate-pulse');
            statusDot.classList.add('bg-red-500');
            if (typeof showToast === 'function') showToast('CONEXÃO PERDIDA', 'Modo Offline.', 'error');
        }
    }
}

// --- MODAIS (BRIEFING E VENDAS) ---

// Exporta globais
window.startDemoBriefing = function () { }; // Stub vazio (compat)
window.closeDemoModal = function () { };
window.fecharBoasVindas = function () { };