import { getRPGState } from './gamification.js';

// Estado local do calendário (para navegação)
let displayDate = new Date();

export function initCalendar() {
    // Expõe a função de navegação globalmente para os botões funcionarem
    window.changeCalendarMonth = changeCalendarMonth;
    renderCalendar();
}

export function changeCalendarMonth(delta) {
    // Muda o mês (delta é -1 ou +1)
    displayDate.setMonth(displayDate.getMonth() + delta);
    renderCalendar();
}

export function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calMonthYear');
    
    if (!grid || !title) return;

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    
    // Título do Mês com Navegação Injetada
    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    
    // Atualiza o HTML do título para incluir as setas
    title.innerHTML = `
        <div class="flex items-center justify-between px-2 w-full">
            <button onclick="window.changeCalendarMonth(-1)" class="text-gray-600 hover:text-white transition p-1"><i class="fa-solid fa-chevron-left"></i></button>
            <span class="text-xs tracking-widest">${months[month]} ${year}</span>
            <button onclick="window.changeCalendarMonth(1)" class="text-gray-600 hover:text-white transition p-1"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
    `;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Dados para comparação
    const today = new Date();
    today.setHours(0,0,0,0); // Zera hora para comparar apenas data
    
    // Pega o estado da gamificação (Scores dos Rituais)
    const rpgState = getRPGState();
    const scores = rpgState.dailyScores || {}; 

    let html = '';

    // Espaços vazios antes do dia 1
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day opacity-0 border-transparent"></div>`;
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
        // Formata a chave da data como yyyy-mm-dd para buscar no dailyScores
        // Importante: getMonth() é 0-indexado, então somamos 1
        const currentMonthStr = (month + 1).toString().padStart(2, '0');
        const currentDayStr = day.toString().padStart(2, '0');
        const dateString = `${year}-${currentMonthStr}-${currentDayStr}`;
        
        // Data atual do loop sendo renderizada
        const renderDate = new Date(year, month, day);
        const isToday = renderDate.getTime() === today.getTime();
        const isFuture = renderDate > today;
        
        let dayClass = 'bg-[#0d0d0d] text-gray-600 border-[#151515]'; 
        let content = day;
        let glow = '';

        // Lógica de Coloração Baseada no Histórico
        if (scores[dateString] !== undefined) {
            const percentage = scores[dateString];
            
            if (percentage === 100) {
                // Perfeito (Ouro/Verde Tático)
                dayClass = 'bg-green-900/30 text-green-400 border-green-600 font-bold';
                glow = 'shadow-[0_0_8px_rgba(34,197,94,0.2)]';
            } else if (percentage >= 50) {
                // Bom (Azul/Amarelo)
                dayClass = 'bg-blue-900/30 text-blue-400 border-blue-600';
            } else if (percentage > 0) {
                // Ruim (Vermelho)
                dayClass = 'bg-red-900/30 text-red-400 border-red-800';
            } else {
                // Fez 0% (Falha total registrada)
                dayClass = 'bg-[#0a0a0a] text-red-700 border-red-900/30 line-through decoration-red-900';
            }
        } else if (!isFuture && !isToday) {
            // Dia passado sem registro (Falha implícita ou antes do uso do app)
            dayClass = 'bg-[#0a0a0a] text-gray-700 border-white/5 opacity-50';
        }

        // Destaque para HOJE
        if (isToday) {
            dayClass += ' ring-1 ring-white text-white bg-white/5';
        }

        html += `<div class="calendar-day ${dayClass} ${glow} transition-all duration-300 relative group">
            ${content}
            ${scores[dateString] !== undefined ? `<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[6px] opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded border border-white/10 whitespace-nowrap z-10">${scores[dateString]}%</div>` : ''}
        </div>`;
    }
    grid.innerHTML = html;
}