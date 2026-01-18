// PRO/js/modules/database.js

window.AppEstado = {
    gamification: {}, 
    dashboard: {},    
    calendar: {},     
    chatHistory: {},
    quizData: {},     // Novo campo para dados do quiz
    funnel: {}        // Novo campo para flags de upgrade/funil
};

const DB_TABLE = 'progresso_usuario';
let autoSaveTimer = null;
let ultimosDadosSalvos = "";

const Database = {
    client: null,

    async init() {
        console.log("🔄 Inicializando Database & Migração...");

        // 1. Identifica o usuário pela Sessão Temporária (SessionStorage)
        let user = null;
        try {
            user = JSON.parse(sessionStorage.getItem('synapse_session'));
        } catch (e) {}

        if (!user || !user.email) {
            console.warn("⛔ Sem sessão ativa. Redirecionando para login.");
            window.location.href = "login.html";
            return;
        }

        // 2. Conecta ao Supabase
        if (!window._supabase) {
            console.error("❌ Supabase não encontrado.");
            return;
        }
        this.client = window._supabase;

        // 3. Tenta baixar dados da Nuvem
        try {
            const { data, error } = await this.client
                .from(DB_TABLE)
                .select('dados')
                .eq('email', user.email)
                .single();

            if (data && data.dados) {
                console.log("☁️ Dados carregados da nuvem.");
                window.AppEstado = { ...window.AppEstado, ...data.dados };
            } else {
                // 4. Se não tem dados na nuvem, verifica se tem lixo no LocalStorage para migrar
                console.log("📦 Perfil vazio na nuvem. Verificando dados locais para migração...");
                await this.migrarLegado(user.email);
            }
        } catch (e) {
            console.error("Erro no sync:", e);
        }

        // 5. Inicia interface e autosave
        this.atualizarInterface();
        this.iniciarAutoSave();
    },

    // --- MÁQUINA DE MIGRAÇÃO ---
    async migrarLegado(emailUser) {
        let migrouAlgo = false;

        // 1. Resgata Gamificação e Missões (synapse_gamification / synapse_missions)
        try {
            const oldGamification = localStorage.getItem('synapse_gamification');
            if (oldGamification) {
                window.AppEstado.gamification = JSON.parse(oldGamification);
                migrouAlgo = true;
            }

            // Se as missões estiverem separadas (dependendo da versão antiga)
            const oldMissions = localStorage.getItem('synapse_missions');
            if (oldMissions) {
                if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
                window.AppEstado.gamification.missions = JSON.parse(oldMissions);
                migrouAlgo = true;
            }
        } catch (e) { console.warn("Erro ao ler gamificação antiga", e); }

        // 2. Resgata Dados do Quiz (synapse_quiz_data)
        try {
            const oldQuiz = localStorage.getItem('synapse_quiz_data');
            if (oldQuiz) {
                window.AppEstado.quizData = JSON.parse(oldQuiz);
                migrouAlgo = true;
            }
        } catch (e) {}

        // 3. Resgata Flags de Funil (synapse_upgrade_pending, etc)
        const upgradePending = localStorage.getItem('synapse_upgrade_pending');
        const upgradeRejected = localStorage.getItem('synapse_upgrade_rejeitado_v_final');
        if (upgradePending || upgradeRejected) {
            window.AppEstado.funnel = {
                upgradePending: !!upgradePending,
                upgradeRejected: !!upgradeRejected
            };
            migrouAlgo = true;
        }

        // 4. Se encontrou dados locais, SALVA NA NUVEM e LIMPA O LOCAL
        if (migrouAlgo) {
            console.log("🚀 Migrando dados locais para o Supabase...");
            await this.forceSave(); // Salva no Supabase
            
            // Limpeza completa do LocalStorage (Adeus vulnerabilidade)
            localStorage.removeItem('synapse_gamification');
            localStorage.removeItem('synapse_missions');
            localStorage.removeItem('synapse_quiz_data');
            localStorage.removeItem('synapse_upgrade_pending');
            localStorage.removeItem('synapse_upgrade_rejeitado_v_final');
            console.log("✨ Limpeza local concluída.");
        } else {
            // Se não tinha nada local, apenas cria o registro inicial vazio
            await this.forceSave();
        }
    },

    atualizarInterface() {
        if (window.initGamification) window.initGamification();
        if (window.initCalendar) window.initCalendar();
    },

    async forceSave() {
        const user = JSON.parse(sessionStorage.getItem('synapse_session'));
        if (!user || !this.client) return;

        const dadosAtuais = JSON.stringify(window.AppEstado);
        if (dadosAtuais === ultimosDadosSalvos) return;

        const { error } = await this.client
            .from(DB_TABLE)
            .upsert({ 
                email: user.email, 
                dados: window.AppEstado,
                updated_at: new Date()
            });

        if (!error) ultimosDadosSalvos = dadosAtuais;
    },

    iniciarAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(() => { this.forceSave(); }, 5000);
        window.addEventListener('beforeunload', () => { this.forceSave(); });
    },
    
    // Suporte ao Chat
    async saveChatHistory(agent, history) {
        if(!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        window.AppEstado.chatHistory[agent] = history;
        this.forceSave();
    },
    async loadChatHistory(agent) {
        return window.AppEstado.chatHistory?.[agent] || [];
    }
};

window.Database = Database;