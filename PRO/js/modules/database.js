// PRO/js/modules/database.js

export const Database = {
    client: null,
    isDemo: false,

    async init() {
        console.log("📥 Iniciando Banco de Dados Inteligente...");
        
        // 1. Tenta pegar a conexão global criada no HTML
        // IMPORTANTE: window._supabase é a instância criada, window.supabase é a biblioteca
        if (window._supabase) {
            this.client = window._supabase;
            console.log("✅ Database: Conectado ao Supabase Global.");
        } else {
            console.warn("⚠️ Database: Supabase Global não encontrado. Tentando reconexão...");
            await new Promise(r => setTimeout(r, 1000)); // Espera 1s
            
            if (window._supabase) {
                this.client = window._supabase;
                console.log("✅ Database: Conectado na segunda tentativa.");
            } else {
                console.warn("❌ Modo Offline (Supabase ausente). Usando LocalStorage.");
                this.isDemo = true;
            }
        }
    },

    // --- FUNÇÕES DE CHAT ---
    async saveChatHistory(agentKey, history) {
        if (!this.client) return; 

        try {
            const { data: { user } } = await this.client.auth.getUser();
            if (!user) return;

            const { data: existing } = await this.client
                .from('synapse_chats')
                .select('id')
                .eq('user_id', user.id)
                .eq('title', agentKey)
                .maybeSingle();

            const payload = {
                user_id: user.id,
                title: agentKey,
                messages: history,
                updated_at: new Date()
            };

            if (existing) payload.id = existing.id;

            await this.client.from('synapse_chats').upsert(payload);
        } catch (e) {
            console.warn("Erro ao salvar chat (ignorado):", e.message);
        }
    },

    async loadChatHistory(agentKey) {
        if (!this.client) return [];
        try {
            const { data: { user } } = await this.client.auth.getUser();
            if (!user) return [];
            const { data } = await this.client
                .from('synapse_chats')
                .select('messages')
                .eq('user_id', user.id)
                .eq('title', agentKey)
                .maybeSingle();
            return data ? data.messages : [];
        } catch (e) { return []; }
    },

    // --- ANALYTICS ---
    logEvent(eventName, details = null) {
        if (!this.client) return;
        this.client.auth.getUser().then(({ data }) => {
            if (data?.user) {
                this.client.from('analytics_eventos').insert({
                    user_id: data.user.id,
                    evento: eventName,
                    detalhe: details ? JSON.stringify(details) : null
                }).then(() => {}); 
            }
        }).catch(() => {});
    },

    // --- [CORREÇÃO] FUNÇÕES QUE FALTAVAM (forceSave e Gamification) ---
    
    // Usado pelo dashboard.js para salvar dias na base
    async forceSave(key, data) {
        // 1. Salva localmente sempre (Backup)
        localStorage.setItem(`synapse_${key}`, JSON.stringify(data));

        // 2. Tenta salvar no Supabase se estiver conectado
        if (this.client) {
            try {
                const { data: { user } } = await this.client.auth.getUser();
                if (user) {
                    // Salva na tabela de perfis ou gamificação
                    // Exemplo genérico: atualiza metadata do usuário ou tabela específica
                    await this.client.from('gamificacao').upsert({
                        user_id: user.id,
                        dados: data,
                        tipo: key,
                        updated_at: new Date()
                    });
                }
            } catch (e) {
                // Falha silenciosa no cloud, mas já salvou no localStorage
            }
        }
    },

    // Usado pelo gamification.js
    async getGamificationState() {
        // Tenta ler do LocalStorage primeiro (mais rápido)
        const local = localStorage.getItem('synapse_gamification');
        if (local) return JSON.parse(local);

        // Se não tiver local, tenta do banco
        if (this.client) {
            try {
                const { data: { user } } = await this.client.auth.getUser();
                if (user) {
                    const { data } = await this.client
                        .from('gamificacao')
                        .select('dados')
                        .eq('user_id', user.id)
                        .eq('tipo', 'gamification')
                        .maybeSingle();
                    if (data) return data.dados;
                }
            } catch (e) {}
        }
        return null;
    },

    async saveGamificationState(state) {
        return this.forceSave('gamification', state);
    }
};

window.Database = Database;