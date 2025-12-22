import { CONFIG } from '../config.js';
import { showToast } from './ui.js'; // <--- IMPORTANTE

let rpgState = { xp: 0, level: 1, streak: 0, lastLoginDate: null, habits: [{ id: 'h1', text: 'Beber 2L Água', done: false }], history: {} };

export function initGamification() { loadState(); checkStreak(); updateUI(); renderHabits(); }
export function getRPGState() { return { ...rpgState }; }

// Exportando para o Chat usar
export function addHabitFromAI(text) { 
    addCustomHabit(text); 
    showToast('HÁBITO CRIADO', 'Nova diretiva neural adicionada.', 'success');
    return true; 
}

function loadState() {
    const xp = localStorage.getItem(CONFIG.STORAGE_KEYS.XP);
    if (xp) rpgState.xp = parseInt(xp);
    
    const lvl = localStorage.getItem('synapse_level');
    if (lvl) rpgState.level = parseInt(lvl);
    else calculateLevel();

    const hbt = localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS);
    if (hbt) {
        const d = JSON.parse(hbt);
        if (d.date === new Date().toISOString().split('T')[0]) rpgState.habits = d.list;
    }
}

function calculateLevel() { 
    rpgState.level = Math.floor(rpgState.xp / 100) + 1; 
}

function checkStreak() { 
    const today = new Date().toISOString().split('T')[0];
    if(rpgState.lastLoginDate && rpgState.lastLoginDate !== today) {
        // Lógica de streak futura
    }
    rpgState.lastLoginDate = today;
    saveStreak();
}

// --- FUNÇÃO PRINCIPAL DE DOPAMINA ---
export function addXP(amt) {
    const oldLevel = rpgState.level;
    
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateLevel();
    
    localStorage.setItem(CONFIG.STORAGE_KEYS.XP, rpgState.xp);
    localStorage.setItem('synapse_level', rpgState.level);
    
    updateUI();
    
    if (amt > 0) {
        triggerDopamineFlash();
        
        // Se subiu de nível
        if (rpgState.level > oldLevel) {
            levelUpEffect(rpgState.level);
        }
    }
}

function triggerDopamineFlash() {
    const flash = document.createElement('div');
    Object.assign(flash.style, {
        position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
        backgroundColor: 'rgba(204, 0, 0, 0.15)',
        zIndex: '9999', pointerEvents: 'none', transition: 'opacity 0.3s ease-out'
    });
    
    document.body.appendChild(flash);
    requestAnimationFrame(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 300);
    });
}

function levelUpEffect(newLevel) {
    // NOVA NOTIFICAÇÃO TOAST
    showToast('UPLOAD COMPLETO', `Nível ${newLevel} Atingido. Neuroplasticidade Expandida.`, 'level-up');
}

window.toggleHabit = (id) => {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        const xpGain = h.done ? 25 : -25;
        addXP(xpGain);
        saveHabits();
        renderHabits();
        
        // Feedback visual extra
        if(h.done) showToast('TAREFA EXECUTADA', `+${xpGain} XP adicionados à rede.`, 'success');
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
    
    if (b) {
        const progress = rpgState.xp % 100;
        b.style.width = `${progress}%`;
    }
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
export function getHistory() { return rpgState.history; }