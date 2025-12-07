// PRO/js/modules/calendar.js
import { CONFIG } from '../config.js';

let currentDate = new Date();
let eventsCache = {}; // Cache local para não bater no banco toda hora

export async function initCalendar() {
    console.log("📅 Iniciando Módulo Calendário...");
    await loadEvents();
    renderMonth(currentDate);
    setupControls();
}

async function loadEvents() {
    const user = getUser();
    if(!user) return;

    const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_email', user.email);

    if (data) {
        // Agrupa eventos por data YYYY-MM-DD
        eventsCache = data.reduce((acc, evt) => {
            const date = evt.event_date; 
            if(!acc[date]) acc[date] = [];
            acc[date].push(evt);
            return acc;
        }, {});
    }
}

function renderMonth(date) {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month-year');
    
    if(!grid || !label) return;

    grid.innerHTML = '';
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Atualiza título
    label.innerText = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Dias vazios
    for(let i=0; i<firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'opacity-0';
        grid.appendChild(div);
    }

    // Dias reais
    for(let i=1; i<=daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const hasEvents = eventsCache[dateStr] && eventsCache[dateStr].length > 0;

        dayDiv.className = `aspect-square rounded-md flex flex-col items-center justify-center cursor-pointer border transition relative ${isToday ? 'bg-red-900/20 border-red-500 text-white' : 'bg-[#111] border-transparent text-gray-500 hover:border-gray-600 hover:text-white'}`;
        
        dayDiv.innerHTML = `<span class="text-xs font-bold">${i}</span>`;

        // Bolinha se tiver evento
        if(hasEvents) {
            const dot = document.createElement('div');
            dot.className = 'w-1.5 h-1.5 bg-[#CC0000] rounded-full mt-1';
            dayDiv.appendChild(dot);
        }

        dayDiv.onclick = () => openEventModal(dateStr);
        grid.appendChild(dayDiv);
    }
}

function openEventModal(dateStr) {
    // Lista eventos existentes nesse dia
    const events = eventsCache[dateStr] || [];
    const eventsListHTML = events.map(e => `<div class="bg-black p-2 rounded text-xs text-gray-300 border border-[#333] mb-1">${e.title}</div>`).join('') || '<p class="text-xs text-gray-600">Nada agendado.</p>';

    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-[#121212] border border-[#333] w-full max-w-sm rounded-xl p-5 shadow-2xl">
            <h3 class="text-white font-bold mb-1">Agenda: <span class="text-red-500">${dateStr}</span></h3>
            <div class="mb-4 max-h-32 overflow-y-auto custom-scrollbar">${eventsListHTML}</div>
            
            <input id="newEventInput" class="w-full bg-[#0a0a0a] border border-[#333] text-white p-2 rounded text-sm mb-3 outline-none focus:border-red-500" placeholder="Novo compromisso...">
            
            <div class="flex justify-end gap-2">
                <button id="closeModal" class="px-3 py-2 text-xs text-gray-400 hover:text-white">Fechar</button>
                <button id="saveEvent" class="bg-[#CC0000] hover:bg-red-700 text-white px-3 py-2 rounded text-xs font-bold">Salvar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('closeModal').onclick = () => modal.remove();
    
    document.getElementById('saveEvent').onclick = async () => {
        const title = document.getElementById('newEventInput').value;
        if(!title) return;
        
        const user = getUser();
        await supabase.from('calendar_events').insert({ user_email: user.email, title, event_date: dateStr });
        
        modal.remove();
        await loadEvents(); // Recarrega
        renderMonth(currentDate); // Atualiza UI
    };
}

function setupControls() {
    document.getElementById('prevMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()-1); renderMonth(currentDate); };
    document.getElementById('nextMonth').onclick = () => { currentDate.setMonth(currentDate.getMonth()+1); renderMonth(currentDate); };
}

function getUser() {
    try { return JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY)); } catch(e) { return null; }
}