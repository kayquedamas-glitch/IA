// PRO/js/modules/database.js

// Estado Global (Adicionei chatHistory aqui)
window.AppEstado = {
    gamification: {}, 
    dashboard: {},    
    calendar: {},     
    chatHistory: {}, // <--- NOVO: Onde o chat fica salvo
    config: {}        
};

const DB_TABLE = 'progresso_usuario';
let autoSaveTimer = null;
let ultimosDadosSalvos = "";

const Database = {
    async init() {
        console.log("📥 Iniciando Banco de Dados...");
        
        if (!window._supabase) {
            console.error("❌ ERRO: Supabase não encontrado (window._supabase).");
            return; 
        }

        const user = JSON.parse(localStorage.getItem('synapse_user'));
        if (!user || !user.email) {
            console.error("Usuário não logado!");
            return;
        }

        try {
            // Baixa tudo do Supabase
            const { data, error } = await window._supabase
                .from(DB_TABLE)
                .select('dados')
                .eq('email', user.email)
                .single();

            if (data && data.dados) {
                console.log("☁️ Dados carregados da Nuvem!");
                // Mescla os dados baixados com o estado atual para garantir que nada falte
                window.AppEstado = { ...window.AppEstado, ...data.dados };
            } else {
                console.log("💾 Criando novo registro na nuvem...");
                this.migrarDoLocalStorage();
                await this.forceSave();
            }
        } catch (e) {
            console.error("Erro conexão banco:", e);
        }

        this.iniciarAutoSave();
    },

    migrarDoLocalStorage() {
        // Tenta pegar históricos antigos se existirem
        try {
            const oldChat = localStorage.getItem('synapse_chat_history_v1');
            if (oldChat) window.AppEstado.chatHistory = JSON.parse(oldChat);
        } catch (e) {}
    },

    async forceSave() {
        const user = JSON.parse(localStorage.getItem('synapse_user'));
        if (!user) return;

        const dadosAtuais = JSON.stringify(window.AppEstado);
        if (dadosAtuais === ultimosDadosSalvos) return; // Não mudou nada

        // Salva tudo (Gamificação + Chat + Calendário)
        const { error } = await window._supabase
            .from(DB_TABLE)
            .upsert({ 
                email: user.email, 
                dados: window.AppEstado,
                updated_at: new Date()
            });

        if (!error) {
            ultimosDadosSalvos = dadosAtuais;
            console.log("✅ Dados salvos na nuvem.");
        }
    },

    iniciarAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        autoSaveTimer = setInterval(() => { this.forceSave(); }, 30000); 
        window.addEventListener('beforeunload', () => { this.forceSave(); });
    },

    // --- FUNÇÕES DE CHAT (Para o chat.js usar) ---
    async saveChatHistory(agentName, history) {
        if (!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        
        window.AppEstado.chatHistory[agentName] = history;
        
        // Força salvar agora para não perder conversa
        this.forceSave(); 
    },

    async loadChatHistory(agentName) {
        if (!window.AppEstado.chatHistory) return [];
        return window.AppEstado.chatHistory[agentName] || [];
    }
};

// Exporta globalmente
window.Database = Database;