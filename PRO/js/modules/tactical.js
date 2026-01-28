// PRO/js/modules/tactical.js

export const Tactical = {
    state: {
        selectedDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
        rituals: [
            { id: 'rit_1', title: 'Leitura Estratégica', xp: 10, icon: 'fa-book', active: true },
            { id: 'rit_2', title: 'Treino Físico', xp: 50, icon: 'fa-dumbbell', active: true },
            { id: 'rit_3', title: 'Deep Work (4h)', xp: 100, icon: 'fa-brain', active: true }
        ],
        missions: [] // Lista de Missões
    },

    init: () => {
        console.log("⚔️ Módulo Tático: Armado e Pronto.");
        Tactical.loadData();
        
        // Renderizações Iniciais
        Tactical.renderCalendarStrip();
        Tactical.renderRituals();
        Tactical.renderMissions(); // <--- NOVO
        
        // Loop de atualização do calendário
        setInterval(Tactical.renderCalendarStrip, 60000);
    },

    loadData: () => {
        // Carrega Rituais
        const savedRituals = localStorage.getItem('synapse_rituals_config');
        if (savedRituals) Tactical.state.rituals = JSON.parse(savedRituals);

        // Carrega Missões (NOVO)
        const savedMissions = localStorage.getItem('synapse_missions_data');
        if (savedMissions) Tactical.state.missions = JSON.parse(savedMissions);
    },

    saveMissions: () => {
        localStorage.setItem('synapse_missions_data', JSON.stringify(Tactical.state.missions));
        Tactical.renderMissions();
    },

    // --- 1. MOTOR DO CALENDÁRIO ---
    renderCalendarStrip: () => {
        const strip = document.getElementById('calendarStrip');
        if (!strip) return;

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
    },

    // --- 2. MOTOR DE RITUAIS ---
    renderRituals: () => {
        const list = document.getElementById('dailyRitualsList');
        if (!list) return;

        list.innerHTML = '';
        const history = JSON.parse(localStorage.getItem('synapse_tactical_history') || '{}');
        const dayData = history[Tactical.state.selectedDate] || [];

        Tactical.state.rituals.forEach(ritual => {
            const isDone = dayData.includes(ritual.id);
            
            const label = document.createElement('label');
            label.className = `flex items-center gap-4 border p-4 rounded-xl cursor-pointer transition-all group ${isDone ? 'bg-red-900/10 border-red-900/50' : 'bg-[#0a0a0a] border-gray-800 hover:border-gray-600'}`;
            
            label.innerHTML = `
                <div class="relative">
                    <input type="checkbox" class="peer appearance-none w-6 h-6 border-2 rounded transition-colors ${isDone ? 'bg-red-600 border-red-600' : 'border-gray-600'}"
                        onchange="window.Tactical.toggleRitual('${ritual.id}')" ${isDone ? 'checked' : ''}>
                    <i class="fa-solid fa-check text-white text-xs absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 peer-checked:opacity-100 pointer-events-none"></i>
                </div>
                <div class="flex-1 ${isDone ? 'opacity-50' : ''}">
                    <p class="text-sm font-bold ${isDone ? 'text-red-400 line-through' : 'text-gray-300 group-hover:text-white'} transition-colors">${ritual.title}</p>
                    <span class="text-[10px] font-mono ${isDone ? 'text-red-600' : 'text-gray-500'}">+${ritual.xp} XP</span>
                </div>
                <i class="fa-solid ${ritual.icon} ${isDone ? 'text-red-500' : 'text-gray-700'} text-lg"></i>
            `;
            list.appendChild(label);
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

    // --- 3. MOTOR DE MISSÕES (NOVO) ---
    renderMissions: () => {
        // Precisamos encontrar o container no HTML. 
        // Como o HTML original tinha "space-y-4", vamos assumir que o ID é "missionsListContainer" 
        // ou vamos injetar no último div da section se não tiver ID.
        // O ideal é adicionar um ID no HTML. Vamos assumir que você adicionará id="activeMissionsList".
        
        let container = document.getElementById('activeMissionsList');
        
        // Fallback: Tenta achar pela classe se não tiver ID (para facilitar sua vida)
        if (!container) {
            const sections = document.querySelectorAll('#view-tactical .space-y-4');
            if(sections.length > 0) container = sections[sections.length - 1]; 
        }

        if (!container) return;
        container.innerHTML = '';

        if (Tactical.state.missions.length === 0) {
            container.innerHTML = `<div class="text-center p-6 text-gray-600 text-xs uppercase tracking-widest border border-dashed border-gray-800 rounded-xl">Nenhuma operação ativa.</div>`;
            return;
        }

        Tactical.state.missions.forEach((mission, index) => {
            // Cálculo de dias restantes
            const today = new Date();
            const deadline = new Date(mission.deadline);
            const diffTime = deadline - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
            
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
                
                <div class="flex items-center gap-2 relative z-10 cursor-pointer" title="Clique para evoluir +10%" onclick="window.Tactical.addMissionProgress(${index})">
                    <div class="flex-1 h-2 bg-gray-900 rounded-full overflow-hidden border border-gray-800">
                        <div class="h-full bg-yellow-600 transition-all duration-500 relative" style="width: ${mission.progress}%">
                            <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                        </div>
                    </div>
                    <span class="text-[10px] text-gray-400 font-mono w-8 text-right">${mission.progress}%</span>
                </div>
                
                <i class="fa-solid fa-rocket absolute -bottom-2 -right-2 text-6xl text-gray-800/20 z-0 group-hover:scale-110 transition-transform duration-700"></i>
            `;
            container.appendChild(el);
        });
    },

    addMissionProgress: (index) => {
        const mission = Tactical.state.missions[index];
        if (mission.progress < 100) {
            mission.progress = Math.min(100, mission.progress + 10); // Aumenta 10% por clique
            
            if (mission.progress === 100) {
                if(window.playSFX) window.playSFX('success');
                // Aqui você pode dar uma recompensa de XP gigante
                if(window.addXP) window.addXP(500); 
                // Opcional: Arquivar missão automaticamente ou deixar visualmente completa
            }
            
            Tactical.saveMissions();
        }
    },

    deleteMission: (index) => {
        if(confirm("Abortar missão?")) {
            Tactical.state.missions.splice(index, 1);
            Tactical.saveMissions();
        }
    },

    // Função chamada pelo botão "NOVA MISSÃO"
    openNewMissionModal: () => {
        // Por simplicidade, usaremos Prompt por enquanto. 
        // No futuro podemos fazer um modal HTML bonito.
        const title = prompt("Nome da Missão / Objetivo:");
        if (!title) return;

        const category = prompt("Categoria (ex: Financeiro, Saúde, Estudo):", "Geral");
        const days = prompt("Prazo em dias (ex: 30):", "30");
        
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + parseInt(days || 30));

        const newMission = {
            title: title,
            category: category || "Geral",
            deadline: deadline.toISOString(),
            progress: 0
        };

        Tactical.state.missions.push(newMission);
        Tactical.saveMissions();
    }
};

window.Tactical = Tactical;