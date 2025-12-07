// PRO/js/modules/dashboard.js
import { CONFIG } from '../config.js';

export async function initDashboard() {
    console.log("📊 Inicializando Dashboard Tático...");
    const user = getUser();
    if(!user) return;

    await loadMissions(user.email);
    setupInput(user.email);
    loadXP(user.email);
}

// --- MISSÕES ---
async function loadMissions(email) {
    const list = document.getElementById('tactical-list');
    if(!list) return;

    const { data: missions } = await supabase
        .from('missions')
        .select('*')
        .eq('user_email', email)
        .order('id', { ascending: true });

    list.innerHTML = '';

    if(missions && missions.length > 0) {
        missions.forEach(m => renderMissionHTML(m, list));
        updateMeta(missions);
    } else {
        list.innerHTML = '<div class="text-center py-8 text-gray-700 text-xs">Nenhuma missão ativa.<br>Adicione uma abaixo.</div>';
        updateMeta([]);
    }
}

function renderMissionHTML(mission, container) {
    const div = document.createElement('div');
    // Estilo da tarefa
    div.className = `group flex items-center gap-3 bg-[#111] hover:bg-[#161616] p-3 rounded-lg border border-transparent hover:border-white/5 transition mb-2 ${mission.is_completed ? 'opacity-50' : ''}`;
    
    div.innerHTML = `
        <button class="check-btn w-5 h-5 rounded border ${mission.is_completed ? 'bg-green-500 border-green-500 text-black' : 'border-[#444] hover:border-white'} flex items-center justify-center transition">
            ${mission.is_completed ? '<i class="fa-solid fa-check text-[10px]"></i>' : ''}
        </button>
        
        <input type="text" readonly value="${mission.title}" class="bg-transparent text-sm w-full outline-none ${mission.is_completed ? 'text-gray-500 line-through' : 'text-gray-200'}">
        
        <button class="del-btn text-gray-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition px-2">
            <i class="fa-solid fa-trash text-xs"></i>
        </button>
    `;

    // Click: Completar
    div.querySelector('.check-btn').onclick = async () => {
        await supabase.from('missions').update({ is_completed: !mission.is_completed }).eq('id', mission.id);
        if(!mission.is_completed) addXP(10); // Ganha 10 XP ao completar
        loadMissions(mission.user_email);
    };

    // Click: Deletar
    div.querySelector('.del-btn').onclick = async () => {
        if(confirm("Abortar missão?")) {
            await supabase.from('missions').delete().eq('id', mission.id);
            loadMissions(mission.user_email);
        }
    };

    container.appendChild(div);
}

function setupInput(email) {
    const btn = document.getElementById('btnAddBlock');
    const input = document.getElementById('newMissionInput');

    // Clone para limpar listeners antigos
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // Função de adicionar
    const addFn = async () => {
        const title = input.value.trim();
        if(!title) return;
        
        input.value = '';
        await supabase.from('missions').insert({ user_email: email, title });
        loadMissions(email);
    };

    newBtn.onclick = addFn;
    input.onkeydown = (e) => { if(e.key === 'Enter') addFn(); };
}

function updateMeta(missions) {
    const total = missions.length;
    const done = missions.filter(m => m.is_completed).length;
    const pct = total === 0 ? 0 : Math.round((done/total)*100);

    const txt = document.getElementById('dailyMetaText');
    const circle = document.querySelector('.circle-chart');
    const content = document.querySelector('.circle-content');

    if(txt) txt.innerText = `${done}/${total}`;
    if(content) content.innerText = `${pct}%`;
    if(circle) circle.style.setProperty('--percentage', `${pct * 3.6}deg`);
}

// --- XP SYSTEM ---
async function loadXP(email) {
    const { data } = await supabase.from('user_progress').select('current_xp, current_level').eq('user_email', email).single();
    if(data) {
        updateXPUI(data.current_xp || 0, data.current_level || 1);
    }
}

async function addXP(amount) {
    const user = getUser();
    const { data } = await supabase.from('user_progress').select('current_xp').eq('user_email', user.email).single();
    const newXP = (data.current_xp || 0) + amount;
    
    await supabase.from('user_progress').update({ current_xp: newXP }).eq('user_email', user.email);
    updateXPUI(newXP, 1); // Simplificado: Nível 1 fixo por enquanto
}

function updateXPUI(xp, level) {
    const bar = document.getElementById('xpBar');
    const lvl = document.getElementById('levelDisplay');
    
    // Meta arbitrária de 100 XP para nivel 2
    const pct = Math.min((xp / 100) * 100, 100);
    
    if(bar) bar.style.width = `${pct}%`;
    if(lvl) lvl.innerText = `Nível ${level} (${xp} XP)`;
}

function getUser() {
    try { return JSON.parse(localStorage.getItem(CONFIG.USER_STORAGE_KEY)); } catch(e) { return null; }
}