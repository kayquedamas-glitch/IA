import { initGamification } from './modules/gamification.js';
import { initDashboard } from './modules/dashboard.js';
import { initCalendar } from './modules/calendar.js';
import { initChat, loadAgent } from './core/chat.js';
import { showToast } from './modules/ui.js';
import { initAudio, playSFX } from './modules/audio.js'; // Importa áudio

// --- INICIALIZAÇÃO DO SISTEMA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SYNAPSE CORE v6.0 INICIADO...");

    // 1. Carrega Perfil do Usuário (Nome e Avatar)
    loadUserProfile();

    // 2. Inicia Módulos
    initAudio();
    initChat();      // Carrega o chat e o primeiro agente
    initGamification();
    initDashboard();
    initCalendar();
    
    // 3. Monitor de Status (Online/Offline) - Aquele que criamos antes
    window.addEventListener('online', updateStatusIndicator);
    window.addEventListener('offline', updateStatusIndicator);
    updateStatusIndicator();
});

// --- CARREGA DADOS DO USUÁRIO ---
function loadUserProfile() {
    try {
        // Tenta ler a sessão salva pelo Login (Supabase ou SheetDB)
        // Verifica as duas chaves possíveis para garantir compatibilidade
        const sessionRaw = localStorage.getItem('synapse_session_v2') || localStorage.getItem('synapse_user');
        
        if (sessionRaw) {
            const session = JSON.parse(sessionRaw);
            // Pega o nome ou define um padrão
            // Tenta pegar 'user', 'nome', 'name' ou 'email'
            const userName = session.user || session.nome || session.name || (session.email ? session.email.split('@')[0] : 'OPERADOR');
            
            // Formata o nome (Primeira letra maiúscula)
            const displayName = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
            const firstLetter = displayName.charAt(0).toUpperCase();

            // --- ATUALIZA A UI ---
            
            // 1. Sidebar (Menu Lateral)
            const sideName = document.getElementById('sidebarName');
            const sideAvatar = document.getElementById('sidebarAvatar');
            
            if (sideName) sideName.innerText = displayName;
            if (sideAvatar) sideAvatar.innerText = firstLetter;

            // 2. Dashboard (Topo)
            const dashName = document.getElementById('dashName');
            if (dashName) dashName.innerText = displayName.toUpperCase(); // Nome em Capslock no dashboard fica mais militar

            console.log(`✅ Identidade Carregada: ${displayName}`);
        } else {
            console.warn("⚠ Nenhuma sessão encontrada. Redirecionando para login...");
            // Se quiser forçar login descomente a linha abaixo:
            // window.location.href = 'login.html';
        }
    } catch (e) {
        console.error("Erro ao carregar perfil:", e);
    }
}

// --- NAVEGAÇÃO E FERRAMENTAS ---

// Troca entre as abas principais (Dashboard <-> Chat)
window.switchTab = (tabName) => {
    // Esconde tudo
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));

    // Toca som
    playSFX('click');

    // Mostra a certa
    if (tabName === 'protocolo') {
        document.getElementById('viewProtocolo').classList.remove('hidden');
        const btn = document.getElementById('tabJornada');
        if(btn) btn.classList.add('active');
    } 
    else if (tabName === 'chat') {
        document.getElementById('viewChat').classList.remove('hidden');
        const btn = document.getElementById('tabChat');
        if(btn) btn.classList.add('active');
        // Foca no input
        setTimeout(() => document.getElementById('chatInput')?.focus(), 100);
    }
    
    // Fecha sidebar no mobile se estiver aberta
    window.toggleSidebar(false);
};

// Seleciona um Agente (Diagnóstico, Comandante, etc)
window.selectTool = (toolName) => {
    // 1. Vai para a aba do Chat
    window.switchTab('chat');
    
    // 2. Carrega o Agente específico
    // O nome aqui deve bater com as chaves no arquivo agents.js (ex: 'Diagnostico', 'COMANDANTE')
    loadAgent(toolName);
    
    // 3. Efeito visual na sidebar
    document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active-tool'));
    // (Adicione a classe .active-tool no CSS se quiser destaque, ou usamos o padrão do chat.js)
};

// Toggle Sidebar (Mobile)
// Toggle Sidebar (Mobile)
window.toggleSidebar = (show) => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (show) {
        sidebar.classList.add('active');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.remove('opacity-0'), 10);
        // playSFX('hover'); // Se tiver áudio
    } else {
        sidebar.classList.remove('active');
        overlay.classList.add('opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
};

// Monitor de Status (Recapitulando a função que fizemos antes)
function updateStatusIndicator() {
    const statusCards = document.querySelectorAll('.dashboard-card');
    let statusDot = null;
    
    statusCards.forEach(card => {
        if(card.innerText.includes('STATUS')) {
            statusDot = card.querySelector('.rounded-full');
        }
    });

    if (statusDot) {
        if (navigator.onLine) {
            statusDot.classList.remove('bg-red-500');
            statusDot.classList.add('bg-green-500', 'animate-pulse');
            // Texto opcional
            const statusText = document.getElementById('sidebarName')?.parentElement?.querySelector('span');
            if(statusText) statusText.innerText = "ONLINE";
        } else {
            statusDot.classList.remove('bg-green-500', 'animate-pulse');
            statusDot.classList.add('bg-red-500');
            showToast('CONEXÃO PERDIDA', 'Modo Offline Ativado.', 'error');
        }
    }
}