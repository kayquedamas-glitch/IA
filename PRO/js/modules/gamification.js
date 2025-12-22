import { CONFIG } from '../config.js';
// Se tiveres criado o ui.js, descomenta a linha abaixo:
import { showToast } from './ui.js'; 

let rpgState = { 
    xp: 0, 
    level: 1, 
    streak: 0, 
    lastLoginDate: null, 
    habits: [{ id: 'h1', text: 'Beber 2L Água', done: false }], 
    history: [] 
};

export function initGamification() { loadState(); checkStreak(); updateUI(); renderHabits(); }
export function getRPGState() { return { ...rpgState }; }

// Exportando para o Chat usar
export function addHabitFromAI(text) { 
    addCustomHabit(text); 
    // showToast('HÁBITO CRIADO', 'Nova diretiva neural adicionada.', 'success'); 
    return true; 
}

function loadState() {
    const xp = localStorage.getItem(CONFIG.STORAGE_KEYS.XP);
    if (xp) rpgState.xp = parseInt(xp);
    
    const lvl = localStorage.getItem('synapse_level');
    if (lvl) rpgState.level = parseInt(lvl);
    else calculateLevel();

    // Carregar histórico
    const hist = localStorage.getItem('synapse_history');
    if (hist) rpgState.history = JSON.parse(hist);

    const hbt = localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS);
    if (hbt) {
        const d = JSON.parse(hbt);
        if (d.date === new Date().toISOString().split('T')[0]) rpgState.habits = d.list;
    }
}

function calculateLevel() { rpgState.level = Math.floor(rpgState.xp / 100) + 1; }

function checkStreak() { 
    const today = new Date().toISOString().split('T')[0];
    if(rpgState.lastLoginDate && rpgState.lastLoginDate !== today) {
        // Lógica simples de streak
    }
    rpgState.lastLoginDate = today;
    saveStreak();
}

export function addXP(amt) {
    const oldLevel = rpgState.level;
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateLevel();
    
    // Salvar estado completo
    localStorage.setItem(CONFIG.STORAGE_KEYS.XP, rpgState.xp);
    localStorage.setItem('synapse_level', rpgState.level);
    
    updateUI();
    
    // Se subiu de nível
    if (amt > 0 && rpgState.level > oldLevel) {
        // levelUpEffect(rpgState.level);
        alert(`Nível ${rpgState.level} Atingido!`); // Fallback simples
    }
}

// Sistema de LOG (Necessário para o Relatório)
export async function logActivity(type, detail, xpGained, durationMin = 0) {
    const activity = {
        id: Date.now(),
        date: new Date().toISOString(),
        day: new Date().toLocaleDateString('pt-BR'),
        type: type,
        detail: detail,
        xp: xpGained,
        duration: durationMin
    };
    rpgState.history.unshift(activity);
    if (rpgState.history.length > 100) rpgState.history.pop();
    saveStreak(); // Salva o histórico junto com o streak
}

window.toggleHabit = (id) => {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        const xp = h.done ? 25 : -25;
        addXP(xp);
        if(h.done) logActivity('HABIT', h.text, xp);
        saveHabits();
        renderHabits();
    }
};

export function addCustomHabit(text) { rpgState.habits.push({ id: 'h' + Date.now(), text, done: false }); saveHabits(); renderHabits(); }

function updateUI() {
    const l = document.getElementById('levelDisplay');
    const b = document.getElementById('xpBar');
    const t = document.getElementById('xpText');
    const s = document.getElementById('streakDisplay');
    if (l) l.innerText = rpgState.level;
    if (t) t.innerText = rpgState.xp;
    if (s) s.innerText = rpgState.streak;
    if (b) b.style.width = `${rpgState.xp % 100}%`;
}

function renderHabits() {
    const list = document.getElementById('habitList');
    if (!list) return;
    list.innerHTML = rpgState.habits.map(h => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-[#0d0d0d] border border-white/5 cursor-pointer hover:border-white/10 transition group" onclick="window.toggleHabit('${h.id}')">
            <span class="text-[10px] font-bold uppercase tracking-wider transition-colors ${h.done ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-white'}">${h.text}</span>
            <div class="w-4 h-4 rounded border flex items-center justify-center transition-all ${h.done ? 'bg-red-900 border-red-600 shadow-[0_0_10px_rgba(200,0,0,0.4)]' : 'border-gray-800 group-hover:border-gray-600'}">
                <i class="fa-solid fa-check text-[8px] text-white ${h.done ? '' : 'hidden'}"></i>
            </div>
        </div>
    `).join('');
}

function saveHabits() { localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits })); }
function saveStreak() { localStorage.setItem(CONFIG.STORAGE_KEYS.STREAK, JSON.stringify({ count: rpgState.streak, lastDate: rpgState.lastLoginDate, history: rpgState.history })); }

// --- AQUI ESTÁ A FUNÇÃO QUE FALTAVA ---
export function getHistory() { return rpgState.history || []; }