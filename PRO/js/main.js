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
        if(img) img.className = "w-full h-full object-contain opacity-100 grayscale-0 transition-all duration-500";
        
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
    if(typeof playSFX === 'function') playSFX('click');
    const FERRAMENTAS_PRO = ['COMANDANTE', 'GENERAL', 'TATICO']; 

    // Se for DEMO e tentar acessar ferramenta PRO -> Bloqueia
    if (window.IS_DEMO && FERRAMENTAS_PRO.includes(toolName.toUpperCase())) {
        if(typeof playSFX === 'function') playSFX('error');
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

function switchTab(tabName) {
    if(typeof playSFX === 'function') playSFX('click');
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

// No arquivo: PRO/js/main.js

function showDemoModal(featureName) {
    if(typeof playSFX === 'function') playSFX('error');
    let title = "Acesso Restrito";
    let subtitle = "Funcionalidade PRO";
    let message = `O recurso <span class="text-white font-bold">${featureName}</span> é exclusivo para operadores do plano completo.`;
    let btnText = "Desbloquear Agora";
    let iconClass = "fa-solid fa-lock";

    // PERSONALIZAÇÃO DO DISCURSO DE VENDA
    if (featureName === 'DOSSIE') {
        title = "Dossiê Bloqueado";
        subtitle = "Análise de Perfil";
        message = `A IA gerou seu <span class="text-white font-bold">Relatório Semanal</span>, mas ele está criptografado. O Dossiê revela seus padrões ocultos de comportamento e sugere ajustes táticos.`;
        btnText = "Liberar Meu Dossiê";
        iconClass = "fa-solid fa-file-shield";
    }
    else if (featureName === 'MODO FOCO') {
        title = "Hiperfoco Neural";
        subtitle = "Ferramenta Tática";
        message = `Você tentou ativar o <span class="text-white font-bold">Modo de Imersão</span>. Essa ferramenta bloqueia distrações e usa frequências sonoras (Binaural Beats) para induzir estado de fluxo imediato.`;
        btnText = "Ativar Modo Foco";
        iconClass = "fa-solid fa-headset";
    }
    else if (featureName === 'PROTOCOLO SOS') {
        title = "Protocolo de Resgate";
        subtitle = "Emergência";
        message = `O botão <span class="text-red-500 font-bold">S.O.S.</span> é o recurso mais poderoso do sistema. Ele ativa uma intervenção de áudio guiada para crises de ansiedade, pânico ou procrastinação aguda.`;
        btnText = "Obter Botão de Pânico";
        iconClass = "fa-solid fa-tower-broadcast";
    }
    
    // --- LINK DE CHECKOUT INTELIGENTE ---
    let checkoutLink = 'https://pay.kiwify.com.br/YzOIskc'; 
    const sessionRaw = localStorage.getItem('synapse_user');
    if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session.email) {
            checkoutLink += `?email=${encodeURIComponent(session.email)}`;
        }
    }

    let modalInnerHTML = `
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
                        <div class="absolute inset-0 bg-red-500/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
                        <span class="relative z-10">${btnText}</span>
                        <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform text-red-600 relative z-10"></i>
                    </button>
                    <button onclick="closeDemoModal()" class="py-2 text-xs text-gray-600 hover:text-white transition-colors uppercase tracking-wider font-bold">
                        Voltar para Synapse Core <i class="fa-solid fa-arrow-left ml-1"></i>
                    </button>
                </div>
            </div>
        </div>`;

    const existingModal = document.getElementById('demo-modal');
    if (existingModal) existingModal.remove();

    const modalBaseHTML = `
    <div id="demo-modal" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity opacity-0" id="demo-overlay"></div>
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

    // VOLTEI PARA O ORIGINAL: url('PRO/polvo_synapse.png')
    const modalHTML = `
    <div id="demo-briefing" class="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-md animate-fade-in"></div>
        
        <div class="relative w-full w-[95%] max-w-lg bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[90vh]">
            
            <div class="h-24 md:h-32 bg-gradient-to-b from-green-900/10 to-transparent flex items-center justify-center relative overflow-hidden shrink-0">
                <div class="absolute inset-0 bg-[url('PRO/polvo_synapse.png')] bg-center bg-contain bg-no-repeat opacity-20 scale-150"></div>
                <div class="absolute bottom-0 w-full h-10 bg-gradient-to-t from-[#0a0a0a] to-transparent"></div>
            </div>

            <div class="p-6 md:p-8 text-center -mt-8 relative z-10 overflow-y-auto custom-scrollbar">
                
                <span class="inline-block py-1 px-3 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] md:text-[10px] font-mono text-green-400 uppercase tracking-widest mb-4 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    <i class="fa-solid fa-check-circle mr-1"></i> Acesso Concedido
                </span>

                <h2 class="text-xl md:text-2xl font-black text-white italic uppercase tracking-tighter mb-4">
                    Bem-vindo ao Core.
                </h2>

                <p class="text-gray-400 text-xs md:text-sm leading-relaxed mb-6 font-medium">
                    Sua identidade foi registrada. O sistema Synapse agora está conectado à sua mente.<br><br>
                    Preparamos um tour rápido para te ensinar a dominar sua dopamina e organizar sua rotina usando o método PRO.
                </p>

                <button onclick="closeBriefing()" class="w-full py-3 md:py-4 bg-white text-black hover:bg-gray-200 font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95 text-xs md:text-sm flex items-center justify-center gap-2 group">
                    <span>Iniciar Protocolo</span>
                    <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform text-red-600"></i>
                </button>
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