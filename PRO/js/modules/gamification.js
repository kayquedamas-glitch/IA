import { CONFIG } from '../config.js';
import { showToast } from './ui.js';
import { saveUserData, syncUserData, pushHistoryLog } from './database.js';
import { playSFX } from './audio.js'; 

let rpgState = { 
    xp: 0, 
    level: 1, 
    streak: 0, 
    lastLoginDate: null, 
    habits: [], 
    missions: [], 
    history: [] 
};

export async function initGamification() { 
    loadLocalState(); 
    checkStreak(); 
    updateUI(); 
    renderHabits();
    
    try {
        const cloudData = await syncUserData();
        if (cloudData) {
            rpgState.xp = cloudData.xp;
            rpgState.level = cloudData.level;
            if(cloudData.habits) rpgState.habits = cloudData.habits;
            if(cloudData.missions) rpgState.missions = cloudData.missions;
            
            saveLocalState();
            updateUI();
            renderHabits();
            if(window.renderMissionsExternal) window.renderMissionsExternal(rpgState.missions);
            console.log("☁ Sincronização Completa");
        }
    } catch (e) { console.warn("Offline mode."); }
}

export function getRPGState() { return { ...rpgState }; }

// --- GERENCIAMENTO DE ESTADO ---
export function updateMissionsState(newMissions) {
    rpgState.missions = newMissions;
    saveLocalState();
}

function loadLocalState() {
    const xp = localStorage.getItem(CONFIG.STORAGE_KEYS.XP);
    if (xp) rpgState.xp = parseInt(xp);
    
    const lvl = localStorage.getItem('synapse_level');
    if (lvl) rpgState.level = parseInt(lvl);
    else calculateLevel();

    const hist = localStorage.getItem('synapse_history');
    if (hist) rpgState.history = JSON.parse(hist);

    const hbt = localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS);
    if (hbt) {
        const d = JSON.parse(hbt);
        rpgState.habits = d.list;
    }
    
    const msn = localStorage.getItem(CONFIG.STORAGE_KEYS.MISSIONS);
    if(msn) rpgState.missions = JSON.parse(msn);
}

function saveLocalState() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.XP, rpgState.xp);
    localStorage.setItem('synapse_level', rpgState.level);
    localStorage.setItem('synapse_history', JSON.stringify(rpgState.history));
    localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits }));
    localStorage.setItem(CONFIG.STORAGE_KEYS.MISSIONS, JSON.stringify(rpgState.missions));
    saveUserData(rpgState);
}

function calculateLevel() { rpgState.level = Math.floor(rpgState.xp / 100) + 1; }
function checkStreak() { /* Lógica de streak futura */ }

// --- AÇÕES ---
// ... (seu código anterior do addXP) ...

export function addXP(amt) {
    const oldLevel = rpgState.level;
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateLevel();
    saveLocalState();
    updateUI();
    
    // LEVEL UP: Versão Pro
    if (amt > 0 && rpgState.level > oldLevel) {
        playSFX('success'); 
        
        // CHAMA A NOVA FUNÇÃO AQUI
        triggerLevelUpPro(rpgState.level); 
        
        showToast('UPLOAD COMPLETO', `Nível ${rpgState.level} Atingido.`, 'level-up');
    }
}

// --- EFEITO VISUAL: HOLOGRAMA PRO (NOVO) ---
function triggerLevelUpPro(newLevel) {
    // 1. Cria o Overlay
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    
    // 2. Estrutura do Holograma
    overlay.innerHTML = `
        <div class="level-up-content">
            <div class="holo-ring-outer"></div>
            <div class="holo-ring-inner"></div>
            
            <div class="level-number-pro">${newLevel}</div>
            <div class="level-label-pro">NOVA PATENTE</div>
        </div>
    `;
    
    document.body.appendChild(overlay);

    // 3. Remove suavemente após 3 segundos
    setTimeout(() => {
        overlay.style.transition = 'opacity 0.6s ease';
        overlay.style.opacity = '0';
        // Remove do DOM quando a transição acabar
        setTimeout(() => overlay.remove(), 600);
    }, 3000);
}

// ... (resto do código) ...

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
    if (rpgState.history.length > 50) rpgState.history.pop();
    pushHistoryLog(activity); 
}

// --- HABITOS & UI ---
export function addHabitFromAI(text) { 
    addCustomHabit(text); 
    showToast('HÁBITO CRIADO', 'Nova diretiva neural.', 'success');
    return true; 
}

window.toggleHabit = (id) => {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        const xp = h.done ? 25 : -25;
        
        if(h.done) playSFX('success');
        else playSFX('click');

        addXP(xp);
        if(h.done) logActivity('HABIT', h.text, xp);
        saveLocalState();
        renderHabits();
    }
};

export function addCustomHabit(text) { 
    rpgState.habits.push({ id: 'h' + Date.now(), text, done: false }); 
    saveLocalState(); 
    renderHabits(); 
}

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

    // ESTADO VAZIO (Bonito)
    if (rpgState.habits.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-6 opacity-40 border border-dashed border-white/10 rounded-xl">
                <i class="fa-solid fa-seedling text-xl mb-2 text-gray-500"></i>
                <p class="text-[9px] uppercase tracking-widest text-gray-500">Nenhum ritual ativo</p>
                <p class="text-[8px] text-gray-600 mt-1">Clique em "+" para instalar</p>
            </div>
        `;
        return;
    }

    list.innerHTML = rpgState.habits.map(h => `
        <div class="flex items-center justify-between p-3 rounded-xl bg-[#0d0d0d] border border-white/5 cursor-pointer hover:border-white/10 transition group" onclick="window.toggleHabit('${h.id}')">
            <span class="text-[10px] font-bold uppercase tracking-wider transition-colors ${h.done ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-white'}">${h.text}</span>
            <div class="w-4 h-4 rounded border flex items-center justify-center transition-all ${h.done ? 'bg-red-900 border-red-600 shadow-[0_0_10px_rgba(200,0,0,0.4)]' : 'border-gray-800 group-hover:border-gray-600'}">
                <i class="fa-solid fa-check text-[8px] text-white ${h.done ? '' : 'hidden'}"></i>
            </div>
        </div>
    `).join('');
}
export function getHistory() { return rpgState.history || []; }