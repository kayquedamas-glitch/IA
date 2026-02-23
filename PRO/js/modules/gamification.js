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
        renderDailyProgress();

        // Atualiza o Dashboard se ele já estiver carregado (para o Heatmap pegar a cor de hoje)
        if (window.initDashboard) window.initDashboard();

        // Expõe funções globais para o HTML
        window.openAddHabitModal = openAddHabitModal;
        window.toggleHabit = toggleHabit;
        window.deleteHabit = deleteHabit;
        window.renderDailyProgress = renderDailyProgress;
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

        if (!rpgState.habits) rpgState.habits = [];
        if (!rpgState.missions) rpgState.missions = [];
        if (!rpgState.dailyScores) rpgState.dailyScores = {};
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
        const today = getLocalDate();
        h.done = !h.done;

        if (h.done) {
            safePlaySFX('success');
            addXP(25);

            // Streak individual do hábito
            const yesterday = (() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            })();

            if (h.lastDoneDate === yesterday) {
                h.habitStreak = (h.habitStreak || 0) + 1;
            } else if (h.lastDoneDate !== today) {
                h.habitStreak = 1; // reset
            }
            h.lastDoneDate = today;
        } else {
            safePlaySFX('click');
            addXP(-25);
        }

        updateDailyScore();
        saveToGlobalState();
        renderHabits();
        renderDailyProgress();

        // Atualiza o Heatmap visualmente na hora
        if (window.features && window.features.renderHeatmap) window.features.renderHeatmap();
    }
}

function updateDailyScore() {
    const today = getLocalDate();

    // Se não tem hábitos, não tem score
    if (!rpgState.habits || rpgState.habits.length === 0) {
        if (!rpgState.dailyScores) rpgState.dailyScores = {};
        rpgState.dailyScores[today] = 0;
        return;
    }

    // Calcula porcentagem (Ex: 2 de 4 = 50%)
    const doneCount = rpgState.habits.filter(h => h.done).length;
    const total = rpgState.habits.length;
    const percent = Math.round((doneCount / total) * 100);

    if (!rpgState.dailyScores) rpgState.dailyScores = {};
    rpgState.dailyScores[today] = percent;

    console.log(`📊 Consistência de hoje (${today}): ${percent}%`);
}

function deleteHabit(id) {
    if (confirm("Remover este ritual?")) {
        rpgState.habits = rpgState.habits.filter(h => h.id !== id);
        updateDailyScore(); // Recalcula o score do dia sem esse hábito
        saveToGlobalState();
        renderHabits();
        if (window.initDashboard) window.initDashboard();
        safePlaySFX('click');
    }
}

export function addCustomHabit(text, emoji = '🎯', time = null) {
    const today = getLocalDate();
    rpgState.habits.push({
        id: 'h' + Date.now(),
        text,
        emoji,
        time,
        done: false,
        habitStreak: 0,
        lastDoneDate: null
    });
    updateDailyScore();
    saveToGlobalState();
    renderHabits();
    renderDailyProgress();
    if (window.initDashboard) window.initDashboard();
}

// --- BARRA DE PROGRESSO DIÁRIA ---
export function renderDailyProgress() {
    const container = document.getElementById('dailyProgressContainer');
    if (!container) return;

    const total = rpgState.habits?.length || 0;
    const done = rpgState.habits?.filter(h => h.done).length || 0;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const color = pct === 100 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#CC0000';
    const label = pct === 100 ? '🔥 Dia Perfeito!' : pct >= 50 ? '🚀 Metade concluída' : done === 0 ? '⚡ Comece agora' : `🎯 ${done}/${total} feitos`;

    container.innerHTML = `
        <div class="mb-5">
            <div class="flex justify-between items-center mb-1.5">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-400">Progresso de Hoje</span>
                <span class="text-[10px] font-mono font-bold" style="color: ${color}">${label}</span>
            </div>
            <div class="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-700" 
                     style="width: ${pct}%; background: ${color}; box-shadow: 0 0 8px ${color}60"></div>
            </div>
        </div>
    `;
}

// --- RENDERIZAÇÃO VISUAL (Cards de Hábito) ---
function renderHabits() {
    const list = document.getElementById('habitListTactical') || document.getElementById('habitList');
    if (!list) return;

    renderDailyProgress();

    if (!rpgState.habits || rpgState.habits.length === 0) {
        list.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10 opacity-40 border border-dashed border-white/10 rounded-2xl">
                <div class="text-4xl mb-3">🌱</div>
                <p class="text-[9px] uppercase tracking-widest text-gray-500 font-bold">Nenhum protocolo ainda</p>
                <p class="text-[8px] text-gray-600 mt-1">Adicione seu primeiro ritual abaixo</p>
            </div>`;
        return;
    }

    // Ordena: não feitos primeiro, depois feitos
    const sorted = [...rpgState.habits].sort((a, b) => {
        if (a.done === b.done) return 0;
        return a.done ? 1 : -1;
    });

    list.innerHTML = sorted.map(h => {
        const emoji = h.emoji || '🎯';
        const streak = h.habitStreak || 0;
        const timeLabel = h.time ? `<span class="text-[8px] text-gray-600 font-mono">${h.time}</span>` : '';
        const streakBadge = streak > 1
            ? `<span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-orange-900/20 border border-orange-700/30 text-orange-400 text-[8px] font-bold">🔥 ${streak}d</span>`
            : '';

        // Anel SVG de progresso (baseado em 7 dias = destaque)
        const streakPct = Math.min(100, (streak / 7) * 100);
        const r = 10;
        const circ = 2 * Math.PI * r;
        const offset = circ - (streakPct / 100) * circ;
        const ringColor = h.done ? '#22c55e' : '#374151';
        const ringFill = h.done ? '#22c55e' : '#CC0000';

        return `
        <div class="group flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 select-none relative overflow-hidden cursor-pointer
                    ${h.done
                ? 'bg-green-950/20 border-green-900/30 opacity-75'
                : 'bg-[#0d0d0d] border-white/5 hover:border-white/15 hover:bg-[#141414]'}"
             onclick="window.toggleHabit('${h.id}')">

            <!-- Linha de progresso no fundo -->
            <div class="absolute bottom-0 left-0 h-[1px] transition-all duration-700 ${h.done ? 'bg-green-500/40 w-full' : 'bg-transparent w-0'}"></div>

            <!-- Emoji + anel SVG -->
            <div class="relative flex-shrink-0 w-10 h-10 flex items-center justify-center">
                <svg class="absolute inset-0" width="40" height="40" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="${r + 8}" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="2"/>
                    <circle cx="20" cy="20" r="${r + 8}" fill="none" stroke="${ringFill}" stroke-width="2"
                            stroke-dasharray="${(circ * (r + 8) / r).toFixed(1)}"
                            stroke-dashoffset="${(circ * (r + 8) / r - (streakPct / 100) * circ * (r + 8) / r).toFixed(1)}"
                            stroke-linecap="round"
                            transform="rotate(-90 20 20)"
                            style="transition: stroke-dashoffset 0.6s ease; opacity: ${h.done ? 1 : 0.5}"/>
                </svg>
                <span class="text-lg z-10">${emoji}</span>
            </div>

            <!-- Texto e badges -->
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-bold uppercase tracking-wide transition-colors ${h.done ? 'text-gray-500 line-through' : 'text-gray-200'}">${h.text}</span>
                    ${streakBadge}
                </div>
                <div class="flex items-center gap-2 mt-0.5">
                    ${timeLabel}
                    ${streak > 0 ? `<span class="text-[8px] text-gray-600">${streak === 1 ? '1 dia seguido' : streak + ' dias seguidos'}</span>` : ''}
                </div>
            </div>

            <!-- Checkbox e delete -->
            <div class="flex items-center gap-2">
                <button onclick="event.stopPropagation(); window.deleteHabit('${h.id}')" 
                        class="text-gray-800 hover:text-red-600 transition p-1 opacity-0 group-hover:opacity-100">
                    <i class="fa-solid fa-times text-[10px]"></i>
                </button>
                <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300 shadow-lg
                            ${h.done ? 'bg-green-600 border-green-500 shadow-green-900/50 scale-110' : 'border-gray-600 bg-transparent hover:border-green-500'}">
                    <i class="fa-solid fa-check text-[9px] text-white transition-transform duration-200 ${h.done ? 'scale-100' : 'scale-0'}"></i>
                </div>
            </div>
        </div>`;
    }).join('');
}

function openAddHabitModal() {
    safePlaySFX('click');
    const existing = document.getElementById('habit-modal');
    if (existing) existing.remove();

    const presets = [
        { emoji: '🏃', text: 'Exercício' }, { emoji: '🧘', text: 'Meditação' },
        { emoji: '📚', text: 'Leitura' }, { emoji: '💧', text: 'Hidratação' },
        { emoji: '😴', text: 'Sono 8h' }, { emoji: '🌿', text: 'Sem redes sociais' }
    ];

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-6 animate-fade-in';
    overlay.id = 'habit-modal';
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-white/10 w-full max-w-sm rounded-2xl p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)] relative">
            <div class="flex justify-between items-center mb-1">
                <h3 class="text-white font-black text-sm tracking-widest uppercase flex items-center gap-2">
                    <i class="fa-solid fa-circle-plus text-green-500"></i> Novo Protocolo
                </h3>
                <button id="cancelHabitBtn" class="text-gray-600 hover:text-white transition">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <p class="text-[9px] text-gray-600 font-mono uppercase tracking-widest mb-5">Adicione ao seu ritual diário</p>

            <!-- Presets rápidos -->
            <p class="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Sugestões</p>
            <div class="grid grid-cols-3 gap-2 mb-4">
                ${presets.map(p => `
                    <button type="button" onclick="document.getElementById('newHabitInput').value='${p.text}'; document.getElementById('selectedEmoji').value='${p.emoji}'; document.getElementById('emojiDisplay').innerText='${p.emoji}'"
                        class="py-2.5 px-1 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 text-center transition-all active:scale-95">
                        <div class="text-xl mb-1">${p.emoji}</div>
                        <div class="text-[8px] text-gray-400 font-bold uppercase">${p.text}</div>
                    </button>
                `).join('')}
            </div>

            <!-- Input customizado -->
            <p class="text-[9px] text-gray-500 uppercase tracking-widest font-bold mb-2">Ou personalize</p>
            <div class="flex gap-2 mb-3">
                <button type="button" id="emojiPickerBtn"
                    class="w-12 h-12 bg-white/5 border border-white/10 rounded-xl text-2xl flex items-center justify-center hover:bg-white/10 transition flex-shrink-0">
                    <span id="emojiDisplay">🎯</span>
                </button>
                <input type="hidden" id="selectedEmoji" value="🎯">
                <input type="text" id="newHabitInput" placeholder="Nome do protocolo..."
                    class="flex-1 bg-white/5 border border-white/10 text-white p-3 rounded-xl text-sm focus:border-green-500/50 outline-none transition-all placeholder-gray-700">
            </div>

            <!-- Horário (opcional) -->
            <div class="flex gap-2 mb-5">
                <select id="habitTimeSelect" class="flex-1 bg-white/5 border border-white/10 text-gray-400 p-3 rounded-xl text-xs focus:border-green-500/50 outline-none appearance-none">
                    <option value="">Sem horário específico</option>
                    <option value="🌅 Manhã">🌅 Manhã</option>
                    <option value="☀️ Tarde">☀️ Tarde</option>
                    <option value="🌙 Noite">🌙 Noite</option>
                    <option value="🌃 Antes de dormir">🌃 Antes de dormir</option>
                </select>
            </div>

            <!-- Emoji picker simples -->
            <div id="emojiPickerPanel" class="hidden mb-3 p-3 bg-black/50 rounded-xl border border-white/5">
                <div class="grid grid-cols-8 gap-1.5 text-xl">
                    ${'🎯🏃🧘📚💧😴🌿🏋️💪🎵🖊️🧠☕🥗🚿🌅'.split('').join(' ').split(' ').map(e => `
                        <button type="button" onclick="document.getElementById('selectedEmoji').value='${e}'; document.getElementById('emojiDisplay').innerText='${e}'; document.getElementById('emojiPickerPanel').classList.add('hidden')" 
                            class="hover:bg-white/10 rounded-lg p-1 transition">${e}</button>
                    `).join('')}
                </div>
            </div>

            <button id="confirmHabitBtn"
                class="w-full py-3 bg-green-900/20 text-green-400 border border-green-900/40 hover:bg-green-600 hover:text-white hover:border-green-500 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">
                <i class="fa-solid fa-plus mr-2"></i>Adicionar Protocolo
            </button>
        </div>
    `;
    document.body.appendChild(overlay);

    const input = document.getElementById('newHabitInput');
    setTimeout(() => input.focus(), 50);

    document.getElementById('emojiPickerBtn').onclick = () => {
        document.getElementById('emojiPickerPanel').classList.toggle('hidden');
    };

    const close = () => overlay.remove();
    const confirmAdd = () => {
        const text = input.value.trim();
        const emoji = document.getElementById('selectedEmoji').value || '🎯';
        const time = document.getElementById('habitTimeSelect').value || null;
        if (text) {
            addCustomHabit(text, emoji, time);
            safePlaySFX('success');
            close();
        } else {
            input.classList.add('border-red-500', 'animate-pulse');
            setTimeout(() => input.classList.remove('border-red-500', 'animate-pulse'), 1000);
        }
    };

    document.getElementById('cancelHabitBtn').onclick = close;
    document.getElementById('confirmHabitBtn').onclick = confirmAdd;
    input.onkeypress = (e) => { if (e.key === 'Enter') confirmAdd(); };

    // Fechar ao clicar no overlay
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
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

export function addHabitFromAI(text) { addCustomHabit(text); return true; }

export async function logActivity(type, detail, xpGained, durationMin = 0) {
    try {
        const activity = { id: Date.now(), date: new Date().toISOString(), day: new Date().toLocaleDateString('pt-BR'), type, detail, xp: xpGained, duration: durationMin };
        if (!rpgState.history) rpgState.history = [];
        rpgState.history.unshift(activity);
        if (rpgState.history.length > 50) rpgState.history.pop();
        saveToGlobalState();
    } catch (e) { }
}

function triggerLevelUpPro(newLevel, newRank) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';
    const rankText = newRank ? `NOVA PATENTE: ${newRank}` : `PATENTE ATUAL: ${rpgState.currentRank}`;
    overlay.innerHTML = `<div class="level-up-content"><div class="holo-ring-outer"></div><div class="holo-ring-inner"></div><div class="level-number-pro">${newLevel}</div><div class="level-label-pro">${rankText}</div></div>`;
    document.body.appendChild(overlay);
    if (typeof playSFX === 'function') playSFX('level-up');
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
            if (typeof showToast === 'function') showToast('PROMOÇÃO', `Patente ${newRank}!`, 'level-up');
            triggerLevelUpPro(calculatedLevel, newRank);
        } else {
            if (typeof showToast === 'function') showToast('LEVEL UP', `Nível ${calculatedLevel}.`, 'level-up');
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
            const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;

            if (lastLogin === yesterday) {
                rpgState.streak += 1;
                if (typeof showToast === 'function') showToast('SEQUÊNCIA AUMENTADA', `${rpgState.streak} dias de disciplina.`, 'success');
            } else {
                if (rpgState.streak > 0 && typeof showToast === 'function') showToast('SEQUÊNCIA PERDIDA', 'Disciplina quebrada.', 'warning');
                rpgState.streak = 1;
            }
            rpgState.lastLoginDate = today;
        }
        saveToGlobalState();
    } catch (e) { console.error("Erro Streak", e); }
}

function updateUI() {
    const l = document.getElementById('levelDisplay'); const b = document.getElementById('xpBar'); const t = document.getElementById('xpText'); const s = document.getElementById('streakDisplay');

    if (l) l.innerText = rpgState.level;
    if (t) t.innerText = rpgState.xp;

    if (s) s.innerText = (typeof rpgState.streak === 'number' && !isNaN(rpgState.streak)) ? rpgState.streak : "0";

    if (b) {
        let xpCost = 100; let totalNeeded = 0;
        for (let i = 1; i < rpgState.level; i++) { totalNeeded += xpCost; xpCost = Math.floor(xpCost * 1.10); }
        const currentLevelProgress = rpgState.xp - totalNeeded;
        const percentage = Math.min(100, Math.max(0, (currentLevelProgress / xpCost) * 100));
        b.style.width = `${percentage}%`;
    }
    const rankEl = document.getElementById('rankDisplay');
    if (rankEl) { rankEl.innerText = rpgState.currentRank; } else {
        const levelContainer = document.querySelector('.dopamine-card span.text-gray-500');
        if (levelContainer && !document.getElementById('injectedRank')) levelContainer.innerHTML = `NÍVEL &bull; <span id="injectedRank" class="text-red-500 font-bold">${rpgState.currentRank}</span>`;
        else if (document.getElementById('injectedRank')) document.getElementById('injectedRank').innerText = rpgState.currentRank;
    }
}

function safePlaySFX(sound) { if (typeof playSFX === 'function') playSFX(sound); }

export function getRPGState() { return { ...rpgState }; }
export function updateMissionsState(newMissions) {
    rpgState.missions = newMissions;
    saveToGlobalState();
}

// Expõe addXP globalmente para módulos não-ES (ex: tactical.js)
window.addXP = addXP;