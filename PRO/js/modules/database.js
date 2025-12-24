import { CONFIG } from '../config.js';

// --- FUNÇÕES DE USUÁRIO ---
export function getUserEmail() {
    try {
        const session = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
        if (session) {
            return JSON.parse(session).email;
        }
    } catch (e) { return null; }
    return null;
}

// --- SALVAR DADOS GERAIS (XP, Nível, Hábitos) ---
export async function saveUserData(rpgState) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEYS.XP, rpgState.xp);
        localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify({ list: rpgState.habits }));
        localStorage.setItem(CONFIG.STORAGE_KEYS.MISSIONS, JSON.stringify(rpgState.missions));
        console.log("💾 Dados salvos localmente.");
    } catch (e) { console.warn("Erro ao salvar local:", e); }
}

// --- CARREGAR DADOS (Sincronização) ---
export async function syncUserData() {
    // Retorna null para indicar que deve usar o cache local do gamification.js
    return null; 
}

// --- LOG DE ATIVIDADES ---
export async function pushHistoryLog(activity) {
    // Função placeholder para evitar erros se for chamada
    // No futuro, você pode salvar isso numa lista 'synapse_logs' se quiser
}

// --- SISTEMA DE CHAT (AS FUNÇÕES QUE FALTAVAM) ---

export async function saveChatHistory(agentName, history) {
    try {
        // 1. Carrega o histórico de TODOS os agentes
        let allChats = JSON.parse(localStorage.getItem('synapse_chat_history_v1') || '{}');
        
        // 2. Atualiza apenas o agente atual
        allChats[agentName] = history;
        
        // 3. Salva de volta no LocalStorage
        localStorage.setItem('synapse_chat_history_v1', JSON.stringify(allChats));
        
    } catch (e) { console.warn("Erro ao salvar chat local:", e); }
}

export async function loadChatHistory(agentName) {
    try {
        let allChats = JSON.parse(localStorage.getItem('synapse_chat_history_v1') || '{}');
        // Retorna o array de mensagens ou null se estiver vazio
        return allChats[agentName] || null;
    } catch (e) { return null; }
}