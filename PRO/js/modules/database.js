// PRO/js/modules/database.js

// 1. Definição das Chaves Reais (Ponte com config.js)
const STORAGE_KEYS = {
    USER: "synapse_user", // Usado no login
    XP: "synapse_xp_v1",
    HABITS: "synapse_habits_v3",
    MISSIONS: "synapse_missions_v3",
    STREAK: "synapse_streak_v1",
    EVENTS: "synapse_calendar_events",
    HISTORY: "synapse_history_v1"
};

window.AppEstado = {
    gamification: {}, 
    dashboard: {},    
    calendar: {},     
    chatHistory: {},
    config: {}        
};

const DB_TABLE = 'progresso_usuario';
let autoSaveTimer = null;
let ultimosDadosSalvos = "";

const Database = {
    async init() {
        console.log("📥 Iniciando Banco de Dados Inteligente...");
        
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
        } catch (e) {}

        // --- MODO DEMO ---
        if (!user || !user.email) {
            console.warn("⚠️ Modo DEMO/Offline (Sem sincronização)");
            this.isDemo = true;
            this.iniciarAutoSave();
            return;
        }

        // --- MODO PRO (Nuvem) ---
        this.isDemo = false;
        if (!window._supabase) {
            console.error("❌ Erro: Supabase não carregou.");
            return;
        }

        try {
            // Busca dados na nuvem
            const { data, error } = await window._supabase
                .from(DB_TABLE)
                .select('dados')
                .eq('email', user.email)
                .single();

            if (data && data.dados) {
                console.log("☁️ Dados encontrados! Sincronizando...");
                window.AppEstado = { ...window.AppEstado, ...data.dados };
                
                // CRUCIAL: Restaura da Nuvem para o LocalStorage do dispositivo atual
                this.restaurarParaLocalStorage();
            } else {
                console.log("💾 Criando registro na nuvem com dados locais...");
                // Se não tem nada na nuvem, pega o que tem no PC e sobe
                this.capturarDoLocalStorage(); 
                await this.forceSave();
            }
        } catch (e) {
            console.error("Erro conexão:", e);
        }

        this.atualizarInterface();
        this.iniciarAutoSave();
    },

    // --- FUNÇÕES DE PONTE (SYNC) ---

    // Pega os dados soltos do LocalStorage e agrupa no AppEstado para salvar
    capturarDoLocalStorage() {
        try {
            // Gamificação
            window.AppEstado.gamification = {
                xp: JSON.parse(localStorage.getItem(STORAGE_KEYS.XP) || '0'),
                missions: JSON.parse(localStorage.getItem(STORAGE_KEYS.MISSIONS) || '[]'),
                streak: JSON.parse(localStorage.getItem(STORAGE_KEYS.STREAK) || '{}')
            };

            // Calendário e Hábitos
            window.AppEstado.calendar = {
                habits: JSON.parse(localStorage.getItem(STORAGE_KEYS.HABITS) || '[]'),
                events: JSON.parse(localStorage.getItem(STORAGE_KEYS.EVENTS) || '[]')
            };

            // Histórico Geral
            window.AppEstado.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');

        } catch (e) {
            console.warn("Erro ao ler LocalStorage:", e);
        }
    },

    // Pega o AppEstado (vindo da nuvem) e espalha no LocalStorage do celular
    restaurarParaLocalStorage() {
        try {
            const g = window.AppEstado.gamification || {};
            if(g.xp) localStorage.setItem(STORAGE_KEYS.XP, JSON.stringify(g.xp));
            if(g.missions) localStorage.setItem(STORAGE_KEYS.MISSIONS, JSON.stringify(g.missions));
            if(g.streak) localStorage.setItem(STORAGE_KEYS.STREAK, JSON.stringify(g.streak));

            const c = window.AppEstado.calendar || {};
            if(c.habits) localStorage.setItem(STORAGE_KEYS.HABITS, JSON.stringify(c.habits));
            if(c.events) localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(c.events));

            if(window.AppEstado.history) {
                localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(window.AppEstado.history));
            }
        } catch (e) {
            console.warn("Erro ao restaurar LocalStorage:", e);
        }
    },

    atualizarInterface() {
        // Reinicia os módulos visuais para pegarem os novos dados
        if (window.initGamification) window.initGamification();
        if (window.initCalendar) window.initCalendar();
        if (window.updateDashboardUI) window.updateDashboardUI();
    },

    async forceSave() {
        // 1. PRIMEIRO: Atualiza o estado com os dados mais recentes do uso atual
        this.capturarDoLocalStorage();

        const dadosAtuais = JSON.stringify(window.AppEstado);
        if (dadosAtuais === ultimosDadosSalvos) return;

        // Se for DEMO, só atualiza variavel interna
        if (this.isDemo) {
            ultimosDadosSalvos = dadosAtuais;
            return;
        }

        // Se for PRO, envia para o Supabase
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
        if (user && window._supabase) {
            const { error } = await window._supabase
                .from(DB_TABLE)
                .upsert({ 
                    email: user.email, 
                    dados: window.AppEstado,
                    updated_at: new Date()
                }, { onConflict: 'email' });

            if (error) {
                console.error("Erro ao salvar nuvem:", error);
            } else {
                // console.log("✅ Progresso salvo na nuvem."); // Comente para limpar o console
                ultimosDadosSalvos = dadosAtuais;
            }
        }
    },  

    async logEvent(nomeEvento, detalhe = "") {
        if (this.isDemo) return;
        const user = JSON.parse(localStorage.getItem(STORAGE_KEYS.USER));
        if (!user) return;
        
        // Opcional: Log de analytics
        window._supabase.from('analytics_eventos').insert({
            email: user.email, evento: nomeEvento, detalhe: detalhe
        }).then(() => {});
    },

    iniciarAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        // Salva a cada 5 segundos para garantir sincronia mais rápida
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