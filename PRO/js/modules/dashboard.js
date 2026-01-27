import { CONFIG } from '../config.js';
import { addXP, logActivity } from './gamification.js';
import { showToast } from './ui.js';
import { playSFX } from './audio.js';

export function initDashboard() {
    // 1. Verifica se a sequência quebrou (Reset se passou de 24h do último dia completo)
    checkStreakIntegrity(); 

    // 2. Carrega dados visuais
    renderMissions();
    updateStreakUI();
    calculateDaysOnBase();

    // 3. Conecta botão HTML ao JS
    window.addNewMission = () => {
        const input = document.getElementById('newMissionInput');
        const dateInput = document.getElementById('newMissionDate');
        createMission(input, dateInput);
    };

    // 4. Registra métrica de acesso
    if (window.Database) window.Database.logEvent('DASHBOARD_VIEW', 'Acessou Painel');
}

// --- LÓGICA DE DIAS NA BASE (Sincronizado na Nuvem) ---a
function calculateDaysOnBase() {
    const daysElement = document.getElementById('daysOnBase');
    if (!daysElement) return;

    // Tenta pegar a data de criação da conta do estado global
    let firstLogin = window.AppEstado?.config?.firstLogin;

    // Se não existir (primeiro acesso da vida), cria agora
    if (!firstLogin) {
        firstLogin = new Date().toISOString();
        if (!window.AppEstado.config) window.AppEstado.config = {};
        window.AppEstado.config.firstLogin = firstLogin;

        // Salva imediatamente no banco
        if (window.Database) window.Database.forceSave();
    }

    try {
        const start = new Date(firstLogin);
        const now = new Date();

        // Zera horas para contar apenas dias corridos
        start.setHours(0, 0, 0, 0);
        now.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(now - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para contar o dia de hoje

        daysElement.innerText = diffDays;
    } catch (e) {
        console.warn("Erro data:", e);
        daysElement.innerText = "1";
    }
}

// --- FOGO / STREAK ---
// Adicione esta variável no TOPO do arquivo (logo após os imports)
// EM PRO/js/modules/dashboard.js

// Variável Global do Timer (Coloque no topo do arquivo se não tiver)
// EM PRO/js/modules/dashboard.js

let streakInterval = null;

export function updateStreakUI() {
    const streak = window.AppEstado?.gamification?.streak || 0;
    
    // Atualiza o número de DIAS na nova barra
    const daysValue = document.getElementById('streakDaysValue');
    if (daysValue) daysValue.innerText = streak;

    // Inicia a contagem regressiva (Reset timer)
    iniciarContagemRegressiva();

    // Lógica do Fogo (Cores e Níveis)
    const fireIcon = document.getElementById('streak-fire');
    if (!fireIcon) return;

    fireIcon.className = 'fa-solid fa-fire transition-all duration-500';
    
    if (streak > 0) {
        fireIcon.classList.add('animate-flicker');
        if (streak < 7) {
            fireIcon.classList.add('text-orange-500', 'drop-shadow-[0_0_10px_rgba(249,115,22,0.4)]');
        } else if (streak < 30) {
            fireIcon.classList.add('text-red-600', 'drop-shadow-[0_0_15px_rgba(220,38,38,0.6)]');
        } else {
            fireIcon.classList.add('text-purple-500', 'drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]');
        }
    } else {
        fireIcon.classList.add('text-gray-700', 'opacity-30');
    }
}

function iniciarContagemRegressiva() {
    const display = document.getElementById('resetCountdown');
    const bar = document.getElementById('resetBar');
    if (!display) return;

    if (streakInterval) clearInterval(streakInterval);

    const updateTimer = () => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0); // Próxima meia-noite

        const diff = midnight - now;

        if (diff <= 0) {
            display.innerText = "00:00:00";
            if(bar) bar.style.width = "0%";
            return;
        }

        const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const m = Math.floor((diff / (1000 * 60)) % 60);
        const s = Math.floor((diff / 1000) % 60);

        // Formata: 04:30:15
        const timerText = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        display.innerText = timerText;

        // Barra de "Vida" do dia (diminui com o tempo)
        if (bar) {
            const totalDaySeconds = 86400; // 24h em segundos
            const currentSecondsLeft = (h * 3600) + (m * 60) + s;
            const percentage = (currentSecondsLeft / totalDaySeconds) * 100;
            bar.style.width = `${percentage}%`;

            // Alerta Vermelho se faltar menos de 2 horas
            if (h < 2) {
                bar.classList.add('animate-pulse');
                display.classList.add('text-red-500');
            } else {
                bar.classList.remove('animate-pulse');
                display.classList.remove('text-red-500');
            }
        }
    };

    updateTimer();
    streakInterval = setInterval(updateTimer, 1000);
}

// --- GERENCIAMENTO DE MISSÕES ---

function getMissions() {
    return window.AppEstado.gamification?.missions || [];
}

function saveMissions(newMissions) {
    if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
    window.AppEstado.gamification.missions = newMissions;

    if (window.Database) window.Database.forceSave();
    renderMissions();
}

function createMission(input, dateInput) {
    const text = input.value.trim();
    const date = dateInput ? dateInput.value : null;

    if (!text) return;

    const missions = getMissions();
    missions.push({
        id: Date.now(),
        text,
        date: date,
        done: false
    });

    playSFX('type');
    saveMissions(missions);

    input.value = '';
    showToast('MISSÃO AGENDADA', 'Objetivo traçado.', 'neutral');
    if (window.Database) window.Database.logEvent('MISSAO_CRIADA', text);
}

export function addMissionFromAI(text) {
    const missions = getMissions();
    missions.push({
        id: Date.now(),
        text,
        date: new Date().toISOString().split('T')[0],
        done: false
    });
    saveMissions(missions);
    return true;
}

window.completeMission = (id) => {
    const missions = getMissions();
    const index = missions.findIndex(m => m.id == id);

    if (index > -1) {
        const m = missions[index];
        m.done = !m.done;

        if (m.done) {
            playSFX('success');
            // XP por missão individual (opcional, pode manter ou tirar)
            addXP(20); 
            logActivity('MISSION', m.text, 20);
            
            if (window.Database) window.Database.logEvent('MISSAO_COMPLETA', m.text);
        } else {
            playSFX('click');
        }
        
        // 1. Salva o estado atual da missão
        saveMissions(missions);

        // 2. VERIFICA SE COMPLETOU TUDO HOJE (NOVA LÓGICA)
        if (m.done) {
            checkDailyAllDone();
        }
    }
};

window.deleteMission = (id) => {
    if (confirm('Abortar missão?')) {
        let missions = getMissions();
        missions = missions.filter(m => m.id != id);
        saveMissions(missions);
    }
};

window.clearCompleted = () => {
    let missions = getMissions();
    missions = missions.filter(m => !m.done);
    saveMissions(missions);
    playSFX('click');
    showToast('LIMPEZA', 'Missões arquivadas.', 'neutral');
};

// --- GRÁFICOS ---
function updateDashboardProgress() {
    const missions = getMissions();
    const total = missions.length;
    const done = missions.filter(m => m.done).length;

    const textEl = document.getElementById('dailyMetaText');
    const circleEl = document.querySelector('.circle-chart');
    const percentEl = document.getElementById('dailyPercentage');

    if (textEl) textEl.innerText = `${done}/${total}`;

    const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

    if (percentEl) percentEl.innerText = `${percentage}%`;

    if (circleEl) {
        circleEl.style.background = `conic-gradient(#cc0000 ${percentage}%, #222 ${percentage}%)`;
        circleEl.style.boxShadow = percentage === 100 ? '0 0 15px rgba(204, 0, 0, 0.5)' : 'none';
    }
}

function renderMissions() {
    updateDashboardProgress();
    const missions = getMissions();
    const list = document.getElementById('missionList');
    if (!list) return;

    if (missions.length === 0) {
        list.innerHTML = `<div class="text-center text-gray-700 py-8 flex flex-col items-center"><i class="fa-solid fa-list-check text-2xl mb-2 opacity-30"></i><p class="text-[10px] uppercase tracking-widest opacity-50">Sem ordens ativas</p></div>`;
        return;
    }

    missions.sort((a, b) => {
        if (a.done === b.done) return (new Date(b.date || 0) - new Date(a.date || 0));
        return a.done ? 1 : -1;
    });

    list.innerHTML = missions.map(m => {
        const isLate = m.date && new Date(m.date) < new Date().setHours(0, 0, 0, 0) && !m.done;
        return `
        <div class="group flex items-center justify-between p-4 bg-[#0a0a0a] border ${m.done ? 'border-green-900/30 opacity-60' : (isLate ? 'border-red-900/60' : 'border-white/5')} rounded-xl hover:border-white/20 transition-all mb-2">
            <div class="flex items-center gap-3 w-full cursor-pointer" onclick="window.completeMission(${m.id})">
                <div class="flex-shrink-0 w-6 h-6 rounded-full border ${m.done ? 'bg-green-900/50 border-green-500' : 'border-gray-600 hover:border-red-500'} transition flex items-center justify-center">
                    ${m.done ? '<i class="fa-solid fa-check text-[10px] text-green-400"></i>' : ''}
                </div>
                <div class="flex flex-col w-full overflow-hidden">
                    <span class="text-sm ${m.done ? 'text-gray-500 line-through' : 'text-gray-200 font-medium'} truncate">${m.text}</span>
                    ${m.date ? `<div class="flex items-center gap-2 mt-1"><span class="text-[10px] font-mono flex items-center gap-1 ${isLate && !m.done ? 'text-red-500 font-bold animate-pulse' : 'text-gray-600'}"><i class="fa-regular fa-calendar"></i> ${m.date.split('-').reverse().join('/').substring(0, 5)}</span></div>` : ''}
                </div>
            </div>
            <button onclick="window.deleteMission(${m.id})" class="text-gray-700 hover:text-red-500 transition p-2 ml-2"><i class="fa-solid fa-trash text-xs"></i></button>
        </div>`
    }).join('');
}
// --- LÓGICA AVANÇADA DE SEQUÊNCIA (STREAK) ---

function checkDailyAllDone() {
    const missions = getMissions();
    
    // Se não houver missões, não faz nada
    if (missions.length === 0) return;

    // Verifica se TODAS estão completas
    const allCompleted = missions.every(m => m.done);

    if (allCompleted) {
        incrementStreak();
    }
}

function incrementStreak() {
    const today = new Date().toDateString(); // Ex: "Tue Jan 27 2026"
    const gamification = window.AppEstado.gamification || {};
    const lastDate = gamification.lastStreakDate;

    // Se já computou a sequência HOJE, não aumenta de novo
    if (lastDate === today) {
        return;
    }

    // Aumenta a sequência
    gamification.streak = (gamification.streak || 0) + 1;
    gamification.lastStreakDate = today; // Marca hoje como feito

    // Salva no estado global
    window.AppEstado.gamification = gamification;
    if (window.Database) window.Database.forceSave();

    // Feedback Visual Épico
    updateStreakUI();
    showToast('DIA CONQUISTADO!', 'Sequência Aumentada +1', 'success');
    playSFX('level-up'); // Ou outro som de vitória
    
    // Opcional: XP Bônus por fechar o dia
    addXP(100);
}

function checkStreakIntegrity() {
    const gamification = window.AppEstado.gamification || {};
    const lastDateStr = gamification.lastStreakDate;
    
    if (!lastDateStr) return; // Nunca começou uma sequência

    const lastDate = new Date(lastDateStr);
    const today = new Date();
    
    // Zera as horas para comparar apenas os dias
    lastDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);

    // Diferença em milissegundos
    const diffTime = Math.abs(today - lastDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Se a diferença for maior que 1 dia (ex: fez anteontem, pulou ontem, entrou hoje)
    // diffDays = 0 (mesmo dia)
    // diffDays = 1 (dia seguinte, ok)
    // diffDays > 1 (quebrou a sequência)
    if (diffDays > 1) {
        console.log("Sequência quebrada. Resetando...");
        gamification.streak = 0;
        // Não resetamos o lastStreakDate para não bugar lógicas futuras, 
        // apenas o contador visual.
        
        window.AppEstado.gamification = gamification;
        if (window.Database) window.Database.forceSave();
    }
}