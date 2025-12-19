import { getHistory } from './gamification.js';

export function initCalendar() { renderCalendar(); }

export function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const label = document.getElementById('calMonthYear');
    if(!grid) return;
    grid.innerHTML = '';
    const now = new Date();
    const months = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
    if(label) label.innerText = `${months[now.getMonth()]} ${now.getFullYear()}`;
    
    const daysCount = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const startIdx = new Date(now.getFullYear(), now.getMonth(), 1).getDay();

    for(let i=0; i<startIdx; i++) grid.appendChild(document.createElement('div'));
    
    const history = getHistory();

    for(let i=1; i<=daysCount; i++) {
        const dateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const isToday = i === now.getDate();
        const hasAct = history[dateKey];

        const day = document.createElement('div');
        day.className = `calendar-day ${isToday ? 'today' : ''} ${hasAct && !isToday ? 'border-red-900 text-red-500' : ''}`;
        day.innerHTML = `<span class="text-[9px]">${i}</span>`;
        grid.appendChild(day);
    }
}