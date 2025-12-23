import { initGamification } from './modules/gamification.js';
import { initDashboard } from './modules/dashboard.js';
import { initCalendar } from './modules/calendar.js';
import { initChat, loadAgent } from './core/chat.js';
import { showToast } from './modules/ui.js';
import { initAudio, playSFX } from './modules/audio.js';
// Importa as funções de funcionalidades extras
import { startSOSProtocol, startFocusMode, showWeeklyReport } from './modules/features.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SYNAPSE CORE v6.3 (STABLE)...");

    try {
        // 1. Carrega Perfil
        loadUserProfile();
        
        // 2. Inicia Áudio
        initAudio();
        
        // 3. Conecta Funções Globais (Resolve o erro "selectTool is not a function")
        window.selectTool = selectTool;
        window.switchTab = switchTab;
        window.toggleSidebar = toggleSidebar;
        
 // Conecta botões de funcionalidades
        window.startFocusMode = startFocusMode;
        
        // --- ESTRATÉGIA DO DOSSIÊ BLOQUEADO ---
        if (window.IS_DEMO) {
            // Se for Demo, o botão Relatório abre o Modal de Vendas
            window.showWeeklyReport = () => {
                if(typeof playSFX === 'function') playSFX('error');
                showDemoModal('DOSSIE'); // Chama nosso modal com o código 'DOSSIE'
            };
        } else {
            // Se for PRO, abre o relatório normal
            window.showWeeklyReport = showWeeklyReport;
        }
        // ---------------------------------------

        window.startSOSProtocol = startSOSProtocol;

        // 4. Liga o Botão SOS da Sidebar
        const btnSOS = document.getElementById('btn-sos-protocol');
        if (btnSOS) {
            btnSOS.onclick = () => {
                if(typeof playSFX === 'function') playSFX('click');
                startSOSProtocol();
                toggleSidebar(false);
            };
        }

        // 5. Inicia os Módulos Principais
        initChat();
        initGamification();
        initDashboard();
        initCalendar();
        
        // 6. Monitor de Status
        window.addEventListener('online', updateStatusIndicator);
        window.addEventListener('offline', updateStatusIndicator);
        updateStatusIndicator();

    } catch (error) {
        console.error("ERRO CRÍTICO NA INICIALIZAÇÃO:", error);
    }
});

// --- FUNÇÕES DE NAVEGAÇÃO (GLOBAL) ---

// PRO/js/main.js

// PRO/js/main.js - Atualize a função selectTool

function selectTool(toolName) {
    // 1. LISTA VIP ATUALIZADA (Diagnóstico foi removido daqui, agora é livre)
    const FERRAMENTAS_PRO = ['COMANDANTE', 'GENERAL', 'TATICO']; 

    // 2. O SEGURANÇA
    if (window.IS_DEMO && FERRAMENTAS_PRO.includes(toolName.toUpperCase())) {
        if(typeof playSFX === 'function') playSFX('error');
        showDemoModal(toolName); // Abre a venda
        return; 
    }

    // 3. FLUXO LIBERADO (Para Diagnóstico ou usuários PRO)
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
    } 
    else if (tabName === 'chat') {
        const view = document.getElementById('viewChat');
        if(view) view.classList.remove('hidden');
        
        const btn = document.getElementById('tabChat');
        if(btn) btn.classList.add('active');
        setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
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
        const sessionRaw = localStorage.getItem('synapse_session_v2') || localStorage.getItem('synapse_user');
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            const userName = session.user || session.nome || session.name || (session.email ? session.email.split('@')[0] : 'OPERADOR');
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
// --- SISTEMA DE VENDAS (DEMO) ---

// PRO/js/main.js - Função showDemoModal Atualizada

// PRO/js/main.js - Substitua a função showDemoModal inteira por esta:

function showDemoModal(featureName) {
    // ==============================================================================
    // ESCOLHA O SEU MODELO AQUI (Mude o número para 1, 2 ou 3 para testar)
    const ESTILO_ESCOLHIDO = 1; 
    // ==============================================================================

    // --- 1. Configuração dos Textos Dinâmicos ---
    let title = "Recurso Pro";
    let subtitle = "Acesso Exclusivo";
    // Usamos uma mensagem padrão caso não seja o Dossiê
    let message = `A funcionalidade <span class="text-white font-bold">${featureName}</span> está disponível apenas nos planos avançados.`;
    let btnText = "Fazer Upgrade Agora";
    let iconClass = "fa-solid fa-lock"; // Ícone padrão

    // PERSONALIZAÇÃO ESTRATÉGICA PARA O DOSSIÊ
    if (featureName === 'DOSSIE') {
        title = "Análise Concluída";
        subtitle = "Documento Pronto";
        message = `A IA processou suas respostas e gerou seu <span class="text-white font-bold">Dossiê Estratégico</span>. O relatório contém a análise dos seus pontos cegos e o plano de ação.<br><br>Desbloqueie sua conta para acessar o documento completo.`;
        btnText = "Liberar Meu Dossiê";
        iconClass = "fa-solid fa-file-shield";
    }
    
    // Link do seu checkout
    const checkoutLink = "'https://SEU-LINK-DE-CHECKOUT.com'";


    // --- 2. Templates HTML dos Modais ---
    let modalInnerHTML = '';

    // --- OPÇÃO 1: Premium Upgrade (Sóbrio) ---
    if (ESTILO_ESCOLHIDO === 1) {
        modalInnerHTML = `
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
                        <button onclick="window.location.href=${checkoutLink}" 
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
    }
    
    // --- OPÇÃO 2: Tactical Briefing (Imersivo) ---
    else if (ESTILO_ESCOLHIDO === 2) {
        modalInnerHTML = `
            <div class="relative bg-[#0a0a0a] border-y-2 border-red-900/70 rounded-lg overflow-hidden shadow-[0_0_30px_rgba(127,29,29,0.2)]">
                <div class="absolute inset-0 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAADCAYAAABS3WWLAAAADklEQVQYV2NkcHCoZwAC9gEha5K2aQAAAABJRU5ErkJggg==')] opacity-10 pointer-events-none"></div>
                
                <div class="p-1 bg-red-900/20 flex justify-between items-center px-4 py-2 border-b border-red-900/30">
                    <span class="text-[10px] font-mono text-red-400 uppercase tracking-widest">/// SYSTEM OVERRIDE ///</span>
                    <span class="text-[10px] font-mono text-red-500 animate-pulse">SECURE CHANNEL</span>
                </div>
                
                <div class="p-8 text-center relative z-10">
                    <div class="mb-6 inline-block p-4 border border-red-500/30 rounded-full bg-red-500/5">
                        <i class="${iconClass} text-3xl text-red-500"></i>
                    </div>
                    <h3 class="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">${title}</h3>
                    <p class="text-red-200/70 text-sm font-mono mb-8 border-l-2 border-red-800/50 pl-4 text-left">
                        <span class="block text-xs text-red-500 mb-2 font-bold">[CLASSIFIED INFO]</span>
                        ${message}
                    </p>

                    <button onclick="window.location.href=${checkoutLink}" 
                        class="w-full py-4 bg-red-700 hover:bg-red-600 text-white font-mono uppercase tracking-widest text-sm border-b-4 border-red-900 active:border-b-0 active:translate-y-[4px] transition-all mb-4">
                        [ ${btnText} ]
                    </button>
                     <button onclick="closeDemoModal()" class="text-xs font-mono text-red-400 hover:text-red-300 tracking-widest">
                        < DECLINE & RETURN >
                    </button>
                </div>
            </div>`;
    }

    // --- OPÇÃO 3: Value Stack (Benefícios) ---
    else if (ESTILO_ESCOLHIDO === 3) {
         modalInnerHTML = `
            <div class="relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-1">
                <div class="bg-black/60 rounded-[20px] p-8">
                    <div class="text-center mb-8">
                        <div class="inline-flex items-center justify-center w-14 h-14 mb-5 bg-red-600/20 text-red-500 rounded-2xl">
                            <i class="${iconClass} text-2xl"></i>
                        </div>
                        <h3 class="text-xl font-bold text-white mb-3">${title}</h3>
                        <p class="text-zinc-400 text-sm leading-relaxed">${message}</p>
                    </div>

                    <div class="bg-zinc-900/80 rounded-xl p-5 mb-8">
                        <p class="text-xs font-bold text-zinc-500 uppercase mb-4">Incluso no plano PRO:</p>
                        <ul class="space-y-3 text-sm text-zinc-300">
                            <li class="flex items-center gap-3"><i class="fa-solid fa-check text-red-500"></i> Acesso ilimitado aos 3 Agentes</li>
                            <li class="flex items-center gap-3"><i class="fa-solid fa-check text-red-500"></i> Relatórios e Dossiês completos</li>
                            <li class="flex items-center gap-3"><i class="fa-solid fa-check text-red-500"></i> Modo Foco e Ferramentas Táticas</li>
                        </ul>
                    </div>
                    
                    <button onclick="window.location.href=${checkoutLink}" 
                        class="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-red-600/20 mb-4">
                        ${btnText}
                    </button>
                    <button onclick="closeDemoModal()" class="w-full py-2 text-sm text-zinc-500 hover:text-white transition-colors">
                        Talvez mais tarde
                    </button>
                </div>
            </div>`;
    }


    // --- 3. Lógica de Exibição (Não precisa mexer aqui) ---
    
    // Remove modal anterior se existir para garantir que o novo estilo seja aplicado
    const existingModal = document.getElementById('demo-modal');
    if (existingModal) {
        existingModal.remove();
    }

    // Cria a estrutura base do modal
    const modalBaseHTML = `
    <div id="demo-modal" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity opacity-0" id="demo-overlay"></div>
        <div class="relative w-full max-w-md scale-95 opacity-0 transition-all duration-300 ease-out" id="demo-content">
            ${modalInnerHTML}
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalBaseHTML);

    // Animação de entrada
    setTimeout(() => {
        document.getElementById('demo-overlay').classList.remove('opacity-0');
        document.getElementById('demo-content').classList.remove('scale-95', 'opacity-0');
    }, 10);
}

// (Mantenha a função closeDemoModal original logo abaixo desta)

function closeDemoModal() {
    const modal = document.getElementById('demo-modal');
    const overlay = document.getElementById('demo-overlay');
    const content = document.getElementById('demo-content');

    if(!modal) return;

    overlay.classList.add('opacity-0');
    content.classList.add('scale-90', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

// Expõe a função de fechar para o HTML poder usar
window.closeDemoModal = closeDemoModal;