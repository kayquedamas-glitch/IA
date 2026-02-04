// PRO/js/modules/tactical.js

export function initTactical() {
    console.log("⚔️ Módulo Tático: Inicializando...");
    
    // 1. Carrega dados (memória ou storage)
    loadData();

    // 2. Expõe renderização globalmente (para o switchTab do index.html usar)
    window.initTacticalModule = renderTacticalView; 
    
    // 3. Define funções de ação globalmente
    setupGlobalActions();

    // 4. Renderiza imediatamente
    renderTacticalView();
}

function setupGlobalActions() {
    window.toggleHabit = (id) => {
        if (!window.AppEstado?.habits) return;
        const habit = window.AppEstado.habits.find(h => h.id === id);
        if (habit) {
            habit.completed = !habit.completed;
            updateStateAndRender();
        }
    };

    window.deleteHabit = (id) => {
        if(!confirm("Remover este ritual?")) return;
        window.AppEstado.habits = window.AppEstado.habits.filter(h => h.id !== id);
        updateStateAndRender();
    };

    window.completeMission = (id) => {
        if (!window.AppEstado?.missions) return;
        const mission = window.AppEstado.missions.find(m => m.id === id);
        if (mission) {
            mission.completed = !mission.completed;
            updateStateAndRender();
        }
    };

    window.deleteMission = (id) => {
        if(!confirm("Abortar missão?")) return;
        window.AppEstado.missions = window.AppEstado.missions.filter(m => m.id !== id);
        updateStateAndRender();
    };

    window.openAddHabitModal = () => {
        const title = prompt("Nome do novo Ritual (ex: Leitura, Treino):");
        if (title && title.trim()) {
            const newHabit = {
                id: crypto.randomUUID(),
                title: title.trim(),
                completed: false,
                frequency: 'Diário'
            };
            if (!window.AppEstado.habits) window.AppEstado.habits = [];
            window.AppEstado.habits.push(newHabit);
            updateStateAndRender();
        }
    };

    window.addNewMission = () => {
        const input = document.getElementById('newMissionInputTactical') || document.getElementById('newMissionInput');
        const dateInput = document.getElementById('newMissionDateTactical') || document.getElementById('newMissionDate');
        
        if (input && input.value.trim()) {
            const newMission = {
                id: crypto.randomUUID(),
                title: input.value.trim(),
                deadline: dateInput?.value || new Date().toISOString().split('T')[0],
                completed: false
            };
            
            if (!window.AppEstado.missions) window.AppEstado.missions = [];
            window.AppEstado.missions.push(newMission);
            input.value = ''; 
            updateStateAndRender();
        }
    };
}

// --- GESTÃO DE DADOS ---

function loadData() {
    // Se o estado já existe (talvez criado pelo main.js), usamos ele
    if (!window.AppEstado) {
        window.AppEstado = { habits: [], missions: [] };
    }

    try {
        const saved = localStorage.getItem('synapse_data');
        if (saved) {
            const data = JSON.parse(saved);
            // Mescla dados salvos com o estado atual, garantindo arrays
            window.AppEstado.habits = data.habits || window.AppEstado.habits || [];
            window.AppEstado.missions = data.missions || window.AppEstado.missions || [];
        }
    } catch (e) {
        console.error("Erro ao carregar dados:", e);
        // Fallback seguro
        window.AppEstado.habits = [];
        window.AppEstado.missions = [];
    }
}

function saveData() {
    if(window.AppEstado) {
        localStorage.setItem('synapse_data', JSON.stringify({
            habits: window.AppEstado.habits,
            missions: window.AppEstado.missions
        }));
    }
}

function updateStateAndRender() {
    saveData();
    renderTacticalView();
}

function renderTacticalView() {
    console.log("⚔️ Renderizando Tático...");
    if (!window.AppEstado) loadData();
    
    const habits = window.AppEstado.habits || [];
    const missions = window.AppEstado.missions || [];

    // Seletores ESPECÍFICOS para garantir que pegamos os elementos certos
    // 1. Tenta pegar pelo ID novo (Tático)
    // 2. Se não achar, tenta querySelectorAll como fallback
    const habitContainer = document.getElementById('habitListTactical');
    const missionContainer = document.getElementById('missionListTactical');

    if (habitContainer) renderHabitListInContainer(habitContainer, habits);
    if (missionContainer) renderMissionListInContainer(missionContainer, missions);
}

// --- RENDERIZADORES ---

function renderHabitListInContainer(container, habits) {
    if (!habits || habits.length === 0) {
        // CORREÇÃO VISUAL: Texto mais claro e visível
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full min-h-[150px] border-2 border-dashed border-white/5 rounded-lg p-4 select-none">
                <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-list-check text-xl text-gray-400"></i>
                </div>
                <span class="text-xs font-bold text-gray-300 uppercase tracking-widest">Nenhum Ritual</span>
                <span class="text-[10px] text-gray-500 mt-1 text-center">Clique no + para adicionar<br>sua rotina diária.</span>
            </div>`;
        return;
    }

    container.innerHTML = habits.map(habit => {
        const isDone = habit.completed;
        return `
        <div class="group relative flex items-center gap-3 p-3 bg-[#151515] border ${isDone ? 'border-green-900/50 bg-green-950/10' : 'border-white/5 hover:border-white/20'} rounded-lg transition-all duration-200 mb-2">
            <button onclick="window.toggleHabit('${habit.id}')" 
                class="w-5 h-5 flex items-center justify-center rounded border ${isDone ? 'bg-green-600 border-green-600 text-black shadow-glow-green' : 'border-gray-600 hover:border-white text-transparent'} transition-all shrink-0">
                <i class="fa-solid fa-check text-[10px] ${isDone ? 'scale-100' : 'scale-0'} transition-transform"></i>
            </button>
            
            <div class="flex-1 flex flex-col min-w-0 cursor-pointer select-none" onclick="window.toggleHabit('${habit.id}')">
                <span class="text-xs font-bold ${isDone ? 'text-green-500 line-through opacity-50' : 'text-gray-200'} transition-all truncate">
                    ${habit.title}
                </span>
                <span class="text-[8px] text-gray-500 uppercase tracking-wider font-mono">${habit.frequency || 'Diário'}</span>
            </div>

            <button onclick="window.deleteHabit('${habit.id}')" class="w-6 h-6 flex items-center justify-center text-gray-600 hover:text-red-500 rounded transition-all opacity-0 group-hover:opacity-100 focus:opacity-100">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
        </div>
        `;
    }).join('');
}

function renderMissionListInContainer(container, missions) {
    if (!missions || missions.length === 0) {
        // CORREÇÃO VISUAL: Texto mais claro e visível
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full min-h-[150px] border-2 border-dashed border-white/5 rounded-lg p-4 select-none">
                <div class="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
                    <i class="fa-solid fa-crosshairs text-xl text-gray-400"></i>
                </div>
                <span class="text-xs font-bold text-gray-300 uppercase tracking-widest">Sem Missões</span>
                <span class="text-[10px] text-gray-500 mt-1 text-center">Defina objetivos estratégicos<br>de longo prazo.</span>
            </div>`;
        return;
    }

    container.innerHTML = missions.map(mission => {
        const isDone = mission.completed;
        return `
        <div class="relative group p-3 bg-[#151515] border-l-[3px] ${isDone ? 'border-l-blue-500 bg-blue-950/10' : 'border-l-gray-700 hover:border-l-white'} border-y border-r border-white/5 rounded-r-lg transition-all mb-3 hover:bg-[#1a1a1a]">
            <div class="flex justify-between items-start gap-3">
                <div class="flex-1 min-w-0">
                    <h4 class="text-xs font-bold ${isDone ? 'text-blue-400 line-through opacity-70' : 'text-white'} truncate">${mission.title}</h4>
                    <div class="flex items-center gap-2 mt-1.5">
                        <span class="text-[9px] text-gray-500 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded border border-white/5">
                            <i class="fa-regular fa-calendar text-[8px]"></i> ${mission.deadline || 'Sem data'}
                        </span>
                    </div>
                </div>
                
                <div class="flex gap-1 shrink-0">
                    <button onclick="window.completeMission('${mission.id}')" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white flex items-center justify-center text-gray-400 transition-all border border-white/5" title="${isDone ? 'Reabrir' : 'Concluir'}">
                        <i class="fa-solid ${isDone ? 'fa-rotate-left' : 'fa-check'} text-[10px]"></i>
                    </button>
                    <button onclick="window.deleteMission('${mission.id}')" class="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-600 hover:text-white flex items-center justify-center text-gray-400 transition-all border border-white/5" title="Remover">
                        <i class="fa-solid fa-xmark text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Inicialização com Fallback
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTactical);
} else {
    initTactical();
}