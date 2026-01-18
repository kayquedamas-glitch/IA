// PRO/js/modules/database.js

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
        
        // 1. Tenta pegar usuário logado
        let user = null;
        try {
            user = JSON.parse(localStorage.getItem('synapse_user'));
        } catch (e) {}

        // 2. MODO DEMO (Sem Login)
        if (!user || !user.email) {
            console.warn("⚠️ Modo DEMO/Offline ativado (Salvando no navegador)");
            this.isDemo = true;
            this.migrarDoLocalStorage();
            this.atualizarInterface();
            this.iniciarAutoSave();
            return;
        }

        // 3. MODO PRO (Com Supabase)
        this.isDemo = false;
        if (!window._supabase) {
            console.error("❌ Erro crítico: Supabase não carregou.");
            return;
        }

        try {
            const { data, error } = await window._supabase
                .from(DB_TABLE)
                .select('dados')
                .eq('email', user.email)
                .single();

            if (data && data.dados) {
                console.log("☁️ Dados baixados da nuvem!");
                window.AppEstado = { ...window.AppEstado, ...data.dados };
            } else {
                console.log("💾 Criando registro nuvem...");
                this.migrarDoLocalStorage();
                await this.forceSave();
            }
        } catch (e) {
            console.error("Erro conexão:", e);
        }

        this.atualizarInterface();
        this.iniciarAutoSave();
    },

    migrarDoLocalStorage() {
        // Recupera dados antigos se existirem no navegador
        try {
            const oldGamification = localStorage.getItem('synapse_gamification');
            if (oldGamification) window.AppEstado.gamification = JSON.parse(oldGamification);
            
            const oldMissions = localStorage.getItem('synapse_missions');
            if (oldMissions) {
                if(!window.AppEstado.gamification) window.AppEstado.gamification = {};
                window.AppEstado.gamification.missions = JSON.parse(oldMissions);
            }
        } catch (e) {}
    },

    atualizarInterface() {
        // Força a atualização visual dos módulos
        if (window.initGamification) window.initGamification();
        if (window.initCalendar) window.initCalendar();
    },

    async forceSave() {
        // Salva o estado atual
        const dadosAtuais = JSON.stringify(window.AppEstado);
        if (dadosAtuais === ultimosDadosSalvos) return;

        // SE FOR DEMO: Salva só no LocalStorage
        if (this.isDemo) {
            localStorage.setItem('synapse_gamification', JSON.stringify(window.AppEstado.gamification));
            ultimosDadosSalvos = dadosAtuais;
            return;
        }

        // SE FOR PRO: Salva no Supabase
        const user = JSON.parse(localStorage.getItem('synapse_user'));
        if (user && window._supabase) {
            const { error } = await window._supabase
                .from(DB_TABLE)
                .upsert({ 
                    email: user.email, 
                    dados: window.AppEstado,
                    updated_at: new Date()
                });
            if (!error) ultimosDadosSalvos = dadosAtuais;
        }
    },

    async logEvent(nomeEvento, detalhe = "") {
        if (this.isDemo) return; // Não loga eventos na demo
        const user = JSON.parse(localStorage.getItem('synapse_user'));
        if (!user) return;
        
        window._supabase.from('analytics_eventos').insert({
            email: user.email, evento: nomeEvento, detalhe: detalhe
        }).then(() => {});
    },

    iniciarAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(() => { this.forceSave(); }, 10000); // Salva a cada 10s
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