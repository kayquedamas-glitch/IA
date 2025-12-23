import { CONFIG } from '../config.js';
import { showToast } from './ui.js';
import { saveUserData, syncUserData, pushHistoryLog } from './database.js';
import { playSFX } from './audio.js'; 
// REMOVIDO: import { renderCalendar } from './calendar.js'; (Causava o travamento)

console.log("🎮 Módulo de Gamificação Tático Iniciado...");

const IS_DEMO = window.IS_DEMO === true;
const STORAGE = IS_DEMO ? sessionStorage : localStorage;
const KEY_PREFIX = IS_DEMO ? 'demo_' : 'synapse_';

let rpgState = { 
    xp: 0, level: 1, currentRank: "RECRUTA", streak: 0, 
    lastLoginDate: null, lastActionTime: 0,
    habits: [], missions: [], history: [], dailyScores: {} 
};

const RANKS = [
    { name: "RECRUTA", minLevel: 1 }, { name: "SOLDADO", minLevel: 5 },
    { name: "CABO", minLevel: 10 }, { name: "SARGENTO", minLevel: 15 },
    { name: "SUBTENENTE", minLevel: 20 }, { name: "TENENTE", minLevel: 25 },
    { name: "CAPITÃO", minLevel: 35 }, { name: "MAJOR", minLevel: 45 },
    { name: "CORONEL", minLevel: 60 }, { name: "GENERAL", minLevel: 80 },
    { name: "MARECHAL", minLevel: 100 }
];

// --- CORREÇÃO DO LOOP ---
// Expõe o estado para que o Calendar.js possa ler sem importar este arquivo
window.getRPGState = () => ({ ...rpgState });

export async function initGamification() { 
    try {
        loadLocalState(); 
        checkStreak(); 
        calculateRankAndLevel();
        updateUI(); 
        safeRenderCalendar(); // Usa a versão segura
        
        // Globais
        window.openAddHabitModal = openAddHabitModal;
        window.toggleHabit = toggleHabit;
        window.deleteHabit = deleteHabit;
        
        if (!IS_DEMO) {
            try {
                const cloudData = await syncUserData();
                if (cloudData) {
                    if (cloudData.xp) rpgState.xp = cloudData.xp;
                    if (cloudData.habits) rpgState.habits = cloudData.habits;
                    if (cloudData.missions) rpgState.missions = cloudData.missions;
                    if (cloudData.dailyScores) rpgState.dailyScores = cloudData.dailyScores;
                    calculateRankAndLevel(); saveLocalState(); updateUI(); 
                    safeRenderCalendar();
                    console.log("☁ Sincronizado.");
                }
            } catch(e) {}
        }
    } catch (e) { console.error("Erro Gamificação:", e); }
}

export function getRPGState() { return { ...rpgState }; }
export function updateMissionsState(newMissions) { rpgState.missions = newMissions; saveLocalState(); }

// Função segura para chamar o calendário sem travar
function safeRenderCalendar() {
    if (typeof window.renderCalendar === 'function') {
        window.renderCalendar();
    }
}

// --- MISSÕES (OBJETIVOS) ---
export function addMission(text, dateRaw) {
    let dateDisplay = "HOJE";
    let dateIso = new Date().toISOString().split('T')[0];
    
    if (dateRaw) {
        const parts = dateRaw.split('-'); 
        dateIso = dateRaw;
        dateDisplay = `${parts[2]}/${parts[1]}`;
    }

    const newMission = {
        id: Date.now(), text: text, date: dateDisplay, fullDate: dateIso, done: false
    };

    if (!rpgState.missions) rpgState.missions = [];
    rpgState.missions.push(newMission);
    
    saveLocalState();
    return true;
}

// --- HÁBITOS ---
function toggleHabit(id) {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        if(h.done) { safePlaySFX('success'); addXP(25); logActivity('HABIT', h.text, 25); } 
        else { safePlaySFX('click'); addXP(-25); }
        updateDailyScore(); saveLocalState(); renderHabits(); safeRenderCalendar();
    }
}

function updateDailyScore() {
    const today = new Date().toISOString().split('T')[0];
    if (rpgState.habits.length === 0) {
        if(rpgState.dailyScores) rpgState.dailyScores[today] = 0;
        return;
    }
    const doneCount = rpgState.habits.filter(h => h.done).length;
    const percent = Math.round((doneCount / rpgState.habits.length) * 100);
    if(!rpgState.dailyScores) rpgState.dailyScores = {};
    rpgState.dailyScores[today] = percent;
}

function deleteHabit(id) {
    if(confirm("Remover?")) {
        rpgState.habits = rpgState.habits.filter(h => h.id !== id);
        updateDailyScore(); saveLocalState(); renderHabits(); safeRenderCalendar();
        safePlaySFX('click');
    }
}

function renderHabits() {
    const list = document.getElementById('habitList');
    if (!list) return;
    if (!rpgState.habits || rpgState.habits.length === 0) {
        list.innerHTML = `<div class="flex flex-col items-center justify-center py-6 opacity-40 border border-dashed border-white/10 rounded-xl"><i class="fa-solid fa-seedling text-xl mb-2 text-gray-500"></i><p class="text-[9px] uppercase tracking-widest text-gray-500">Nenhum ritual ativo</p></div>`;
        return;
    }
    list.innerHTML = rpgState.habits.map(h => `
        <div class="flex items-center gap-2 p-3 rounded-xl bg-[#0d0d0d] border border-white/5 cursor-pointer hover:border-white/10 transition group" onclick="window.toggleHabit('${h.id}')">
            <div class="flex-grow flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider transition-colors ${h.done ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-white'}">${h.text}</span>
                <div class="w-4 h-4 rounded border flex items-center justify-center transition-all ${h.done ? 'bg-red-900 border-red-600' : 'border-gray-800'}">
                    <i class="fa-solid fa-check text-[8px] text-white ${h.done ? '' : 'hidden'}"></i>
                </div>
            </div>
            <button onclick="event.stopPropagation(); window.deleteHabit('${h.id}')" class="text-gray-700 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100"><i class="fa-solid fa-trash text-[10px]"></i></button>
        </div>`).join('');
}

function openAddHabitModal() {
    safePlaySFX('click');
    const existing = document.getElementById('habit-modal');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 animate-fade-in';
    overlay.id = 'habit-modal';
    overlay.innerHTML = `<div class="bg-[#0a0a0a] border border-[#333] w-full max-w-sm rounded-2xl p-6 relative">
            <button id="closeHabitBtn" class="absolute top-4 right-4 text-gray-600"><i class="fa-solid fa-xmark"></i></button>
            <h3 class="text-red-500 font-bold text-xs tracking-[0.2em] uppercase mb-6">Novo Ritual</h3>
            <input type="text" id="newHabitInput" placeholder="Ex: Leitura (20min)" class="w-full bg-[#111] border border-[#333] text-white p-4 rounded-xl text-sm mb-4 outline-none focus:border-red-500">
            <button id="confirmHabitBtn" class="w-full bg-red-900/20 text-red-500 py-3 rounded-lg font-bold text-xs uppercase hover:bg-red-600 hover:text-white transition">Salvar</button>
        </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('newHabitInput');
    setTimeout(() => input.focus(), 50);
    const close = () => overlay.remove();
    const confirm = () => { if(input.value.trim()){ addCustomHabit(input.value.trim()); safePlaySFX('success'); close(); } };
    document.getElementById('closeHabitBtn').onclick = close;
    document.getElementById('confirmHabitBtn').onclick = confirm;
    input.onkeypress = (e) => { if(e.key === 'Enter') confirm(); };
}

// --- CORE ---
export function addXP(amt) {
    const now = Date.now();
    if (amt > 0 && (now - rpgState.lastActionTime < 500)) return;
    rpgState.lastActionTime = now;
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateRankAndLevel(); saveLocalState(); updateUI();
    if (amt > 0) safePlaySFX('success');
}

export function addHabitFromAI(habitName, category) {
    // Note que mudamos 'text' para 'text: habitName'
    rpgState.habits.push({ 
        id: 'h' + Date.now(), 
        text: habitName, 
        done: false 
    }); 
    
    updateDailyScore(); 
    saveLocalState(); 
    renderHabits(); 
    safeRenderCalendar();
}

export async function logActivity(type, detail, xp, dur=0) {
    try {
        const act = { id: Date.now(), date: new Date().toISOString(), day: new Date().toLocaleDateString('pt-BR'), type, detail, xp, duration: dur };
        if(!rpgState.history) rpgState.history = [];
        rpgState.history.unshift(act);
        if (rpgState.history.length > 50) rpgState.history.pop();
        if (!IS_DEMO && typeof pushHistoryLog === 'function') try { pushHistoryLog(act); } catch(e) {}
        saveLocalState();
    } catch (e) {}
}

function loadLocalState() {
    try {
        const xp = STORAGE.getItem(KEY_PREFIX + 'xp'); if (xp) rpgState.xp = parseInt(xp);
        const h = STORAGE.getItem(KEY_PREFIX + 'history'); if (h) rpgState.history = JSON.parse(h);
        const hbt = STORAGE.getItem(KEY_PREFIX + 'habits'); if (hbt) rpgState.habits = JSON.parse(hbt).list || [];
        const msn = STORAGE.getItem(KEY_PREFIX + 'missions'); if(msn) rpgState.missions = JSON.parse(msn) || [];
        const sc = STORAGE.getItem(KEY_PREFIX + 'daily_scores'); if(sc) rpgState.dailyScores = JSON.parse(sc);
        calculateRankAndLevel();
    } catch(e) {}
}

function saveLocalState() {
    try {
        STORAGE.setItem(KEY_PREFIX + 'xp', rpgState.xp);
        STORAGE.setItem(KEY_PREFIX + 'history', JSON.stringify(rpgState.history));
        STORAGE.setItem(KEY_PREFIX + 'habits', JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits }));
        STORAGE.setItem(KEY_PREFIX + 'missions', JSON.stringify(rpgState.missions));
        STORAGE.setItem(KEY_PREFIX + 'daily_scores', JSON.stringify(rpgState.dailyScores));
        if (!IS_DEMO && typeof saveUserData === 'function') saveUserData(rpgState);
    } catch(e) {}
}

function calculateRankAndLevel() { 
    if (!rpgState.xp) rpgState.xp = 0;
    let lvl = 1; let cost = 100; let total = 0;
    while (rpgState.xp >= total + cost) { total += cost; lvl++; cost = Math.floor(cost * 1.10); }
    rpgState.level = lvl;
    let rank = "RECRUTA";
    for (let r of RANKS) { if (rpgState.level >= r.minLevel) rank = r.name; }
    rpgState.currentRank = rank;
}

function checkStreak() {
    const today = new Date().toISOString().split('T')[0];
    if (!rpgState.lastLoginDate) { rpgState.streak = 1; rpgState.lastLoginDate = today; } 
    else if (rpgState.lastLoginDate !== today) {
        const yest = new Date(); yest.setDate(yest.getDate() - 1);
        if (rpgState.lastLoginDate === yest.toISOString().split('T')[0]) rpgState.streak++; else rpgState.streak = 1;
        rpgState.lastLoginDate = today;
    }
    saveLocalState();
}

function updateUI() {
    const l = document.getElementById('levelDisplay'); const b = document.getElementById('xpBar'); const t = document.getElementById('xpText'); const s = document.getElementById('streakDisplay');
    if (l) l.innerText = rpgState.level; if (t) t.innerText = rpgState.xp; if (s) s.innerText = rpgState.streak;
    if (b) {
        let cost = 100; let total = 0;
        for(let i=1; i < rpgState.level; i++) { total += cost; cost = Math.floor(cost * 1.10); }
        b.style.width = `${Math.min(100, Math.max(0, ((rpgState.xp - total) / cost) * 100))}%`;
    }
    const r = document.getElementById('rankDisplay'); if(r) r.innerText = rpgState.currentRank;
}

function safePlaySFX(s) { if (typeof playSFX === 'function') playSFX(s); }