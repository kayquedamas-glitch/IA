import { getRPGState } from './gamification.js';

export function initCalendar() {
    renderCalendar();
}

export function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calMonthYear');
    
    if (!grid || !title) return;

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Título do Mês
    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    title.innerText = `${months[month]} ${year}`;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Pega o estado da gamificação (Scores dos Rituais)
    const rpgState = getRPGState();
    const scores = rpgState.dailyScores || {}; 

    let html = '';

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day opacity-20 border-transparent"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentMonthStr = (month + 1).toString().padStart(2, '0');
        const currentDayStr = day.toString().padStart(2, '0');
        const dateString = `${year}-${currentMonthStr}-${currentDayStr}`;
        const isToday = day === date.getDate();
        
        let scoreClass = 'bg-[#0d0d0d] text-gray-500 border-[#151515]'; 
        let scoreGlow = '';

        if (scores[dateString] !== undefined) {
            const percentage = scores[dateString];
            if (percentage === 100) {
                // MISSÃO CUMPRIDA (Verde/Ouro Tático)
                scoreClass = 'bg-green-900/40 text-green-400 border-green-600';
                scoreGlow = 'shadow-[0_0_10px_rgba(34,197,94,0.3)]';
            } else if (percentage >= 50) {
                // QUASE LÁ (Amarelo)
                scoreClass = 'bg-yellow-900/40 text-yellow-400 border-yellow-600';
            } else if (percentage > 0) {
                // COMEÇOU (Vermelho Fraco)
                scoreClass = 'bg-red-900/20 text-red-400 border-red-900';
            }
        }
        
        const todayClass = isToday ? 'ring-1 ring-white' : '';
        html += `<div class="calendar-day ${scoreClass} ${scoreGlow} ${todayClass} transition-all duration-300">${day}</div>`;
    }
    grid.innerHTML = html;
}