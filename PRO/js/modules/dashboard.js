// PRO/js/modules/dashboard.js
import { CONFIG } from '../config.js';

// --- CORREÇÃO 1: Inicializar o Supabase corretamente ---
let supabase = null;
try {
    if (window.supabase && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_KEY) {
        supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    } else {
        console.error("Supabase não encontrado. Verifique o arquivo config.js e se o script CDN está no HTML.");
    }
} catch (e) {
    console.error("Erro ao iniciar Supabase:", e);
}

export async function initDashboard() {
    console.log("📊 Inicializando Dashboard Tático...");
    
    // --- CORREÇÃO 2: Aceitar Visitante (Modo Teste) ---
    const user = getUser() || { email: "visitante@teste.com", name: "Visitante" };

    if (!supabase) {
        console.warn("Sem conexão com banco de dados. O Dashboard não salvará nada.");
        return;
    }

    await loadMissions(user.email);
    setupInput(user.email);
    loadXP(user.email);
}

// --- MISSÕES ---
async function loadMissions(email) {
    const list = document.getElementById('tactical-list');
    if(!list) return;

    // Busca missões do banco
    const { data: missions, error } = await supabase
        .from('missions')
        .select('*')
        .eq('user_email', email)
        .order('id', { ascending: true });

    if (error) console.error("Erro ao carregar missões:", error);

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
        // Atualiza visualmente na hora (para parecer rápido)
        mission.is_completed = !mission.is_completed;
        const btn = div.querySelector('.check-btn');
        const input = div.querySelector('input');
        
        if(mission.is_completed) {
            btn.className = "check-btn w-5 h-5 rounded border bg-green-500 border-green-500 text-black flex items-center justify-center transition";
            btn.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i>';
            input.classList.add('text-gray-500', 'line-through');
            div.classList.add('opacity-50');
        } else {
            btn.className = "check-btn w-5 h-5 rounded border border-[#444] hover:border-white flex items-center justify-center transition";
            btn.innerHTML = '';
            input.classList.remove('text-gray-500', 'line-through');
            div.classList.remove('opacity-50');
        }

        // Atualiza no Banco
        await supabase.from('missions').update({ is_completed: mission.is_completed }).eq('id', mission.id);
        if(mission.is_completed) addXP(10); // Ganha 10 XP
        
        // Recarrega estatísticas
        updateMeta(await getLocalMissions(mission.user_email)); 
    };

    // Click: Deletar
    div.querySelector('.del-btn').onclick = async () => {
        if(confirm("Abortar missão?")) {
            div.remove(); // Remove visualmente na hora
            await supabase.from('missions').delete().eq('id', mission.id);
            updateMeta(await getLocalMissions(mission.user_email));
        }
    };

    container.appendChild(div);
}

// Função auxiliar para evitar recarregar tudo do banco só para atualizar o gráfico
async function getLocalMissions(email) {
    const { data } = await supabase.from('missions').select('*').eq('user_email', email);
    return data || [];
}

function setupInput(email) {
    const btn = document.getElementById('btnAddBlock');
    const input = document.getElementById('newMissionInput');

    if(!btn || !input) return;

    // Clone para limpar listeners antigos
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    // Função de adicionar
    const addFn = async () => {
        const title = input.value.trim();
        if(!title) return;
        
        // Limpa input e dá feedback visual
        input.value = '';
        input.placeholder = "Salvando...";
        
        const { error } = await supabase.from('missions').insert({ user_email: email, title });
        
        input.placeholder = "Nova missão...";
        if(error) {
            alert("Erro ao salvar: " + error.message);
        } else {
            loadMissions(email); // Recarrega lista
        }
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
    const { data } = await supabase.from('user_progress').select('current_xp, current_level').eq('user_email', email).maybeSingle();
    
    if(data) {
        updateXPUI(data.current_xp || 0, data.current_level || 1);
    } else {
        // Se não tiver XP ainda, cria o registro
        await supabase.from('user_progress').insert({ user_email: email, current_xp: 0 });
    }
}

async function addXP(amount) {
    const user = getUser() || { email: "visitante@teste.com" };
    const { data } = await supabase.from('user_progress').select('current_xp').eq('user_email', user.email).maybeSingle();
    
    const currentXP = data ? data.current_xp : 0;
    const newXP = currentXP + amount;
    
    await supabase.from('user_progress').upsert({ user_email: user.email, current_xp: newXP }, { onConflict: 'user_email' });
    updateXPUI(newXP, 1);
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