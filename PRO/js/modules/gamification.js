import { showToast } from './ui.js';
import { playSFX } from './audio.js'; 

console.log("🎮 Módulo de Gamificação Iniciado (V12 - Bolinhas & Heatmap)...");

// --- VARIÁVEIS GLOBAIS ---

let rpgState = { 
    xp: 0, level: 1, currentRank: "RECRUTA", streak: 0, 
    lastLoginDate: null, lastActionTime: 0, habitsDate: null,
    habits: [], missions: [], history: [], dailyScores: {} 
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

function isDemoUser() {
    try {
        const u = JSON.parse(localStorage.getItem('synapse_user'));
        return u && u.status !== 'PRO' && u.status !== 'VIP';
    } catch(e) { return true; }
}

// --- DATA LOCAL (AAA-MM-DD) ---
function getLocalDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`; 
}

export async function initGamification() { 
    try {
        loadFromGlobalState(); 
        
        if (rpgState.level) previousLevel = rpgState.level;

        // VERIFICAÇÃO DIÁRIA (O Reset acontece aqui)
        checkDailyReset();
        
        // Verifica a Streak (Sequência)
        checkStreak();

        updateDailyScore(); 
        calculateRankAndLevel(false);

        updateUI(); 
        renderHabits(); 
        
        // Atualiza o Dashboard se ele já estiver carregado (para o Heatmap pegar a cor de hoje)
        if (window.initDashboard) window.initDashboard();

        // Expõe funções globais para o HTML
        window.openAddHabitModal = openAddHabitModal;
        window.toggleHabit = toggleHabit;
        window.deleteHabit = deleteHabit;
    } catch (e) { console.error("Erro Gamificação:", e); }
}

function checkDailyReset() {
    const today = getLocalDate();
    const lastSavedDate = rpgState.habitsDate; 
    
    // CASO 1: Primeira vez (Salva Hoje e NÃO reseta)
    if (!lastSavedDate) {
        rpgState.habitsDate = today;
        saveToGlobalState(); 
        return;
    }

    // CASO 2: Virada de Dia Real (Ontem -> Hoje)
    if (lastSavedDate !== today) {
        console.log(`🔄 Novo dia detectado (${today}). Resetando bolinhas...`);
        
        // Desmarca todos os hábitos
        if (rpgState.habits) {
            rpgState.habits = rpgState.habits.map(h => ({ ...h, done: false }));
        }
        
        rpgState.habitsDate = today;
        
        // Inicia o score de hoje como 0
        if (!rpgState.dailyScores) rpgState.dailyScores = {};
        rpgState.dailyScores[today] = 0;
        
        saveToGlobalState();
        renderHabits(); 
    }
}

function loadFromGlobalState() {
    if (window.AppEstado && window.AppEstado.gamification) {
        rpgState = { ...rpgState, ...window.AppEstado.gamification };
        
        // Correção de bug antigo de streak
        if (typeof rpgState.streak === 'object' || isNaN(Number(rpgState.streak))) {
            rpgState.streak = 0;
        } else {
            rpgState.streak = Number(rpgState.streak);
        }
        
        if(!rpgState.habits) rpgState.habits = [];
        if(!rpgState.missions) rpgState.missions = [];
        if(!rpgState.dailyScores) rpgState.dailyScores = {};
    }
}

function saveToGlobalState() {
    if (!window.AppEstado) window.AppEstado = {};
    
    // Garante que a data está atualizada
    rpgState.habitsDate = getLocalDate();
    window.AppEstado.gamification = rpgState;
    
    if (window.Database && window.Database.forceSave) window.Database.forceSave();
}

// --- INTERAÇÃO ---

function toggleHabit(id) {
    const h = rpgState.habits.find(x => x.id === id);
    if (h) {
        h.done = !h.done;
        
        if(h.done) { 
            safePlaySFX('success'); 
            addXP(25); 
        } else { 
            safePlaySFX('click'); 
            addXP(-25); 
        }
        
        updateDailyScore(); 
        saveToGlobalState(); 
        renderHabits(); 
        
        // Atualiza o Heatmap visualmente na hora
        if (window.features && window.features.renderHeatmap) window.features.renderHeatmap(); 
    }
}

function updateDailyScore() {
    const today = getLocalDate();
    
    // Se não tem hábitos, não tem score
    if (!rpgState.habits || rpgState.habits.length === 0) {
        if(!rpgState.dailyScores) rpgState.dailyScores = {};
        rpgState.dailyScores[today] = 0;
        return;
    }

    // Calcula porcentagem (Ex: 2 de 4 = 50%)
    const doneCount = rpgState.habits.filter(h => h.done).length;
    const total = rpgState.habits.length;
    const percent = Math.round((doneCount / total) * 100);
    
    if(!rpgState.dailyScores) rpgState.dailyScores = {};
    rpgState.dailyScores[today] = percent;
    
    console.log(`📊 Consistência de hoje (${today}): ${percent}%`);
}

function deleteHabit(id) {
    if(confirm("Remover este ritual?")) {
        rpgState.habits = rpgState.habits.filter(h => h.id !== id);
        updateDailyScore(); // Recalcula o score do dia sem esse hábito
        saveToGlobalState();
        renderHabits();
        if (window.initDashboard) window.initDashboard();
        safePlaySFX('click');
    }
}

export function addCustomHabit(text) { 
    rpgState.habits.push({ id: 'h' + Date.now(), text, done: false }); 
    updateDailyScore(); 
    saveToGlobalState(); 
    renderHabits();
    if (window.initDashboard) window.initDashboard();
}

// --- RENDERIZAÇÃO VISUAL (Bolinhas) ---
function renderHabits() {
    const list = document.getElementById('habitListTactical') || document.getElementById('habitList');
    if (!list) return; 

    if (!rpgState.habits || rpgState.habits.length === 0) {
        list.innerHTML = `<div class="flex flex-col items-center justify-center py-6 opacity-40 border border-dashed border-white/10 rounded-xl"><i class="fa-solid fa-seedling text-xl mb-2 text-gray-500"></i><p class="text-[9px] uppercase tracking-widest text-gray-500">Sem Rituais</p><p class="text-[8px] text-gray-600 mt-1">Adicione com "+"</p></div>`;
        return;
    }

    list.innerHTML = rpgState.habits.map(h => `
        <div class="flex items-center justify-between p-4 mb-2 rounded-xl bg-[#0d0d0d] border border-white/5 hover:bg-[#151515] transition group select-none relative overflow-hidden">
            
            <div class="absolute bottom-0 left-0 h-[2px] bg-green-500/50 transition-all duration-500" style="width: ${h.done ? '100%' : '0%'}"></div>

            <div class="flex flex-col cursor-pointer flex-grow" onclick="window.toggleHabit('${h.id}')">
                <span class="text-xs font-bold uppercase tracking-wider transition-colors ${h.done ? 'text-gray-500 line-through' : 'text-gray-200'}">
                    ${h.text}
                </span>
            </div>

            <div class="flex items-center gap-4">
                <button onclick="event.stopPropagation(); window.deleteHabit('${h.id}')" class="text-gray-800 hover:text-red-900 transition p-1">
                    <i class="fa-solid fa-times text-[10px]"></i>
                </button>

                <div onclick="window.toggleHabit('${h.id}')" 
                     class="w-6 h-6 rounded-full border-2 cursor-pointer flex items-center justify-center transition-all duration-300 shadow-lg 
                     ${h.done ? 'bg-green-600 border-green-600 shadow-green-900/50 scale-110' : 'border-gray-600 bg-transparent hover:border-gray-400'}">
                    <i class="fa-solid fa-check text-[10px] text-white transition-transform duration-300 ${h.done ? 'scale-100' : 'scale-0'}"></i>
                </div>
            </div>

        </div>
    `).join('');
}

function openAddHabitModal() {
    if (isDemoUser() && rpgState.habits.length >= 3) {
        if(typeof showToast === 'function') showToast('LIMITE FREE', 'Máximo de 3 rituais na versão gratuita.', 'warning');
        return;
    }
    safePlaySFX('click');
    const existing = document.getElementById('habit-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 animate-fade-in';
    overlay.id = 'habit-modal';
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-[#333] w-full max-w-sm rounded-2xl p-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
            <h3 class="text-green-500 font-bold text-xs tracking-[0.2em] uppercase mb-6 flex items-center gap-2">
                <i class="fa-solid fa-circle"></i> Novo Ritual
            </h3>
            <input type="text" id="newHabitInput" placeholder="Nome da tarefa..." 
                class="w-full bg-[#111] border border-[#333] text-white p-4 rounded-xl text-sm focus:border-green-500 outline-none transition-all mb-6">
            <div class="flex justify-end gap-3">
                <button id="cancelHabitBtn" class="text-gray-500 text-[10px] font-bold uppercase hover:text-white px-4 py-3 tracking-wider">Cancelar</button>
                <button id="confirmHabitBtn" class="bg-green-900/20 text-green-500 border border-green-900/50 hover:bg-green-600 hover:text-white hover:border-green-500 px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all">Criar</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    const input = document.getElementById('newHabitInput');
    setTimeout(() => input.focus(), 50);
    const close = () => overlay.remove();
    const confirm = () => {
        const text = input.value.trim();
        if(text) { addCustomHabit(text); safePlaySFX('success'); close(); } 
        else { input.classList.add('border-red-500'); }
    };
    document.getElementById('cancelHabitBtn').onclick = close;
    document.getElementById('confirmHabitBtn').onclick = confirm;
    input.onkeypress = (e) => { if(e.key === 'Enter') confirm(); };
}

export function addXP(amt) {
    const now = Date.now();
    if (amt > 0 && (now - rpgState.lastActionTime < 500)) return;
    
    if (isDemoUser() && rpgState.level >= 3) {
        if(Math.random() > 0.7) { 
             if(typeof showToast === 'function') showToast('NÍVEL MÁXIMO', 'Desbloqueie o PRO para evoluir sua patente.', 'warning');
        }
        return; 
    }

    rpgState.lastActionTime = now;
    rpgState.xp = Math.max(0, rpgState.xp + amt);
    calculateRankAndLevel(true); 
    
    saveToGlobalState();
    updateUI();
    if (amt > 0) safePlaySFX('success'); 
}

export function addHabitFromAI(text) { addCustomHabit(text); return true; }

export async function logActivity(type, detail, xpGained, durationMin = 0) {
    try {
        const activity = { id: Date.now(), date: new Date().toISOString(), day: new Date().toLocaleDateString('pt-BR'), type, detail, xp: xpGained, duration: durationMin };
        if(!rpgState.history) rpgState.history = [];
        rpgState.history.unshift(activity);
        if (rpgState.history.length > 50) rpgState.history.pop();
        saveToGlobalState();
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
        const today = getLocalDate();
        const lastLogin = rpgState.lastLoginDate;

        if (typeof rpgState.streak === 'object' || isNaN(rpgState.streak)) rpgState.streak = 0;

        if (!lastLogin) { 
            rpgState.streak = 1; 
            rpgState.lastLoginDate = today; 
        } 
        else if (lastLogin !== today) {
            const yesterdayDate = new Date(); 
            yesterdayDate.setDate(yesterdayDate.getDate() - 1);
            const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth()+1).padStart(2,'0')}-${String(yesterdayDate.getDate()).padStart(2,'0')}`;
            
            if (lastLogin === yesterday) { 
                rpgState.streak += 1; 
                if(typeof showToast === 'function') showToast('SEQUÊNCIA AUMENTADA', `${rpgState.streak} dias de disciplina.`, 'success'); 
            } else { 
                if (rpgState.streak > 0 && typeof showToast === 'function') showToast('SEQUÊNCIA PERDIDA', 'Disciplina quebrada.', 'warning'); 
                rpgState.streak = 1; 
            }
            rpgState.lastLoginDate = today;
        }
        saveToGlobalState();
    } catch(e) { console.error("Erro Streak", e); }
}

function updateUI() {
    const l = document.getElementById('levelDisplay'); const b = document.getElementById('xpBar'); const t = document.getElementById('xpText'); const s = document.getElementById('streakDisplay');
    
    if (l) l.innerText = rpgState.level; 
    if (t) t.innerText = rpgState.xp; 
    
    if (s) s.innerText = (typeof rpgState.streak === 'number' && !isNaN(rpgState.streak)) ? rpgState.streak : "0";

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

export function getRPGState() { return { ...rpgState }; }
export function updateMissionsState(newMissions) { 
    rpgState.missions = newMissions; 
    saveToGlobalState(); 
}