// PRO/js/modules/tactical.js

export const Tactical = {
    state: {
        selectedDate: new Date().toISOString().split('T')[0],
        rituals: [
            { id: 'rit_1', title: 'Leitura Estratégica', xp: 10, icon: 'fa-book', active: true },
            { id: 'rit_2', title: 'Treino Físico', xp: 50, icon: 'fa-dumbbell', active: true },
            { id: 'rit_3', title: 'Deep Work (4h)', xp: 100, icon: 'fa-brain', active: true }
        ],
        missions: []
    },

    init: () => {
        console.log("⚔️ Módulo Tático: Armado e Pronto.");
        Tactical.loadData();
        Tactical.renderCalendarStrip();
        Tactical.renderRituals();
        Tactical.renderMissions(); 
        setInterval(Tactical.renderCalendarStrip, 60000);
    },

    loadData: () => {
        const savedRituals = localStorage.getItem('synapse_rituals_config');
        if (savedRituals) Tactical.state.rituals = JSON.parse(savedRituals);
        
        const savedMissions = localStorage.getItem('synapse_missions_data');
        if (savedMissions) Tactical.state.missions = JSON.parse(savedMissions);
    },

    saveRituals: () => {
        localStorage.setItem('synapse_rituals_config', JSON.stringify(Tactical.state.rituals));
        Tactical.renderRituals();
    },

    saveMissions: () => {
        localStorage.setItem('synapse_missions_data', JSON.stringify(Tactical.state.missions));
        Tactical.renderMissions();
    },

    // --- CALENDÁRIO ---
    renderCalendarStrip: () => {
        const strip = document.getElementById('calendarStrip'); // Tenta achar o novo (strip)
        const grid = document.getElementById('calendarGrid');   // Tenta achar o velho (grid)

        // Se tiver o Grid antigo (na sidebar ou view), renderiza simples
        if(grid) {
            grid.innerHTML = '';
            // Lógica simples para preencher o grid antigo com dias
            const today = new Date();
            for(let i=0; i<35; i++) { // Renderiza um mês genérico visual
                const d = document.createElement('div');
                d.className = "text-center py-1 rounded hover:bg-white/10 cursor-pointer " + (i === today.getDate() ? "bg-red-600 text-white" : "text-gray-500");
                d.innerText = i+1 > 31 ? "" : i+1;
                grid.appendChild(d);
            }
            // Atualiza Título
            const title = document.getElementById('calMonthYear');
            if(title) title.innerText = today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
        }

        // Se tiver o Strip novo (no Tático)
        if(strip) {
            strip.innerHTML = '';
            const today = new Date();
            for (let i = -2; i <= 4; i++) {
                const d = new Date();
                d.setDate(today.getDate() + i);
                const dateStr = d.toISOString().split('T')[0];
                const isToday = i === 0;
                const isSelected = dateStr === Tactical.state.selectedDate;
                const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                const dayNum = d.getDate();

                const el = document.createElement('div');
                let classes = isSelected 
                    ? "bg-red-600 border-red-500 text-white transform scale-110 shadow-[0_0_15px_rgba(220,38,38,0.4)]" 
                    : "bg-[#111] border-gray-800 text-gray-500 hover:border-gray-600 opacity-60 hover:opacity-100";
                
                el.className = `flex flex-col items-center justify-center w-14 h-20 rounded-2xl border transition-all cursor-pointer flex-shrink-0 ${classes}`;
                el.onclick = () => {
                    Tactical.state.selectedDate = dateStr;
                    Tactical.renderCalendarStrip();
                    Tactical.renderRituals();
                };

                el.innerHTML = `
                    <span class="text-[9px] font-bold uppercase mb-1 ${isSelected ? 'text-red-200' : ''}">${isToday ? 'HOJE' : dayName}</span>
                    <span class="text-xl font-black ${isSelected ? 'text-white' : ''}">${dayNum}</span>
                    ${isToday ? '<div class="w-1 h-1 bg-white rounded-full mt-1"></div>' : ''}
                `;
                strip.appendChild(el);
            }
        }
    },

    // --- RITUAIS ---
    renderRituals: () => {
        // Tenta renderizar na lista da View Tática (nova) ou da Sidebar (velha)
        const targets = ['dailyRitualsList', 'habitList'];
        
        targets.forEach(targetId => {
            const list = document.getElementById(targetId);
            if (!list) return;

            list.innerHTML = '';
            const history = JSON.parse(localStorage.getItem('synapse_tactical_history') || '{}');
            const dayData = history[Tactical.state.selectedDate] || [];

            Tactical.state.rituals.forEach(ritual => {
                const isDone = dayData.includes(ritual.id);
                
                // Layout diferente dependendo de onde está (Sidebar vs Tela cheia)
                const isSidebar = targetId === 'habitList';
                
                const el = document.createElement('div');
                if(isSidebar) {
                    // Layout Compacto para Sidebar
                    el.className = `flex items-center justify-between p-2 rounded cursor-pointer ${isDone ? 'bg-green-900/20' : 'hover:bg-white/5'}`;
                    el.onclick = () => window.Tactical.toggleRitual(ritual.id);
                    el.innerHTML = `
                        <span class="text-xs ${isDone ? 'text-gray-500 line-through' : 'text-gray-300'}">${ritual.title}</span>
                        <i class="fa-solid ${isDone ? 'fa-check text-green-500' : 'fa-circle text-gray-700'} text-[10px]"></i>
                    `;
                } else {
                    // Layout Completo para View Tática
                    el.className = `flex items-center gap-4 border p-4 rounded-xl cursor-pointer transition-all group ${isDone ? 'bg-red-900/10 border-red-900/50' : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600'}`;
                    el.onclick = () => window.Tactical.toggleRitual(ritual.id);
                    el.innerHTML = `
                        <div class="relative">
                            <div class="w-6 h-6 border-2 rounded ${isDone ? 'bg-red-600 border-red-600' : 'border-gray-600'}"></div>
                            ${isDone ? '<i class="fa-solid fa-check text-white text-xs absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></i>' : ''}
                        </div>
                        <div class="flex-1 ${isDone ? 'opacity-50' : ''}">
                            <p class="text-sm font-bold ${isDone ? 'text-red-400 line-through' : 'text-gray-300 group-hover:text-white'} transition-colors">${ritual.title}</p>
                            <span class="text-[10px] font-mono ${isDone ? 'text-red-600' : 'text-gray-500'}">+${ritual.xp} XP</span>
                        </div>
                        <i class="fa-solid ${ritual.icon} ${isDone ? 'text-red-500' : 'text-gray-700'} text-lg"></i>
                    `;
                }
                list.appendChild(el);
            });
        });
    },

    toggleRitual: (id) => {
        const date = Tactical.state.selectedDate;
        const history = JSON.parse(localStorage.getItem('synapse_tactical_history') || '{}');
        if (!history[date]) history[date] = [];

        if (history[date].includes(id)) {
            history[date] = history[date].filter(itemId => itemId !== id);
        } else {
            history[date].push(id);
            const ritual = Tactical.state.rituals.find(r => r.id === id);
            if(window.playSFX) window.playSFX('success');
            if(window.addXP) window.addXP(ritual.xp);
        }
        localStorage.setItem('synapse_tactical_history', JSON.stringify(history));
        Tactical.renderRituals();
    },

    // --- FUNÇÃO PARA ADICIONAR RITUAL (RESOLVE O SEU ERRO) ---
    openAddRitualModal: () => {
        const title = prompt("Nome do novo ritual:");
        if(!title) return;
        const xp = prompt("XP por conclusão:", "10");
        
        const newRitual = {
            id: 'rit_' + Date.now(),
            title: title,
            xp: parseInt(xp) || 10,
            icon: 'fa-check-circle',
            active: true
        };
        
        Tactical.state.rituals.push(newRitual);
        Tactical.saveRituals();
    },

    // --- MISSÕES ---
    renderMissions: () => {
        const container = document.getElementById('activeMissionsList');
        if (!container) return;
        container.innerHTML = '';

        if (Tactical.state.missions.length === 0) {
            container.innerHTML = `<div class="text-center p-6 text-gray-600 text-xs uppercase tracking-widest border border-dashed border-gray-800 rounded-xl">Sem operações.</div>`;
            return;
        }

        Tactical.state.missions.forEach((mission, index) => {
            const today = new Date();
            const deadline = new Date(mission.deadline);
            const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24)); 
            const isLate = diffDays < 0;
            const statusText = isLate ? "ATRASADO" : `${diffDays} DIAS`;
            const statusColor = isLate ? "text-red-500" : "text-gray-500";

            const el = document.createElement('div');
            el.className = "bg-[#111] rounded-xl p-4 border border-gray-800 relative overflow-hidden group hover:border-gray-600 transition-all";
            
            el.innerHTML = `
                <div class="flex justify-between items-start mb-2 relative z-10">
                    <span class="text-[9px] bg-yellow-900/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-900/30 uppercase tracking-widest">${mission.category}</span>
                    <button onclick="window.Tactical.deleteMission(${index})" class="text-gray-700 hover:text-red-500 transition-colors"><i class="fa-solid fa-trash text-xs"></i></button>
                </div>
                <div class="flex justify-between items-end mb-1 relative z-10">
                    <h4 class="text-white font-bold">${mission.title}</h4>
                    <span class="text-[9px] font-mono ${statusColor} font-bold uppercase">${statusText}</span>
                </div>
                <div class="flex items-center gap-2 relative z-10 cursor-pointer" onclick="window.Tactical.addMissionProgress(${index})">
                    <div class="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                        <div class="h-full bg-yellow-600 transition-all duration-500 relative" style="width: ${mission.progress}%"></div>
                    </div>
                    <span class="text-[10px] text-gray-400 font-mono w-8 text-right">${mission.progress}%</span>
                </div>
            `;
            container.appendChild(el);
        });
    },

    addMissionProgress: (index) => {
        const mission = Tactical.state.missions[index];
        if (mission.progress < 100) {
            mission.progress = Math.min(100, mission.progress + 10);
            if (mission.progress === 100 && window.addXP) window.addXP(500); 
            Tactical.saveMissions();
        }
    },

    deleteMission: (index) => {
        if(confirm("Abortar missão?")) {
            Tactical.state.missions.splice(index, 1);
            Tactical.saveMissions();
        }
    },

    openNewMissionModal: () => {
        const title = prompt("Nome da Missão:");
        if (!title) return;
        const days = prompt("Prazo (dias):", "30");
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + parseInt(days || 30));

        Tactical.state.missions.push({
            title: title,
            category: "Geral",
            deadline: deadline.toISOString(),
            progress: 0
        });
        Tactical.saveMissions();
    }
};

// --- CRUCIAL: REFAR A FUNÇÃO ANTIGA PARA O BOTÃO FUNCIONAR ---
window.openAddHabitModal = function() {
    // Redireciona para a nova função
    Tactical.openAddRitualModal();
};

window.Tactical = Tactical;