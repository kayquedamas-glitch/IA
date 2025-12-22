import { getRPGState } from './gamification.js'; // Importa dados reais

export function initCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendarGrid');
    const monthEl = document.getElementById('calendarMonth');
    if (!calendarEl) return;

    const date = new Date();
    const month = date.toLocaleString('default', { month: 'long' });
    const year = date.getFullYear();
    const day = date.getDate();
    
    if(monthEl) monthEl.innerText = `${month.toUpperCase()} ${year}`;

    // Lógica básica de dias
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

    // Pega dados do sistema (Missões e Hábitos)
    const state = getRPGState();
    const missions = state.missions || [];
    
    let html = '';

    // Dias vazios antes do dia 1
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="aspect-square"></div>`;
    }

    // Dias do mês
    for (let i = 1; i <= daysInMonth; i++) {
        const currentDateStr = `${year}-${String(date.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        
        // Verifica se é hoje
        const isToday = i === day;
        
        // Verifica missões neste dia
        const dayMissions = missions.filter(m => m.date === currentDateStr && !m.done);
        const hasMission = dayMissions.length > 0;
        
        // Estilo do dia
        let bgClass = isToday ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'bg-[#111] text-gray-400 hover:bg-[#222]';
        if (hasMission && !isToday) bgClass += ' border border-red-900/40 text-red-200';

        html += `
            <div onclick="window.openDayDetails('${currentDateStr}')" 
                 class="${bgClass} aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold cursor-pointer relative transition-all active:scale-95 group">
                ${i}
                ${hasMission ? `<div class="w-1 h-1 bg-red-500 rounded-full mt-1 animate-pulse"></div>` : ''}
            </div>
        `;
    }

    calendarEl.innerHTML = html;
}

// --- MODAL DE DETALHES DO DIA (Interatividade) ---
window.openDayDetails = (dateStr) => {
    const state = getRPGState();
    
    // Filtra o que tem pra fazer nesse dia
    const missionsForDay = (state.missions || []).filter(m => m.date === dateStr);
    const habits = state.habits || []; // Hábitos são diários (rituais)

    // Formata data
    const [y, m, d] = dateStr.split('-');
    const formattedDate = `${d}/${m}`;

    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 bg-black/95 backdrop-blur-sm z-[9999] flex items-center justify-center p-6 animate-fade-in';
    
    // HTML do Modal
    overlay.innerHTML = `
        <div class="bg-[#0a0a0a] border border-[#333] w-full max-w-md rounded-2xl p-6 relative shadow-2xl">
            <button id="closeDay" class="absolute top-4 right-4 text-gray-500 hover:text-white"><i class="fa-solid fa-xmark"></i></button>
            
            <div class="flex items-center gap-3 mb-6">
                <div class="bg-red-900/20 p-3 rounded-lg border border-red-900/30">
                    <i class="fa-regular fa-calendar text-red-500"></i>
                </div>
                <div>
                    <h3 class="text-white font-bold text-lg">LOG DO DIA ${formattedDate}</h3>
                    <p class="text-xs text-gray-500 uppercase">Planeamento Tático</p>
                </div>
            </div>

            <div class="mb-6">
                <h4 class="text-xs text-gray-400 font-bold uppercase mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-repeat"></i> Rituais Diários
                </h4>
                <div class="space-y-2">
                    ${habits.length ? habits.map(h => `
                        <div class="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5">
                            <span class="text-sm text-gray-300">${h.text}</span>
                            <i class="fa-solid fa-circle text-[6px] ${h.done ? 'text-green-500' : 'text-gray-600'}"></i>
                        </div>
                    `).join('') : '<p class="text-gray-600 text-xs italic">Nenhum ritual definido.</p>'}
                </div>
            </div>

            <div>
                <h4 class="text-xs text-gray-400 font-bold uppercase mb-3 flex items-center gap-2">
                    <i class="fa-solid fa-crosshairs"></i> Missões Agendadas
                </h4>
                <div class="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                    ${missionsForDay.length ? missionsForDay.map(m => `
                        <div class="flex items-center gap-3 p-3 bg-red-900/10 rounded-lg border border-red-900/20">
                            <div class="w-4 h-4 rounded-full border border-red-500/50 flex items-center justify-center">
                                ${m.done ? '<i class="fa-solid fa-check text-[8px] text-red-500"></i>' : ''}
                            </div>
                            <span class="text-sm ${m.done ? 'text-gray-500 line-through' : 'text-white'}">${m.text}</span>
                        </div>
                    `).join('') : '<p class="text-gray-600 text-xs italic">Nada agendado para este dia.</p>'}
                </div>
            </div>

            <button onclick="document.getElementById('newMissionDate').value='${dateStr}'; document.getElementById('closeDay').click(); window.switchTab('protocolo');" 
                class="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest rounded-lg transition border border-white/10">
                + Adicionar Missão nesta Data
            </button>
        </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('closeDay').onclick = () => overlay.remove();
};