// PRO/js/modules/tactical.js

export function initTactical() {
    console.log("⚔️ Módulo Tático: Inicializando (Vertical Timeline)...");
    
    if (!window.AppEstado) {
        window.AppEstado = { 
            gamification: { habits: [], missions: [] } 
        };
    }

    window.initTacticalModule = renderTacticalView; 
    setupGlobalActions();
    renderTacticalView();
}

// --- UTILITÁRIOS ---
function getTodayDate() {
    return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
}

function getLastDays(count) {
    const dates = [];
    for (let i = 0; i < count; i++) { // Ordem: Hoje (0) até Passado (count)
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
    }
    return dates; // [ "Hoje", "Ontem", "Anteontem"... ]
}

function formatDateDay(dateString) {
    // Retorna apenas o dia (ex: 25)
    return dateString.split('-')[2];
}

function getWeekDay(dateString) {
    // Retorna dia da semana (S, T, Q...)
    const d = new Date(dateString + 'T12:00:00'); // Compensar fuso
    const days = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
    return days[d.getDay()];
}

// --- VERIFICAÇÃO DE LIMITES ---
function checkLimit(type) {
    const isFree = window.IS_DEMO || (window.AppEstado?.user?.status === 'free') || (localStorage.getItem('synapse_user')?.includes('"status":"free"'));
    
    if (isFree) {
        const habits = window.AppEstado.gamification?.habits || window.AppEstado.habits || [];
        const missions = window.AppEstado.gamification?.missions || window.AppEstado.missions || [];
        
        const limit = 3;
        const current = type === 'habit' ? habits.length : missions.length;
        
        if (current >= limit) {
            if (window.showDemoModal) window.showDemoModal(type === 'habit' ? 'Rituais' : 'Missões');
            else alert(`⚠️ VERSÃO FREE\n\nLimite de ${limit} atingido.`);
            return false;
        }
    }
    return true;
}

// --- AÇÕES GLOBAIS ---
function setupGlobalActions() {
    
    const getArrays = () => {
        if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
        let habits = window.AppEstado.gamification.habits || window.AppEstado.habits || [];
        let missions = window.AppEstado.gamification.missions || window.AppEstado.missions || [];
        return { habits, missions };
    };

    const saveChanges = (newHabits, newMissions) => {
        if (window.AppEstado.gamification) {
            if (newHabits) window.AppEstado.gamification.habits = newHabits;
            if (newMissions) window.AppEstado.gamification.missions = newMissions;
        }
        if (newHabits) window.AppEstado.habits = newHabits;
        if (newMissions) window.AppEstado.missions = newMissions;

        if (window.Database && window.Database.forceSave) window.Database.forceSave();
        else localStorage.setItem('synapse_data_backup', JSON.stringify(window.AppEstado));

        renderTacticalView();
        if (window.renderDashboard) window.renderDashboard();
    };

    window.toggleHabitDate = (id, dateString) => {
        const { habits } = getArrays();
        const habit = habits.find(h => h.id === id);
        
        if (habit) {
            if (!habit.history) habit.history = [];
            const index = habit.history.indexOf(dateString);
            
            if (index > -1) habit.history.splice(index, 1);
            else {
                habit.history.push(dateString);
                if(window.playSFX) window.playSFX('click');
            }
            // Atualiza status de hoje para compatibilidade
            habit.completed = habit.history.includes(getTodayDate());
            saveChanges(habits, null);
        }
    };

    window.deleteHabit = (id) => {
        if(!confirm("Remover este ritual?")) return;
        const { habits } = getArrays();
        const newHabits = habits.filter(h => h.id !== id);
        saveChanges(newHabits, null);
    };

    window.completeMission = (id) => {
        const { missions } = getArrays();
        const mission = missions.find(m => m.id === id);
        if (mission) {
            mission.completed = !mission.completed;
            saveChanges(null, missions);
        }
    };

    window.deleteMission = (id) => {
        if(!confirm("Abortar missão?")) return;
        const { missions } = getArrays();
        const newMissions = missions.filter(m => m.id !== id);
        saveChanges(null, newMissions);
    };

    window.openAddHabitModal = () => {
        if (!checkLimit('habit')) return;
        const title = prompt("Nome do novo Ritual:");
        if (title && title.trim()) {
            const { habits } = getArrays();
            habits.push({
                id: crypto.randomUUID(),
                title: title.trim(),
                completed: false,
                history: [],
                frequency: 'Diário'
            });
            saveChanges(habits, null);
        }
    };

    window.addNewMission = () => {
        if (!checkLimit('mission')) return;
        const input = document.getElementById('newMissionInputTactical') || document.getElementById('newMissionInput');
        const dateInput = document.getElementById('newMissionDateTactical') || document.getElementById('newMissionDate');
        
        if (input && input.value.trim()) {
            const { missions } = getArrays();
            missions.push({
                id: crypto.randomUUID(),
                title: input.value.trim(),
                deadline: dateInput?.value || getTodayDate(),
                completed: false
            });
            input.value = ''; 
            saveChanges(null, missions);
        }
    };
}

// --- RENDERIZAÇÃO ---

function renderTacticalView() {
    let habits = window.AppEstado?.gamification?.habits || window.AppEstado?.habits || [];
    let missions = window.AppEstado?.gamification?.missions || window.AppEstado?.missions || [];

    const habitContainer = document.getElementById('habitListTactical');
    const missionContainer = document.getElementById('missionListTactical');

    if (habitContainer) renderHabitListInContainer(habitContainer, habits);
    if (missionContainer) renderMissionListInContainer(missionContainer, missions);
}

function renderHabitListInContainer(container, habits) {
    if (!habits || habits.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full min-h-[100px] border-2 border-dashed border-white/5 rounded-lg p-4 select-none opacity-50">
                <i class="fa-solid fa-list-check text-xl text-gray-400 mb-2"></i>
                <span class="text-[10px] text-gray-500 text-center">Nenhum ritual ativo</span>
            </div>`;
        return;
    }

    // Mostra os últimos 5 dias na vertical (para caber bem na tela)
    const displayDays = getLastDays(5); 

    container.innerHTML = habits.map(habit => {
        const history = habit.history || [];
        
        // Gera as bolinhas VERTICAIS
        const dotsHTML = displayDays.map((dayDate, index) => {
            const isDone = history.includes(dayDate);
            const isToday = index === 0; // O primeiro do array é Hoje
            
            // Lógica de Opacidade: Hoje = 100%, Ontem = 80%, etc.
            const opacity = Math.max(0.3, 1 - (index * 0.15));
            
            // Estilos
            let dotClass = isDone 
                ? 'bg-green-500 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' 
                : 'bg-[#0a0a0a] border-white/10 hover:border-white/40';
            
            if (isToday) dotClass += ' w-5 h-5 ring-2 ring-white/20 z-10'; // Hoje é maior
            else dotClass += ' w-3 h-3'; // Passado é menor

            return `
                <div class="relative flex items-center justify-end w-full group/dot" 
                     style="opacity: ${opacity}">
                    
                    <span class="mr-3 text-[9px] font-mono text-gray-500 ${isToday ? 'opacity-100 text-green-400 font-bold' : 'opacity-0 group-hover/dot:opacity-100'} transition-opacity">
                        ${getWeekDay(dayDate)} ${formatDateDay(dayDate)}
                    </span>

                    ${index !== displayDays.length - 1 ? 
                        `<div class="absolute right-[calc(50%-1px)] top-full w-[2px] h-4 bg-white/5 -z-0"></div>` 
                        : ''}

                    <div class="rounded-full border transition-all duration-300 cursor-pointer ${dotClass} relative z-10"
                         onclick="event.stopPropagation(); window.toggleHabitDate('${habit.id}', '${dayDate}')"
                         title="${dayDate}">
                         
                         ${isDone ? '<i class="fa-solid fa-check text-[8px] text-black absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>' : ''}
                    </div>
                </div>
            `;
        }).join(''); // Junta as bolinhas (sem reverse, pois getLastDays já vem na ordem Hoje -> Passado)

        return `
        <div class="group relative flex items-stretch justify-between p-0 bg-[#121212] border border-white/5 rounded-2xl overflow-hidden mb-4 shadow-lg min-h-[140px]">
            
            <div class="flex-1 p-5 flex flex-col justify-center border-r border-white/5 bg-gradient-to-r from-transparent to-black/20">
                <div class="mb-2">
                    <span class="text-[9px] text-blue-500 font-bold uppercase tracking-widest mb-1 block">Protocolo</span>
                    <h3 class="text-xl font-black text-white leading-tight">${habit.title}</h3>
                </div>
                <div class="mt-auto flex items-center gap-3">
                     <span class="text-[8px] text-gray-600 bg-white/5 px-2 py-1 rounded border border-white/5 uppercase">
                        ${habit.frequency || 'Diário'}
                     </span>
                     <button onclick="window.deleteHabit('${habit.id}')" class="text-gray-600 hover:text-red-500 transition-colors">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                </div>
            </div>

            <div class="w-16 bg-[#050505] flex flex-col items-center justify-center gap-3 py-4 px-1 relative">
                <div class="absolute top-4 bottom-4 right-[19px] w-[1px] bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
                
                ${dotsHTML}
            </div>
        </div>
        `;
    }).join('');
}

function renderMissionListInContainer(container, missions) {
    if (!missions || missions.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-full min-h-[100px] border-2 border-dashed border-white/5 rounded-lg p-4 select-none opacity-50">
                <i class="fa-solid fa-crosshairs text-xl text-gray-400 mb-2"></i>
                <span class="text-[10px] text-gray-500 text-center">Sem missões ativas</span>
            </div>`;
        return;
    }

    container.innerHTML = missions.map(mission => {
        const isDone = mission.completed;
        return `
        <div class="relative group p-4 bg-[#151515] border-l-[4px] ${isDone ? 'border-l-blue-500 bg-blue-950/10' : 'border-l-gray-700 hover:border-l-white'} border-y border-r border-white/5 rounded-r-xl transition-all mb-3 hover:bg-[#1a1a1a]">
            <div class="flex justify-between items-start gap-3">
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-bold ${isDone ? 'text-blue-400 line-through opacity-70' : 'text-white'} truncate">${mission.title}</h4>
                    <div class="flex items-center gap-2 mt-2">
                        <span class="text-[9px] text-gray-500 flex items-center gap-1 bg-black/40 px-2 py-1 rounded border border-white/5 font-mono">
                            <i class="fa-regular fa-calendar text-[8px]"></i> ${mission.deadline || 'Hoje'}
                        </span>
                    </div>
                </div>
                
                <div class="flex flex-col gap-2 shrink-0">
                    <button onclick="window.completeMission('${mission.id}')" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-blue-600 hover:text-white flex items-center justify-center text-gray-400 transition-all border border-white/5 shadow-lg" title="${isDone ? 'Reabrir' : 'Concluir'}">
                        <i class="fa-solid ${isDone ? 'fa-rotate-left' : 'fa-check'} text-xs"></i>
                    </button>
                    <button onclick="window.deleteMission('${mission.id}')" class="w-8 h-8 rounded-lg bg-white/5 hover:bg-red-600 hover:text-white flex items-center justify-center text-gray-400 transition-all border border-white/5" title="Remover">
                        <i class="fa-solid fa-xmark text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
        `;
    }).join('');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTactical);
} else {
    setTimeout(initTactical, 100);
}