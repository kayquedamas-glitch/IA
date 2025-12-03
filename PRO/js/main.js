// PRO/js/main.js
import { CONFIG } from './config.js';
import { initNavigation } from './modules/navigation.js';
import { initChat } from './core/chat.js';
import { renderHabits, renderCalendar, addNewHabitPrompt, clearHistory } from './modules/gamification.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Verificação de Auth (Segurança Básica)
    checkAuth();
    loadUserProfile();

    // 2. Inicializar Módulos
    initNavigation();
    initChat();
    
    // 3. Inicializar Gamificação
    renderHabits();
    renderCalendar();
    
    // 4. Expor funções globais para o HTML (onclicks antigos)
    window.addNewHabitPrompt = addNewHabitPrompt;
    window.clearHistory = clearHistory;
    
    // Listener especial para atualizar calendário quando mudar de aba
    document.addEventListener('tabChanged:protocolo', () => {
        renderCalendar();
        renderHabits();
    });

    console.log("Synapse OS v2.0 :: Modules Loaded");
});

function checkAuth() {
    try {
        const user = JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY));
        const session = localStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
        // Se não tiver user nem sessão, manda pro login
        if (!user && !session) {
             window.location.href = "login.html"; 
        }
        document.body.style.visibility = "visible";
    } catch(e) { 
        document.body.style.visibility = "visible"; 
    }
}

function loadUserProfile() {
    const storedUser = localStorage.getItem(CONFIG.USER_STORAGE_KEY) || localStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
    let user = null;
    try { user = JSON.parse(storedUser); } catch(e) {}

    const nameDisplay = document.getElementById('userNameDisplay');
    const avatarDisplay = document.getElementById('userAvatar');
    
    if (user) {
        const displayName = user.name || user.user || "Operador";
        if (nameDisplay) nameDisplay.innerText = displayName;
        if (avatarDisplay) avatarDisplay.innerText = displayName.charAt(0).toUpperCase();
    }
}