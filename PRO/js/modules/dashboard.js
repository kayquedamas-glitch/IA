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

// ... imports e initDashboard existentes ...

function renderMissionHTML(mission, container) {
    // Cores baseadas na prioridade (igual ao Next.js)
    const priorityColors = {
        'low': 'border-gray-500 text-gray-500',
        'normal': 'border-blue-500 text-blue-500',
        'high': 'border-yellow-500 text-yellow-500',
        'critical': 'border-[#CC0000] text-[#CC0000]'
    };
    
    const pColor = priorityColors[mission.priority] || priorityColors['normal'];
    const xpReward = mission.xp_reward || 15;

    const div = document.createElement('div');
    div.className = `bg-[#0a0a0a] border border-[#222] rounded-lg p-4 mb-2 transition-all ${mission.status === 'completed' ? 'opacity-50 border-green-900' : ''}`;
    
    div.innerHTML = `
        <div class="flex items-start gap-3">
            <button class="check-btn w-5 h-5 mt-1 border-2 rounded flex items-center justify-center transition-colors ${mission.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-[#CC0000] hover:bg-[#CC0000]/20'}">
                ${mission.status === 'completed' ? '<i class="fas fa-check text-black text-xs"></i>' : ''}
            </button>
            
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                    <h3 class="font-mono font-bold text-sm ${mission.status === 'completed' ? 'line-through text-gray-600' : 'text-white'}">${mission.title}</h3>
                    <span class="text-[10px] font-mono px-1.5 py-0.5 border rounded uppercase ${pColor}">
                        ${mission.priority || 'NORMAL'}
                    </span>
                </div>
                <div class="flex items-center gap-2 text-xs font-mono">
                    <span class="${mission.status === 'completed' ? 'text-green-500' : 'text-[#CC0000]'}">+${xpReward} XP</span>
                </div>
            </div>
            
            <button class="del-btn text-gray-600 hover:text-red-500"><i class="fas fa-trash"></i></button>
        </div>
    `;

    // Lógica de Check
    div.querySelector('.check-btn').onclick = async () => {
        if(mission.status === 'completed') return; // Evita farmar XP clicando várias vezes
        
        // Atualiza UI
        mission.status = 'completed';
        div.classList.add('opacity-50', 'border-green-900');
        div.querySelector('.check-btn').classList.add('bg-green-500', 'border-green-500');
        div.querySelector('.check-btn').innerHTML = '<i class="fas fa-check text-black text-xs"></i>';
        div.querySelector('h3').classList.add('line-through', 'text-gray-600');

        // Som e Confete
        if(window.confetti) confetti({ particleCount: 50, origin: { y: 0.7 }, colors: ['#CC0000', '#FFF'] });
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'); // Click sound
        audio.play().catch(()=>{});

        // Supabase
        await supabase.from('missions').update({ status: 'completed', completed_at: new Date() }).eq('id', mission.id);
        
        // Adiciona XP
        if(window.addXP) window.addXP(xpReward);
    };

    // Lógica Delete
    div.querySelector('.del-btn').onclick = async () => {
        if(confirm("Remover missão?")) {
            div.remove();
            await supabase.from('missions').delete().eq('id', mission.id);
        }
    };

    container.appendChild(div);
}

function setupInput(email) {
    const btn = document.getElementById('btnAddBlock');
    // Você precisará adicionar um select de prioridade no HTML ou criar um modal via JS
    // Aqui farei uma versão simplificada que cria um modal para adicionar missão com prioridade
    
    btn.onclick = () => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-[#121212] border border-[#333] w-full max-w-md rounded-xl p-6">
                <h3 class="text-white font-mono text-xl mb-4">Nova Missão</h3>
                <input id="modalMissionTitle" class="w-full bg-[#0a0a0a] border border-[#333] text-white p-3 rounded mb-4 font-mono text-sm" placeholder="Título da missão">
                
                <label class="text-gray-500 text-xs font-mono mb-2 block">PRIORIDADE</label>
                <div class="grid grid-cols-4 gap-2 mb-6">
                    <button onclick="selectPriority(this, 'low', 10)" class="p-btn border border-[#333] text-gray-500 text-xs py-2 rounded hover:border-gray-500">BAIXA</button>
                    <button onclick="selectPriority(this, 'normal', 15)" class="p-btn border border-blue-900 text-blue-500 text-xs py-2 rounded bg-blue-900/10 ring-1 ring-blue-500">NORMAL</button>
                    <button onclick="selectPriority(this, 'high', 30)" class="p-btn border border-[#333] text-yellow-500 text-xs py-2 rounded hover:border-yellow-500">ALTA</button>
                    <button onclick="selectPriority(this, 'critical', 50)" class="p-btn border border-[#333] text-[#CC0000] text-xs py-2 rounded hover:border-[#CC0000]">CRÍTICA</button>
                </div>
                
                <div class="flex gap-3">
                    <button onclick="this.closest('.fixed').remove()" class="flex-1 py-3 text-gray-400 font-mono text-xs">CANCELAR</button>
                    <button id="saveMissionBtn" class="flex-1 bg-[#CC0000] text-white font-mono font-bold text-xs py-3 rounded">CRIAR (+15 XP)</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        let selectedPriority = 'normal';
        let selectedXP = 15;

        window.selectPriority = (el, prio, xp) => {
            document.querySelectorAll('.p-btn').forEach(b => {
                b.className = 'p-btn border border-[#333] text-gray-500 text-xs py-2 rounded';
            });
            el.className = `p-btn border border-white text-white text-xs py-2 rounded bg-white/10`;
            selectedPriority = prio;
            selectedXP = xp;
            document.getElementById('saveMissionBtn').innerText = `CRIAR (+${xp} XP)`;
        };

        document.getElementById('saveMissionBtn').onclick = async () => {
            const title = document.getElementById('modalMissionTitle').value;
            if(!title) return;
            
            await supabase.from('missions').insert({
                user_email: email, // Nota: idealmente use user_id se tiver tabela de profiles sincronizada
                title: title,
                priority: selectedPriority,
                xp_reward: selectedXP,
                status: 'active'
            });
            
            modal.remove();
            loadMissions(email);
        };
    };
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