// PRO/js/modules/database.js
import { CONFIG } from '../config.js';
import Storage from './storage.js';

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
    chatHistory: {}, // Histórico legado (por Agente)
    chatSessions: {} // <--- NOVO: Histórico tipo ChatGPT (por Sessão)
};

const DB_TABLE = 'progresso_usuario';
let autoSaveTimer = null;
let lastSaveTime = 0;
const SAVE_DEBOUNCE_MS = 2000; // 2 segundos debounce
let pendingSave = false;

const Database = {
    async init() {
        console.log("☁️ Conectando ao Núcleo Neural (V10 - Dexie Integration)...");

        // 1. Tenta carregar do IndexedDB (Offline First)
        const localData = await Storage.getLocalState('app_state');
        if (localData) {
            console.log("📂 Carregado do Cache Local (IndexedDB).");
            this.mergeState(localData);
        } else {
            console.log("⚠️ Nenhum dado local. Tentando nuvem ou localStorage legado...");
            // Fallback: Tenta importar do localStorage antigo (Migração)
            const legacyData = localStorage.getItem('synapse_demo_state'); // Ou synapse_app_state se existisse
            if (legacyData) {
                console.log("🔄 Migrando dados legados...");
                this.mergeState(JSON.parse(legacyData));
                await this.forceSave(); // Salva no novo formato
            }
        }

        // 2. Tenta Sync com Nuvem (Background)
        this.backgroundSync();

        this.atualizarInterface();
        this.iniciarAutoSave();
    },

    mergeState(newData) {
        if (!newData) return;
        window.AppEstado = {
            ...window.AppEstado,
            ...newData,
            gamification: {
                ...window.AppEstado.gamification,
                ...(newData.gamification || {})
            },
            chatHistory: {
                ...window.AppEstado.chatHistory,
                ...(newData.chatHistory || {})
            },
            chatSessions: {
                ...window.AppEstado.chatSessions,
                ...(newData.chatSessions || {})
            }
        };
        this.validarEstrutura();
    },

    async backgroundSync() {
        if (!window._supabase || !window.AppAuth?.user) return;

        try {
            // DOWNLOAD: Baixa TUDO da nuvem para garantir consistência
            const { data, error } = await window._supabase
                .from(DB_TABLE)
                .select('dados')
                .eq('email', window.AppAuth.user.email)
                .single();

            if (data && data.dados) {
                console.log("📥 Dados recebidos da nuvem (Background Sync).");
                this.mergeState(data.dados);
                await Storage.setLocalState('app_state', window.AppEstado); // Atualiza cache local
                this.atualizarInterface();
            }

            // FLUSH QUEUE: Envia pendências
            await this.processSyncQueue();

        } catch (e) {
            console.error("Erro no Background Sync:", e);
        }
    },

    validarEstrutura() {
        if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
        const g = window.AppEstado.gamification;
        if (!g.habits) g.habits = [];
        if (!g.missions) g.missions = [];
        if (!g.history) g.history = [];
        if (!g.dailyScores) g.dailyScores = {};
        if (!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        if (!window.AppEstado.chatSessions) window.AppEstado.chatSessions = {};
    },

    atualizarInterface() {
        // console.log("🔄 Sincronizando interface...");
        if (window.initGamification) window.initGamification();
        if (window.renderCalendar) window.renderCalendar();
        if (window.initDashboard) window.initDashboard();
        if (window.updateStreakUI) window.updateStreakUI();
        if (window.renderChatSidebar) window.renderChatSidebar();
    },

    // --- NOVA LÓGICA DE SAVE (COM DEBOUNCE E FILA) ---
    requestSave() {
        pendingSave = true;
        // Se já tem timer rodando, deixa ele terminar.
        // O loop do autoSaveTimer vai pegar o pendingSave.
    },

    async forceSave() {
        // 1. Salva SEMPRE no Local (IndexedDB) - Transacional e Rápido
        await Storage.setLocalState('app_state', window.AppEstado);

        pendingSave = false;
        lastSaveTime = Date.now();

        // 2. Enfileira operação de Sync para Nuvem
        // Em vez de enviar o blob todo direto, colocamos na fila
        // Mas por enquanto, para manter compatibilidade, vamos enviar o blob todo como uma OP
        await Storage.enqueueOp('FULL_SYNC', window.AppEstado);

        // 3. Tenta processar a fila imediatamente (se online)
        this.processSyncQueue();
    },

    async processSyncQueue() {
        if (!navigator.onLine || !window._supabase || !window.AppAuth?.user) return;

        const ops = await Storage.getPendingOps();
        if (ops.length === 0) return;

        console.log(`📡 Processando Fila: ${ops.length} operações pendentes...`);

        // Pegamos apenas a última operação FULL_SYNC para evitar updates redundantes
        // (Simplificação para Fase 1 - Ideal é JSON Checksum ou Patches)
        const lastOp = ops[ops.length - 1];

        try {
            const { error } = await window._supabase
                .from(DB_TABLE)
                .upsert({
                    email: window.AppAuth.user.email,
                    dados: lastOp.payload,
                    updated_at: new Date()
                }, { onConflict: 'email' });

            if (error) throw error;

            console.log("✅ Sync Nuvem Concluído.");

            // Marca todas como processadas (já que enviamos o estado final)
            // Em um sistema real de patches, processariamos uma por uma.
            for (const op of ops) {
                await Storage.markOpProcessed(op.id, true);
            }

        } catch (e) {
            console.error("❌ Erro no Sync Nuvem:", e);
        }
    },

    async logEvent(nomeEvento, detalhe = "") {
        if (!window.AppAuth?.user) return;
        // Fire and forget, mas poderíamos enfileirar também
        window._supabase.from('analytics_eventos').insert({
            email: window.AppAuth.user.email, evento: nomeEvento, detalhe: detalhe
        }).then(() => { });
    },

    iniciarAutoSave() {
        if (autoSaveTimer) clearInterval(autoSaveTimer);
        // Loop de verificação a cada 1s
        autoSaveTimer = setInterval(() => {
            if (pendingSave && (Date.now() - lastSaveTime > SAVE_DEBOUNCE_MS)) {
                this.forceSave();
            }
        }, 1000);

        window.addEventListener('beforeunload', () => {
            // Tenta salvar localmente antes de fechar (Sync nuvem vai falhar se fechar rapido, mas SW pegaria na v2)
            Storage.setLocalState('app_state', window.AppEstado);
        });
    },

    // --- FUNÇÕES DE CHAT ANTIGO (LEGADO) ---
    async saveChatHistory(agent, history) {
        if (!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        window.AppEstado.chatHistory[agent] = history;
        this.requestSave();
    },

    async loadChatHistory(agent) {
        if (!window.AppEstado.chatHistory) window.AppEstado.chatHistory = {};
        return window.AppEstado.chatHistory[agent] || [];
    },

    // --- FUNÇÕES DE SESSÕES (TIPO CHATGPT) ---
    async saveSession(sessionId, sessionData) {
        if (!window.AppEstado.chatSessions) window.AppEstado.chatSessions = {};
        window.AppEstado.chatSessions[sessionId] = sessionData;
        this.requestSave();
    },

    async loadSessions() {
        return window.AppEstado.chatSessions || {};
    },

    async deleteSession(sessionId) {
        if (window.AppEstado.chatSessions && window.AppEstado.chatSessions[sessionId]) {
            delete window.AppEstado.chatSessions[sessionId];
            this.forceSave(); // Delete deve ser imediato para UI
        }
    }
};

window.Database = Database;