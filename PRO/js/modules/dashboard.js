import { CONFIG } from '../config.js';

let supabase = null;

try {
    if (window.supabase) {
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    }
} catch (e) {
    console.warn("Modo Offline Ativado (Supabase Error)");
}

export async function initDashboard() {
    console.log("⚙️ Dashboard System Init...");
    
    const user = getUser();
    updateProfileUI(user);
    
    // Load Missions (Híbrido: Local + Cloud)
    await loadMissions(user.email);
    
    // Setup Inputs
    setupMissionInput(user.email);
    
    // Setup Calendar Render (Simples)
    renderCalendar();
}

function getUser() {
    try {
        const s = JSON.parse(localStorage.getItem('synapse_session_v2'));
        const u = JSON.parse(localStorage.getItem('synapseUser'));
        return s || u || { email: 'visitante@synapse.com', user: 'Visitante' };
    } catch {
        return { email: 'erro@synapse.com', user: 'Erro' };
    }
}

function updateProfileUI(user) {
    const name = user.user || user.name || "Membro";
    const initial = name.charAt(0).toUpperCase();
    
    const els = {
        sidebarName: document.getElementById('userNameSidebar'),
        sidebarAvatar: document.getElementById('userAvatarSidebar'),
        dashName: document.getElementById('userNameDashboard')
    };

    if(els.sidebarName) els.sidebarName.innerText = name;
    if(els.sidebarAvatar) els.sidebarAvatar.innerText = initial;
    if(els.dashName) els.dashName.innerText = name.toUpperCase();
}

// --- MISSIONS LOGIC ---

async function loadMissions(email) {
    const container = document.getElementById('tactical-list');
    if(!container) return;
    
    container.innerHTML = '<div class="text-center py-10 text-gray-600 animate-pulse font-mono text-xs">BUSCANDO DADOS TÁTICOS...</div>';

    let missions = [];

    // Tenta carregar do Supabase
    if(supabase) {
        const { data, error } = await supabase
            .from('missions')
            .select('*')
            .eq('user_email', email)
            .order('created_at', { ascending: false });
        
        if(!error && data) missions = data;
    }

    // Fallback LocalStorage se falhar ou vazio
    if(missions.length === 0) {
        const local = localStorage.getItem('synapse_local_missions');
        if(local) missions = JSON.parse(local);
    }

    renderMissionList(missions);
}

function renderMissionList(missions) {
    const container = document.getElementById('tactical-list');
    container.innerHTML = '';

    if (missions.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center h-48 text-center opacity-50 border border-dashed border-white/10 rounded-xl">
                <i class="fa-solid fa-ban text-2xl mb-2 text-gray-500"></i>
                <p class="text-xs font-mono text-gray-500">SEM ORDENS ATIVAS.</p>
                <p class="text-[10px] text-red-900 mt-1 uppercase tracking-widest">A ociosidade é o inimigo.</p>
            </div>
        `;
        updateStats(0, 0);
        return;
    }

    missions.forEach(m => {
        const el = document.createElement('div');
        el.className = `group flex items-center gap-3 bg-[#111] border border-white/5 p-4 rounded-lg hover:border-white/20 transition-all ${m.is_completed ? 'opacity-40' : ''}`;
        
        el.innerHTML = `
            <input type="checkbox" class="mission-checkbox" ${m.is_completed ? 'checked' : ''}>
            <span class="flex-1 text-sm font-medium ${m.is_completed ? 'line-through text-gray-500' : 'text-gray-200'}">${m.title}</span>
            <button class="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity delete-btn">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>
        `;

        // Check Handler
        const chk = el.querySelector('.mission-checkbox');
        chk.onchange = () => toggleMission(m, missions);

        // Delete Handler
        el.querySelector('.delete-btn').onclick = () => deleteMission(m.id, missions);

        container.appendChild(el);
    });

    updateStats(missions);
}

async function toggleMission(mission, allMissions) {
    mission.is_completed = !mission.is_completed;
    
    // Save
    saveMissions(allMissions);
    renderMissionList(allMissions); // Re-render for visual feedback
}

async function deleteMission(id, allMissions) {
    if(!confirm("ABORTAR MISSÃO?")) return;
    
    const idx = allMissions.findIndex(m => m.id === id);
    if(idx > -1) {
        allMissions.splice(idx, 1);
        
        // Se tiver ID do banco, deleta lá tbm
        if(supabase && typeof id !== 'number') { // IDs locais são timestamps (números)
            await supabase.from('missions').delete().eq('id', id);
        }
        
        saveMissions(allMissions);
        renderMissionList(allMissions);
    }
}

async function setupMissionInput(email) {
    const btn = document.getElementById('btnAddBlock');
    const input = document.getElementById('newMissionInput');
    
    const add = async () => {
        const title = input.value.trim();
        if(!title) return;

        input.value = '';
        input.placeholder = "REGISTRANDO...";
        
        const newM = {
            id: Date.now(), // Temp ID
            title: title,
            is_completed: false,
            user_email: email,
            created_at: new Date().toISOString()
        };

        // Carrega atuais
        let current = [];
        const stored = localStorage.getItem('synapse_local_missions');
        if(stored) current = JSON.parse(stored);
        
        current.unshift(newM);
        saveMissions(current);
        
        // Se tiver supabase, salva lá em background
        if(supabase) {
            supabase.from('missions').insert({ title, user_email: email })
                .then(() => loadMissions(email)); // Recarrega com ID real
        } else {
            renderMissionList(current);
        }
        
        input.placeholder = "Nova ordem...";
    };

    btn.onclick = add;
    input.onkeydown = (e) => { if(e.key === 'Enter') add(); };
}

function saveMissions(missions) {
    localStorage.setItem('synapse_local_missions', JSON.stringify(missions));
}

function updateStats(missions) {
    if(!missions) {
         document.getElementById('dailyMetaText').innerText = "0/0";
         return;
    }
    const total = missions.length;
    const done = missions.filter(m => m.is_completed).length;
    const pct = total === 0 ? 0 : Math.round((done/total)*100);
    
    // Update Text
    document.getElementById('dailyMetaText').innerText = `${done}/${total}`;
    
    // Update Circle Chart
    const circle = document.getElementById('progressCircle');
    if(circle) {
        const radius = circle.r.baseVal.value;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (pct / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }

    // Update XP Bar (Simulado)
    const xpBar = document.getElementById('xpBar');
    if(xpBar) xpBar.style.width = `${pct}%`;
}

// --- CALENDAR SIMPLE ---
function renderCalendar() {
    const grid = document.getElementById('cal-grid');
    const label = document.getElementById('cal-month-year');
    if(!grid) return;

    const date = new Date();
    const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    label.innerText = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;

    grid.innerHTML = '';
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const startDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    // Empties
    for(let i=0; i<startDay; i++) {
        grid.appendChild(document.createElement('div'));
    }

    // Days
    for(let i=1; i<=daysInMonth; i++) {
        const d = document.createElement('div');
        const isToday = i === date.getDate();
        d.className = `aspect-square flex items-center justify-center text-[10px] font-mono rounded ${isToday ? 'bg-red-600 text-white font-bold' : 'bg-[#111] text-gray-500 hover:border hover:border-white/20'}`;
        d.innerText = i;
        grid.appendChild(d);
    }
}