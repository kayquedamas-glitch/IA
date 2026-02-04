import { initGamification } from './modules/gamification.js';
import { initDashboard } from './modules/dashboard.js';
import { initCalendar } from './modules/calendar.js';
import './modules/database.js';
import { initChat, loadAgent } from './core/chat.js';
import { showToast } from './modules/ui.js';
import { initAudio, playSFX } from './modules/audio.js';
import { startSOSProtocol, startFocusMode, showWeeklyReport } from './modules/features.js';

// --- INICIALIZAÇÃO DO SISTEMA (BOOT) ---
document.addEventListener('DOMContentLoaded', () => {
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

    // Configura os recursos (features)
    window.features = {
        // Bloqueia MODO FOCO se for Demo
        startFocusMode: window.IS_DEMO ? () => showDemoModal('MODO FOCO') : startFocusMode,

        // Bloqueia PROTOCOLO SOS se for Demo
        startSOSProtocol: window.IS_DEMO ? () => showDemoModal('PROTOCOLO SOS') : startSOSProtocol,

        // Bloqueia RELATÓRIO (Dossiê) se for Demo
        showWeeklyReport: window.IS_DEMO ? () => showDemoModal('DOSSIE') : showWeeklyReport
    };

    // Atualiza os atalhos globais para usar as versões (possivelmente) bloqueadas
    window.startFocusMode = window.features.startFocusMode;
    window.startSOSProtocol = window.features.startSOSProtocol;
    window.showWeeklyReport = window.features.showWeeklyReport;

    // Atualiza o click do botão SOS da sidebar para usar a nova função protegida
    const btnSOS = document.getElementById('btn-sos-protocol');
    if (btnSOS) btnSOS.onclick = () => {
        window.features.startSOSProtocol();
        toggleSidebar(false);
    };

    // 2. INICIALIZAÇÃO DO BANCO E VERIFICAÇÃO AUTOMÁTICA
    try {
        if (window.Database) {
            await window.Database.init();

            // >>> CHECA SE VIROU PRO <<<
            await checkRealUserStatus();

        } else {
            console.warn("⚠️ Banco de dados não carregado.");
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


// --- [NOVO] Verifica status real no Supabase ---
async function checkRealUserStatus() {
    try {
        const sessionRaw = localStorage.getItem('synapse_user');
        if (!sessionRaw) return;

        const session = JSON.parse(sessionRaw);
        const email = session.email;

        // Tenta usar o cliente Supabase global
        const client = window.supabase || (window.Database ? window.Database.client : null);

        if (client && email) {
            const { data, error } = await client
                .from('clientes_vip')
                .select('status')
                .eq('email', email)
                .single();

            if (data && data.status) {
                // Se o banco diz PRO, mas o navegador diz FREE -> Atualiza!
                if (data.status.toLowerCase() !== (session.status || 'free').toLowerCase()) {
                    console.log(`🔄 Status atualizado via Banco: ${data.status}`);

                    session.status = data.status.toLowerCase();
                    localStorage.setItem('synapse_user', JSON.stringify(session));

                    // Se virou PRO, desliga o modo DEMO
                    if (session.status === 'pro' || session.status === 'vip') {
                        window.IS_DEMO = false;
                        localStorage.removeItem('synapse_demo_mode');
                        // Recarrega para aplicar desbloqueios
                        setTimeout(() => window.location.reload(), 500);
                    }
                }
            }
        }
    } catch (err) {
        console.warn("CheckStatus ignorado (offline ou erro):", err);
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
            if (window.IS_DEMO && window.startDemoBriefing) window.startDemoBriefing();
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

function switchTab(tabName) {
    if (typeof playSFX === 'function') playSFX('click');
    
    // 1. Esconde todas as seções
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    // 2. Lógica do Botão NOVO CHAT (Correção Solicitada)
    const newChatBtn = document.getElementById('newChatContainer');
    if (newChatBtn) {
        // Só mostra se a aba for 'chat'
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
        if (window.IS_DEMO) {
            const sideName = document.getElementById('sidebarName');
            const sideAvatar = document.getElementById('sidebarAvatar');
            const dashName = document.getElementById('dashName');

            if (sideName) sideName.innerText = "VISITANTE";
            if (sideAvatar) sideAvatar.innerText = "V";
            if (dashName) dashName.innerText = "OPERADOR CONVIDADO";
            return;
        }

        const sessionRaw = localStorage.getItem('synapse_user');

        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);

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

// No arquivo: PRO/js/main.js

function showDemoModal(featureName) {
    if (typeof playSFX === 'function') playSFX('error');
    
    // Configuração dos textos (mantive sua lógica original)
    let title = "Acesso Restrito";
    let subtitle = "Funcionalidade PRO";
    let message = `O recurso <span class="text-white font-bold">${featureName}</span> é exclusivo para operadores do plano completo.`;
    let btnText = "Desbloquear Agora";
    let iconClass = "fa-solid fa-lock";

    if (featureName === 'DOSSIE') {
        title = "Dossiê Bloqueado";
        subtitle = "Análise de Perfil";
        message = `A IA gerou seu <span class="text-white font-bold">Relatório Semanal</span>, mas ele está criptografado.`;
        btnText = "Liberar Meu Dossiê";
        iconClass = "fa-solid fa-file-shield";
    }
    else if (featureName === 'MODO FOCO') {
        title = "Hiperfoco Neural";
        subtitle = "Ferramenta Tática";
        message = `Você tentou ativar o <span class="text-white font-bold">Modo de Imersão</span>.`;
        btnText = "Ativar Modo Foco";
        iconClass = "fa-solid fa-headset";
    }
    else if (featureName === 'PROTOCOLO SOS') {
        title = "Protocolo de Resgate";
        subtitle = "Emergência";
        message = `O botão <span class="text-red-500 font-bold">S.O.S.</span> ativa uma intervenção para crises.`;
        btnText = "Obter Botão de Pânico";
        iconClass = "fa-solid fa-tower-broadcast";
    }

    let checkoutLink = 'https://pay.kiwify.com.br/YzOIskc';
    const sessionRaw = localStorage.getItem('synapse_user');
    if (sessionRaw) {
        try {
            const session = JSON.parse(sessionRaw);
            if (session.email) checkoutLink += `?email=${encodeURIComponent(session.email)}`;
        } catch(e){}
    }

    // --- A CORREÇÃO VISUAL ESTÁ AQUI (top-14) ---
    const modalBaseHTML = `
    <div id="demo-modal" class="fixed left-0 right-0 bottom-0 top-14 md:top-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity opacity-0" id="demo-overlay" onclick="closeDemoModal()"></div>
        <div class="relative w-full w-[95%] max-w-md scale-95 opacity-0 transition-all duration-300 ease-out max-h-[90vh] overflow-y-auto custom-scrollbar" id="demo-content">
            <div class="relative bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-900 via-red-600 to-gray-900"></div>
                
                <div class="p-8">
                    <div class="flex items-start gap-5">
                        <div class="flex-shrink-0 w-14 h-14 bg-red-900/10 rounded-xl flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                            <i class="${iconClass} text-2xl text-red-500"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                                <i class="fa-solid fa-lock text-[8px]"></i> ${subtitle}
                            </p>
                            <h3 class="text-2xl font-bold text-white mb-3 italic">${title}</h3>
                            <p class="text-gray-400 text-sm leading-relaxed">${message}</p>
                        </div>
                    </div>
                    
                    <div class="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3">
                        <button onclick="window.location.href='${checkoutLink}'" 
                            class="w-full py-4 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-3 group relative overflow-hidden">
                            <span class="relative z-10">${btnText}</span>
                            <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform text-red-600 relative z-10"></i>
                        </button>
                        
                        <button onclick="window.closeDemoModal()" class="py-2 text-xs text-gray-600 hover:text-white transition-colors uppercase tracking-wider font-bold cursor-pointer">
                            Voltar para Synapse Free <i class="fa-solid fa-arrow-left ml-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;

    const existingModal = document.getElementById('demo-modal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalBaseHTML);

    // Pequeno delay para a animação CSS funcionar
    requestAnimationFrame(() => {
        const overlay = document.getElementById('demo-overlay');
        const content = document.getElementById('demo-content');
        if(overlay) overlay.classList.remove('opacity-0');
        if(content) content.classList.remove('scale-95', 'opacity-0');
    });
}

function closeDemoModal() {
    const modal = document.getElementById('demo-modal');
    if (!modal) return;
    
    // Animação de saída
    const overlay = document.getElementById('demo-overlay');
    const content = document.getElementById('demo-content');
    
    if(overlay) overlay.classList.add('opacity-0');
    if(content) content.classList.add('scale-90', 'opacity-0');
    
    // Remove do DOM após a animação
    setTimeout(() => { 
        modal.remove(); 
    }, 300);
}
// --- FUNÇÃO DE BOAS-VINDAS INTELIGENTE ---
// =================================================================
// 1. BOAS-VINDAS (CLEAN & MINIMALISTA)
// =================================================================
function startDemoBriefing() {
    // Verifica usuário
    let user = { nome: "Visitante", email: "demo", status: "free" };
    try {
        const savedUser = localStorage.getItem('synapse_user');
        if (savedUser) user = JSON.parse(savedUser);
    } catch (e) { }

    // Verifica se já viu (Bloqueio por e-mail)
    const storageKey = `synapse_welcome_seen_${user.email}`;
    if (document.getElementById('demo-briefing')) return;
    if (localStorage.getItem(storageKey)) return;

    const primeiroNome = user.nome ? user.nome.split(' ')[0] : 'Operador';

    // HTML Minimalista
    const modalHTML = `
    <div id="demo-briefing" class="fixed inset-0 z-[99999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-[#000000]/90 backdrop-blur-xl animate-fade-in"></div>

        <div class="relative w-full max-w-5xl bg-[#0a0a0a] border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-fade-in-up max-h-[90vh]">
            
            <div class="relative h-64 md:h-auto md:w-1/2 overflow-hidden bg-gradient-to-br from-[#1a0505] to-black flex items-center justify-center">
                <div class="absolute inset-0 bg-[url('PRO/polvo_synapse.png')] bg-center bg-contain bg-no-repeat opacity-80 md:scale-90 animate-pulse-slow"></div>
                <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent"></div>
            </div>

            <div class="flex flex-col justify-center p-8 md:p-12 md:w-1/2 bg-[#0a0a0a] relative z-10">
                
                <div class="mb-8">
                    <div class="flex items-center gap-2 mb-4 opacity-50">
                        <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                        <span class="text-[9px] uppercase tracking-[0.3em] font-mono text-white">Conexão Estabelecida</span>
                    </div>

                    <h1 class="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-2 leading-none">
                        Olá, <span class="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-800">${primeiroNome}</span>
                    </h1>
                    
                    <p class="text-gray-500 text-sm leading-relaxed max-w-sm mt-4">
                        O sistema Synapse está pronto. Configuramos seu ambiente neural para máxima produtividade.
                    </p>
                </div>

                <div class="space-y-3 mt-auto">
                    <button onclick="iniciarTourDetalhado()" class="w-full py-4 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-3 group">
                        <div class="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="fa-solid fa-play text-[8px]"></i>
                        </div>
                        <span>Conhecer Ferramentas</span>
                    </button>

                    <button onclick="fecharBoasVindas()" class="w-full py-4 rounded-xl border border-white/10 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-white hover:border-white/30 transition-all">
                        Pular Introdução
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function fecharBoasVindas() {
    const modal = document.getElementById('demo-briefing');
    let userEmail = 'demo';
    try { const u = JSON.parse(localStorage.getItem('synapse_user')); if (u) userEmail = u.email; } catch (e) { }

    localStorage.setItem(`synapse_welcome_seen_${userEmail}`, 'true');

    if (modal) {
        modal.style.transition = 'opacity 0.5s ease';
        modal.style.opacity = '0';
        setTimeout(() => modal.remove(), 500);
    }
}



const html = `
    <div id="tour-overlay" class="fixed inset-0 z-[10000] pointer-events-none">
        <div class="pointer-events-auto ${containerClasses} transition-all duration-500 ease-out z-[10010]">
            
            <div class="${cardBaseClasses}">
                <div class="absolute top-0 left-0 h-1 bg-red-600 transition-all duration-300" style="width: ${((index + 1) / total) * 100}%"></div>
                
                <div class="flex justify-between items-start mb-3">
                    <h3 class="text-lg font-black text-white uppercase italic tracking-wider">${dados.titulo}</h3>
                    <span class="text-[10px] font-mono text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">${index + 1}/${total}</span>
                </div>
                
                <p class="text-sm text-gray-300 mb-6 leading-relaxed font-medium">
                    ${dados.texto}
                </p>

                <div class="flex gap-3">
                     ${index > 0 ? `<button onclick="passoAnterior()" class="px-4 py-3 border border-white/20 text-white rounded-lg font-bold uppercase text-xs hover:bg-white/10 transition-colors"><i class="fa-solid fa-arrow-left"></i></button>` : ''}
                     
                    <button onclick="proximoPasso()" class="flex-1 py-3 bg-white text-black hover:bg-gray-200 rounded-lg font-bold uppercase text-xs tracking-widest flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform">
                        ${index === total - 1 ? 'Concluir' : 'Próximo'} <i class="fa-solid fa-arrow-right"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;

document.body.insertAdjacentHTML('beforeend', html);


// Adicione também esta pequena função para permitir voltar, se quiser
window.passoAnterior = () => {
    // Você precisará expor a variável passoAtual globalmente ou dentro do escopo do tour
    // Se não quiser mexer muito, apenas ignore este bloco, o botão voltar é opcional.
};

// Exporta globais
window.startDemoBriefing = startDemoBriefing;
window.iniciarTourDetalhado = iniciarTourDetalhado;
window.fecharBoasVindas = fecharBoasVindas;
window.closeDemoModal = closeDemoModal;