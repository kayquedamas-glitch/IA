/* app.js - ATUALIZADO: ESTRATÉGIAS DE CONVERSÃO (BARNUM + LOADING + AMOSTRA GRÁTIS) */

document.addEventListener('DOMContentLoaded', () => {
    
    // CONFIGURAÇÕES
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 

    // --- ELEMENTOS DO DOM ---
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    // Navegação e UI
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada') || document.getElementById('tabProtocolo');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // --- ESTRATÉGIA 1 & 3: DEFINIÇÕES DE FERRAMENTAS COM GATILHOS ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Sessão de Diagnóstico",
            subtitle: "Analisando perfil...", 
            typewriterExamples: [ "identificando padrões...", "acessando núcleo...", "iniciando varredura..." ],
            
            // ESTRATÉGIA 1: EFEITO BARNUM (NOMEAR O SABOTADOR)
            systemPrompt: `Você é o Synapse.
PERSONA: Especialista em comportamento, direto, curto e cirúrgico.
OBJETIVO: Identificar o padrão de comportamento do usuário.

Fase 1: Faça apenas 2 ou 3 perguntas curtas (uma por vez) para entender o problema dele (Procrastinação, Ansiedade, Vício, etc).
Fase 2: Após as respostas, DÊ UM NOME CRIATIVO E IMPACTANTE AO SABOTADOR dele (ex: "O Perfeccionista Paralisado", "O Dopamina Junkie", "O Procrastinador Ansioso").
Fase 3: Diga exatamente esta frase final: "Identifiquei seu padrão. Você está preso no ciclo do [NOME DO SABOTADOR]. Tenho o antídoto químico exato para isso."
Fase 4: IMEDIATAMENTE após essa frase, coloque a tag: [FIM_DA_SESSAO]`
        },
        
        'Faca na Caveira': {
            title: "Faca na Caveira",
            subtitle: "Quebrando inércia...",
            typewriterExamples: ["carregando protocolo...", "preparando dopamina...", "vamos começar."],
            
            // ESTRATÉGIA 3: A "AMOSTRA GRÁTIS" QUE TRAVA NO MOMENTO DO COMPROMISSO
            systemPrompt: `Você é o Sargento Synapse.
OBJETIVO: Fazer o usuário começar uma tarefa AGORA.
ESTILO: Militar, energético, imperativo. Curto.

1. Pergunte: "Qual a única tarefa que você precisa matar agora? Responda em poucas palavras."
2. Aguarde a resposta do usuário.
3. Quando ele responder a tarefa, diga: "Entendido. A missão foi aceita. Vamos ativar o Protocolo de Hiperfoco de 2 Minutos para iniciar [TAREFA DO USUARIO]. Prepare-se." e IMEDIATAMENTE coloque a tag: [BLOQUEIO_PRO]`
        }
    };

    // Estado Inicial
    let currentTool = 'Diagnostico';
    let conversationHistory = [];

    // --- FUNÇÃO GLOBAL DE SELEÇÃO DE FERRAMENTA ---
    window.selectTool = function(toolKey) {
        currentTool = toolKey;
        
        // 1. Atualiza Visual da Sidebar
        document.querySelectorAll('.tool-item').forEach(el => el.classList.remove('active'));
        const activeToolBtn = document.getElementById('tool' + toolKey);
        if(activeToolBtn) activeToolBtn.classList.add('active');

        // 2. Reseta o Chat Completo
        messagesContainer.innerHTML = '';
        const tool = toolDefinitions[toolKey];
        
        // 3. Reseta Histórico com o Novo Prompt
        conversationHistory = [{ role: "system", content: tool.systemPrompt }];
        
        // 4. Recria Cabeçalho
        createHeader(tool.typewriterExamples);

        // 5. Mensagem Inicial Específica
        if (toolKey === 'Diagnostico') {
             addMessage("Olá. O que está travando a sua vida hoje? <<Procrastinação>> <<Fadiga>> <<Ansiedade>> <<Vício>>", false);
        } else if (toolKey === 'Faca na Caveira') {
             addMessage("Sargento Synapse na escuta. Qual a missão (tarefa) que você está adiando? Digite abaixo:", false);
        }
        
        // 6. Habilita input e foca
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.placeholder = "Digite aqui...";
        
        // 7. UI Mobile
        if(sidebar) { sidebar.classList.remove('open'); overlay.classList.remove('open'); }
        switchTab('chat');
    }

    function createHeader(phrases) {
        const headerHTML = `
            <div class="w-full text-center mb-6 p-4 fade-in">
                <p id="chatSubtitle" class="text-gray-400 text-sm">
                    <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                    <span class="animate-pulse">|</span>
                </p>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('afterbegin', headerHTML);
        startTypewriter(phrases);
    }

    // --- LÓGICA DO CHAT ---
    function addMessage(message, isUser, isError = false) {
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        let cleanMessage = message.replace(buttonRegex, '').trim();
        
        // Detecta Gatilhos Especiais
        const isSalesTrigger = cleanMessage.includes('[FIM_DA_SESSAO]');
        const isProLockTrigger = cleanMessage.includes('[BLOQUEIO_PRO]');

        // Limpa as tags do texto visível
        cleanMessage = cleanMessage.replace('[FIM_DA_SESSAO]', '').replace('[BLOQUEIO_PRO]', '').trim();
        
        // Formatação
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = isUser ? 'chat-message-user' : 'chat-message-ia';
            if(isError) div.style.color = '#ff4d4d';
            div.innerHTML = cleanMessage;
            messagesContainer.appendChild(div);
        }

        // Renderiza Botões (apenas se não for fim de sessão)
        if (buttons.length > 0 && !isUser && !isSalesTrigger && !isProLockTrigger) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'quick-reply-container';
            buttons.forEach(btnText => {
                const btn = document.createElement('button');
                btn.className = 'cyber-btn';
                btn.innerText = btnText;
                btn.onclick = () => sendQuickReply(btnText);
                btnContainer.appendChild(btn);
            });
            messagesContainer.appendChild(btnContainer);
        }

        // --- GATILHOS DE CONVERSÃO ---
        
        // 1. ESTRATÉGIA 2: LOADING FAKE + VENDA
        if (isSalesTrigger && !isUser) {
            triggerFakeLoading(messagesContainer, chatInput);
        }

        // 2. ESTRATÉGIA 3: BLOQUEIO PRO (Amostra Grátis)
        if (isProLockTrigger && !isUser) {
            triggerProLock(messagesContainer, chatInput);
        }
        
        scrollToBottom();
    }

    function sendQuickReply(text) {
        const lastBtns = messagesContainer.querySelector('.quick-reply-container:last-child');
        if(lastBtns) lastBtns.style.display = 'none';
        chatInput.value = text;
        sendMessage();
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        chatInput.value = '';
        chatInput.disabled = true;
        
        conversationHistory.push({ role: "user", content: text });

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: API_MODEL,
                    messages: conversationHistory,
                    temperature: 0.7 
                })
            });
            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;
            
            if(!reply) throw new Error("Vazio");

            conversationHistory.push({ role: "assistant", content: reply });
            addMessage(reply, false);

        } catch (e) {
            // Fallback de segurança
            setTimeout(() => {
                const fakeReply = "Conexão instável. Tente novamente.";
                addMessage(fakeReply, false);
                chatInput.disabled = false;
            }, 1000);
        }
        
        // Reabilita input se não houve gatilho de bloqueio na resposta (verificado dentro de addMessage)
        const lastMsg = conversationHistory[conversationHistory.length - 1]?.content || "";
        if (!lastMsg.includes('[FIM_DA_SESSAO]') && !lastMsg.includes('[BLOQUEIO_PRO]')) {
            chatInput.disabled = false;
            // chatInput.focus(); // Opcional no mobile para não pular teclado
        }
    }

    // --- FUNÇÕES ESPECIAIS DE CONVERSÃO ---

    // ESTRATÉGIA 2: LOADING FAKE (Valor Percebido)
    function triggerFakeLoading(container, input) {
        input.disabled = true;
        input.placeholder = "Gerando Dossiê...";

        const loaderId = 'loader-' + Date.now();
        const loaderHTML = `
            <div id="${loaderId}" class="w-full mt-4 mb-8 fade-in">
                <div class="bg-[#111] border border-white/10 rounded-xl p-6 text-center shadow-lg">
                    <p class="text-gray-400 text-xs mb-3 font-mono-code animate-pulse" id="loaderText${loaderId}">> Mapeando padrões de sintaxe...</p>
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

        // Sequência de Animação
        setTimeout(() => { bar.style.width = "45%"; }, 100);
        setTimeout(() => { text.innerText = "> Cruzando dados neuroquímicos..."; }, 1500);
        setTimeout(() => { bar.style.width = "80%"; text.innerText = "> Identificando gatilhos de falha..."; }, 2200);
        setTimeout(() => { bar.style.width = "100%"; text.innerText = "> Dossiê Gerado."; }, 3200);

        // Troca pelo Card de Venda
        setTimeout(() => {
            const loaderEl = document.getElementById(loaderId);
            if(loaderEl) loaderEl.remove();
            renderSalesCard(container);
        }, 3800);
    }

    // ESTRATÉGIA 4: CARD DE VENDA COM BLUR (Curiosidade)
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
                    
                    <!-- BLUR SEDUTOR -->
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

    // ESTRATÉGIA 3: BLOQUEIO PRO (Perda/Compromisso)
    function triggerProLock(container, input) {
        input.disabled = true;
        input.placeholder = "Acesso PRO Necessário.";
        
        const lockHTML = `
            <div class="w-full mt-4 mb-4 animate-fade-in-up">
                <div class="bg-red-900/10 border border-red-500/30 rounded-lg p-4 relative overflow-hidden">
                     <div class="absolute -right-4 -top-4 w-16 h-16 bg-red-500/10 rounded-full blur-xl"></div>
                    
                    <div class="flex items-start gap-3">
                        <i class="fas fa-ban text-red-500 mt-1"></i>
                        <div>
                            <p class="font-bold text-xs text-red-200 mb-1">Acesso Negado ao Protocolo</p>
                            <p class="text-xs text-gray-400 leading-relaxed">
                                Você já definiu a missão. Não pare agora. O "Faca na Caveira" é uma ferramenta exclusiva do plano PRO.
                            </p>
                        </div>
                    </div>
                    
                    <a href="index.html#planos" class="inline-flex items-center gap-2 mt-3 text-[10px] font-bold text-white bg-red-600 px-4 py-2 rounded uppercase hover:bg-red-500 transition shadow-lg shadow-red-900/20">
                        Liberar Acesso Imediato <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', lockHTML);
        scrollToBottom();
    }

    // --- UTILITÁRIOS ---
    function scrollToBottom() {
        const scroller = document.querySelector('.chat-messages');
        if(scroller) setTimeout(() => { scroller.scrollTop = scroller.scrollHeight; }, 50);
    }

    function startTypewriter(phrases) {
        const el = document.getElementById('typewriter-text');
        if(!el) return;
        let pIndex = 0, cIndex = 0, isDeleting = false;
        
        // Limpa intervalo anterior se houver (para evitar sobreposição)
        if(window.typewriterTimeout) clearTimeout(window.typewriterTimeout);

        function type() {
            const current = phrases[pIndex];
            if (!current) return;
            
            el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
            cIndex += isDeleting ? -1 : 1;
            
            let speed = isDeleting ? 30 : 80;

            if(!isDeleting && cIndex === current.length) { 
                isDeleting = true; 
                speed = 2000; 
            } else if(isDeleting && cIndex === 0) { 
                isDeleting = false; 
                pIndex = (pIndex + 1) % phrases.length; 
                speed = 500; 
            }
            
            window.typewriterTimeout = setTimeout(type, speed);
        }
        type();
    }

    // Navegação (Abas)
    window.switchTab = function(tab) {
        if(tabChat) { tabChat.classList.remove('active'); tabChat.style.color = '#666'; }
        if(tabProtocolo) { tabProtocolo.classList.remove('active'); tabProtocolo.style.color = '#666'; }
        
        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');

        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            if(tabChat) { tabChat.classList.add('active'); tabChat.style.color = '#CC0000'; }
        } else {
            viewProtocolo.classList.remove('hidden');
            if(tabProtocolo) { tabProtocolo.classList.add('active'); tabProtocolo.style.color = '#CC0000'; }
            renderCalendar(); 
        }
    }

    // Calendário (Simples para Demo)
    function renderCalendar() {
        const grid = document.getElementById('realCalendarGrid');
        if(!grid) return;
        grid.innerHTML = '';
        ['D','S','T','Q','Q','S','S'].forEach(d => {
            const h = document.createElement('div'); h.className = 'calendar-day-header'; h.innerText = d; grid.appendChild(h);
        });
        const now = new Date();
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const today = now.getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const dayEl = document.createElement('div'); dayEl.className = 'calendar-day'; dayEl.innerText = i;
            if (i < today) {
                if(Math.random() > 0.3) { dayEl.classList.add('success'); dayEl.innerHTML = '<i class="fas fa-check text-[8px]"></i>'; } else { dayEl.style.color = "#333"; }
            } else if (i === today) { dayEl.classList.add('active'); }
            else { 
                dayEl.classList.add('locked'); 
                dayEl.addEventListener('click', () => window.location.href="index.html#planos"); 
            }
            grid.appendChild(dayEl);
        }
    }

    // Listeners
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    if(menuBtn) menuBtn.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('open'); });
    if(overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
    
    // INICIALIZAÇÃO
    selectTool('Diagnostico');
});