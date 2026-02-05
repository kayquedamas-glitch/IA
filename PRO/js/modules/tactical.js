// APP/PRO/js/modules/tactical.js

// --- CONFIGURAÇÃO E INICIALIZAÇÃO ---
export function initTactical() {
    console.log("⚔️ Módulo Tático: Inicializando (Layout Responsivo V3)...");
    
    // 1. Carrega Estado Seguro
    try {
        const backup = localStorage.getItem('synapse_data_backup');
        if (backup) {
            window.AppEstado = JSON.parse(backup);
        } else {
            const userSession = localStorage.getItem('synapse_user');
            window.AppEstado = userSession ? { user: JSON.parse(userSession) } : {};
        }
    } catch (e) {
        console.error("Erro crítico ao carregar:", e);
        window.AppEstado = {};
    }

    // 2. Garante Estrutura de Dados
    if (!window.AppEstado.gamification) window.AppEstado.gamification = {};
    if (!window.AppEstado.gamification.habits) window.AppEstado.gamification.habits = [];
    if (!window.AppEstado.gamification.metas) window.AppEstado.gamification.metas = [];

    // 3. AUTO-CORREÇÃO DE DADOS
    window.AppEstado.gamification.habits = window.AppEstado.gamification.habits.map(h => ({
        ...h,
        id: h.id || generateUUID(),
        title: h.title || h.text || h.name || "Protocolo Sem Nome", 
        text: h.title || h.text || h.name || "Protocolo Sem Nome",
        history: Array.isArray(h.history) ? h.history : [],
        frequency: h.frequency || 'Diário'
    }));

    // 4. Salva a correção
    localStorage.setItem('synapse_data_backup', JSON.stringify(window.AppEstado));

    // 5. Configura Ações e Injeta Modais
    injectMetasModal();
    setupTacticalActions(); 
    
    // 6. Renderiza a tela
    renderTacticalView();
}

// --- UTILITÁRIOS ---
function generateUUID() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx'.replace(/[xy]/g, c => (Math.random()*16|0).toString(16));
}

function getTodayDate() { return new Date().toLocaleDateString('en-CA'); }

function getDaysRemaining(deadline) {
    if (!deadline) return "∞";
    const diff = new Date(deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} dias` : (days === 0 ? "Hoje" : "Atrasado");
}

function getCategoryIcon(cat) {
    const map = { 'financeiro': 'fa-sack-dollar', 'carreira': 'fa-briefcase', 'saude': 'fa-heart-pulse', 'pessoal': 'fa-user-astronaut' };
    return map[cat] || 'fa-star';
}

function getCategoryColor(cat) {
    const map = { 'financeiro': 'text-green-400', 'carreira': 'text-blue-400', 'saude': 'text-red-400', 'pessoal': 'text-purple-400' };
    return map[cat] || 'text-white';
}

// --- MODAL HTML (CORRIGIDO - RESPONSIVO) ---
function injectMetasModal() {
    const oldModal = document.getElementById('modalNovaMeta');
    if (oldModal) oldModal.remove();

    // MUDANÇA PRINCIPAL AQUI:
    // 1. Usamos 'fixed inset-0 flex items-center justify-center' para centralizar perfeitamente.
    // 2. 'max-h-[85vh]' e 'overflow-y-auto' garantem que o modal role se for grande demais.
    // 3. 'z-[99999]' garante que fique acima de tudo.
    
    const modalHTML = `
    <div id="modalNovaMeta" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 hidden">
        
        <div class="absolute inset-0 bg-black/90 backdrop-blur-sm transition-opacity cursor-pointer" onclick="window.closeMetaModalTactical()"></div>
        
        <div class="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(204,0,0,0.3)] p-6 animate-fade-in-up max-h-[85vh] overflow-y-auto custom-scrollbar flex flex-col">
            
            <div class="flex justify-between items-start mb-1">
                <h3 class="text-xl font-black text-white uppercase tracking-tighter">Nova Meta</h3>
                <button onclick="window.closeMetaModalTactical()" class="text-gray-500 hover:text-white p-1"><i class="fa-solid fa-xmark"></i></button>
            </div>
            
            <p class="text-[10px] text-gray-500 font-mono mb-6">DEFINA SEU OBJETIVO ESTRATÉGICO</p>

            <div class="space-y-4 flex-grow">
                <div>
                    <label class="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Nome da Meta</label>
                    <input type="text" id="inputMetaTitulo" class="w-full bg-[#151515] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-red-500 outline-none transition-colors placeholder-gray-700" placeholder="Ex: Comprar Macbook">
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Categoria</label>
                        <div class="relative">
                            <select id="selectMetaCategoria" class="w-full bg-[#151515] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-red-500 outline-none appearance-none cursor-pointer">
                                <option value="financeiro">Financeiro</option>
                                <option value="carreira">Carreira</option>
                                <option value="saude">Saúde</option>
                                <option value="pessoal">Pessoal</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="text-[10px] text-gray-400 uppercase font-bold tracking-widest block mb-1">Prazo</label>
                        <input type="date" id="inputMetaPrazo" class="w-full bg-[#151515] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-red-500 outline-none cursor-pointer text-gray-300">
                    </div>
                </div>

                <div class="flex gap-3 mt-6 pt-4 border-t border-white/5 shrink-0">
                    <button onclick="window.closeMetaModalTactical()" class="flex-1 py-3 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition">Cancelar</button>
                    <button onclick="window.saveNewMetaTactical()" type="button" class="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/40 transition active:scale-95">
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    </div>`;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// --- AÇÕES GLOBAIS ---
function setupTacticalActions() {
    
    const forceUpdate = () => {
        localStorage.setItem('synapse_data_backup', JSON.stringify(window.AppEstado));
        requestAnimationFrame(() => renderTacticalView());
    };

    // 1. ADICIONAR HÁBITO
    window.openAddHabitModal = () => {
        // Pequeno delay para evitar conflito de UI
        setTimeout(() => {
            const title = prompt("NOME DO NOVO PROTOCOLO:");
            if (title && title.trim()) {
                const newHabit = {
                    id: generateUUID(),
                    title: title.trim(),
                    text: title.trim(),
                    history: [],
                    frequency: 'Diário',
                    done: false
                };
                window.AppEstado.gamification.habits.unshift(newHabit);
                forceUpdate();
                try { if(window.playSFX) window.playSFX('success'); } catch(e){}
            }
        }, 50);
    };

    // 2. TOGGLE HÁBITO
    window.toggleHabitDateTactical = (id, dateString) => {
        const habit = window.AppEstado.gamification.habits.find(h => h.id === id);
        if (habit) {
            if (!habit.history) habit.history = [];
            const idx = habit.history.indexOf(dateString);
            idx > -1 ? habit.history.splice(idx, 1) : habit.history.push(dateString);
            forceUpdate();
        }
    };
    
    // 3. DELETAR HÁBITO
    window.deleteHabitTactical = (id) => {
        if(!confirm("Remover este protocolo?")) return;
        window.AppEstado.gamification.habits = window.AppEstado.gamification.habits.filter(h => h.id !== id);
        forceUpdate();
        try { if(window.playSFX) window.playSFX('delete'); } catch(e){}
    };

    // 4. SISTEMA DE METAS (VISUALIZAÇÃO)
    window.openNewMetaModalTactical = () => {
        const modal = document.getElementById('modalNovaMeta');
        if(modal) { 
            modal.classList.remove('hidden'); 
            // Bloqueia scroll do fundo para evitar rolagem dupla
            document.body.style.overflow = 'hidden';
        } else { 
            injectMetasModal(); 
            document.getElementById('modalNovaMeta').classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeMetaModalTactical = () => {
        const modal = document.getElementById('modalNovaMeta');
        if(modal) { 
            modal.classList.add('hidden'); 
            // Libera scroll do fundo
            document.body.style.overflow = '';
        }
    };

    // 5. SALVAR META
    window.saveNewMetaTactical = () => {
        const inputTitulo = document.getElementById('inputMetaTitulo');
        const inputCategoria = document.getElementById('selectMetaCategoria');
        const inputPrazo = document.getElementById('inputMetaPrazo');

        if (!inputTitulo || !inputTitulo.value.trim()) {
            alert("Digite o nome da meta!");
            return;
        }

        const novaMeta = {
            id: generateUUID(),
            title: inputTitulo.value,
            category: inputCategoria.value,
            deadline: inputPrazo.value || getTodayDate(),
            progress: 0,
            status: 'active'
        };

        window.AppEstado.gamification.metas.push(novaMeta);
        forceUpdate();
        window.closeMetaModalTactical();
        
        // Limpa
        inputTitulo.value = ''; 
    };

    window.updateMetaProgressTactical = (id, newProgress) => {
        const meta = window.AppEstado.gamification.metas.find(m => m.id === id);
        if (meta) {
            meta.progress = parseInt(newProgress);
            meta.status = meta.progress >= 100 ? 'completed' : 'active';
            forceUpdate();
        }
    };

    window.deleteMetaTactical = (id) => {
        if(!confirm("Excluir meta?")) return;
        window.AppEstado.gamification.metas = window.AppEstado.gamification.metas.filter(m => m.id !== id);
        forceUpdate();
    };
    
    window.initTacticalModule = renderTacticalView;
}

// --- RENDERIZAÇÃO ---
function renderTacticalView() {
    const habitContainer = document.getElementById('habitListTactical');
    const metaContainer = document.getElementById('missionListTactical');

    if (habitContainer) renderHabits(habitContainer, window.AppEstado.gamification.habits || []);
    if (metaContainer) renderMetas(metaContainer, window.AppEstado.gamification.metas || []);
}

function renderHabits(container, habits) {
    if (!habits || habits.length === 0) {
        container.innerHTML = `<div class="flex flex-col items-center justify-center py-6 opacity-40 border border-dashed border-white/10 rounded-lg"><i class="fa-solid fa-seedling text-xl mb-2 text-gray-500"></i><span class="text-[10px] uppercase tracking-widest text-gray-500">Sem protocolos ativos</span></div>`; 
        return;
    }
    
    const dates = [];
    for(let i=0; i<5; i++) {
        const d = new Date(); d.setDate(d.getDate() - i);
        dates.push(d.toLocaleDateString('en-CA'));
    }

    container.innerHTML = habits.map(h => {
        const displayTitle = h.title || h.text || h.name || "Sem Nome";
        const safeHistory = Array.isArray(h.history) ? h.history : [];

        const dots = dates.map((date, i) => {
            const done = safeHistory.includes(date);
            const isToday = i === 0;
            return `<div onclick="event.stopPropagation(); window.toggleHabitDateTactical('${h.id}', '${date}')" 
                class="w-${isToday?4:2} h-${isToday?4:2} rounded-full ${done ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-[#222]'} cursor-pointer transition-all border border-white/5 hover:border-white/50"></div>`;
        }).join('');

        return `
        <div class="flex items-center justify-between p-3 bg-[#111] border border-white/5 rounded-xl mb-2 hover:border-white/20 transition-all group animate-fade-in-up">
            <div>
                <h4 class="text-xs font-bold text-white uppercase tracking-tight">${displayTitle}</h4>
                <div class="flex gap-2 mt-1.5 items-center">${dots}</div>
            </div>
            <button onclick="window.deleteHabitTactical('${h.id}')" class="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-500 transition px-2 py-2">
                <i class="fa-solid fa-trash text-xs"></i>
            </button>
        </div>`;
    }).join('');
}

function renderMetas(container, metas) {
    if (!document.getElementById('metasHeaderControl')) {
        container.innerHTML = `
            <div id="metasHeaderControl" class="flex justify-between items-center mb-6">
                <h3 class="text-xs font-black text-white uppercase italic flex items-center gap-2">
                    <i class="fa-solid fa-bullseye text-blue-500"></i> Metas
                </h3>
                <button onclick="window.openNewMetaModalTactical()" class="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600 border border-blue-500/30 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20">
                    <i class="fa-solid fa-plus"></i> Nova
                </button>
            </div>
            <div id="metasGrid" class="space-y-3 pb-20"></div>
        `;
    }

    const grid = document.getElementById('metasGrid');
    if (!grid) return; 

    if (metas.length === 0) {
        grid.innerHTML = `<div class="flex flex-col items-center justify-center py-10 opacity-40"><i class="fa-solid fa-mountain text-4xl text-gray-600 mb-3"></i><span class="text-[10px] uppercase tracking-widest">Nenhuma meta</span></div>`;
        return;
    }

    grid.innerHTML = metas.map(meta => {
        const percent = meta.progress || 0;
        const isDone = percent >= 100;
        const icon = getCategoryIcon(meta.category || 'pessoal');
        const colorClass = getCategoryColor(meta.category || 'pessoal');
        const metaTitle = meta.title || "Meta Sem Nome";

        return `
        <div class="group relative bg-[#121212] border border-white/5 hover:border-white/10 rounded-xl p-4 transition-all overflow-hidden animate-fade-in-up">
            <div class="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-900 to-blue-500 transition-all duration-700" style="width: ${percent}%"></div>
            
            <div class="flex justify-between items-start mb-3 relative z-10">
                <div class="flex gap-3 items-center">
                    <div class="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center border border-white/5 shadow-inner">
                        <i class="fa-solid ${icon} ${isDone ? 'text-green-500' : colorClass} text-sm"></i>
                    </div>
                    <div>
                        <span class="text-[8px] font-bold uppercase tracking-widest text-gray-500 block mb-0.5">${meta.category || 'Geral'}</span>
                        <h4 class="text-sm font-bold text-white leading-tight ${isDone ? 'line-through opacity-50' : ''}">${metaTitle}</h4>
                    </div>
                </div>
                <div class="text-right">
                    <span class="text-[9px] font-mono text-gray-400 block">Prazo</span>
                    <span class="text-[10px] font-bold ${getDaysRemaining(meta.deadline) === 'Atrasado' ? 'text-red-500' : 'text-white'}">${getDaysRemaining(meta.deadline)}</span>
                </div>
            </div>

            <div class="flex items-center gap-3 relative z-10 bg-[#0a0a0a] rounded-lg p-2 border border-white/5">
                <span class="text-[10px] font-mono font-bold w-8 text-right text-blue-400">${percent}%</span>
                <input type="range" min="0" max="100" value="${percent}" 
                    oninput="window.updateMetaProgressTactical('${meta.id}', this.value)"
                    class="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all">
                
                <button onclick="window.deleteMetaTactical('${meta.id}')" class="text-gray-600 hover:text-red-500 px-2 transition-colors">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>
            
            ${isDone ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none"><span class="text-green-500 font-black border-2 border-green-500 px-4 py-2 rounded uppercase tracking-widest transform -rotate-12 text-xs">Concluída</span></div>' : ''}
        </div>`;
    }).join('');
}

initTactical();