import { initChat, loadAgent } from './core/chat.js';
import { initDashboard } from './modules/dashboard.js';
import { initGamification, addCustomHabit } from './modules/gamification.js';
import { showToast, showInputModal } from './modules/ui.js'; // <--- ADICIONE ESTA LINHA
import { initAudio } from './modules/audio.js';

import { initCalendar } from './modules/calendar.js';

// --- IMPORTANTE: Importar as novas funcionalidades ---
import { startSOSProtocol, startFocusMode, showWeeklyReport } from './modules/features.js';

// --- FUNÇÕES GLOBAIS (Para o HTML acessar) ---

window.switchTab = function(tabId) {
    const chatView = document.getElementById('viewChat');
    const protocolView = document.getElementById('viewProtocolo');
    const navProtocolo = document.getElementById('tabJornada');
    const navChat = document.getElementById('tabChat');
    
    // Troca de Telas
    if (tabId === 'chat') {
        if(chatView) { chatView.classList.remove('hidden'); chatView.classList.add('flex'); }
        if(protocolView) protocolView.classList.add('hidden');
        if(navChat) navChat.classList.add('active');
        if(navProtocolo) navProtocolo.classList.remove('active');
    } else {
        // Aba Jornada/Protocolo
        if(chatView) { chatView.classList.add('hidden'); chatView.classList.remove('flex'); }
        if(protocolView) protocolView.classList.remove('hidden');
        if(navProtocolo) navProtocolo.classList.add('active');
        if(navChat) navChat.classList.remove('active');
    }
    
    // Fecha a sidebar apenas se estiver no celular
    if(window.innerWidth <= 768) {
        window.toggleSidebar(false);
    }
};

window.selectTool = function(toolKey) {
    loadAgent(toolKey);
    window.switchTab('chat');
};

window.toggleSidebar = function(forceState) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if(!sidebar) return;

    // Verifica se está visível pela classe
    const isVisible = sidebar.classList.contains('visible');
    const shouldShow = typeof forceState === 'boolean' ? forceState : !isVisible;

    if(shouldShow) {
        sidebar.classList.add('visible');
        if(overlay) {
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.classList.add('opacity-100'), 10);
        }
    } else {
        sidebar.classList.remove('visible');
        if(overlay) {
            overlay.classList.remove('opacity-100');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }
};

// --- EXPOR FUNCIONALIDADES PARA OS BOTÕES ---
window.features = { 
    startSOSProtocol, 
    startFocusMode, 
    showWeeklyReport 
};

// --- INICIALIZAÇÃO DO SISTEMA ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 SYNAPSE CORE v5.3...");

    // Inicia os módulos
    initChat();
    initAudio(); // <--- ADICIONE ESTA LINHA
    initDashboard();
    // ... resto do código ...

    // Inicia os módulos

    initChat();
    initDashboard();
    initGamification();
    initCalendar();
    loadUserProfile();
    
    // --- LÓGICA DO BOTÃO ADICIONAR HÁBITO ---
// --- LÓGICA DO BOTÃO ADICIONAR HÁBITO (ATUALIZADO) ---
    const btnAddHabit = document.getElementById('addHabitBtn');
    if(btnAddHabit) {
        btnAddHabit.onclick = () => {
            // Abre o modal estiloso
            showInputModal('Novo Ritual', 'Ex: Leitura Matinal...', (novoHabito) => {
                addCustomHabit(novoHabito);
                showToast('SUCESSO', 'Ritual adicionado.', 'success');
            });
        };
    }
    
    // Forçar início na aba Jornada (Visual e Lógica)
    window.switchTab('protocolo');
    
    // Ligar o botão SOS da Sidebar (se existir)
    const btnSOS = document.getElementById('btn-sos-protocol');
    if(btnSOS) {
        btnSOS.addEventListener('click', () => {
            console.log("⚠ INICIANDO PROTOCOLO DE EMERGÊNCIA...");
            startSOSProtocol();
            if(window.innerWidth <= 768) window.toggleSidebar(false);
        });
    }

    // Botão de fechar no overlay (Mobile)
    const overlay = document.getElementById('sidebarOverlay');
    if(overlay) overlay.onclick = () => window.toggleSidebar(false);
});

function loadUserProfile() {
    const userStr = localStorage.getItem('synapse_session_v2');
    const dashName = document.getElementById('dashName');
    const sidebarName = document.getElementById('sidebarName');
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    
    if(userStr) {
        const user = JSON.parse(userStr);
        const name = user.user || user.name || "OPERADOR";
        if(dashName) dashName.innerText = name.toUpperCase();
        if(sidebarName) sidebarName.innerText = name.toUpperCase();
        if(sidebarAvatar) sidebarAvatar.innerText = name.charAt(0).toUpperCase();
    }
}