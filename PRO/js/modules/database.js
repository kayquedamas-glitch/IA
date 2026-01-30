// PRO/js/modules/database.js

// Estado Global (A Fonte da Verdade)
window.AppEstado = {
    gamification: {
        xp: 0,
        level: 1,
        streak: 0,
        habits: [],     // Rituais
        missions: [],   // Missões
        history: [],    // Histórico
        dailyScores: {}, // Cores do Calendário
        habitsDate: null // Data do último reset
    },
    config: {},
    chatHistory: {} // <--- O Chat precisa disto aqui
};

const DB_TABLE = 'progresso_usuario';
let autoSaveTimer = null;
let ultimosDadosSalvos = "";

const Database = {
    async init() {
        console.log("☁️ Conectando ao Núcleo Neural (V9 - Chat Fix)...");
        
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('synapse_user'));
        } catch (e) {}

        if (!user || !user.email) {
            console.warn("⚠️ Sem login detectado.");
            return;
        }

        if (!window._supabase) {
            console.error("❌ Erro Crítico: Supabase desconectado.");
            return;
        }

        // DOWNLOAD: Baixa TUDO da nuvem
        try {
            const { data, error } = await window._supabase
                .from(DB_TABLE)
                .select('dados')
                .eq('email', user.email)
                .single();

            if (data && data.dados) {
                console.log("📥 Dados recebidos da nuvem.");
                
                // Mescla com cuidado para não perder estruturas
                window.AppEstado = {
                    ...window.AppEstado,
                    ...data.dados,
                    gamification: {
                        ...window.AppEstado.gamification,
                        ...(data.dados.gamification || {})
                    },
                    chatHistory: {
                        ...window.AppEstado.chatHistory,
                        ...(data.dados.chatHistory || {})
                    }
                };

                this.validarEstrutura();
            } else {
                console.log("✨ Novo perfil na nuvem. Criando...");
                await this.forceSave();
            }
        } catch (e) {
            console.error("Erro no download:", e);
        }

        this.atualizarInterface();
        this.iniciarAutoSave();
    },

    validarEstrutura() {
        if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
        const g = window.AppEstado.gamification;
        if (!g.habits) g.habits = [];
        if (!g.missions) g.missions = [];
        if (!g.history) g.history = [];
        if (!g.dailyScores) g.dailyScores = {};
        if (!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
    },

    atualizarInterface() {
        console.log("🔄 Sincronizando interface...");
        if (window.initGamification) window.initGamification(); 
        if (window.renderCalendar) window.renderCalendar();
        if (window.initDashboard) window.initDashboard();
        if (window.updateStreakUI) window.updateStreakUI();
    },

    async forceSave() {
        const user = JSON.parse(localStorage.getItem('synapse_user'));
        if (!user || !user.email || !window._supabase) return;

        const pacoteDados = JSON.stringify(window.AppEstado);

        if (pacoteDados === ultimosDadosSalvos) return;

        console.log("⬆️ Enviando dados para a nuvem...");

        const { error } = await window._supabase
            .from(DB_TABLE)
            .upsert({ 
                email: user.email, 
                dados: window.AppEstado, 
                updated_at: new Date()
            }, { onConflict: 'email' });

        if (error) {
            console.error("❌ Falha no upload:", error);
        } else {
            console.log("✅ Dados salvos com sucesso.");
            ultimosDadosSalvos = pacoteDados;
        }
    },  

    async logEvent(nomeEvento, detalhe = "") {
        const user = JSON.parse(localStorage.getItem('synapse_user'));
        if (!user) return;
        
        window._supabase.from('analytics_eventos').insert({
            email: user.email, evento: nomeEvento, detalhe: detalhe
        }).then(() => {});
    },

    iniciarAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(() => { this.forceSave(); }, 3000); 
        window.addEventListener('beforeunload', () => { this.forceSave(); });
    },

    // --- FUNÇÕES DE CHAT (RESTAURADAS) ---
    async saveChatHistory(agent, history) {
        if(!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        window.AppEstado.chatHistory[agent] = history;
        this.forceSave();
    },

    async loadChatHistory(agent) {
        if(!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        return window.AppEstado.chatHistory[agent] || [];
    }
};

window.Database = Database;