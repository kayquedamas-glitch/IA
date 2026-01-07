export const CONFIG = {
    // --- BANCO DE DADOS (Google Sheets / SheetDB) ---
    // Usado pelo database.js para salvar histórico e login
    API_URL: "https://gexnzquhqbszqjqwowix.supabase.co",

    // --- INTELIGÊNCIA ARTIFICIAL (Worker) ---
    // Usado pelo chat.js (IMPORTANTE: Verifica a nota abaixo)
    AI_WORKER: "https://long-block-7f38.kayquedamas.workers.dev",
    API_MODEL: "llama-3.1-8b-instant",

    // --- ARMAZENAMENTO LOCAL (LocalStorage) ---
    STORAGE_KEYS: {
        // Dados do Utilizador
        USER: "synapse_session_v2",
        XP: "synapse_xp_v1",
        HABITS: "synapse_habits_v3",
        HISTORY: "synapse_history_v1", // Novo (Log de atividades)
        
        // Mantidos do antigo (Para não quebrar o Calendário e Missões)
        MISSIONS: "synapse_missions_v3",
        STREAK: "synapse_streak_v1",
        EVENTS: "synapse_calendar_events"
    }
};