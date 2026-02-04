// PRO/js/modules/tactical.js

export function initTactical() {
    console.log("⚔️ Módulo Tático Iniciado");
    
    // Tenta carregar dados salvos ao iniciar
    loadData();

    // Expõe a função de renderização globalmente
    window.initTacticalModule = renderTacticalView; 
    
    // --- FUNÇÕES DE AÇÃO ---
    
    window.toggleHabit = (id) => {
        const habits = window.AppEstado?.habits || [];
        const habit = habits.find(h => h.id === id);
        if (habit) {
            habit.completed = !habit.completed;
            updateStateAndRender();
        }
    };

    window.deleteHabit = (id) => {
        if(!confirm("Remover este ritual?")) return;
        if (window.AppEstado?.habits) {
            window.AppEstado.habits = window.AppEstado.habits.filter(h => h.id !== id);
            updateStateAndRender();
        }
    };

    window.completeMission = (id) => {
        const missions = window.AppEstado?.missions || [];
        const mission = missions.find(m => m.id === id);
        if (mission) {
            mission.completed = !mission.completed;
            updateStateAndRender();
        }
    };

    window.deleteMission = (id) => {
        if(!confirm("Abortar missão?")) return;
        if (window.AppEstado?.missions) {
            window.AppEstado.missions = window.AppEstado.missions.filter(m => m.id !== id);
            updateStateAndRender();
        }
    };

    window.openAddHabitModal = () => {
        const title = prompt("Nome do novo Ritual:");
        if (title) {
            const newHabit = {
                id: crypto.randomUUID(),
                title: title,
                completed: false,
                frequency: 'Diário'
            };
            if (!window.AppEstado) window.AppEstado = { habits: [], missions: [] };
            if (!window.AppEstado.habits) window.AppEstado.habits = [];
            
            window.AppEstado.habits.push(newHabit);
            updateStateAndRender();
        }
    };

    window.addNewMission = () => {
        // Tenta pegar de qualquer um dos inputs (Jornada ou Tático)
        const input = document.getElementById('newMissionInputTactical') || document.getElementById('newMissionInput');
        const dateInput = document.getElementById('newMissionDateTactical') || document.getElementById('newMissionDate');
        
        if (input && input.value.trim()) {
            const newMission = {
                id: crypto.randomUUID(),
                title: input.value,
                deadline: dateInput?.value || 'Sem data',
                completed: false
            };
            
            if (!window.AppEstado) window.AppEstado = { habits: [], missions: [] };
            if (!window.AppEstado.missions) window.AppEstado.missions = [];
            
            window.AppEstado.missions.push(newMission);
            
            input.value = ''; // Limpa o input
            updateStateAndRender();
        }
    };

    // Renderiza inicial
    renderTacticalView();
}

// --- PERSISTÊNCIA DE DADOS ---
function saveData() {
    if(window.AppEstado) {
        localStorage.setItem('synapse_data', JSON.stringify(window.AppEstado));
    }
}

function loadData() {
    const saved = localStorage.getItem('synapse_data');
    if (saved) {
        const data = JSON.parse(saved);
        // Mescla com o estado atual se existir, ou cria novo
        window.AppEstado = { 
            habits: data.habits || [], 
            missions: data.missions || [] 
        };
    } else {
        // Estado inicial vazio se não houver nada salvo
        if (!window.AppEstado) window.AppEstado = { habits: [], missions: [] };
    }
}

function updateStateAndRender() {
    saveData(); // Salva no LocalStorage
    renderTacticalView(); // Atualiza a tela
}

function renderTacticalView() {
    // Garante que o estado existe
    if (!window.AppEstado) loadData();
    
    const habits = window.AppEstado.habits || [];
    const missions = window.AppEstado.missions || [];

    // SELETORES: Busca as listas da Jornada (IDs antigos) e do Tático (IDs novos)
    const habitContainers = [
        document.getElementById('habitList'), 
        document.getElementById('habitListTactical')
    ].filter(el => el); // Remove nulos

    const missionContainers = [
        document.getElementById('missionList'),
        document.getElementById('missionListTactical')
    ].filter(el => el);

    // Atualiza todas as listas encontradas na tela
    habitContainers.forEach(container => renderHabitListInContainer(container, habits));
    missionContainers.forEach(container => renderMissionListInContainer(container, missions));
}

// --- RENDERIZADORES ---

function renderHabitListInContainer(container, habits) {
    if (habits.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-gray-600 opacity-50">
                <i class="fa-solid fa-clipboard-check text-4xl mb-2"></i>
                <span class="text-[10px] uppercase tracking-widest">Sem protocolos</span>
            </div>`;
        return;
    }

    container.innerHTML = habits.map(habit => {
        const isDone = habit.completed;
        return `
        <div class="group relative flex items-center gap-3 p-3 bg-[#111] border ${isDone ? 'border-green-900/50 bg-green-900/10' : 'border-white/5 hover:border-white/20'} rounded-lg transition-all duration-300">
            <button onclick="window.toggleHabit('${habit.id}')" 
                class="w-6 h-6 flex items-center justify-center rounded border ${isDone ? 'bg-green-500 border-green-500 text-black' : 'border-gray-600 hover:border-white text-transparent'} transition-all shrink-0">
                <i class="fa-solid fa-check text-xs ${isDone ? 'scale-100' : 'scale-0'} transition-transform"></i>
            </button>
            
            <div class="flex-1 flex flex-col min-w-0">
                <span class="text-xs font-bold ${isDone ? 'text-green-500 line-through opacity-50' : 'text-gray-200'} transition-all truncate">
                    ${habit.title}
                </span>
                <span class="text-[9px] text-gray-600 uppercase tracking-wider">${habit.frequency || 'Diário'}</span>
            </div>

            <button onclick="window.deleteHabit('${habit.id}')" class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition-all px-2 shrink-0">
                <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
        </div>
        `;
    }).join('');
}

function renderMissionListInContainer(container, missions) {
    if (missions.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-40 text-gray-600 opacity-50">
                <i class="fa-solid fa-crosshairs text-4xl mb-2"></i>
                <span class="text-[10px] uppercase tracking-widest">Sem missões</span>
            </div>`;
        return;
    }

    container.innerHTML = missions.map(mission => {
        const isDone = mission.completed;
        return `
        <div class="relative group p-4 bg-[#111] border-l-2 ${isDone ? 'border-l-blue-500 bg-blue-900/10' : 'border-l-gray-600 hover:border-l-white'} border-y border-r border-white/5 rounded-r-lg transition-all mb-2">
            <div class="flex justify-between items-start gap-3">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold ${isDone ? 'text-blue-400 line-through' : 'text-white'} truncate">${mission.title}</h4>
                    <p class="text-[10px] text-gray-500 mt-1 flex items-center gap-2">
                        <i class="fa-regular fa-calendar"></i> ${mission.deadline || 'Sem prazo'}
                    </p>
                </div>
                
                <div class="flex gap-2 shrink-0">
                    <button onclick="window.completeMission('${mission.id}')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-blue-500 hover:text-white flex items-center justify-center text-gray-400 transition-all">
                        <i class="fa-solid fa-check text-xs"></i>
                    </button>
                    <button onclick="window.deleteMission('${mission.id}')" class="w-8 h-8 rounded-full bg-white/5 hover:bg-red-500 hover:text-white flex items-center justify-center text-gray-400 transition-all">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

// Inicializa
document.addEventListener('DOMContentLoaded', initTactical);