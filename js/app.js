/* js/app.js - VERSÃO RESTAURADA E OTIMIZADA (SEM NOTIFICAÇÕES) */

document.addEventListener('DOMContentLoaded', () => {

    // CONFIGURAÇÕES
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev";
    const API_MODEL = "llama-3.1-8b-instant";

    // --- ELEMENTOS DO DOM ---
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    // UI Geral
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    

    // --- FUNÇÕES DE CONVERSÃO RESTAURADAS ---

    function triggerFakeLoading(container, input) {
        input.disabled = true;
        input.placeholder = "Gerando Dossiê...";

        const loaderId = 'loader-' + Date.now();
        const loaderHTML = `
            <div id="${loaderId}" class="w-full mt-4 mb-8 fade-in">
                <div class="bg-[#111] border border-white/10 rounded-xl p-6 text-center shadow-lg">
                    <p class="text-gray-400 text-xs mb-3 font-mono-code animate-pulse" id="loaderText${loaderId}">> Mapeando padrões...</p>
                    <div class="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden border border-white/5">
                        <div class="bg-red-600 h-full w-0 transition-all duration-[3000ms] ease-out shadow-[0_0_10px_rgba(220,38,38,0.7)]" id="loaderBar${loaderId}"></div>
                    </div>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', loaderHTML);
        const bar = document.getElementById(`loaderBar${loaderId}`);
        const text = document.getElementById(`loaderText${loaderId}`);

        scrollToBottom();

        setTimeout(() => { bar.style.width = "45%"; }, 100);
        setTimeout(() => { text.innerText = "> Cruzando dados neuroquímicos..."; }, 1500);
        setTimeout(() => { bar.style.width = "80%"; text.innerText = "> Identificando gatilhos..."; }, 2200);
        setTimeout(() => { bar.style.width = "100%"; text.innerText = "> Dossiê Gerado."; }, 3200);

        setTimeout(() => {
            const loaderEl = document.getElementById(loaderId);
            if (loaderEl) loaderEl.remove();
            renderSalesCard(container);
        }, 3800);
    }

    function renderSalesCard(container) {
        const saleHTML = `
            <div class="w-full mt-4 mb-8 animate-fade-in-up">
                <div class="bg-[#0f0f0f] border border-red-900/50 rounded-xl p-6 text-center shadow-[0_0_25px_rgba(204,0,0,0.1)] relative overflow-hidden group">
                    <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-900 via-red-600 to-red-900"></div>
                    
                    <div class="flex justify-center mb-3">
                        <div class="w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center border border-red-500/30">
                            <i class="fas fa-file-medical-alt text-red-500"></i>
                        </div>
                    </div>

                    <h3 class="text-white font-bold text-sm uppercase tracking-wider mb-1">Dossiê Completo Gerado</h3>
                    <p class="text-gray-500 text-[10px] mb-4">Estratégia personalizada pronta para acesso.</p>
                    
                    <div class="text-left bg-black/40 border border-white/5 p-4 rounded mb-5 relative select-none overflow-hidden cursor-pointer" onclick="window.location.href='index.html#planos'">
                        <div class="filter blur-[4px] opacity-50 text-[10px] text-gray-400 group-hover:blur-[2.5px] transition-all duration-500 leading-relaxed">
                            <strong>1. Gatilho Primário:</strong> O padrão identificado mostra uma sobrecarga de dopamina barata às...<br>
                            <strong>2. Ação Corretiva:</strong> Aplicar o jejum de telas por 15 minutos logo após...<br>
                            <strong>3. Ferramenta Sugerida:</strong> Utilizar o "Faca na caveira" sempre que sentir...
                        </div>
                        <div class="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/20 to-transparent">
                            <div class="bg-black/80 backdrop-blur-sm border border-red-500/30 px-3 py-1.5 rounded-full flex items-center gap-2">
                                <i class="fas fa-lock text-red-500 text-xs"></i>
                                <span class="text-[9px] font-bold text-white uppercase tracking-wider">Conteúdo Bloqueado</span>
                            </div>
                        </div>
                    </div>

                    <a href="index.html#planos" class="block w-full py-3.5 bg-[#CC0000] hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-[0.15em] transition-all shadow-lg shadow-red-900/20 active:scale-[0.98]">
                        DESBLOQUEAR AGORA
                    </a>
                    <p class="text-[9px] text-gray-600 mt-2">Garantia de 7 dias ou seu dinheiro de volta.</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', saleHTML);
        scrollToBottom();
    }

    // --- SEQUÊNCIA DE PÂNICO (URGÊNCIA) ---
    window.triggerPanicSequence = function () {
        if (sidebar && sidebar.classList.contains('open')) toggleSidebar();
        switchTab('chat');
        messagesContainer.innerHTML = '';

        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-red-600/20 z-50 pointer-events-none animate-pulse';
        document.body.appendChild(overlay);
        setTimeout(() => overlay.remove(), 2000);

        const alertHTML = `
            <div class="text-center py-10 fade-in">
                <i class="fas fa-biohazard text-4xl text-red-500 mb-4 animate-spin-slow"></i>
                <h2 class="text-xl font-black text-white uppercase tracking-widest mb-2">Analisando Crise</h2>
                <div class="w-48 h-1 bg-gray-800 rounded-full mx-auto overflow-hidden mt-4">
                    <div class="h-full bg-red-500 animate-progress-loading"></div>
                </div>
                <p class="text-[10px] text-red-400 font-mono mt-2 blink">DETECTANDO PADRÃO DE RECAÍDA...</p>
            </div>
        `;
        messagesContainer.innerHTML = alertHTML;

        setTimeout(() => {
            messagesContainer.innerHTML = '';
            const lockHTML = `
                <div class="mt-4 bg-[#110505] border border-red-500/50 rounded-xl p-6 text-center shadow-[0_0_30px_rgba(220,38,38,0.2)] animate-slide-up">
                    <div class="w-12 h-12 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500 text-red-500">
                        <i class="fas fa-hand-paper text-xl"></i>
                    </div>
                    <h3 class="text-white font-bold text-lg mb-2">Intervenção Bloqueada</h3>
                    <p class="text-gray-400 text-xs mb-6 leading-relaxed">
                        O Protocolo de Emergência é uma ferramenta avançada para parar recaídas na hora.
                    </p>
                    <button onclick="window.location.href='index.html#planos'" class="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded uppercase tracking-widest text-xs shadow-lg transition">
                        Desbloquear Agora
                    </button>
                    <p class="text-[9px] text-gray-600 mt-3">Você está a um clique de salvar seu dia.</p>
                </div>
            `;
            messagesContainer.innerHTML = lockHTML;
        }, 2500);
    }

    // --- SIMULAÇÃO DE POTENCIAL (JORNADA) ---
    window.switchTab = function (tab) {
        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            viewProtocolo.classList.add('hidden');
            tabChat.classList.add('active'); tabChat.style.color = '#CC0000';
            tabProtocolo.classList.remove('active'); tabProtocolo.style.color = '#666';
        } else {
            viewChat.classList.add('hidden');
            viewProtocolo.classList.remove('hidden');
            tabChat.classList.remove('active'); tabChat.style.color = '#666';
            tabProtocolo.classList.add('active'); tabProtocolo.style.color = '#CC0000';

            if (!window.hasSeenJourneyAnimation) {
                playJourneyAnimation();
                window.hasSeenJourneyAnimation = true;
            }
        }
    }

    function playJourneyAnimation() {
        const grid = document.getElementById('demoCalendarGrid');
        if (!grid) return;

        grid.innerHTML = '';
        for (let i = 1; i <= 30; i++) {
            const el = document.createElement('div');
            el.className = 'calendar-day border border-[#222] text-[#333]';
            el.innerText = i;
            el.id = `day-${i}`;
            grid.appendChild(el);
        }

        let count = 1;
        const interval = setInterval(() => {
            if (count > 20) {
                clearInterval(interval);
                showJourneyLock(grid);
                return;
            }
            const el = document.getElementById(`day-${count}`);
            if (el) {
                el.className = 'calendar-day bg-green-500 text-white border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)] transform scale-110 transition';
                el.innerHTML = '<i class="fas fa-check text-xs"></i>';
            }
            count++;
        }, 80);
    }

    function showJourneyLock(grid) {
        setTimeout(() => {
            grid.classList.add('opacity-30', 'blur-[1px]', 'transition', 'duration-1000');
            const banner = document.getElementById('journeyLockBanner');
            if (banner) {
                banner.classList.remove('hidden');
                banner.classList.add('animate-pop-in');
            }
        }, 500);
    }

    function scrollToBottom() {
        const scroller = document.querySelector('.chat-messages');
        if (scroller) setTimeout(() => scroller.scrollTop = scroller.scrollHeight, 50);
    }

    function startTypewriter(phrases) {
        const el = document.getElementById('typewriter-text');
        if (!el) return;
        let pIndex = 0, cIndex = 0, isDeleting = false;
        if (window.typewriterTimeout) clearTimeout(window.typewriterTimeout);
        function type() {
            const current = phrases[pIndex];
            el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
            cIndex += isDeleting ? -1 : 1;
            let speed = isDeleting ? 30 : 80;
            if (!isDeleting && cIndex === current.length) { isDeleting = true; speed = 2000; }
            else if (isDeleting && cIndex === 0) { isDeleting = false; pIndex = (pIndex + 1) % phrases.length; speed = 500; }
            window.typewriterTimeout = setTimeout(type, speed);
        }
        type();
    }

    selectTool('Diagnostico');
});