import { CONFIG } from '../config.js';
import { showToast } from './ui.js';
// REMOVIDOS OS IMPORTS ANTIGOS DO DATABASE PARA NÃO DAR ERRO
import { playSFX } from './audio.js'; 

console.log("🎮 Módulo de Gamificação Tático Iniciado (Supabase Edition)...");

const IS_DEMO = window.IS_DEMO === true;

// Estado Inicial Padrão
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
        // 1. CARREGA DO ESTADO GLOBAL (Que o Database.js já baixou do Supabase)
        loadFromGlobalState(); 
        
        previousLevel = rpgState.level; 
        checkStreak(); 
        calculateRankAndLevel(false); 
        updateUI(); 
        renderHabits();
        safeRenderCalendar(); 
        
        // Globais para o HTML usar
        window.openAddHabitModal = openAddHabitModal;
        window.toggleHabit = toggleHabit;
        window.deleteHabit = deleteHabit;
        
    } catch (e) { console.error("Erro Gamificação:", e); }
}

export function getRPGState() { return { ...rpgState }; }
export function updateMissionsState(newMissions) { 
    rpgState.missions = newMissions; 
    saveToGlobalState(); 
}

// --- FUNÇÃO DE CARREGAMENTO NOVO (Lê do window.AppEstado) ---
function loadFromGlobalState() {
    // Se o banco de dados já preencheu o AppEstado, usamos ele
    if (window.AppEstado && window.AppEstado.gamification && Object.keys(window.AppEstado.gamification).length > 0) {
        console.log("🎮 Gamificação carregada do Estado Global");
        rpgState = { ...rpgState, ...window.AppEstado.gamification };
        
        // Verifica reset diário de hábitos (Lógica movida para cá)
        const habitsDate = rpgState.habitsDate; // Precisamos salvar a data dos hábitos
        const today = new Date().toISOString().split('T')[0];
        
        if (habitsDate !== today && rpgState.habits) {
            console.log("🔄 Novo dia: Resetando hábitos...");
            rpgState.habits = rpgState.habits.map(h => ({ ...h, done: false }));
            rpgState.habitsDate = today;
            saveToGlobalState(); // Salva o reset
        }
    }
}

// --- FUNÇÃO DE SALVAMENTO NOVO (Escreve no window.AppEstado) ---
function saveToGlobalState() {
    // 1. Atualiza a memória RAM do app
    if (!window.AppEstado) window.AppEstado = {};
    
    // Salva a data de hoje para controle de reset
    rpgState.habitsDate = new Date().toISOString().split('T')[0];
    
    window.AppEstado.gamification = rpgState;

    // 2. Avisa o Banco de Dados para sincronizar com a nuvem (Auto-Save ou Force Save)
    if (window.Database && window.Database.forceSave) {
        // O Database vai detectar a mudança e salvar no Supabase
        // Não precisamos chamar forceSave() toda hora se tiver auto-save, 
        // mas chamar garante sincronia rápida em ações importantes.
        window.Database.forceSave(); 
    }
}

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
        saveToGlobalState(); // Mudou para o novo save
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
        saveToGlobalState();
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
    
    calculateRankAndLevel(true); 
    
    saveToGlobalState();
    updateUI();
    
    if (amt > 0) safePlaySFX('success'); 
}

export function addCustomHabit(text) { 
    rpgState.habits.push({ id: 'h' + Date.now(), text, done: false }); 
    updateDailyScore();
    saveToGlobalState(); 
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
        
        saveToGlobalState(); // Salva o histórico
    } catch (e) {}
}

function triggerLevelUpPro(newLevel, newRank) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    const rankText = newRank ? `NOVA PATENTE: ${newRank}` : `PATENTE ATUAL: ${rpgState.currentRank}`;
    overlay.innerHTML = `<div class="level-up-content"><div class="holo-ring-outer"></div><div class="holo-ring-inner"></div><div class="level-number-pro">${newLevel}</div><div class="level-label-pro">${rankText}</div></div>`;
    document.body.appendChild(overlay);
    
    if(typeof playSFX === 'function') playSFX('level-up');

    setTimeout(() => { 
        overlay.style.transition = 'opacity 0.6s ease'; 
        overlay.style.opacity = '0'; 
        setTimeout(() => overlay.remove(), 600); 
    }, 4000);
}

// --- LÓGICA DE CÁLCULO DE NÍVEL ---
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
        saveToGlobalState();
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