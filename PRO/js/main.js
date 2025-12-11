// PRO/js/main.js
import { CONFIG } from './config.js';
import { initNavigation } from './modules/navigation.js';
import { initChat } from './core/chat.js';
import { syncData, renderHabits, renderCalendar, addNewHabitPrompt, clearHistory } from './modules/gamification.js';

// Variáveis para os módulos carregados dinamicamente
let initDashboard, startZenMode, showWeeklyReport, initCalendar;

// Função para carregar os módulos extras sem travar o site se falharem
async function loadModules() {
    try {
        // Carrega Dashboard (Lista de Missões e XP)
        const dashModule = await import('./modules/dashboard.js');
        initDashboard = dashModule.initDashboard;
        
        // Carrega Features (Modo Zen e Relatório)
        const featModule = await import('./modules/features.js');
        startZenMode = featModule.startZenMode;
        showWeeklyReport = featModule.showWeeklyReport;

        // Carrega o Calendário Tático (Novo)
        const calModule = await import('./modules/calendar.js');
        initCalendar = calModule.initCalendar;

    } catch (e) {
        console.error("⚠️ Aviso: Alguns módulos (Dashboard/Calendar) não foram carregados.", e);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log("🚀 Inicializando Synapse PRO v2.6 (Auth Fix)...");
    
    // 1. Carrega os módulos pesados
    await loadModules();

    // 2. Verifica usuário (CORREÇÃO AQUI)
    const user = checkAuth();
    loadUserProfile();

    // 3. Garante que o usuário existe no Banco de Dados
    // Agora verifica 'user.user' (nome) ou 'user.email'
    if (user && user.email && window.supabase) {
        // Evita criar registro para o usuário genérico 'visitante' se possível,
        // mas garante que quem logou tenha registro.
        if (user.email !== "visitante@synapse.com") {
            await ensureUserInDB(user.email);
        }
    }

    // 4. Inicializa a Interface (Com proteção contra falhas)
    try {
        initNavigation();
        initChat();
        
        // Inicializa os módulos se estiverem carregados
        if (initDashboard) initDashboard();
        if (initCalendar) initCalendar();
        
        setupButtons(); // Liga os botões de Foco e Relatório

    } catch (e) {
        console.error("❌ Erro crítico na UI:", e);
    } finally {
        // 5. GARANTIA ANTI-TELA PRETA: Força o site a aparecer sempre
        document.body.style.visibility = "visible";
    }

    // Globais para acesso via HTML (se necessário)
    window.addNewHabitPrompt = addNewHabitPrompt;
    window.clearHistory = clearHistory;

    // 6. Listeners: O que acontece quando troca de aba
    document.addEventListener('tabChanged:protocolo', () => {
        // Recarrega tudo para garantir dados frescos
        renderCalendar(); // Calendário de Hábitos (antigo)
        renderHabits();
        
        if (initDashboard) initDashboard(); // Lista de Missões
        if (initCalendar) initCalendar();   // Novo Calendário de Eventos
        
        setupButtons(); // Re-liga os botões
    });

    // 7. Sincronização Inicial (Gamificação)
    if (typeof syncData === 'function') {
        syncData().catch(e => console.warn("Modo Offline ativado:", e));
    }
});

// --- FUNÇÕES AUXILIARES ---

function setupButtons() {
    const btnFoco = document.getElementById('btnFoco');
    const btnRelatorio = document.getElementById('btnRelatorio');

    if (btnFoco) {
        // Clone para remover listeners antigos e evitar duplicidade
        const newFoco = btnFoco.cloneNode(true);
        btnFoco.parentNode.replaceChild(newFoco, btnFoco);
        
        newFoco.onclick = () => {
            if (startZenMode) startZenMode();
            else alert("Carregando módulo de Foco...");
        };
    }

    if (btnRelatorio) {
        const newRep = btnRelatorio.cloneNode(true);
        btnRelatorio.parentNode.replaceChild(newRep, btnRelatorio);
        
        newRep.onclick = () => {
            if (showWeeklyReport) showWeeklyReport();
            else alert("Carregando módulo de Relatório...");
        };
    }
}

async function ensureUserInDB(email) {
    try {
        // Tenta buscar o usuário sem gerar erro 406 (usando maybeSingle)
        const { data } = await supabase
            .from('user_progress')
            .select('id')
            .eq('user_email', email)
            .maybeSingle();
        
        // Se não existir, CRIA automaticamente
        if (!data) {
            console.log("🆕 Novo usuário detectado. Criando registro no DB...");
            await supabase.from('user_progress').insert([{ 
                user_email: email, 
                game_data: {},
                current_xp: 0,
                current_level: 1
            }]);
        }
    } catch (e) {
        console.warn("Erro ao verificar DB (pode ser falha de conexão):", e);
    }
}

// --- CORREÇÃO PRINCIPAL: Ler das duas chaves de armazenamento ---
function checkAuth() {
    try {
        // Tenta ler do login novo (v2) OU do antigo
        const sessionV2 = JSON.parse(localStorage.getItem(CONFIG.SESSION_STORAGE_KEY));
        const userV1 = JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY));
        
        const activeUser = sessionV2 || userV1;

        // Se achou alguém, retorna. Se não, retorna o Visitante.
        return activeUser || { email: "visitante@synapse.com", name: "Visitante" };
    } catch (e) { return null; }
}

function loadUserProfile() {
    const user = checkAuth();
    if (user) {
        // Prioriza 'user' (do sheetDB) ou 'name', depois email, ou genérico
        const displayName = user.user || user.name || user.email || "Membro";
        
        const ids = ['userNameDisplay', 'userNameSidebar', 'userNameDashboard'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = displayName;
        });
        
        // Avatar (Inicial do nome)
        const avatarIds = ['userAvatar', 'userAvatarSidebar'];
        avatarIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = displayName.charAt(0).toUpperCase();
        });
    }
}// --- CORREÇÃO: Ler das duas chaves de armazenamento ---
function checkAuth() {
    try {
        // Tenta ler do login novo (v2) OU do antigo
        const sessionV2 = JSON.parse(localStorage.getItem('synapse_session_v2'));
        const userV1 = JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY));
        
        // Prioriza a sessão nova
        const activeUser = sessionV2 || userV1;

        // Se achou alguém, retorna. Se não, retorna o Visitante.
        return activeUser || { email: "visitante@synapse.com", name: "Visitante" };
    } catch (e) { return null; }
}

function loadUserProfile() {
    const user = checkAuth();
    if (user) {
        // Pega o nome ou usa o começo do e-mail se falhar
        let displayName = user.user || user.name;
        
        if (!displayName || displayName === "Membro" || displayName === "Visitante") {
             if (user.email && user.email.includes('@')) {
                const nick = user.email.split('@')[0];
                displayName = nick.charAt(0).toUpperCase() + nick.slice(1);
             }
        }

        // Atualiza na tela
        const ids = ['userNameDisplay', 'userNameSidebar', 'userNameDashboard'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = displayName;
        });
        
        // Avatar
        const avatarIds = ['userAvatar', 'userAvatarSidebar'];
        avatarIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = displayName ? displayName.charAt(0).toUpperCase() : "M";
        });
    }
}