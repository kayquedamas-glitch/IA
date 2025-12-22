import { CONFIG } from '../config.js';
import { showToast } from './ui.js';

function getUserEmail() {
    const session = localStorage.getItem(CONFIG.STORAGE_KEYS.USER);
    if (!session) return null;
    try { return JSON.parse(session).email; } catch (e) { return null; }
}

// --- BAIXAR DADOS (Sync Down) ---
export async function syncUserData() {
    const email = getUserEmail();
    if (!email) return null;

    try {
        const response = await fetch(`${CONFIG.API_URL}/search?email=${email}`);
        const data = await response.json();

        if (data && data.length > 0) {
            const user = data[0];
            console.log("☁ Nuvem carregada:", user);
            
            // Retorna o pacote completo (agora com missões)
            return {
                xp: parseInt(user.xp) || 0,
                level: parseInt(user.level) || 1,
                habits: user.habits ? JSON.parse(user.habits) : [],
                missions: user.missions ? JSON.parse(user.missions) : [], // <--- NOVO
                lastLogin: user.last_login
            };
        }
    } catch (error) {
        console.warn("Erro sync:", error);
    }
    return null;
}

// --- SALVAR DADOS (Sync Up) ---
export async function saveUserData(rpgState) {
    const email = getUserEmail();
    if (!email) return;

    // Prepara o pacote para enviar
    const payload = {
        xp: rpgState.xp,
        level: rpgState.level,
        habits: JSON.stringify(rpgState.habits),
        missions: JSON.stringify(rpgState.missions), // <--- NOVO
        last_login: new Date().toISOString()
    };

    fetch(`${CONFIG.API_URL}/email/${email}?sheet=USERS`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload })
    }).catch(e => console.warn("Erro save:", e));
}

// --- HISTÓRICO (Logs) ---
export async function pushHistoryLog(activity) {
    const email = getUserEmail();
    if (!email) return;

    const logItem = {
        id: activity.id,
        email: email,
        date: activity.date,
        type: activity.type,
        detail: activity.detail,
        xp_gained: activity.xp,
        duration: activity.duration
    };

    fetch(`${CONFIG.API_URL}?sheet=HISTORY`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: logItem })
    }).catch(e => console.warn("Erro log:", e));
}