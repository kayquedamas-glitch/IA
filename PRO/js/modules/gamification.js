import { CONFIG } from '../config.js';
import { showToast } from './ui.js';
import { saveUserData, syncUserData, pushHistoryLog } from './database.js';
import { playSFX } from './audio.js'; 
// REMOVI O IMPORT DO CALENDAR PARA NÃO TRAVAR O SITE

console.log("🎮 Módulo de Gamificação Tático Iniciado (Holograma Edition)...");

// --- CONFIGURAÇÃO DE ISOLAMENTO (DEMO VS PRO) ---
const IS_DEMO = window.IS_DEMO === true;
const STORAGE = IS_DEMO ? sessionStorage : localStorage; 
const KEY_PREFIX = IS_DEMO ? 'demo_' : 'synapse_';       

let rpgState = { 
    xp: 0, 
    level: 1, 
    currentRank: "RECRUTA",
    streak: 0, 
    lastLoginDate: null, 
    lastActionTime: 0,
    habits: [], 
    missions: [], 
    history: [],
    dailyScores: {} 
};

// Variável para controlar animação de level up
let previousLevel = 1;

const RANKS = [
    { name: "RECRUTA", minLevel: 1 }, { name: "SOLDADO", minLevel: 5 },
    { name: "CABO", minLevel: 10 }, { name: "SARGENTO", minLevel: 15 },
    { name: "SUBTENENTE", minLevel: 20 }, { name: "TENENTE", minLevel: 25 },
    { name: "CAPITÃO", minLevel: 35 }, { name: "MAJOR", minLevel: 45 },
    { name: "CORONEL", minLevel: 60 }, { name: "GENERAL", minLevel: 80 },
    { name: "MARECHAL", minLevel: 100 }
];

export async function initGamification() { 
    try {
        loadLocalState(); 
        previousLevel = rpgState.level; // Sincroniza nível atual
        checkStreak(); 
        calculateRankAndLevel(false); // False = não anima ao carregar a página
        updateUI(); 
        renderHabits();
        safeRenderCalendar(); // Usa a versão segura
        
        // Globais
        window.openAddHabitModal = openAddHabitModal;
        window.toggleHabit = toggleHabit;
        window.deleteHabit = deleteHabit;
        
        // --- SINCRONIZAÇÃO ---
        if (!IS_DEMO) {
            try {
                const cloudData = await syncUserData();
                if (cloudData) {
                    if (cloudData.xp) rpgState.xp = cloudData.xp;
                    if (cloudData.habits) rpgState.habits = cloudData.habits;
                    if (cloudData.missions) rpgState.missions = cloudData.missions;
                    if (cloudData.dailyScores) rpgState.dailyScores = cloudData.dailyScores;
                    
                    calculateRankAndLevel(false); 
                    saveLocalState();
                    updateUI();
                    renderHabits();
                    
                    if(window.renderMissionsExternal) window.renderMissionsExternal(rpgState.missions);
                    safeRenderCalendar();
                    console.log("☁ Sincronizado com a Nuvem.");
                }
            } catch(cloudError) { console.warn("Modo Offline Ativo."); }
        }
    } catch (e) { console.error("Erro Gamificação:", e); }
}

export function getRPGState() { return { ...rpgState }; }
export function updateMissionsState(newMissions) { rpgState.missions = newMissions; saveLocalState(); }

// --- FUNÇÃO SEGURA DO CALENDÁRIO ---
function safeRenderCalendar() {
    if (typeof window.renderCalendar === 'function') {
        window.renderCalendar();
    }
}

// --- GERENCIAMENTO DE HÁBITOS ---

function toggleHabit(id) {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        
        if(h.done) { 
            safePlaySFX('success'); 
            addXP(25); 
            logActivity('HABIT', h.text, 25);
        } else { 
            safePlaySFX('click'); 
            addXP(-25); 
        }
        
        updateDailyScore(); 
        saveLocalState();
        renderHabits();
        safeRenderCalendar(); 
    }
}

function updateDailyScore() {
    const today = new Date().toISOString().split('T')[0];
    if (rpgState.habits.length === 0) {
        if(rpgState.dailyScores) rpgState.dailyScores[today] = 0;
        return;
    }
    const doneCount = rpgState.habits.filter(h => h.done).length;
    const total = rpgState.habits.length;
    const percent = Math.round((doneCount / total) * 100);
    
    if(!rpgState.dailyScores) rpgState.dailyScores = {};
    rpgState.dailyScores[today] = percent;
}

function deleteHabit(id) {
    if(confirm("Remover este protocolo permanentemente?")) {
        rpgState.habits = rpgState.habits.filter(h => h.id !== id);
        updateDailyScore();
        saveLocalState();
        renderHabits();
        safeRenderCalendar();
        safePlaySFX('click');
    }
}

function renderHabits() {
    const list = document.getElementById('habitList');
    if (!list) return;

    if (!rpgState.habits || rpgState.habits.length === 0) {
        list.innerHTML = `<div class="flex flex-col items-center justify-center py-6 opacity-40 border border-dashed border-white/10 rounded-xl"><i class="fa-solid fa-seedling text-xl mb-2 text-gray-500"></i><p class="text-[9px] uppercase tracking-widest text-gray-500">Nenhum ritual ativo</p><p class="text-[8px] text-gray-600 mt-1">Clique em "+" para instalar</p></div>`;
        return;
    }

    list.innerHTML = rpgState.habits.map(h => `
        <div class="flex items-center gap-2 p-3 rounded-xl bg-[#0d0d0d] border border-white/5 cursor-pointer hover:border-white/10 transition group" onclick="window.toggleHabit('${h.id}')">
            <div class="flex-grow flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider transition-colors ${h.done ? 'text-gray-600 line-through' : 'text-gray-300 group-hover:text-white'}">${h.text}</span>
                <div class="w-4 h-4 rounded border flex items-center justify-center transition-all ${h.done ? 'bg-red-900 border-red-600 shadow-[0_0_10px_rgba(200,0,0,0.4)]' : 'border-gray-800 group-hover:border-gray-600'}">
                    <i class="fa-solid fa-check text-[8px] text-white ${h.done ? '' : 'hidden'}"></i>
                </div>
            </div>
            <button onclick="event.stopPropagation(); window.deleteHabit('${h.id}')" class="text-gray-700 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <i class="fa-solid fa-trash text-[10px]"></i>
            </button>
        </div>
    `).join('');
}

function openAddHabitModal() {
    safePlaySFX('click');
    const existing = document.getElementById('habit-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 animate-fade-in';
    overlay.id = 'habit-modal';
    
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-[#333] w-full max-w-sm rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
            <h3 class="text-red-500 font-bold text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                <i class="fa-solid fa-code-commit"></i> Novo Protocolo
            </h3>
            <input type="text" id="newHabitInput" placeholder="Ex: Leitura Tática (20min)" 
                class="w-full bg-[#111] border border-[#333] text-white p-4 rounded-xl text-sm focus:border-red-500 outline-none transition-all mb-6 placeholder-gray-700">
            <div class="flex justify-end gap-3">
                <button id="cancelHabitBtn" class="text-gray-500 text-[10px] font-bold uppercase hover:text-white px-4 py-3 tracking-wider">Cancelar</button>
                <button id="confirmHabitBtn" class="bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-600 hover:text-white hover:border-red-500 px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(220,38,38,0.1)]">Confirmar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const input = document.getElementById('newHabitInput');
    setTimeout(() => input.focus(), 50);
    
    const close = () => overlay.remove();
    const confirm = () => {
        const text = input.value.trim();
        if(text) {
            addCustomHabit(text);
            safePlaySFX('success');
            if(typeof showToast === 'function') showToast('PROTOCOLO INICIADO', 'Novo hábito registrado.', 'success');
            close();
        } else {
            input.classList.add('border-red-500', 'animate-pulse');
            safePlaySFX('error');
        }
    };
    
    document.getElementById('cancelHabitBtn').onclick = close;
    document.getElementById('confirmHabitBtn').onclick = confirm;
    input.onkeypress = (e) => { if(e.key === 'Enter') confirm(); };
}

export function addXP(amt) {
    const now = Date.now();
    if (amt > 0 && (now - rpgState.lastActionTime < 500)) return;
    rpgState.lastActionTime = now;
    
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    
    // Calcula nível e passa TRUE para permitir animação se subir
    calculateRankAndLevel(true); 
    
    saveLocalState();
    updateUI();
    
    if (amt > 0) safePlaySFX('success'); 
}

export function addCustomHabit(text) { 
    rpgState.habits.push({ id: 'h' + Date.now(), text, done: false }); 
    updateDailyScore();
    saveLocalState(); 
    renderHabits();
    safeRenderCalendar();
}

export function addHabitFromAI(text) { addCustomHabit(text); return true; }

export async function logActivity(type, detail, xpGained, durationMin = 0) {
    try {
        const activity = { id: Date.now(), date: new Date().toISOString(), day: new Date().toLocaleDateString('pt-BR'), type, detail, xp: xpGained, duration: durationMin };
        if(!rpgState.history) rpgState.history = [];
        rpgState.history.unshift(activity);
        if (rpgState.history.length > 50) rpgState.history.pop();
        
        if (!IS_DEMO && typeof pushHistoryLog === 'function') { 
            try { pushHistoryLog(activity); } catch(e) {} 
        }
        
        saveLocalState();
    } catch (e) {}
}

// --- ANIMAÇÃO DE HOLOGRAMA (A SUA VERSÃO) ---
function triggerLevelUpPro(newLevel, newRank) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    const rankText = newRank ? `NOVA PATENTE: ${newRank}` : `PATENTE ATUAL: ${rpgState.currentRank}`;
    overlay.innerHTML = `<div class="level-up-content"><div class="holo-ring-outer"></div><div class="holo-ring-inner"></div><div class="level-number-pro">${newLevel}</div><div class="level-label-pro">${rankText}</div></div>`;
    document.body.appendChild(overlay);
    
    // Som
    if(typeof playSFX === 'function') playSFX('level-up');

    setTimeout(() => { 
        overlay.style.transition = 'opacity 0.6s ease'; 
        overlay.style.opacity = '0'; 
        setTimeout(() => overlay.remove(), 600); 
    }, 4000);
}

// --- FUNÇÕES DE ESTADO ---

function loadLocalState() {
    try {
        const xp = STORAGE.getItem(KEY_PREFIX + 'xp');
        if (xp && xp !== 'NaN') rpgState.xp = parseInt(xp);
        
        // Carrega nível salvo ou recalcula
        const lvl = STORAGE.getItem(KEY_PREFIX + 'level');
        if (lvl) previousLevel = parseInt(lvl);
        
        const hist = STORAGE.getItem(KEY_PREFIX + 'history');
        if (hist) rpgState.history = JSON.parse(hist);
        
        const hbt = STORAGE.getItem(KEY_PREFIX + 'habits');
        if (hbt) { const d = JSON.parse(hbt); rpgState.habits = d.list || []; }
        
        const msn = STORAGE.getItem(KEY_PREFIX + 'missions');
        if(msn) rpgState.missions = JSON.parse(msn) || [];
        
        const scores = STORAGE.getItem(KEY_PREFIX + 'daily_scores');
        if(scores) rpgState.dailyScores = JSON.parse(scores);
        
    } catch(e) { console.warn("Erro ao carregar estado local"); }
}

function saveLocalState() {
    try {
        STORAGE.setItem(KEY_PREFIX + 'xp', rpgState.xp);
        STORAGE.setItem(KEY_PREFIX + 'level', rpgState.level);
        STORAGE.setItem(KEY_PREFIX + 'history', JSON.stringify(rpgState.history));
        STORAGE.setItem(KEY_PREFIX + 'habits', JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits }));
        STORAGE.setItem(KEY_PREFIX + 'missions', JSON.stringify(rpgState.missions));
        STORAGE.setItem(KEY_PREFIX + 'daily_scores', JSON.stringify(rpgState.dailyScores));
        
        if (!IS_DEMO && typeof saveUserData === 'function') {
            saveUserData(rpgState);
        }
    } catch(e) {}
}

function calculateRankAndLevel(animate = false) { 
    if (!rpgState.xp || isNaN(rpgState.xp)) rpgState.xp = 0;
    
    let calculatedLevel = 1; 
    let xpCost = 100; 
    let totalXpNeeded = 0;
    
    while (rpgState.xp >= totalXpNeeded + xpCost) { 
        totalXpNeeded += xpCost; 
        calculatedLevel++; 
        xpCost = Math.floor(xpCost * 1.10); 
    }
    
    // ANIMAÇÃO DE LEVEL UP (Só se animate for true)
    if (animate && calculatedLevel > previousLevel) {
        let newRank = "RECRUTA";
        for (let r of RANKS) { if (calculatedLevel >= r.minLevel) newRank = r.name; }
        
        if (newRank !== rpgState.currentRank) {
             if(typeof showToast === 'function') showToast('PROMOÇÃO', `Patente ${newRank}!`, 'level-up');
             triggerLevelUpPro(calculatedLevel, newRank);
        } else {
             if(typeof showToast === 'function') showToast('LEVEL UP', `Nível ${calculatedLevel}.`, 'level-up');
             triggerLevelUpPro(calculatedLevel, null);
        }
    }

    previousLevel = calculatedLevel;
    rpgState.level = calculatedLevel;
    
    let rank = "RECRUTA";
    for (let r of RANKS) { if (rpgState.level >= r.minLevel) rank = r.name; }
    rpgState.currentRank = rank;
}

function checkStreak() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const lastLogin = rpgState.lastLoginDate;
        if (!lastLogin) { rpgState.streak = 1; rpgState.lastLoginDate = today; } 
        else if (lastLogin !== today) {
            const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
            if (lastLogin === yesterday.toISOString().split('T')[0]) { 
                rpgState.streak += 1; 
                if(typeof showToast === 'function') showToast('SEQUÊNCIA AUMENTADA', `${rpgState.streak} dias de disciplina.`, 'success'); 
            } 
            else { 
                if (rpgState.streak > 0 && typeof showToast === 'function') showToast('SEQUÊNCIA PERDIDA', 'Disciplina quebrada.', 'warning'); 
                rpgState.streak = 1; 
            }
            rpgState.lastLoginDate = today;
        }
        saveLocalState();
    } catch(e) {}
}

function updateUI() {
    const l = document.getElementById('levelDisplay'); const b = document.getElementById('xpBar'); const t = document.getElementById('xpText'); const s = document.getElementById('streakDisplay');
    if (l) l.innerText = rpgState.level; if (t) t.innerText = rpgState.xp; if (s) s.innerText = rpgState.streak;
    if (b) {
        let xpCost = 100; let totalNeeded = 0;
        for(let i=1; i < rpgState.level; i++) { totalNeeded += xpCost; xpCost = Math.floor(xpCost * 1.10); }
        const currentLevelProgress = rpgState.xp - totalNeeded;
        const percentage = Math.min(100, Math.max(0, (currentLevelProgress / xpCost) * 100));
        b.style.width = `${percentage}%`;
    }
    const rankEl = document.getElementById('rankDisplay'); 
    if(rankEl) { rankEl.innerText = rpgState.currentRank; } else {
        const levelContainer = document.querySelector('.dopamine-card span.text-gray-500'); 
        if(levelContainer && !document.getElementById('injectedRank')) levelContainer.innerHTML = `NÍVEL &bull; <span id="injectedRank" class="text-red-500 font-bold">${rpgState.currentRank}</span>`;
        else if (document.getElementById('injectedRank')) document.getElementById('injectedRank').innerText = rpgState.currentRank;
    }
}

function safePlaySFX(sound) { if (typeof playSFX === 'function') playSFX(sound); }