// APP/PRO/js/modules/tactical.js

console.log("⚔️ Módulo Tático: Protocolo Visual Corrigido (Sem Duplicidade)...");

// --- INICIALIZAÇÃO ---
export function initTactical() {
    cleanupLegacyUI();
    ensureGlobalState(); 
    injectMetasModal();
    setupTacticalActions(); 
    renderTacticalView();
}

// --- GARANTIA DE ESTRUTURA ---
function ensureGlobalState() {
    if (!window.AppEstado) window.AppEstado = {};
    if (Object.keys(window.AppEstado).length === 0) {
        try {
            const backup = localStorage.getItem('synapse_data_backup');
            if (backup) window.AppEstado = { ...window.AppEstado, ...JSON.parse(backup) };
        } catch(e) {}
    }
    if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
    if (!window.AppEstado.gamification.metas || !Array.isArray(window.AppEstado.gamification.metas)) {
        window.AppEstado.gamification.metas = [];
    }
}

// --- LIMPEZA DE LEGADO ---
function cleanupLegacyUI() {
    const legacyInput = document.getElementById('newMissionInputTactical');
    if (legacyInput) {
        let footer = legacyInput.parentElement;
        while (footer && !footer.classList.contains('border-t')) footer = footer.parentElement;
        if (footer) footer.style.display = 'none';
    }
}

// --- UTILITÁRIOS ---
function generateUUID() { return 'xxxxxxxx-xxxx'.replace(/[xy]/g, c => (Math.random()*16|0).toString(16)); }
function getTodayDate() { return new Date().toLocaleDateString('en-CA'); }
function getDaysRemaining(d) {
    if (!d) return "∞";
    const days = Math.ceil((new Date(d) - new Date()) / (86400000));
    return days > 0 ? `${days} dias` : (days === 0 ? "Hoje" : "Atrasado");
}
function getCategoryIcon(c) {
    const map = { 'financeiro': 'fa-sack-dollar', 'carreira': 'fa-briefcase', 'saude': 'fa-heart-pulse', 'pessoal': 'fa-user-astronaut' };
    return map[c] || 'fa-star';
}
function getCategoryColor(c) {
    const map = { 'financeiro': 'text-green-500', 'carreira': 'text-gray-300', 'saude': 'text-red-500', 'pessoal': 'text-white' };
    return map[c] || 'text-white';
}
function forceUpdate() {
    ensureGlobalState();
    localStorage.setItem('synapse_data_backup', JSON.stringify(window.AppEstado));
    if(window.Database && window.Database.forceSave) window.Database.forceSave();
    renderTacticalView();
}

// --- MODAL ---
function injectMetasModal() {
    const oldModal = document.getElementById('modalNovaMeta');
    if (oldModal) oldModal.remove();

    const modalHTML = `
    <div id="modalNovaMeta" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 hidden">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity cursor-pointer" onclick="window.closeMetaModalTactical()"></div>
        <div class="relative w-full max-w-md bg-[#0a0a0a] border border-red-900/30 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] p-6 animate-fade-in-up flex flex-col">
            <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fa-solid fa-crosshairs text-red-600"></i> Nova Missão
                </h3>
                <button onclick="window.closeMetaModalTactical()" class="text-gray-500 hover:text-red-500 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <p class="text-[10px] text-gray-500 font-mono mb-6">DEFINA SEU OBJETIVO ESTRATÉGICO</p>
            <div class="space-y-5">
                <div>
                    <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-1">Nome da Missão</label>
                    <input type="text" id="inputMetaTitulo" class="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-red-600 outline-none placeholder-gray-700 transition-colors">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-1">Categoria</label>
                        <select id="selectMetaCategoria" class="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-red-600 outline-none appearance-none">
                            <option value="financeiro">Financeiro</option>
                            <option value="carreira">Carreira</option>
                            <option value="saude">Saúde</option>
                            <option value="pessoal">Pessoal</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-1">Prazo Final</label>
                        <input type="date" id="inputMetaPrazo" class="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-red-600 outline-none text-gray-300">
                    </div>
                </div>
                <div class="flex gap-3 mt-6 pt-4 border-t border-white/5">
                    <button onclick="window.closeMetaModalTactical()" class="flex-1 py-3 rounded-lg border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition">Cancelar</button>
                    <button onclick="window.saveNewMetaTactical()" type="button" class="flex-1 py-3 rounded-lg bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/30 active:scale-95 transition-all">Confirmar</button>
                </div>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- AÇÕES ---
function setupTacticalActions() {
    window.openNewMetaModalTactical = () => {
        const modal = document.getElementById('modalNovaMeta');
        if(modal) { modal.classList.remove('hidden'); setTimeout(() => document.getElementById('inputMetaTitulo')?.focus(), 100); }
        else { injectMetasModal(); document.getElementById('modalNovaMeta').classList.remove('hidden'); }
    };
    window.closeMetaModalTactical = () => { document.getElementById('modalNovaMeta')?.classList.add('hidden'); };

    window.saveNewMetaTactical = () => {
        try {
            ensureGlobalState();
            const tEl = document.getElementById('inputMetaTitulo');
            const cEl = document.getElementById('selectMetaCategoria');
            const pEl = document.getElementById('inputMetaPrazo');
            
            if (!tEl || !cEl) return;
            const titulo = tEl.value.trim();
            if (!titulo) { tEl.classList.add('border-red-500', 'animate-pulse'); setTimeout(() => tEl.classList.remove('border-red-500', 'animate-pulse'), 1000); return; }
            
            window.AppEstado.gamification.metas.push({
                id: generateUUID(), title: titulo, category: cEl.value, deadline: pEl.value || getTodayDate(), progress: 0, status: 'active'
            });
            
            forceUpdate();
            window.closeMetaModalTactical();
            tEl.value = '';
            if(window.playSFX) window.playSFX('success');
        } catch (e) { console.error("Erro salvo:", e); }
    };

    window.updateMetaProgressTactical = (id, val) => {
        ensureGlobalState();
        const m = window.AppEstado.gamification.metas.find(x => x.id === id);
        if (m) { m.progress = parseInt(val); m.status = m.progress >= 100 ? 'completed' : 'active'; forceUpdate(); }
    };

    window.deleteMetaTactical = (id) => {
        if(confirm("Deseja abortar esta missão?")) {
            ensureGlobalState();
            window.AppEstado.gamification.metas = window.AppEstado.gamification.metas.filter(x => x.id !== id);
            forceUpdate();
            if(window.playSFX) window.playSFX('delete');
        }
    };
    window.initTacticalModule = renderTacticalView;
}

// --- RENDERIZAÇÃO CORRIGIDA (SEM TÍTULO DUPLICADO) ---
function renderTacticalView() {
    const container = document.getElementById('missionListTactical');
    if (!container) return;
    ensureGlobalState();

    // HEADER: Removido o <h3> duplicado. Agora só tem o botão alinhado à direita.
    if (!document.getElementById('metasHeaderControl')) {
        container.innerHTML = `
            <div id="metasHeaderControl" class="flex justify-end items-center mb-4 animate-fade-in">
                <button onclick="window.openNewMetaModalTactical()" class="group flex items-center gap-2 bg-red-900/10 hover:bg-red-600 border border-red-900/40 text-red-500 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_0_10px_rgba(220,38,38,0.1)] hover:shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                    <i class="fa-solid fa-plus group-hover:rotate-90 transition-transform"></i> Nova Missão
                </button>
            </div>
            <div id="metasGrid" class="space-y-3 pb-24"></div>
        `;
    }

    const grid = document.getElementById('metasGrid');
    const metas = window.AppEstado.gamification.metas || [];

    if (metas.length === 0) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 opacity-30 border border-dashed border-white/5 rounded-xl">
                <i class="fa-solid fa-chess-rook text-3xl mb-3 text-red-900"></i>
                <span class="text-[9px] uppercase tracking-widest text-gray-500">Sem missões ativas</span>
            </div>`;
        return;
    }

    metas.sort((a,b) => (a.status === 'completed' ? 1 : -1));

    grid.innerHTML = metas.map(m => {
        const p = m.progress || 0;
        const done = p >= 100;
        const icon = getCategoryIcon(m.category);
        const color = getCategoryColor(m.category);
        
        return `
        <div class="relative bg-[#0d0d0d] border ${done ? 'border-green-900/30' : 'border-white/5'} hover:border-red-500/20 rounded-xl p-4 overflow-hidden group transition-all duration-300">
            <div class="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-red-900 via-red-600 to-orange-500 transition-all duration-700 shadow-[0_0_10px_rgba(220,38,38,0.3)]" style="width: ${p}%"></div>
            
            <div class="flex justify-between items-start mb-4 relative z-10">
                <div class="flex gap-3">
                    <div class="w-9 h-9 rounded-lg bg-[#151515] flex items-center justify-center border border-white/5 shadow-inner">
                        <i class="fa-solid ${icon} ${done ? 'text-green-500' : color} text-xs"></i>
                    </div>
                    <div>
                        <span class="text-[8px] font-bold uppercase tracking-widest text-gray-600 block mb-0.5">${m.category}</span>
                        <h4 class="text-xs font-bold text-gray-200 ${done ? 'line-through opacity-40' : ''}">${m.title}</h4>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-[9px] font-bold font-mono ${getDaysRemaining(m.deadline) === 'Atrasado' && !done ? 'text-red-500 animate-pulse' : 'text-gray-500'}">
                        ${getDaysRemaining(m.deadline)}
                    </span>
                </div>
            </div>

            <div class="flex items-center gap-3 relative z-10 bg-[#050505] rounded-lg p-2 border border-white/5">
                <span class="text-[9px] font-mono font-bold w-9 text-right ${done ? 'text-green-500' : 'text-red-500'}">${p}%</span>
                <input type="range" min="0" max="100" value="${p}" 
                    oninput="window.updateMetaProgressTactical('${m.id}', this.value)"
                    class="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-600 hover:accent-red-500 transition-all">
                <button onclick="window.deleteMetaTactical('${m.id}')" class="text-gray-700 hover:text-red-600 px-1.5 transition-colors" title="Abortar">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
            </div>
            ${done ? '<div class="absolute top-2 right-2 pointer-events-none"><i class="fa-solid fa-check-circle text-green-500/20 text-4xl"></i></div>' : ''}
        </div>`;
    }).join('');
}

initTactical();