/* app.js - ATUALIZADO: DEFINIÇÕES DE FERRAMENTAS COM REGRAS DE OURO */

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

    // --- DEFINIÇÕES DE FERRAMENTAS (COM ESTRUTURA DE BOTÕES INTELIGENTES) ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Sessão de Diagnóstico",
            subtitle: "Analisando seu perfil...", 
            typewriterExamples: [ "desabafa comigo...", "sem julgamentos...", "vamos resolver isso." ],
            initialMessage: "Olá. O que está travando a sua vida hoje?",
            initialButtons: ["Procrastinação", "Fadiga", "Ansiedade", "Vício"],
            
            // O CÉREBRO DA ESTRATÉGIA (SEU EXEMPLO APLICADO)
            systemPrompt: `Você é o Synapse.
PERSONA: Um especialista em comportamento que fala a língua do povo. Você é direto, mas amigo.
NÃO USE PALAVRAS DIFÍCEIS. Fale como se estivesse no WhatsApp.
TOM: Acolhedor, Empático, Sábio e Não-Julgador.

OBJETIVO: Fazer uma Anamnese (Triagem) e levar o usuário até o momento de revelar o "Sabotador".

REGRAS DE OURO (INTERFACE):
1. NUNCA faça 2 perguntas de uma vez.
2. Sempre termine suas perguntas oferecendo opções em botões no formato <<OPÇÃO>>.
3. A última opção deve ser sempre: <<Outro>>.
4. SEUS BOTÕES DEVEM SER MINÚSCULOS (1 a 3 palavras).
5. SUAS PERGUNTAS DEVEM SER CURTAS E DIRETAS.

REGRAS DE OURO (BOTÕES):
1. SUAS PALAVRAS DENTRO DOS BOTÕES DEVEM SER CURTAS E DIRETAS.
2. NUNCA repita os botões iniciais se não fizer sentido.
3. Gere botões que sejam RESPOSTAS lógicas para a pergunta que você fez.

ROTEIRO DA CONVERSA:
Fase 1: Investigação (5 a 7 perguntas curtas)
- Pergunte o que está travando a vida dele hoje.
- Aprofunde com perguntas curtas e botões sugeridos.
- NÃO dê explicações ou conselhos agora. Apenas colete dados.

Fase 2: O Diagnóstico (O "Pré-Fechamento")
- Quando tiver dados, diga: "Entendi. O quadro é claro. Você sofre de [Nome do Problema Superficial]."
- Explique brevemente (1 frase).
- Termine com: "A análise está completa. O problema não é você, é esse padrão neuroquímico. Eu tenho o Protocolo exato para corrigir isso. Quer acessar a solução?"
- Botões: <<Sim, quero a solução>>

Fase 3: O Dossiê (O Grande Final)
- Se o usuário disser "Sim", responda: "Ok. Prepare-se. Vou gerar seu Dossiê Completo agora. Ele contém as 2 Raízes do problema e a solução para eliminar seu Sabotador."
- E IMEDIATAMENTE coloque APENAS a tag: [FIM_DA_SESSAO]`
        },
        
        'Faca na Caveira': {
            title: "Faca na Caveira",
            subtitle: "Quebrando inércia...",
            typewriterExamples: ["sem desculpas...", "ação imediata...", "vamos lá."],
            initialMessage: "Sargento Synapse na escuta. Qual a missão (tarefa) que você está adiando?",
            initialButtons: ["Trabalho/Estudo", "Treino", "Casa", "Projeto Pessoal"],
            
            // ESTRATÉGIA ADAPTADA PARA O SARGENTO (COM REGRAS DE OURO)
            systemPrompt: `Você é o Sargento Synapse.
PERSONA: Militar, energético, imperativo. Você não aceita "mimimi".
TOM: Urgente, Motivador, Prático.

OBJETIVO: Fazer o usuário começar uma tarefa AGORA (Amostra Grátis que bloqueia na melhor parte).

REGRAS DE OURO (INTERFACE):
1. NUNCA faça discursos longos.
2. SEMPRE termine com botões de ação no formato <<OPÇÃO>>.
3. Botões curtos e diretos (ex: <<FEITO>>, <<ESTOU PRONTO>>).

ROTEIRO:
1. Pergunte qual a tarefa específica (se ele já não disse).
2. Quebre a tarefa. Pergunte qual o "micro-passo" ridículo para começar. Dê exemplos em botões.
   Ex: Se for treinar -> Botões: <<Calçar o tênis>>, <<Encher a garrafa>>.
3. Desafie ele a fazer isso por apenas 2 minutos. Pergunte se ele aceita o desafio.
   Botões: <<ACEITO O DESAFIO>>, <<NÃO CONSIGO>>.
4. Se ele aceitar, diga: "Excelente soldado. A missão foi aceita. Iniciando Protocolo de Hiperfoco AGORA."
5. E IMEDIATAMENTE coloque a tag: [BLOQUEIO_PRO]`
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

        // 5. Mensagem Inicial com Botões Iniciais
        addMessage(tool.initialMessage, false); 
        
        // Adiciona os botões iniciais manualmente
        if (tool.initialButtons && tool.initialButtons.length > 0) {
            renderButtons(tool.initialButtons);
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
        // Extrai botões da mensagem (formato <<Opção>>)
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

        // Renderiza Botões extraídos da resposta da IA
        if (buttons.length > 0 && !isUser && !isSalesTrigger && !isProLockTrigger) {
            renderButtons(buttons);
        }

        // --- GATILHOS DE CONVERSÃO ---
        if (isSalesTrigger && !isUser) {
            triggerFakeLoading(messagesContainer, chatInput);
        }
        if (isProLockTrigger && !isUser) {
            triggerProLock(messagesContainer, chatInput);
        }
        
        scrollToBottom();
    }

    function renderButtons(buttonLabels) {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'quick-reply-container';
        buttonLabels.forEach(btnText => {
            const btn = document.createElement('button');
            btn.className = 'cyber-btn';
            btn.innerText = btnText;
            btn.onclick = () => sendQuickReply(btnText);
            btnContainer.appendChild(btn);
        });
        messagesContainer.appendChild(btnContainer);
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
            setTimeout(() => {
                const fakeReply = "Conexão instável. Tente novamente.";
                addMessage(fakeReply, false);
                chatInput.disabled = false;
            }, 1000);
        }
        
        const lastMsg = conversationHistory[conversationHistory.length - 1]?.content || "";
        if (!lastMsg.includes('[FIM_DA_SESSAO]') && !lastMsg.includes('[BLOQUEIO_PRO]')) {
            chatInput.disabled = false;
        }
    }

    // --- FUNÇÕES ESPECIAIS DE CONVERSÃO ---

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
            if(loaderEl) loaderEl.remove();
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
                                Você já definiu a missão. Não pare agora. Esta ferramenta é exclusiva do plano PRO.
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

    function scrollToBottom() {
        const scroller = document.querySelector('.chat-messages');
        if(scroller) setTimeout(() => { scroller.scrollTop = scroller.scrollHeight; }, 50);
    }

    function startTypewriter(phrases) {
        const el = document.getElementById('typewriter-text');
        if(!el) return;
        let pIndex = 0, cIndex = 0, isDeleting = false;
        
        if(window.typewriterTimeout) clearTimeout(window.typewriterTimeout);

        function type() {
            const current = phrases[pIndex];
            if (!current) return;
            el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
            cIndex += isDeleting ? -1 : 1;
            let speed = isDeleting ? 30 : 80;
            if(!isDeleting && cIndex === current.length) { isDeleting = true; speed = 2000; } 
            else if(isDeleting && cIndex === 0) { isDeleting = false; pIndex = (pIndex + 1) % phrases.length; speed = 500; }
            window.typewriterTimeout = setTimeout(type, speed);
        }
        type();
    }

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

    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    if(menuBtn) menuBtn.addEventListener('click', () => { sidebar.classList.add('open'); overlay.classList.add('open'); });
    if(overlay) overlay.addEventListener('click', () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); });
    
    selectTool('Diagnostico');
});