// PRO/js/main.js
import { initChat, switchAgent } from './core/chat.js';
import { initDashboard } from './modules/dashboard.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 SYNAPSE CORE v3.0 STARTED");

    // 1. Inicializa Chat
    initChat();
    
    // 2. Inicializa Dashboard (async para carregar dados)
    await initDashboard();

    // 3. Funções Globais para HTML
    window.switchTab = switchTab;
    window.selectTool = switchAgent;
    
    // 4. Inicia na Aba Correta
    switchTab('protocolo'); // Começa no Dashboard
});

function switchTab(tabId) {
    const chat = document.getElementById('viewChat');
    const proto = document.getElementById('viewProtocolo');
    const navJornada = document.getElementById('navJornada');
    
    // Reseta Nav Active State
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    
    if (tabId === 'chat') {
        chat.classList.remove('hidden');
        chat.classList.add('flex'); // Chat precisa de flexbox
        proto.classList.add('hidden');
        if(navJornada) navJornada.classList.remove('active-nav-item');
    } else {
        chat.classList.add('hidden');
        chat.classList.remove('flex');
        proto.classList.remove('hidden');
        if(navJornada) navJornada.classList.add('active-nav-item');
    }
}