// PRO/js/modules/gamification.js
import { CONFIG } from '../config.js';

const defaultHabits = [
    { id: 'h1', name: 'Beber Água ao Acordar' },
    { id: 'h2', name: 'Arrumar a Cama' },
    { id: 'h3', name: 'Banho Gelado' },
    { id: 'h4', name: 'Ler 10 Páginas' },
    { id: 'h5', name: 'Sem Celular na 1ª Hora' }
];

// Funções de Dados
function loadData() {
    const stored = localStorage.getItem(CONFIG.DATA_STORAGE_KEY);
    if (!stored) return { days: {}, habits: defaultHabits };
    const parsed = JSON.parse(stored);
    if(!parsed.habits || parsed.habits.length === 0) parsed.habits = defaultHabits;
    return parsed;
}

function saveData(data) { 
    localStorage.setItem(CONFIG.DATA_STORAGE_KEY, JSON.stringify(data)); 
}

// Funções de Renderização
export function renderHabits() {
    const habitListEl = document.getElementById('habitList');
    if(!habitListEl) return;

    const todayKey = new Date().toISOString().split('T')[0];
    const data = loadData();
    
    if (!data.days[todayKey]) data.days[todayKey] = [];
    habitListEl.innerHTML = '';
    
    // Estado Vazio
    if(data.habits.length === 0) {
        habitListEl.innerHTML = `
            <div class="text-center py-8 border border-dashed border-[#222] rounded-xl bg-[#0a0a0a]">
                <i class="fas fa-plus-circle text-gray-700 text-3xl mb-3"></i>
                <p class="text-gray-500 text-xs">Adicione seus rituais para começar.</p>
            </div>`;
        return;
    }

    const completedCount = data.habits.filter(h => data.days[todayKey].includes(h.id)).length;
    const countEl = document.getElementById('habitCount');
    if(countEl) countEl.innerText = `${completedCount}/${data.habits.length}`;

    data.habits.forEach(habit => {
        const isChecked = data.days[todayKey].includes(habit.id);
        const div = document.createElement('div');
        
        div.className = `habit-item cursor-pointer flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${isChecked ? 'bg-green-900/10 border-green-500/30' : 'bg-[#111] border-[#222] hover:border-[#333]'}`;
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-green-500 border-green-500' : 'border-[#333]'}">
                    <i class="fas fa-check text-black text-xs ${isChecked ? '' : 'opacity-0'}"></i>
                </div>
                <span class="text-sm ${isChecked ? 'text-white line-through opacity-50' : 'text-gray-300'}">${habit.name}</span>
            </div>
            ${isChecked ? '<span class="text-[10px] text-green-500 font-bold animate-pulse">+XP</span>' : '<i class="fas fa-chevron-right text-[#333] text-xs"></i>'}
        `;
        
        div.onclick = () => toggleHabit(habit.id, todayKey);
        habitListEl.appendChild(div);
    });
}

function toggleHabit(habitId, dateKey) {
    const currentData = loadData();
    const dayData = currentData.days[dateKey] || [];
    
    if (dayData.includes(habitId)) { 
        const index = dayData.indexOf(habitId); 
        dayData.splice(index, 1); 
    } else { 
        dayData.push(habitId); 
        if(navigator.vibrate) navigator.vibrate(50);
        
        // Confetes (global via CDN)
        if (window.confetti) {
            confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#22c55e', '#ffffff'] });
        }
    }
    currentData.days[dateKey] = dayData;
    saveData(currentData);
    renderHabits(); 
    renderCalendar();
}

export function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if(!grid) return;
    grid.innerHTML = '';
    
    ['D','S','T','Q','Q','S','S'].forEach(d => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.innerText = d;
        grid.appendChild(h);
    });

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const today = now.getDate();
    const appData = loadData();
    let streak = 0;

    for (let i = 1; i <= daysInMonth; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), i);
        const offset = d.getTimezoneOffset() * 60000;
        const dateKey = new Date(d.getTime() - offset).toISOString().split('T')[0];
        const dayHabits = appData.days[dateKey] || [];
        const isDone = dayHabits.length > 0;
        
        if(isDone) streak++; 

        const el = document.createElement('div');
        el.className = `calendar-day ${isDone ? 'success' : ''} ${i === today ? 'active' : ''}`;
        if(!isDone && i < today) el.style.color = '#333';
        el.innerText = i;
        grid.appendChild(el);
    }

    updateLevel(streak);
}

function updateLevel(streak) {
    const streakEl = document.getElementById('proStreakDisplay');
    if(streakEl) streakEl.innerText = streak;

    let level = 1;
    let nextLevelThreshold = 7;
    
    if (streak >= 7) { level = 2; nextLevelThreshold = 14; }
    if (streak >= 14) { level = 3; nextLevelThreshold = 30; }
    if (streak >= 30) { level = 4; nextLevelThreshold = 60; }
    
    let progressPercent = Math.min((streak / nextLevelThreshold) * 100, 100);
    
    const progressBar = document.getElementById('levelProgressBar');
    if(progressBar) progressBar.style.width = `${progressPercent}%`;
    
    const levelBadge = document.getElementById('levelBadge');
    if(levelBadge) levelBadge.innerText = `NÍVEL ${level}`;
    
    const nextLevelText = document.getElementById('nextLevelText');
    if(nextLevelText) nextLevelText.innerText = `Próximo nível em ${nextLevelThreshold - streak} dias`;
}

export function addNewHabitPrompt() {
    const newName = prompt("Nome do ritual:");
    if(newName) {
        const data = loadData();
        data.habits.push({ id: 'h'+Date.now(), name: newName });
        saveData(data);
        renderHabits();
    }
}

export function clearHistory() { 
    if(confirm("Reiniciar todo o progresso?")) { 
        localStorage.removeItem(CONFIG.DATA_STORAGE_KEY); 
        renderHabits(); 
        renderCalendar(); 
    } 
}