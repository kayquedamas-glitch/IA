// APP/PRO/js/modules/tactical.js

console.log("⚔️ Módulo Tático: Sistema de Missões RPG...");

// --- XP por dificuldade ---
const DIFFICULTY_CONFIG = {
    facil: { label: 'Fácil', xp: 25, color: 'text-green-400', border: 'border-green-900/40', bg: 'bg-green-900/10' },
    medio: { label: 'Médio', xp: 60, color: 'text-yellow-400', border: 'border-yellow-800/40', bg: 'bg-yellow-900/10' },
    dificil: { label: 'Difícil', xp: 120, color: 'text-red-400', border: 'border-red-800/40', bg: 'bg-red-900/10' }
};

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
        } catch (e) { }
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
function generateUUID() { return 'xxxxxxxx-xxxx'.replace(/[xy]/g, c => (Math.random() * 16 | 0).toString(16)); }
function getTodayDate() { return new Date().toLocaleDateString('en-CA'); }

function getDaysRemaining(d) {
    if (!d) return null;
    const days = Math.ceil((new Date(d) - new Date()) / 86400000);
    if (days > 1) return { label: `${days} dias`, urgent: false };
    if (days === 1) return { label: `Amanhã`, urgent: true };
    if (days === 0) return { label: `Hoje`, urgent: true };
    return { label: `Atrasada`, urgent: true };
}

function getCategoryIcon(c) {
    const map = { financeiro: 'fa-sack-dollar', carreira: 'fa-briefcase', saude: 'fa-heart-pulse', pessoal: 'fa-user-astronaut' };
    return map[c] || 'fa-star';
}
function getCategoryColor(c) {
    const map = { financeiro: 'text-green-500', carreira: 'text-blue-400', saude: 'text-red-400', pessoal: 'text-purple-400' };
    return map[c] || 'text-white';
}
function getCategoryBg(c) {
    const map = { financeiro: 'bg-green-900/15 border-green-900/30', carreira: 'bg-blue-900/15 border-blue-900/30', saude: 'bg-red-900/15 border-red-900/30', pessoal: 'bg-purple-900/15 border-purple-900/30' };
    return map[c] || 'bg-white/5 border-white/10';
}

function forceUpdate() {
    ensureGlobalState();
    localStorage.setItem('synapse_data_backup', JSON.stringify(window.AppEstado));
    if (window.Database && window.Database.forceSave) window.Database.forceSave();
    renderTacticalView();
}

// --- MODAL DE NOVA MISSÃO ---
function injectMetasModal() {
    const oldModal = document.getElementById('modalNovaMeta');
    if (oldModal) oldModal.remove();

    const modalHTML = `
    <div id="modalNovaMeta" class="fixed inset-0 z-[99999] flex items-center justify-center p-4 hidden">
        <div class="absolute inset-0 bg-black/95 backdrop-blur-sm cursor-pointer" onclick="window.closeMetaModalTactical()"></div>
        <div class="relative w-full max-w-md bg-[#0a0a0a] border border-red-900/30 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.15)] p-6 animate-fade-in-up">
            
            <div class="flex justify-between items-start mb-1">
                <h3 class="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
                    <i class="fa-solid fa-crosshairs text-red-600"></i> Nova Missão
                </h3>
                <button onclick="window.closeMetaModalTactical()" class="text-gray-500 hover:text-red-500 transition"><i class="fa-solid fa-xmark text-lg"></i></button>
            </div>
            <p class="text-[10px] text-gray-600 font-mono mb-6 uppercase tracking-widest">Defina objetivo · recompensa · prazo</p>

            <div class="space-y-4">
                <!-- Nome -->
                <div>
                    <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-1.5">Objetivo da Missão</label>
                    <input type="text" id="inputMetaTitulo" placeholder="Ex: Fechar 2 clientes novos em março"
                        class="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white text-sm focus:border-red-600 outline-none placeholder-gray-700 transition-colors">
                </div>

                <!-- Categoria + Prazo -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-1.5">Categoria</label>
                        <select id="selectMetaCategoria" class="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-red-600 outline-none appearance-none cursor-pointer">
                            <option value="carreira">💼 Carreira</option>
                            <option value="financeiro">💰 Financeiro</option>
                            <option value="saude">❤️ Saúde</option>
                            <option value="pessoal">🚀 Pessoal</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-1.5">Prazo (opcional)</label>
                        <input type="date" id="inputMetaPrazo" class="w-full bg-[#111] border border-white/10 rounded-lg p-3 text-white text-xs focus:border-red-600 outline-none text-gray-300">
                    </div>
                </div>

                <!-- Dificuldade / XP -->
                <div>
                    <label class="text-[10px] text-red-500/80 uppercase font-bold tracking-widest block mb-2">Dificuldade · Recompensa XP</label>
                    <div class="grid grid-cols-3 gap-2" id="difficultyPicker">
                        <button type="button" data-diff="facil"
                            class="diff-btn py-3 rounded-lg border border-green-900/40 bg-green-900/10 text-center transition-all active-diff"
                            onclick="window.selectDifficulty('facil')">
                            <div class="text-green-400 font-black text-xs uppercase">Fácil</div>
                            <div class="text-[10px] text-gray-400 font-mono mt-0.5">+25 XP</div>
                        </button>
                        <button type="button" data-diff="medio"
                            class="diff-btn py-3 rounded-lg border border-white/10 bg-white/5 text-center transition-all"
                            onclick="window.selectDifficulty('medio')">
                            <div class="text-yellow-400 font-black text-xs uppercase">Médio</div>
                            <div class="text-[10px] text-gray-400 font-mono mt-0.5">+60 XP</div>
                        </button>
                        <button type="button" data-diff="dificil"
                            class="diff-btn py-3 rounded-lg border border-white/10 bg-white/5 text-center transition-all"
                            onclick="window.selectDifficulty('dificil')">
                            <div class="text-red-400 font-black text-xs uppercase">Difícil</div>
                            <div class="text-[10px] text-gray-400 font-mono mt-0.5">+120 XP</div>
                        </button>
                    </div>
                    <input type="hidden" id="inputDifficulty" value="facil">
                </div>

                <!-- Botões -->
                <div class="flex gap-3 pt-2 border-t border-white/5 mt-2">
                    <button onclick="window.closeMetaModalTactical()"
                        class="flex-1 py-3 rounded-lg border border-white/10 text-gray-500 hover:text-white hover:bg-white/5 text-xs font-bold uppercase transition">
                        Cancelar
                    </button>
                    <button onclick="window.saveNewMetaTactical()" type="button"
                        class="flex-1 py-3 rounded-lg bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-red-900/30 active:scale-95 transition-all">
                        Criar Missão
                    </button>
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
        if (modal) {
            modal.classList.remove('hidden');
            // Reset seleção
            window.selectDifficulty('facil');
            document.getElementById('inputMetaTitulo').value = '';
            document.getElementById('inputMetaPrazo').value = '';
            setTimeout(() => document.getElementById('inputMetaTitulo')?.focus(), 100);
        } else {
            injectMetasModal();
            document.getElementById('modalNovaMeta').classList.remove('hidden');
        }
    };

    window.closeMetaModalTactical = () => {
        document.getElementById('modalNovaMeta')?.classList.add('hidden');
    };

    window.selectDifficulty = (diff) => {
        document.getElementById('inputDifficulty').value = diff;
        document.querySelectorAll('.diff-btn').forEach(btn => {
            const isSelected = btn.dataset.diff === diff;
            const cfg = DIFFICULTY_CONFIG[btn.dataset.diff];
            btn.style.opacity = isSelected ? '1' : '0.4';
            btn.style.transform = isSelected ? 'scale(1.05)' : 'scale(1)';
            btn.style.borderColor = isSelected ? '' : 'rgba(255,255,255,0.08)';
            btn.style.background = isSelected ? '' : 'rgba(255,255,255,0.03)';
        });
    };

    window.saveNewMetaTactical = () => {
        try {
            ensureGlobalState();
            const tEl = document.getElementById('inputMetaTitulo');
            const cEl = document.getElementById('selectMetaCategoria');
            const pEl = document.getElementById('inputMetaPrazo');
            const dEl = document.getElementById('inputDifficulty');

            if (!tEl || !cEl) return;
            const titulo = tEl.value.trim();
            if (!titulo) {
                tEl.classList.add('border-red-500', 'animate-pulse');
                setTimeout(() => tEl.classList.remove('border-red-500', 'animate-pulse'), 1000);
                return;
            }

            const difficulty = dEl?.value || 'facil';
            const xpReward = DIFFICULTY_CONFIG[difficulty]?.xp || 25;

            window.AppEstado.gamification.metas.push({
                id: generateUUID(),
                title: titulo,
                category: cEl.value,
                deadline: pEl.value || null,
                difficulty,
                xpReward,
                status: 'active',
                createdAt: getTodayDate()
            });

            forceUpdate();
            window.closeMetaModalTactical();
            if (window.playSFX) window.playSFX('success');
        } catch (e) { console.error("Erro ao salvar missão:", e); }
    };

    // COMPLETAR MISSÃO → gera XP
    window.completeMissionTactical = (id) => {
        ensureGlobalState();
        const m = window.AppEstado.gamification.metas.find(x => x.id === id);
        if (!m || m.status === 'completed') return;

        m.status = 'completed';
        m.completedAt = getTodayDate();

        // Concede XP via gamification module
        const xp = m.xpReward || 25;
        if (window.addXP) {
            window.addXP(xp);
        } else if (typeof addXP === 'function') {
            addXP(xp);
        }

        forceUpdate();

        // Toast de XP
        if (window.showToast) {
            window.showToast('MISSÃO CONCLUÍDA!', `+${xp} XP desbloqueados`, 'success');
        }
        if (window.playSFX) window.playSFX('success');
    };

    window.deleteMetaTactical = (id) => {
        if (confirm("Deseja abandonar esta missão?")) {
            ensureGlobalState();
            window.AppEstado.gamification.metas = window.AppEstado.gamification.metas.filter(x => x.id !== id);
            forceUpdate();
            if (window.playSFX) window.playSFX('delete');
        }
    };

    window.initTacticalModule = renderTacticalView;

    // addNewMission compat (chamado do HTML via window.addNewMission)
    window.addNewMission = () => window.openNewMetaModalTactical();
}

// --- RENDERIZAÇÃO ---
function renderTacticalView() {
    const container = document.getElementById('missionListTactical');
    if (!container) return;
    ensureGlobalState();

    // Header (apenas uma vez)
    if (!document.getElementById('metasHeaderControl')) {
        container.innerHTML = `
            <div id="metasHeaderControl" class="flex justify-end items-center mb-4 animate-fade-in">
                <button onclick="window.openNewMetaModalTactical()"
                    class="group flex items-center gap-2 bg-blue-900/10 hover:bg-blue-600 border border-blue-900/40 text-blue-400 hover:text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all">
                    <i class="fa-solid fa-plus group-hover:rotate-90 transition-transform"></i> Nova Missão
                </button>
            </div>
            <div id="metasGrid" class="space-y-3 pb-24"></div>
        `;
    }

    const grid = document.getElementById('metasGrid');
    if (!grid) return;

    const metas = window.AppEstado.gamification.metas || [];

    if (metas.length === 0) {
        grid.innerHTML = `
            <div class="flex flex-col items-center justify-center py-14 opacity-30 border border-dashed border-white/5 rounded-xl">
                <i class="fa-solid fa-chess-rook text-3xl mb-3 text-gray-700"></i>
                <span class="text-[9px] uppercase tracking-widest text-gray-500">Nenhuma missão ativa.<br>Crie sua primeira missão acima.</span>
            </div>`;
        return;
    }

    // Ativas primeiro, depois concluídas
    const sorted = [...metas].sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return 1;
        if (b.status === 'completed' && a.status !== 'completed') return -1;
        return 0;
    });

    grid.innerHTML = sorted.map(m => {
        const done = m.status === 'completed';
        const diff = DIFFICULTY_CONFIG[m.difficulty] || DIFFICULTY_CONFIG.facil;
        const icon = getCategoryIcon(m.category);
        const catColor = getCategoryColor(m.category);
        const catBg = getCategoryBg(m.category);
        const deadline = getDaysRemaining(m.deadline);

        if (done) {
            // Card concluída: compacto e esmaecido
            return `
            <div class="relative bg-[#0a0a0a] border border-green-900/20 rounded-xl p-3.5 flex items-center gap-3 opacity-50 group transition-all">
                <div class="w-8 h-8 rounded-lg bg-green-900/15 border border-green-900/30 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-check text-green-500 text-xs"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[11px] font-bold text-gray-400 line-through truncate">${m.title}</p>
                    <p class="text-[9px] text-gray-600 font-mono mt-0.5">
                        <i class="fa-solid ${icon} mr-1"></i>${m.category}
                        &nbsp;·&nbsp;
                        <span class="text-green-500/70">+${m.xpReward} XP ganhos</span>
                    </p>
                </div>
                <button onclick="window.deleteMetaTactical('${m.id}')"
                    class="text-gray-700 hover:text-red-600 opacity-0 group-hover:opacity-100 px-1.5 transition-all flex-shrink-0" title="Remover">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
            </div>`;
        }

        // Card ativa
        const deadlineHTML = deadline
            ? `<span class="text-[9px] font-bold font-mono ${deadline.urgent ? 'text-red-400 animate-pulse' : 'text-gray-500'}">
                   <i class="fa-regular fa-clock mr-1"></i>${deadline.label}
               </span>`
            : `<span class="text-[9px] text-gray-600 font-mono">Sem prazo</span>`;

        return `
        <div class="relative bg-[#0c0c0c] border border-white/5 hover:border-white/10 rounded-xl p-4 overflow-hidden group transition-all duration-200">
            <!-- Linha de cor da categoria no topo -->
            <div class="absolute top-0 left-0 right-0 h-[2px] ${catColor.replace('text-', 'bg-')} opacity-40"></div>

            <!-- Cabeçalho da missão -->
            <div class="flex items-start gap-3 mb-4">
                <!-- Ícone de categoria -->
                <div class="w-10 h-10 rounded-xl ${catBg} border flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid ${icon} ${catColor} text-sm"></i>
                </div>

                <!-- Título + Categoria -->
                <div class="flex-1 min-w-0">
                    <span class="text-[8px] font-bold uppercase tracking-widest ${catColor} opacity-70 block mb-0.5">${m.category}</span>
                    <h4 class="text-sm font-bold text-white leading-snug">${m.title}</h4>
                </div>

                <!-- Lixeira -->
                <button onclick="window.deleteMetaTactical('${m.id}')"
                    class="text-gray-700 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5" title="Abandonar missão">
                    <i class="fa-solid fa-trash text-[10px]"></i>
                </button>
            </div>

            <!-- Footer da missão: prazo + dificuldade + botão concluir -->
            <div class="flex items-center gap-2 flex-wrap">
                <!-- Prazo -->
                ${deadlineHTML}

                <!-- Dificuldade (separador) -->
                <span class="text-gray-700 text-[9px]">·</span>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${diff.bg} border ${diff.border} text-[9px] font-bold ${diff.color}">
                    ${diff.label}
                </span>

                <!-- XP reward -->
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-900/10 border border-blue-900/30 text-[9px] font-bold text-blue-400 ml-auto">
                    <i class="fa-solid fa-bolt text-[8px]"></i> +${m.xpReward} XP
                </span>
            </div>

            <!-- Botão de conclusão -->
            <button onclick="window.completeMissionTactical('${m.id}')"
                class="mt-3 w-full py-2.5 rounded-lg bg-white/5 hover:bg-green-900/20 border border-white/8 hover:border-green-700/40 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-green-400 transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98]">
                <i class="fa-solid fa-flag-checkered"></i>
                Concluir Missão · Resgatar ${m.xpReward} XP
            </button>
        </div>`;
    }).join('');
}

// =====================================================
// CALENDÁRIO SEMANAL + TABS (NOVO DESIGN)
// =====================================================

function renderWeekCalendar() {
    const container = document.getElementById('weekCalendar');
    const monthLabel = document.getElementById('tacticMonthLabel');
    if (!container) return;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Dom, 1=Seg..
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    // Obtém dados de atividade para marcar dots
    const dailyScores = window.AppEstado?.gamification?.dailyScores || {};

    // Calcula os 7 dias da semana atual (segunda a domingo)
    // Ajusta para começar na segunda-feira
    const startDiff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    container.innerHTML = '';

    for (let i = 0; i < 7; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + startDiff + i);

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        const isToday = d.toDateString() === today.toDateString();
        const hasActivity = dailyScores[dateKey] > 0;
        const isFuture = d > today && !isToday;

        const cell = document.createElement('div');
        cell.className = `week-day-cell${isToday ? ' today' : ''}${hasActivity ? ' has-activity' : ''}`;
        cell.innerHTML = `
            <span class="week-day-name">${dayNames[d.getDay()]}</span>
            <div class="week-day-number" style="${isFuture ? 'opacity: 0.3' : ''}">${d.getDate()}</div>
        `;
        container.appendChild(cell);
    }

    // Atualiza label do mês
    if (monthLabel) {
        monthLabel.textContent = `${monthNames[today.getMonth()]} ${today.getFullYear()}`;
    }
}

// Alterna entre os painéis Hábitos e Missões (mobile)
function switchTacticTab(tab) {
    const panelHabits = document.getElementById('panelHabits');
    const panelMissions = document.getElementById('panelMissions');
    const tabHabits = document.getElementById('tabHabits');
    const tabMissions = document.getElementById('tabMissions');

    if (tab === 'habits') {
        panelHabits?.classList.remove('hide-mobile');
        panelMissions?.classList.remove('show-mobile');
        tabHabits?.classList.add('active');
        tabMissions?.classList.remove('active');
    } else {
        panelHabits?.classList.add('hide-mobile');
        panelMissions?.classList.add('show-mobile');
        tabMissions?.classList.add('active');
        tabHabits?.classList.remove('active');
    }

    // Atualiza badge de contagem de missões
    updateMissionBadge();
}

function updateMissionBadge() {
    const badge = document.getElementById('missionCountBadge');
    if (!badge) return;
    const metas = window.AppEstado?.gamification?.metas || [];
    const active = metas.filter(m => m.status !== 'completed').length;
    const total = metas.length;
    badge.textContent = total > 0 ? `${active}/${total}` : '';
}

// Expõe globalmente
window.switchTacticTab = switchTacticTab;
window.renderWeekCalendar = renderWeekCalendar;
window.updateMissionBadge = updateMissionBadge;

initTactical();