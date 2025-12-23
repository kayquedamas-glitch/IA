import { CONFIG } from '../config.js';
import { showToast } from './ui.js';
import { saveUserData, syncUserData, pushHistoryLog } from './database.js';
import { playSFX } from './audio.js'; 
import { renderCalendar } from './calendar.js';

console.log("🎮 Módulo de Gamificação Tático Iniciado...");

// --- CONFIGURAÇÃO DE ISOLAMENTO (DEMO VS PRO) ---
const IS_DEMO = window.IS_DEMO === true;
const STORAGE = IS_DEMO ? sessionStorage : localStorage; // Demo usa memória temporária
const KEY_PREFIX = IS_DEMO ? 'demo_' : 'synapse_';       // Demo usa prefixo diferente

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

const RANKS = [
    { name: "RECRUTA", minLevel: 1 },
    { name: "SOLDADO", minLevel: 5 },
    { name: "CABO", minLevel: 10 },
    { name: "SARGENTO", minLevel: 15 },
    { name: "SUBTENENTE", minLevel: 20 },
    { name: "TENENTE", minLevel: 25 },
    { name: "CAPITÃO", minLevel: 35 },
    { name: "MAJOR", minLevel: 45 },
    { name: "CORONEL", minLevel: 60 },
    { name: "GENERAL", minLevel: 80 },
    { name: "MARECHAL", minLevel: 100 }
];

export async function initGamification() { 
    try {
        loadLocalState(); 
        checkStreak(); 
        calculateRankAndLevel();
        updateUI(); 
        renderHabits();
        
        // Funções Globais
        window.openAddHabitModal = openAddHabitModal;
        window.toggleHabit = toggleHabit;
        window.deleteHabit = deleteHabit;
        
        // --- SINCRONIZAÇÃO (Bloqueada na Demo) ---
        if (!IS_DEMO) {
            try {
                const cloudData = await syncUserData();
                if (cloudData) {
                    if (cloudData.xp) rpgState.xp = cloudData.xp;
                    if (cloudData.habits) rpgState.habits = cloudData.habits;
                    if (cloudData.missions) rpgState.missions = cloudData.missions;
                    if (cloudData.dailyScores) rpgState.dailyScores = cloudData.dailyScores;
                    
                    calculateRankAndLevel(); 
                    saveLocalState();
                    updateUI();
                    renderHabits();
                    
                    if(window.renderMissionsExternal) window.renderMissionsExternal(rpgState.missions);
                    renderCalendar();
                    console.log("☁ Sincronizado com a Nuvem.");
                }
            } catch(cloudError) { console.warn("Modo Offline Ativo."); }
        } else {
            console.log("👻 Modo Demo: Sincronização de nuvem desativada.");
        }

    } catch (e) { console.error("Erro Gamificação:", e); }
}

export function getRPGState() { return { ...rpgState }; }
export function updateMissionsState(newMissions) { rpgState.missions = newMissions; saveLocalState(); }

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
        renderCalendar(); 
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
        renderCalendar();
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

// Dentro de PRO/js/modules/gamification.js

function openAddHabitModal() {
    // Som de clique
    if(typeof playSFX === 'function') playSFX('click');
    
    const existing = document.getElementById('habit-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4 animate-fade-in';
    overlay.id = 'habit-modal';
    
    // HTML Modificado para parecer um Chat (Input + Botão Enviar)
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-[#333] w-full max-w-sm rounded-2xl p-6 shadow-2xl relative">
            
            <button id="closeHabitModalBtn" class="absolute top-4 right-4 text-gray-600 hover:text-white transition-colors p-2">
                <i class="fa-solid fa-xmark text-lg"></i>
            </button>

            <h3 class="text-red-500 font-bold text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                <i class="fa-solid fa-code-commit"></i> Novo Objetivo
            </h3>
            
            <div class="relative flex items-center group">
                <input type="text" id="newHabitInput" placeholder="Digite seu novo protocolo..." 
                    class="w-full bg-[#111] border border-[#333] text-white pl-4 pr-14 py-4 rounded-xl text-sm focus:border-red-500 focus:bg-black outline-none transition-all placeholder-gray-600 shadow-inner">
                
                <button id="confirmHabitBtn" class="absolute right-2 p-2 bg-red-900/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all active:scale-95">
                    <i class="fa-solid fa-paper-plane text-sm"></i>
                </button>
            </div>
            
            <p class="text-[10px] text-gray-600 mt-3 pl-1">
                Tecle <span class="text-gray-400 font-bold">Enter</span> para enviar.
            </p>
        </div>
    `;
    document.body.appendChild(overlay);
    
    const input = document.getElementById('newHabitInput');
    // Pequeno delay para focar no mobile sem quebrar o layout
    setTimeout(() => input.focus(), 100);
    
    const close = () => overlay.remove();
    
    const confirm = () => {
        const text = input.value.trim();
        if(text) {
            // Chama a função interna de adicionar
            addCustomHabit(text);
            
            if(typeof playSFX === 'function') playSFX('success');
            if(typeof showToast === 'function') showToast('OBJETIVO TRAÇADO', 'Novo protocolo iniciado.', 'success');
            
            close();
        } else {
            // Feedback de erro (Borda vermelha)
            input.classList.add('border-red-500', 'animate-pulse');
            setTimeout(() => input.classList.remove('border-red-500', 'animate-pulse'), 500);
            if(typeof playSFX === 'function') playSFX('error');
        }
    };
    
    // Liga os eventos corretamente
    document.getElementById('closeHabitModalBtn').onclick = close;
    document.getElementById('confirmHabitBtn').onclick = confirm;
    
    // Fechar ao clicar fora
    overlay.onclick = (e) => {
        if(e.target === overlay) close();
    };

    // Enviar com Enter
    input.onkeypress = (e) => { if(e.key === 'Enter') confirm(); };
}

export function addXP(amt) {
    const now = Date.now();
    if (amt > 0 && (now - rpgState.lastActionTime < 500)) return;
    rpgState.lastActionTime = now;
    
    const oldLevel = rpgState.level;
    const oldRank = rpgState.currentRank;
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateRankAndLevel();
    saveLocalState();
    updateUI();
    
    if (amt > 0 && rpgState.level > oldLevel) {
        safePlaySFX('success'); 
        if (rpgState.currentRank !== oldRank) {
            if(typeof showToast === 'function') showToast('PROMOÇÃO', `Patente ${rpgState.currentRank}!`, 'level-up');
            triggerLevelUpPro(rpgState.level, rpgState.currentRank);
        } else {
            if(typeof showToast === 'function') showToast('LEVEL UP', `Nível ${rpgState.level}.`, 'level-up');
            triggerLevelUpPro(rpgState.level, null);
        }
    }
}

export function addCustomHabit(text) { 
    rpgState.habits.push({ id: 'h' + Date.now(), text, done: false }); 
    updateDailyScore();
    saveLocalState(); 
    renderHabits();
    renderCalendar();
}

export function addHabitFromAI(text) { addCustomHabit(text); return true; }

export async function logActivity(type, detail, xpGained, durationMin = 0) {
    try {
        const activity = { id: Date.now(), date: new Date().toISOString(), day: new Date().toLocaleDateString('pt-BR'), type, detail, xp: xpGained, duration: durationMin };
        if(!rpgState.history) rpgState.history = [];
        rpgState.history.unshift(activity);
        if (rpgState.history.length > 50) rpgState.history.pop();
        
        // Só salva log na nuvem se NÃO for demo
        if (!IS_DEMO && typeof pushHistoryLog === 'function') { 
            try { pushHistoryLog(activity); } catch(e) {} 
        }
        
        saveLocalState();
    } catch (e) {}
}

function triggerLevelUpPro(newLevel, newRank) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    const rankText = newRank ? `NOVA PATENTE: ${newRank}` : `PATENTE ATUAL: ${rpgState.currentRank}`;
    overlay.innerHTML = `<div class="level-up-content"><div class="holo-ring-outer"></div><div class="holo-ring-inner"></div><div class="level-number-pro">${newLevel}</div><div class="level-label-pro">${rankText}</div></div>`;
    document.body.appendChild(overlay);
    setTimeout(() => { overlay.style.transition = 'opacity 0.6s ease'; overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 600); }, 3000);
}

// --- FUNÇÕES DE ESTADO (ISOLADAS) ---

function loadLocalState() {
    try {
        // Usa KEY_PREFIX para separar Demo de PRO
        const xp = STORAGE.getItem(KEY_PREFIX + 'xp');
        if (xp && xp !== 'NaN') rpgState.xp = parseInt(xp);
        
        calculateRankAndLevel();
        
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
        // Usa STORAGE (Session ou Local) e KEY_PREFIX
        STORAGE.setItem(KEY_PREFIX + 'xp', rpgState.xp);
        STORAGE.setItem(KEY_PREFIX + 'level', rpgState.level);
        STORAGE.setItem(KEY_PREFIX + 'history', JSON.stringify(rpgState.history));
        STORAGE.setItem(KEY_PREFIX + 'habits', JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits }));
        STORAGE.setItem(KEY_PREFIX + 'missions', JSON.stringify(rpgState.missions));
        STORAGE.setItem(KEY_PREFIX + 'daily_scores', JSON.stringify(rpgState.dailyScores));
        
        // Bloqueia salvamento na nuvem se for Demo
        if (!IS_DEMO && typeof saveUserData === 'function') {
            saveUserData(rpgState);
        }
    } catch(e) {}
}

function calculateRankAndLevel() { 
    if (!rpgState.xp || isNaN(rpgState.xp)) rpgState.xp = 0;
    let calculatedLevel = 1; let xpCost = 100; let totalXpNeeded = 0;
    while (rpgState.xp >= totalXpNeeded + xpCost) { totalXpNeeded += xpCost; calculatedLevel++; xpCost = Math.floor(xpCost * 1.10); }
    rpgState.level = calculatedLevel;
    let newRank = "RECRUTA";
    for (let r of RANKS) { if (rpgState.level >= r.minLevel) newRank = r.name; }
    rpgState.currentRank = newRank;
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