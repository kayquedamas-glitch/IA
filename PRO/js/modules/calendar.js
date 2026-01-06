// PRO/js/modules/calendar.js

// Estado local para navegação do calendário
let displayDate = new Date();

export function initCalendar() {
    window.changeCalendarMonth = changeCalendarMonth;
    renderCalendar();
}

export function changeCalendarMonth(delta) {
    displayDate.setMonth(displayDate.getMonth() + delta);
    renderCalendar();
}

export function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calMonthYear');
    
    if (!grid || !title) return;

    const year = displayDate.getFullYear();
    const month = displayDate.getMonth();
    const months = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    
    title.innerHTML = `
        <div class="flex items-center justify-between px-2 w-full">
            <button onclick="window.changeCalendarMonth(-1)" class="text-gray-600 hover:text-white transition p-1"><i class="fa-solid fa-chevron-left"></i></button>
            <span class="text-xs tracking-widest">${months[month]} ${year}</span>
            <button onclick="window.changeCalendarMonth(1)" class="text-gray-600 hover:text-white transition p-1"><i class="fa-solid fa-chevron-right"></i></button>
        </div>
    `;
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // PEGA DO ESTADO GLOBAL DO SUPABASE
    const scores = window.AppEstado?.gamification?.dailyScores || {}; 

    let html = '';

    for (let i = 0; i < firstDay; i++) {
        html += `<div class="calendar-day opacity-0 border-transparent"></div>`;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const currentMonthStr = (month + 1).toString().padStart(2, '0');
        const currentDayStr = day.toString().padStart(2, '0');
        const dateString = `${year}-${currentMonthStr}-${currentDayStr}`;
        
        const renderDate = new Date(year, month, day);
        const isToday = renderDate.getTime() === today.getTime();
        
        let dayClass = 'bg-[#0d0d0d] text-gray-600 border-[#151515]'; 
        let glow = '';

        // --- LÓGICA DE CORES SOLICITADA ---
        if (scores[dateString] !== undefined) {
            const percentage = scores[dateString];
            
            if (percentage === 100) {
                // VERDE (Concluído)
                dayClass = 'bg-green-900/30 text-green-400 border-green-600 font-bold';
                glow = 'shadow-[0_0_8px_rgba(34,197,94,0.2)]';
            } 
            else if (percentage > 0 && percentage < 100) {
                // AMARELO (Pela metade/Em andamento)
                dayClass = 'bg-yellow-900/30 text-yellow-400 border-yellow-600';
            } 
            else {
                // VERMELHO (0% - Não concluído)
                dayClass = 'bg-red-900/20 text-red-500 border-red-900/50';
            }
        } 
        else if (isToday) {
            // Hoje (Sem registro ainda)
            dayClass += ' ring-1 ring-white text-white bg-white/5';
        }

        html += `<div class="calendar-day ${dayClass} ${glow} transition-all duration-300 relative group">
            ${day}
            ${scores[dateString] !== undefined ? `<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[6px] opacity-0 group-hover:opacity-100 transition-opacity bg-black px-1 rounded border border-white/10 whitespace-nowrap z-10">${scores[dateString]}%</div>` : ''}
        </div>`;
    }
    grid.innerHTML = html;
}