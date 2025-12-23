import { CONFIG } from '../config.js';
import { addXP, logActivity, updateMissionsState } from './gamification.js'; 
import { showToast } from './ui.js';
import { playSFX } from './audio.js'; // Importa sons

let missions = [];

export function initDashboard() {
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.MISSIONS);
    if (stored) missions = JSON.parse(stored);
    
    renderMissions();

    // --- ADICIONE ESTE BLOCO ---
    // Isso conecta o botão do HTML com a função interna do JS
    window.addNewMission = () => {
        const input = document.getElementById('newMissionInput');
        const dateInput = document.getElementById('newMissionDate');
        createMission(input, dateInput);
    };
    // ---------------------------

    const btn = document.getElementById('addMissionBtn');
    // ... resto do código ...
}

function createMission(input, dateInput) {
    const text = input.value.trim();
    const date = dateInput ? dateInput.value : null; 
    
    if (!text) return;
    
    const mission = { 
        id: Date.now(), 
        text, 
        date: date, 
        done: false 
    };
    
    missions.push(mission);
    playSFX('type'); // Som de digitar/entrar dados
    
    save();
    renderMissions();
    
    input.value = '';
    showToast('MISSÃO AGENDADA', `Alvo definido para ${date ? formatDate(date) : 'hoje'}.`, 'neutral');
}

export function addMissionFromAI(text) {
    missions.push({ 
        id: Date.now(), 
        text, 
        date: new Date().toISOString().split('T')[0],
        done: false 
    });
    save();
    renderMissions();
    return true;
}

window.completeMission = (id) => {
    const index = missions.findIndex(m => m.id == id);
    if (index > -1) {
        const m = missions[index];
        
        // Se já estava feita, desfaz. Se não, completa.
        m.done = !m.done;

        if(m.done) {
            playSFX('success');
            addXP(50);
            logActivity('MISSION', m.text, 50);
            showToast('MISSÃO CUMPRIDA', 'Objetivo eliminado.', 'success');
        } else {
            playSFX('click');
        }

        save();
        renderMissions();
    }
};

window.deleteMission = (id) => {
    if(confirm('Abortar missão?')) {
        missions = missions.filter(m => m.id != id);
        save();
        renderMissions();
    }
};

// Nova função para limpar apenas as completas
window.clearCompleted = () => {
    missions = missions.filter(m => !m.done);
    save();
    renderMissions();
    playSFX('click');
    showToast('LIMPEZA', 'Missões concluídas arquivadas.', 'neutral');
};

function save() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
    updateMissionsState(missions);
}

// --- ATUALIZA O GRÁFICO (NOVO) ---
function updateDashboardProgress() {
    const total = missions.length;
    const done = missions.filter(m => m.done).length;
    
    const textEl = document.getElementById('dailyMetaText');
    const circleEl = document.querySelector('.circle-chart');
    const percentEl = document.getElementById('dailyPercentage');

    if (textEl) textEl.innerText = `${done}/${total}`;
    
    const percentage = total === 0 ? 0 : Math.round((done / total) * 100);
    
    if (percentEl) percentEl.innerText = `${percentage}%`;
    
    if (circleEl) {
        // Pinta o gráfico dinamicamente
        circleEl.style.background = `conic-gradient(#cc0000 ${percentage}%, #222 ${percentage}%)`;
        circleEl.style.borderRadius = '50%';
        // Adiciona um brilho se completar 100%
        circleEl.style.boxShadow = percentage === 100 ? '0 0 15px rgba(204, 0, 0, 0.5)' : 'none';
    }
}

function renderMissions() {
    updateDashboardProgress(); // Atualiza o gráfico sempre que renderizar

    const list = document.getElementById('missionList');
    if (!list) return;

    if (missions.length === 0) {
        list.innerHTML = `
            <div class="text-center text-gray-700 py-8 flex flex-col items-center animate-fade-in">
                <i class="fa-solid fa-list-check text-2xl mb-2 opacity-30"></i>
                <p class="text-[10px] uppercase tracking-widest opacity-50">Sem ordens ativas</p>
            </div>`;
        return;
    }

    // Ordenação: Pendentes primeiro, depois feitas
    missions.sort((a, b) => {
        if (a.done === b.done) {
            // Se o status for igual, ordena por data
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(a.date) - new Date(b.date);
        }
        return a.done ? 1 : -1; // Feitas vão para o final
    });

    let html = missions.map(m => {
        const isLate = m.date && new Date(m.date) < new Date().setHours(0,0,0,0) && !m.done;
        
        return `
        <div id="mission-${m.id}" class="group flex items-center justify-between p-4 bg-[#0a0a0a] border ${m.done ? 'border-green-900/30 opacity-60' : (isLate ? 'border-red-900/60' : 'border-white/5')} rounded-xl hover:border-white/20 transition-all duration-300 animate-slide-in mb-2">
            <div class="flex items-center gap-3 w-full cursor-pointer" onclick="window.completeMission(${m.id})">
                <div class="flex-shrink-0 w-6 h-6 rounded-full border ${m.done ? 'bg-green-900/50 border-green-500' : 'border-gray-600 hover:border-red-500'} transition flex items-center justify-center">
                    ${m.done ? '<i class="fa-solid fa-check text-[10px] text-green-400"></i>' : ''}
                </div>
                
                <div class="flex flex-col w-full overflow-hidden">
                    <span class="text-sm ${m.done ? 'text-gray-500 line-through' : 'text-gray-200 font-medium'} truncate transition-colors">${m.text}</span>
                    ${m.date ? `
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[10px] font-mono flex items-center gap-1 ${isLate && !m.done ? 'text-red-500 font-bold animate-pulse' : 'text-gray-600'}">
                                <i class="fa-regular fa-calendar"></i> 
                                ${formatDate(m.date)} ${isLate && !m.done ? '(ATRASADO)' : ''}
                            </span>
                        </div>
                    ` : ''}
                </div>
            </div>
            
            <button onclick="window.deleteMission(${m.id})" class="text-gray-700 hover:text-red-500 transition opacity-0 group-hover:opacity-100 p-2 ml-2">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>
        </div>
    `}).join('');

    // Adiciona botão para limpar se tiver missões feitas
    if(missions.some(m => m.done)) {
        html += `
            <div class="text-center mt-4">
                <button onclick="window.clearCompleted()" class="text-[10px] text-gray-600 hover:text-white uppercase tracking-widest border border-white/5 hover:bg-white/5 px-4 py-2 rounded-lg transition">
                    <i class="fa-solid fa-box-archive mr-2"></i> Arquivar Concluídas
                </button>
            </div>
        `;
    }

    list.innerHTML = html;
}

function formatDate(dateStr) {
    if(!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
}