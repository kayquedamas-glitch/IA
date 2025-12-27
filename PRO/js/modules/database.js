import { CONFIG } from '../config.js';

// Variável de controle para não salvar toda hora (Debounce)
let saveTimeout = null;

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

// --- SALVAR DADOS (Direto no SheetDB, mas inteligente) ---
export async function saveUserData(rpgState) {
    const email = getUserEmail();
    if (!email) return;

    // Se tentar salvar de novo em menos de 2 segundos, cancela a tentativa anterior
    if (saveTimeout) clearTimeout(saveTimeout);

    console.log("⏳ ...esperando para salvar");

    saveTimeout = setTimeout(async () => {
        try {
            // Pega os eventos do calendário da memória
            const calendarEvents = localStorage.getItem(CONFIG.STORAGE_KEYS.EVENTS) || "[]";

            const dataToSave = {
                xp: rpgState.xp,
                habits: JSON.stringify(rpgState.habits || []),
                missions: JSON.stringify(rpgState.missions || []),
                dailyScores: JSON.stringify(rpgState.dailyScores || {}),
                events: calendarEvents // Incluímos o calendário!
            };

            // Envia direto para o SheetDB
            await fetch(`${CONFIG.API_URL}/email/${email}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ data: dataToSave })
            });

            console.log("☁ ✅ Dados e Calendário salvos!");
        } catch (e) { 
            console.warn("Erro ao salvar:", e); 
        }
    }, 2000); // 2 segundos de atraso
}

// --- CARREGAR DADOS ---
export async function syncUserData() {
    const email = getUserEmail();
    if (!email) return null;

    try {
        console.log("☁ Buscando dados...");
        const response = await fetch(`${CONFIG.API_URL}/search?email=${email}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const userRow = data[0];
            
            // Restaura o Calendário na memória do navegador
            if (userRow.events) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.EVENTS, userRow.events);
            }
            
            // Retorna os dados do RPG
            return {
                xp: parseInt(userRow.xp) || 0,
                habits: userRow.habits ? JSON.parse(userRow.habits) : [],
                missions: userRow.missions ? JSON.parse(userRow.missions) : [],
                dailyScores: userRow.dailyScores ? JSON.parse(userRow.dailyScores) : {}
            };
        }
    } catch (e) {
        console.warn("Erro ao baixar dados (usando offline):", e);
    }
    return null; 
}

// --- OUTRAS FUNÇÕES (Mantidas iguais) ---
export async function pushHistoryLog(activity) {}

export async function saveChatHistory(agentName, history) {
    try {
        let allChats = JSON.parse(localStorage.getItem('synapse_chat_history_v1') || '{}');
        allChats[agentName] = history;
        localStorage.setItem('synapse_chat_history_v1', JSON.stringify(allChats));
    } catch (e) { }
}

export async function loadChatHistory(agentName) {
    try {
        let allChats = JSON.parse(localStorage.getItem('synapse_chat_history_v1') || '{}');
        return allChats[agentName] || null;
    } catch (e) { return null; }
}