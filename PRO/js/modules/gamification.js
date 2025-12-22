import { CONFIG } from '../config.js';
import { showToast } from './ui.js';
import { saveUserData, syncUserData, pushHistoryLog } from './database.js';
import { playSFX } from './audio.js';

// --- SISTEMA DE PATENTES E HIERARQUIA ---
const RANKS = [
    { name: "RECRUTA", minLevel: 1 },       // Fácil
    { name: "SOLDADO", minLevel: 5 },       // Começa a jornada
    { name: "CABO", minLevel: 10 },         // Primeiro desafio
    { name: "SARGENTO", minLevel: 15 },     // Exige constância
    { name: "SUBTENENTE", minLevel: 20 },
    { name: "TENENTE", minLevel: 25 },      // Oficial júnior
    { name: "CAPITÃO", minLevel: 35 },      // Nível alto
    { name: "MAJOR", minLevel: 45 },        // EXTREMAMENTE DIFÍCIL
    { name: "CORONEL", minLevel: 60 },      // Elite
    { name: "GENERAL", minLevel: 80 },      // Lenda
    { name: "MARECHAL", minLevel: 100 }     // Quase impossível
];

let rpgState = {
    xp: 0,
    level: 1,
    currentRank: "RECRUTA",
    streak: 0,
    lastActionTime: 0, // Para anti-abuso
    habits: [],
    missions: [],
    history: []
};

export async function initGamification() {
    loadLocalState();
    checkStreak(); // <--- AGORA VAI FUNCIONAR
    calculateRankAndLevel();
    updateUI();
    renderHabits();

    try {
        const cloudData = await syncUserData();
        if (cloudData) {
            rpgState.xp = cloudData.xp;
            // Recalculamos o nível baseado no XP da nuvem para garantir a nova dificuldade
            calculateRankAndLevel();

            if (cloudData.habits) rpgState.habits = cloudData.habits;
            if (cloudData.missions) rpgState.missions = cloudData.missions;

            saveLocalState();
            updateUI();
            renderHabits();
            if (window.renderMissionsExternal) window.renderMissionsExternal(rpgState.missions);
            console.log("☁ Sincronização Militar Completa");
        }
    } catch (e) { console.warn("Offline mode."); }
}

export function getRPGState() { return { ...rpgState }; }

export function updateMissionsState(newMissions) {
    rpgState.missions = newMissions;
    saveLocalState();
}

function loadLocalState() {
    const xp = localStorage.getItem(CONFIG.STORAGE_KEYS.XP);
    if (xp) rpgState.xp = parseInt(xp);

    // Não carregamos o nível salvo, recalculamos sempre baseado no XP para evitar bugs de versão
    calculateRankAndLevel();

    const hist = localStorage.getItem('synapse_history');
    if (hist) rpgState.history = JSON.parse(hist);

    const hbt = localStorage.getItem(CONFIG.STORAGE_KEYS.HABITS);
    if (hbt) {
        const d = JSON.parse(hbt);
        rpgState.habits = d.list;
    }

    const msn = localStorage.getItem(CONFIG.STORAGE_KEYS.MISSIONS);
    if (msn) rpgState.missions = JSON.parse(msn);
}

function saveLocalState() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.XP, rpgState.xp);
    localStorage.setItem('synapse_level', rpgState.level);
    localStorage.setItem('synapse_history', JSON.stringify(rpgState.history));
    localStorage.setItem(CONFIG.STORAGE_KEYS.HABITS, JSON.stringify({ date: new Date().toISOString().split('T')[0], list: rpgState.habits }));
    localStorage.setItem(CONFIG.STORAGE_KEYS.MISSIONS, JSON.stringify(rpgState.missions));
    saveUserData(rpgState);
}

// --- O CORAÇÃO DO SISTEMA (Matemática da Dificuldade) ---
function calculateRankAndLevel() {
    // FÓRMULA EXPONENCIAL DE DIFICULDADE
    // Nível 1 = 0 XP
    // Nível 2 = 200 XP
    // Nível 10 = ~4.500 XP
    // Nível 45 (Major) = ~80.000 XP
    // Isso torna o começo rápido, mas o meio/fim brutal.

    // A fórmula inversa (XP -> Nível): Nível = RaizQuadrada(XP / 50) aprox.
    // Ajuste fino para ficar justo:
    let calculatedLevel = 1;
    let xpCost = 100; // Custo do primeiro nível
    let totalXpNeeded = 0;

    // Loop simples para descobrir o nível atual baseado no XP total
    while (rpgState.xp >= totalXpNeeded + xpCost) {
        totalXpNeeded += xpCost;
        calculatedLevel++;
        // Cada nível custa 10% a mais que o anterior (Juros Compostos de Dificuldade)
        xpCost = Math.floor(xpCost * 1.10);
    }

    rpgState.level = calculatedLevel;

    // Define a Patente baseado no Nível
    let newRank = "RECRUTA";
    for (let r of RANKS) {
        if (rpgState.level >= r.minLevel) {
            newRank = r.name;
        }
    }
    rpgState.currentRank = newRank;
}

function checkStreak() {
    const today = new Date().toISOString().split('T')[0]; // Data de hoje (YYYY-MM-DD)
    const lastLogin = rpgState.lastLoginDate; // Pega a última data salva

    // 1. Primeiro acesso de sempre
    if (!lastLogin) {
        rpgState.streak = 1;
        rpgState.lastLoginDate = today;
    } 
    // 2. Acesso no mesmo dia (não faz nada)
    else if (lastLogin === today) {
        // Mantém a streak como está
    } 
    // 3. Acesso consecutivo (Ontem -> Hoje)
    else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        if (lastLogin === yesterdayStr) {
            rpgState.streak += 1; // Aumenta!
            // Efeito visual de fogo se aumentar
            showToast('SEQUÊNCIA AUMENTADA', `${rpgState.streak} dias de disciplina.`, 'success');
        } else {
            // 4. Quebrou a sequência (Ficou dias sem entrar)
            if (rpgState.streak > 0) {
                showToast('SEQUÊNCIA PERDIDA', 'A disciplina foi quebrada.', 'warning');
            }
            rpgState.streak = 1; // Reinicia
        }
        rpgState.lastLoginDate = today; // Atualiza a data
    }
    
    saveLocalState(); // Salva a nova streak
}

// --- AÇÕES COM ANTI-ABUSO ---
export function addXP(amt) {
    const now = Date.now();

    // ANTI-ABUSO: Se tentar ganhar XP em menos de 500ms (clique frenético)
    if (amt > 0 && (now - rpgState.lastActionTime < 500)) {
        showToast('FADIGA NEURAL', 'Aguarde recuperação sináptica.', 'warning');
        return; // Nega o XP
    }

    rpgState.lastActionTime = now;

    const oldLevel = rpgState.level;
    const oldRank = rpgState.currentRank;

    rpgState.xp = Math.max(0, rpgState.xp + amt);

    calculateRankAndLevel(); // Recalcula tudo
    saveLocalState();
    updateUI();

    // VERIFICA EVOLUÇÃO
    if (amt > 0) {
        if (rpgState.level > oldLevel) {
            playSFX('success');

            // Se mudou de Patente, avisa com glória
            if (rpgState.currentRank !== oldRank) {
                showToast('PROMOÇÃO MILITAR', `Patente ${rpgState.currentRank} Conquistada!`, 'level-up');
                triggerLevelUpPro(rpgState.level, rpgState.currentRank); // Mostra Patente no Holograma
            } else {
                // Só subiu nível
                showToast('UPLOAD COMPLETO', `Nível ${rpgState.level} Atingido.`, 'level-up');
                triggerLevelUpPro(rpgState.level, null);
            }
        }
    }
}

// --- EFEITO VISUAL: HOLOGRAMA PRO (ATUALIZADO PARA PATENTE) ---
function triggerLevelUpPro(newLevel, newRank) {
    const overlay = document.createElement('div');
    overlay.className = 'level-up-overlay';

    // Se tiver patente nova, destaca ela. Se não, mostra "NOVA PATENTE" genérico ou o nome da atual.
    const rankText = newRank ? `NOVA PATENTE: ${newRank}` : `PATENTE ATUAL: ${rpgState.currentRank}`;

    overlay.innerHTML = `
        <div class="level-up-content">
            <div class="holo-ring-outer"></div>
            <div class="holo-ring-inner"></div>
            <div class="level-number-pro">${newLevel}</div>
            <div class="level-label-pro">${rankText}</div>
        </div>
    `;

    document.body.appendChild(overlay);

    setTimeout(() => {
        overlay.style.transition = 'opacity 0.6s ease';
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 600);
    }, 3000);
}

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
        // Se já foi feito hoje e o usuário está desmarcando, removemos o XP ganho?
        // Estratégia Justa: 
        // Se marcar: Ganha XP e trava por 2 segundos.
        // Se desmarcar: Perde XP (para evitar marcar/desmarcar infinito).

        h.done = !h.done;

        if (h.done) {
            playSFX('success');
            addXP(25); // Ganha 25
        } else {
            playSFX('click');
            addXP(-25); // Perde 25 (punição por desfazer ou correção)
        }

        if (h.done) logActivity('HABIT', h.text, 25);
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

    // Atualiza Nível
    if (l) l.innerText = rpgState.level;

    // Atualiza XP Total
    if (t) t.innerText = rpgState.xp;

    if (s) s.innerText = rpgState.streak;

    // Barra de XP (Cálculo Visual da Porcentagem para o próximo nível)
    // Precisamos recalcular o custo do próximo nível para a barra ficar certa
    if (b) {
        // Recalculando limites para a barra visual
        let xpCost = 100;
        let totalNeeded = 0;
        for (let i = 1; i < rpgState.level; i++) {
            totalNeeded += xpCost;
            xpCost = Math.floor(xpCost * 1.10);
        }
        // totalNeeded = XP que eu tinha quando cheguei neste nível
        // totalNeeded + xpCost = XP para o próximo

        const currentLevelProgress = rpgState.xp - totalNeeded;
        const percentage = Math.min(100, Math.max(0, (currentLevelProgress / xpCost) * 100));

        b.style.width = `${percentage}%`;
    }

    // ATUALIZA A PATENTE NO DASHBOARD
    // Procura onde exibir a Patente. Se não tiver um lugar específico, colocamos perto do Nível.
    const rankEl = document.getElementById('rankDisplay'); // Vamos criar isso no HTML ou injetar
    if (rankEl) {
        rankEl.innerText = rpgState.currentRank;
    } else {
        // Se não existe, vamos injetar no DOM perto do nível (gambiarra inteligente)
        const levelContainer = document.querySelector('.dopamine-card span.text-gray-500');
        if (levelContainer && !document.getElementById('injectedRank')) {
            levelContainer.innerHTML = `NÍVEL &bull; <span id="injectedRank" class="text-red-500 font-bold">${rpgState.currentRank}</span>`;
        } else if (document.getElementById('injectedRank')) {
            document.getElementById('injectedRank').innerText = rpgState.currentRank;
        }
    }
}

function renderHabits() {
    const list = document.getElementById('habitList');
    if (!list) return;

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