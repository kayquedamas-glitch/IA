import { CONFIG } from '../config.js';

let rpgState = { xp: 0, level: 1, streak: 0, lastLoginDate: null, habits: [{ id: 'h1', text: 'Beber 2L Água', done: false }], history: {} };

export function initGamification() { loadState(); checkStreak(); updateUI(); renderHabits(); }
export function getRPGState() { return { ...rpgState }; }

// CORREÇÃO: Exportando para o Chat usar
export function addHabitFromAI(text) { addCustomHabit(text); return true; }

function loadState() {
    const xp = localStorage.getItem(CONFIG.STORAGE_KEYS.XP);
    if (xp) rpgState.xp = parseInt(xp);
    const hbt = localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS);
    if (hbt) {
        const d = JSON.parse(hbt);
        if (d.date === new Date().toISOString().split('T')[0]) rpgState.habits = d.list;
    }
    calculateLevel();
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
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateLevel();
    localStorage.setItem(CONFIG.STORAGE_KEYS.XP, rpgState.xp);
    updateUI();
}

window.toggleHabit = (id) => {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        addXP(h.done ? 25 : -25);
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
        <div class="flex items-center justify-between p-3 rounded-xl bg-[#0d0d0d] border border-white/5 cursor-pointer hover:border-white/10 transition" onclick="window.toggleHabit('${h.id}')">
            <span class="text-[10px] font-bold uppercase tracking-wider ${h.done ? 'text-gray-600 line-through' : 'text-gray-300'}">${h.text}</span>
            <div class="w-4 h-4 rounded border flex items-center justify-center ${h.done ? 'bg-red-600 border-red-600' : 'border-gray-800'}">
                <i class="fa-solid fa-check text-[8px] text-white ${h.done ? '' : 'hidden'}"></i>
            </div>
        </div>
    `).join('');
}

function saveHabits() { localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits })); }
function saveStreak() { localStorage.setItem(CONFIG.STORAGE_KEYS.STREAK, JSON.stringify({ count: rpgState.streak, lastDate: rpgState.lastLoginDate, history: rpgState.history })); }
export function getHistory() { return rpgState.history; }