// PRO/js/main.js
import { CONFIG } from './config.js';
import { initNavigation } from './modules/navigation.js';
import { initChat } from './core/chat.js';
// Importa syncData corretamente
import { renderHabits, renderCalendar, addNewHabitPrompt, clearHistory, syncData } from './modules/gamification.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Synapse OS v2.0 :: Inicializando...");

    checkAuth();
    loadUserProfile();

    // Tenta inicializar módulos. Se falhar, captura o erro para não travar tudo.
    try {
        initNavigation();
        initChat();
    } catch (e) {
        console.error("Erro ao iniciar módulos UI:", e);
    }
    
    window.addNewHabitPrompt = addNewHabitPrompt;
    window.clearHistory = clearHistory;
    
    document.addEventListener('tabChanged:protocolo', () => {
        renderCalendar();
        renderHabits();
    });

    // Inicia Gamificação (com tratamento de erro se o Supabase falhar)
    try {
        syncData().then(() => {
            console.log("Sync completo.");
            renderHabits();
            renderCalendar();
        }).catch(err => {
            console.warn("Modo Offline:", err);
            renderHabits();
            renderCalendar();
        });
    } catch (e) {
        console.error("Erro fatal na gamificação:", e);
    }
});

function checkAuth() {
    try {
        const user = JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY));
        const session = JSON.parse(localStorage.getItem(CONFIG.SESSION_STORAGE_KEY));
        if (!user && !session && !localStorage.getItem('synapse_access')) {
             window.location.href = "login.html"; 
        }
        document.body.style.visibility = "visible";
    } catch(e) { 
        document.body.style.visibility = "visible"; 
    }
}

function loadUserProfile() {
    try {
        const storedUser = localStorage.getItem(CONFIG.USER_STORAGE_KEY) || localStorage.getItem(CONFIG.SESSION_STORAGE_KEY);
        let user = null;
        if(storedUser) user = JSON.parse(storedUser);

        const ids = ['userNameDisplay', 'userNameSidebar', 'userNameDashboard'];
        if (user) {
            const name = user.name || user.user || "Membro";
            ids.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.innerText = name;
            });
            
            const avatarIds = ['userAvatar', 'userAvatarSidebar'];
            avatarIds.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.innerText = name.charAt(0).toUpperCase();
            });
        }
    } catch(e) {}
}