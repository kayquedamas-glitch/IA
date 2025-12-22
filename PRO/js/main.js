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
        window.showWeeklyReport = showWeeklyReport;
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

function selectTool(toolName) {
    // Muda para a aba de chat
    switchTab('chat');
    // Carrega o agente específico
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