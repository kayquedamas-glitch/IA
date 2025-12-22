import { CONFIG } from '../config.js';

// Variável para controlar o "tempo de espera" (Debounce)
let saveTimeout = null;

// --- FUNÇÕES DE USUÁRIO ---
export function getUserEmail() {
    try {
        const session = localStorage.getItem('synapse_session_v2') || localStorage.getItem('synapse_user');
        if (session) {
            return JSON.parse(session).email;
        }
    } catch (e) { return null; }
    return null;
}

// --- SALVAR DADOS (COM PROTEÇÃO ANTI-FLOOD/DEBOUNCE) ---
// --- SALVAR DADOS (COM PROTEÇÃO ANTI-FLOOD/DEBOUNCE) ---
export async function saveUserData(rpgState) {
    const email = getUserEmail();
    if (!email) return;

    // 1. Cancela o envio anterior se o usuário clicou de novo rápido
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    // 2. Agenda um novo envio para daqui a 3 segundos
    saveTimeout = setTimeout(async () => {
        try {
            // Prepara os dados
            const payload = {
                xp: rpgState.xp,
                level: rpgState.level,
                habits: rpgState.habits,
                missions: rpgState.missions
            };

            console.log("💾 Salvando na Nuvem (Debounced)...");
            
            // --- CORREÇÃO DO ERRO 405 AQUI ---
            // URL Correta: .../api/v1/ID/email/VALOR
            // Body Correto: Apenas o objeto, sem o wrapper "data" para PATCH
            await fetch(`${CONFIG.API_URL}/email/${email}`, {
                method: 'PATCH', 
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload) 
            });

        } catch (error) {
            console.warn("Erro ao salvar (Cloud):", error);
        }
    }, 3000); 
}

// --- SINCRONIZAR (CARREGAR) ---
export async function syncUserData() {
    const email = getUserEmail();
    if (!email) return null;

    try {
        const response = await fetch(`${CONFIG.API_URL}/search?email=${email}`);
        if(!response.ok) throw new Error('Erro na busca');
        
        const data = await response.json();
        if (data.length > 0) {
            const userData = data[0]; 
            return {
                xp: parseInt(userData.xp || 0),
                level: parseInt(userData.level || 1),
                habits: typeof userData.habits === 'string' ? JSON.parse(userData.habits) : userData.habits,
                missions: typeof userData.missions === 'string' ? JSON.parse(userData.missions) : userData.missions
            };
        }
    } catch (error) {
        console.warn("Offline ou usuário novo.");
    }
    return null;
}

export async function pushHistoryLog(activity) {
    // Implementação opcional de log
}