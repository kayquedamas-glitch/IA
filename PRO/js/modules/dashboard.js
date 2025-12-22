import { CONFIG } from '../config.js';
import { addXP, logActivity, updateMissionsState } from './gamification.js'; 
import { showToast } from './ui.js';

let missions = [];

export function initDashboard() {
    // Tenta carregar backup local caso o gamification demore a sincronizar
    const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.MISSIONS);
    if (stored) missions = JSON.parse(stored);
    
    renderMissions();

    const btn = document.getElementById('addMissionBtn');
    const input = document.getElementById('newMissionInput');
    const dateInput = document.getElementById('newMissionDate');
    
    if (btn && input) {
        // Define a data de hoje como padrão no input
        if(dateInput) dateInput.valueAsDate = new Date();

        btn.onclick = () => createMission(input, dateInput);
        input.onkeypress = (e) => { if (e.key === 'Enter') createMission(input, dateInput); };
    }

    // HOOK EXTERNO: Permite que o gamification.js atualize a lista 
    // quando os dados chegarem da nuvem (Google Sheets)
    window.renderMissionsExternal = (newMissions) => {
        missions = newMissions || [];
        renderMissions();
    };
}

function createMission(input, dateInput) {
    const text = input.value.trim();
    // Se existir input de data, pega o valor, senão null
    const date = dateInput ? dateInput.value : null; 
    
    if (!text) return;
    
    const mission = { 
        id: Date.now(), 
        text, 
        date: date, // Formato YYYY-MM-DD
        done: false 
    };
    
    missions.push(mission);
    
    save(); // Salva e Sincroniza
    renderMissions();
    
    input.value = '';
    // Não limpamos a data intencionalmente para facilitar inserções em massa no mesmo dia
    
    showToast('MISSÃO AGENDADA', `Alvo definido para ${date ? formatDate(date) : 'hoje'}.`, 'neutral');
}

// Função usada pelo Agente de IA (Chat)
export function addMissionFromAI(text) {
    missions.push({ 
        id: Date.now(), 
        text, 
        date: new Date().toISOString().split('T')[0], // Define para hoje por padrão
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
        
        // Efeito Visual de Saída
        const el = document.getElementById(`mission-${id}`);
        if(el) {
            el.style.transform = "scale(0.95)";
            el.style.opacity = "0";
        }

        setTimeout(() => {
            missions.splice(index, 1); // Remove da lista
            save(); // Salva e Sincroniza
            renderMissions();
            
            // Recompensas
            addXP(50);
            logActivity('MISSION', m.text, 50);
            showToast('MISSÃO CUMPRIDA', '+50 XP. Objetivo eliminado.', 'success');
            
            // Confetis (se a biblioteca estiver carregada)
            if(window.confetti) {
                window.confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#cc0000', '#ffffff'] });
            }
        }, 300);
    }
};

window.deleteMission = (id) => {
    if(confirm('Abortar missão?')) {
        missions = missions.filter(m => m.id != id);
        save();
        renderMissions();
    }
};

function save() {
    // 1. Salva Localmente (Backup instantâneo)
    localStorage.setItem(CONFIG.STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
    
    // 2. Envia para o Gamification salvar na Nuvem (Google Sheets)
    updateMissionsState(missions);
}

function renderMissions() {
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

    // LÓGICA DE ORDENAÇÃO:
    // 1. Atrasadas primeiro
    // 2. Data mais próxima depois
    // 3. Sem data por último
    missions.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
    });

    list.innerHTML = missions.map(m => {
        // Verifica se está atrasada (Data da missão < Hoje e não feita)
        const isLate = m.date && new Date(m.date) < new Date().setHours(0,0,0,0) && !m.done;
        
        return `
        <div id="mission-${m.id}" class="group flex items-center justify-between p-4 bg-[#0a0a0a] border ${isLate ? 'border-red-900/60 shadow-[0_0_10px_rgba(200,0,0,0.1)]' : 'border-white/5'} rounded-xl hover:border-red-900/50 transition-all duration-300 animate-slide-in mb-2">
            <div class="flex items-center gap-3 w-full">
                <button onclick="window.completeMission(${m.id})" class="flex-shrink-0 w-6 h-6 rounded-full border border-gray-600 hover:border-red-500 hover:bg-red-500/20 transition flex items-center justify-center group-hover:shadow-[0_0_10px_rgba(200,0,0,0.2)]">
                    <i class="fa-solid fa-check text-[10px] text-transparent group-hover:text-red-500 transition"></i>
                </button>
                
                <div class="flex flex-col w-full overflow-hidden">
                    <span class="text-sm text-gray-300 font-medium truncate">${m.text}</span>
                    ${m.date ? `
                        <div class="flex items-center gap-2 mt-1">
                            <span class="text-[10px] font-mono flex items-center gap-1 ${isLate ? 'text-red-500 font-bold animate-pulse' : 'text-gray-600'}">
                                <i class="fa-regular fa-calendar"></i> 
                                ${formatDate(m.date)} ${isLate ? '(ATRASADO)' : ''}
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
}

// Auxiliar para formatar data (YYYY-MM-DD -> DD/MM)
function formatDate(dateStr) {
    if(!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}`;
}