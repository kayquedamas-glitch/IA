import { CONFIG } from '../config.js';
import { addXP } from './gamification.js';

let missions = [];

export async function initDashboard() { loadMissions(); setupInputs(); }
export function getMissions() { return missions; }
export function addMissionFromAI(text) { missions.unshift({ id: Date.now(), text, done: false }); saveMissions(); return true; }

function loadMissions() {
    const saved = localStorage.getItem(CONFIG.STORAGE_KEYS.MISSIONS);
    if(saved) missions = JSON.parse(saved);
    renderMissions();
}

function saveMissions() {
    localStorage.setItem(CONFIG.STORAGE_KEYS.MISSIONS, JSON.stringify(missions));
    renderMissions();
}

function renderMissions() {
    const container = document.getElementById('missionList');
    if(!container) return;
    container.innerHTML = '';
    
    const done = missions.filter(m => m.done).length;
    const total = missions.length;
    const perc = total === 0 ? 0 : Math.round((done / total) * 100);

    const circle = document.querySelector('.circle-chart');
    if(circle) circle.style.setProperty('--percentage', `${(perc / 100) * 360}deg`);
    
    const content = document.getElementById('dailyPercentage');
    if(content) content.innerText = `${perc}%`;
    
    const meta = document.getElementById('dailyMetaText');
    if(meta) meta.innerText = `${done}/${total}`;

    if(missions.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-gray-700 font-mono text-[10px] uppercase">Nenhum objetivo</div>`;
        return;
    }

    missions.forEach(m => {
        const div = document.createElement('div');
        div.className = `flex items-center gap-4 bg-[#0d0d0d] p-4 rounded-xl border border-white/5 ${m.done ? 'opacity-40' : ''}`;
        div.innerHTML = `
            <div class="w-6 h-6 rounded-lg border flex items-center justify-center cursor-pointer ${m.done ? 'bg-red-600 border-red-600' : 'border-gray-800'}" onclick="window.toggleMission(${m.id})">
                <i class="fa-solid fa-check text-[10px] text-white ${m.done ? '' : 'hidden'}"></i>
            </div>
            <span class="flex-grow text-xs font-bold uppercase tracking-wide ${m.done ? 'line-through text-gray-500' : 'text-gray-300'}">${m.text}</span>
            <button class="text-gray-800 hover:text-red-500 transition" onclick="window.deleteMission(${m.id})"><i class="fa-solid fa-trash-can text-xs"></i></button>
        `;
        container.appendChild(div);
    });
}

window.toggleMission = (id) => {
    const m = missions.find(x => x.id === id);
    if(m) {
        m.done = !m.done;
        addXP(m.done ? 50 : -50);
        saveMissions();
    }
};

window.deleteMission = (id) => { missions = missions.filter(x => x.id !== id); saveMissions(); };

function setupInputs() {
    const btn = document.getElementById('addMissionBtn');
    const input = document.getElementById('newMissionInput');
    const add = () => { if(!input.value.trim()) return; missions.unshift({ id: Date.now(), text: input.value.trim(), done: false }); input.value = ''; saveMissions(); };
    if(btn) btn.onclick = add;
    if(input) input.onkeydown = (e) => { if(e.key === 'Enter') add(); };
}