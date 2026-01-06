// PRO/js/modules/calendar.js

let displayDate = new Date();

export function initCalendar() {
    // --- A CORREÇÃO ESTÁ AQUI EMBAIXO ---
    window.changeCalendarMonth = changeCalendarMonth;
    window.renderCalendar = renderCalendar; // Agora o Gamification consegue chamar o Calendário!
    
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
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    // Zera a hora de hoje para comparar corretamente
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Pega os dados salvos (garantindo que seja um objeto)
    const scores = window.AppEstado?.gamification?.dailyScores || {}; 

    let html = '';
    // Dias vazios antes do dia 1
    for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day opacity-0 border-transparent"></div>`;

    for (let day = 1; day <= daysInMonth; day++) {
        // Formata a data igualzinho ao gamification.js (YYYY-MM-DD)
        const currentMonthStr = (month + 1).toString().padStart(2, '0');
        const currentDayStr = day.toString().padStart(2, '0');
        const dateString = `${year}-${currentMonthStr}-${currentDayStr}`;
        
        const renderDate = new Date(year, month, day);
        const isToday = renderDate.getTime() === today.getTime();
        
        // Estilo Padrão (Cinza Escuro)
        let dayClass = 'bg-[#0d0d0d] text-gray-600 border-[#151515]'; 
        let glow = '';
        let scoreContent = '';

        // --- LÓGICA DO SEMÁFORO (CORES) ---
        if (scores[dateString] !== undefined) {
            const percentage = Number(scores[dateString]); 
            
            if (percentage === 100) {
                // 🟢 VERDE (Concluído)
                dayClass = 'bg-green-900/30 text-green-400 border-green-600 font-bold';
                glow = 'shadow-[0_0_8px_rgba(34,197,94,0.2)]';
            } 
            else if (percentage === 0) {
                // 🔴 VERMELHO (0% feito, mas já visitou o dia)
                dayClass = 'bg-red-900/20 text-red-500 border-red-900/50';
            } 
            else {
                // 🟡 AMARELO (1% a 99% - Em progresso)
                dayClass = 'bg-yellow-900/20 text-yellow-400 border-yellow-600/50';
            }
            
            // Mostra a % pequena embaixo do número
            scoreContent = `<div class="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[6px] opacity-0 group-hover:opacity-100 bg-black px-1 border border-white/10 z-10 whitespace-nowrap">${percentage}%</div>`;
        } 
        else if (isToday) {
            // Hoje, mas sem dados ainda (Borda Branca)
            dayClass += ' ring-1 ring-white text-white bg-white/5';
        }

        html += `<div class="calendar-day ${dayClass} ${glow} transition-all relative group duration-300">
            ${day}
            ${scoreContent}
        </div>`;
    }
    grid.innerHTML = html;
}