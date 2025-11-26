/* app.js - VERSÃO FINAL: DEFINIÇÕES MANTIDAS + OFERTA DIRETA (SEM CHOQUE) */

document.addEventListener('DOMContentLoaded', () => {
    
    // CONFIGURAÇÕES
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 

    // --- ELEMENTOS DO DOM ---
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    const viewChat = document.getElementById('viewChat');
    const viewProtocolo = document.getElementById('viewProtocolo');
    // O viewLocked foi removido da lógica, pois não será mais usado
    
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada') || document.getElementById('tabProtocolo');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // --- CORREÇÃO DO BOTÃO DA SIDEBAR (DIRECIONAR PARA 19,90) ---
    const sidebarBtn = document.querySelector('.sidebar-upgrade-box a');
    if (sidebarBtn) {
        // Força o link a ir para a seção de preço
        sidebarBtn.href = "pag.html#planos"; 
    }

    // --- DEFINIÇÃO DAS FERRAMENTAS E PROMPTS (MANTIDA FIELMENTE) ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Sessão de Diagnóstico",
            subtitle: "Analisando seu perfil...", 
            typewriterExamples: [ 
                "desabafa comigo...",
                "sem julgamentos...",
                "vamos resolver isso."
            ],
            // O CÉREBRO DA ESTRATÉGIA
            systemPrompt: `Você é o Synapse.
PERSONA: Um especialista em comportamento que fala a língua do povo. Você é direto, mas amigo.
NÃO USE PALAVRAS DIFÍCEIS. Fale como se estivesse no WhatsApp.
TOM: Acolhedor, Empático, Sábio e Não-Julgador.

OBJETIVO: Fazer uma Anamnese (Triagem) e levar o usuário até o momento de revelar o "Sabotador".

REGRAS DE OURO (INTERFACE):
1. SUAS PERGUNTAS DEVEM SER CURTAS.
2. Sempre termine suas perguntas oferecendo opções em botões no formato <<OPÇÃO>>.
3. E OBRIGATORIAMENTE a última opção deve ser sempre: <<Outro>>.
4. SEUS BOTÕES DEVEM SER MINÚSCULOS (1 a 3 palavras).

ROTEIRO DA CONVERSA:
Fase 1: Investigação (5 a 7 perguntas)
- Pergunte o que está travando a vida dele hoje.
- Botões sugeridos: <<Preguiça>>, <<Medo>>, <<Cansaço>>, <<Vício>>, <<Outro>>
- Vá aprofundando com perguntas curtas até sentir que entendeu o padrão.

Fase 2: O Diagnóstico do Sintoma (O "Pré-Fechamento")
- Quando tiver dados suficientes, diga: "Entendi. O quadro é claro. Você sofre de [Nome do Problema Superficial, ex: Ciclo de Culpa ou Vício em Dopamina]."
- Explique brevemente (1 frase) por que isso acontece.
- E termine com esta PERGUNTA EXATA: "Mas isso é só a ponta do iceberg. Eu descobri que existe um SABOTADOR INVISÍVEL na sua mente causando tudo isso. Você quer saber quem ele é?"
- Botões: <<Sim, quero saber>>, <<Quem é?>>, <<Me conta>>.

Fase 3: O Dossiê (O Grande Final)
- Se o usuário disser "Sim" (ou algo parecido), responda:
  "Ok. Prepare-se. Vou gerar seu Dossiê Completo agora. Ele contém as 2 Raízes do problema e o Nome do seu Sabotador."
- E IMEDIATAMENTE no final desta mensagem, coloque APENAS a tag: [FIM_DA_SESSAO]
- NÃO escreva mais nada depois da tag.
- Termine a sessão aqui. NÃO FAÇA MAIS PERGUNTAS.
- Não fale as raizes ou o nome do sabotador aqui. Deixe ele curioso e diga que para ter acesso tem que desbloquear nosso plano. Apenas gere a tag para o paywall.`,
            isLocked: false 
        },
        'Estrategista': { title: "Estrategista", isLocked: true },
        'Mestre': { title: "Ferreiro", isLocked: true },
        'Auditor': { title: "Auditor", isLocked: true }
    };

    // INICIALIZAÇÃO DO HISTÓRICO
    let conversationHistory = [{ 
        role: "system", 
        content: toolDefinitions['Diagnostico'].systemPrompt 
    }];

    // --- FUNÇÕES DE NAVEGAÇÃO ---
    window.switchTab = function(tab) {
        if(tabChat) { tabChat.classList.remove('active'); tabChat.style.color = '#666'; }
        if(tabProtocolo) { tabProtocolo.classList.remove('active'); tabProtocolo.style.color = '#666'; }
        
        if(viewChat) viewChat.classList.add('hidden');
        if(viewProtocolo) viewProtocolo.classList.add('hidden');
        // viewLocked removido daqui

        if (tab === 'chat') {
            if(viewChat) viewChat.classList.remove('hidden');
            if(tabChat) { tabChat.classList.add('active'); tabChat.style.color = '#CC0000'; }
        } else {
            if(viewProtocolo) viewProtocolo.classList.remove('hidden');
            if(tabProtocolo) { tabProtocolo.classList.add('active'); tabProtocolo.style.color = '#CC0000'; }
            renderCalendar(); 
        }
    }

    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

    // --- FUNÇÃO DE REDIRECIONAMENTO PARA VENDA (SUBSTITUI O BLOQUEIO) ---
    function redirectToSales() {
        // Redireciona diretamente para a página de vendas (ou oferta) com ancora de preço
        window.location.href = "pag.html#planos"; 
    }

    // --- RESET DO CHAT (CORREÇÃO DO BUG DAS VÍRGULAS) ---
    function resetChat() {
        // 1. Limpa o visual
        messagesContainer.innerHTML = ''; 
        
        // 2. Recria o Cabeçalho do Typewriter
        const headerHTML = `
            <div class="w-full text-center mb-6 p-4">
                <p id="chatSubtitle" class="text-gray-400 text-sm">
                    <span id="typewriter-text" class="text-brutal-red font-medium"></span>
                    <span class="animate-pulse">|</span>
                </p>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('afterbegin', headerHTML);

        // 3. Reseta a memória
        conversationHistory = [{ 
            role: "system", 
            content: toolDefinitions['Diagnostico'].systemPrompt 
        }];
        
        // 4. Reseta Input
        chatInput.disabled = false;
        chatInput.value = '';
        chatInput.placeholder = "Digite aqui...";
        
        // 5. Mensagem Inicial Manual
        const welcomeText = "Olá! Estou aqui para ajudar. O que está travando a sua vida hoje? <<Preguiça>> <<Medo>> <<Cansaço>> <<Vício>> <<Outro>>";
        addMessage(welcomeText, false); 
        
        // 6. Inicia o texto piscando
        startTypewriter(toolDefinitions['Diagnostico'].typewriterExamples);
    }

    // --- LÓGICA DO CHAT ---
    function addMessage(message, isUser, isError = false) {
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        let cleanMessage = message.replace(buttonRegex, '').trim();
        
        // --- FILTRO DE LIMPEZA (CORREÇÃO DAS VÍRGULAS) ---
        cleanMessage = cleanMessage.replace(/\|/g, ''); // Remove barras verticais
        cleanMessage = cleanMessage.replace(/,,,/g, ''); // Remove sequências de vírgulas
        cleanMessage = cleanMessage.replace(/, , ,/g, ''); // Remove vírgulas com espaço
        cleanMessage = cleanMessage.replace(/^,+$/, ''); // Remove linhas que são só vírgulas
        
        const isSalesTrigger = cleanMessage.includes('[FIM_DA_SESSAO]');
        cleanMessage = cleanMessage.replace('[FIM_DA_SESSAO]', '').trim();

        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = isUser ? 'chat-message-user' : 'chat-message-ia';
            if(isError) div.style.color = '#ff4d4d';
            div.innerHTML = cleanMessage;
            messagesContainer.appendChild(div);
        }

        // Botoes de resposta rapida
        if (buttons.length > 0 && !isUser && !isSalesTrigger) {
            const btnContainer = document.createElement('div');
            btnContainer.className = 'quick-reply-container';
            buttons.forEach(btnText => {
                if(btnText.toUpperCase() !== "OPÇÃO") { 
                    const btn = document.createElement('button');
                    btn.className = 'cyber-btn';
                    btn.innerText = btnText;
                    btn.onclick = () => sendQuickReply(btnText);
                    btnContainer.appendChild(btn);
                }
            });
            messagesContainer.appendChild(btnContainer);
        }

        // --- GATILHO DE VENDA (OFERTA DIRETA) ---
        if (isSalesTrigger && !isUser) {
            const saleContainer = document.createElement('div');
            saleContainer.className = 'w-full mt-4 mb-8 animate-pulse';
            saleContainer.innerHTML = `
                <div class="bg-[#111] border border-red-900/50 rounded-xl p-4 text-center shadow-[0_0_20px_rgba(204,0,0,0.2)]">
                    <p class="text-gray-400 text-xs uppercase tracking-widest mb-3 font-bold">Dossiê Bloqueado</p>
                    <i class="fas fa-file-medical-alt text-4xl text-[#CC0000] mb-4"></i>
                    <p class="text-white text-sm mb-4 font-medium">O Synapse identificou o nome do seu Sabotador.</p>
                    
                    <!-- BOTÃO ÚNICO: REVELAR (Vai para Pagina de Vendas com ancora de preço) -->
                    <a href="pag.html#planos" class="block w-full py-3 bg-[#CC0000] hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-900/40 no-underline mb-3">
                        REVELAR IDENTIDADE <i class="fas fa-unlock ml-2"></i>
                    </a>
                </div>
            `;
            messagesContainer.appendChild(saleContainer);
            
            chatInput.disabled = true;
            chatInput.placeholder = "Sessão finalizada.";
        }
        const scroller = document.querySelector('.chat-messages');
        if(scroller) setTimeout(() => { scroller.scrollTop = scroller.scrollHeight; }, 50);
    }

    function sendQuickReply(text) {
        const lastBtns = messagesContainer.querySelector('.quick-reply-container:last-child');
        if (text.toLowerCase().includes('outro')) {
            if(lastBtns) lastBtns.style.display = 'none';
            chatInput.value = "";
            chatInput.placeholder = "Digite aqui...";
            chatInput.focus();
            return;
        }
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

            // Se a API não mandou botões, adiciona manualmente se nao for fim
            let finalReply = reply;
            if (!reply.includes('<<') && !reply.includes('[FIM_DA_SESSAO]')) {
                finalReply += " <<Sim>> <<Não>> <<Talvez>>";
            }

            addMessage(finalReply, false);
            conversationHistory.push({ role: "assistant", content: reply });

        } catch (e) {
            // MODO DE SEGURANÇA
            setTimeout(() => {
                let fakeReply = "";
                if (conversationHistory.length <= 3) {
                    fakeReply = "Entendi perfeitamente. Muita gente sente isso. E me diz, o que você sente que é a maior consequência disso hoje? <<Perco Dinheiro>> <<Me Sinto Frustrado>> <<Estou Estagnado>> <<Outro>>";
                } else if (conversationHistory.length <= 5) {
                    fakeReply = "Certo. Isso é um sintoma clássico de desregulação dopaminérgica. Mas deixa eu te perguntar: você sente que isso acontece todo dia ou só às vezes? <<Todo Santo Dia>> <<Às Vezes>> <<Raramente>> <<Outro>>";
                } else {
                    fakeReply = "Analisei seus padrões e o resultado é chocante. Vou gerar seu Dossiê Completo agora. [FIM_DA_SESSAO]";
                }
                addMessage(fakeReply, false);
                conversationHistory.push({ role: "assistant", content: fakeReply });
                if (!fakeReply.includes('[FIM_DA_SESSAO]')) { chatInput.disabled = false; chatInput.focus(); }
            }, 1000);
            return;
        } 
        
        const lastMsg = conversationHistory[conversationHistory.length - 1].content;
        if (!lastMsg.includes('[FIM_DA_SESSAO]')) {
            chatInput.disabled = false;
            chatInput.focus();
        }
    }

    // --- CALENDÁRIO E HÁBITOS ---
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
                // Se clicar no calendário futuro, vai pra oferta
                dayEl.addEventListener('click', redirectToSales); 
            }
            grid.appendChild(dayEl);
        }
    }

    window.toggleHabit = function(el) {
        el.classList.toggle('checked');
        const check = el.querySelector('.habit-checkbox i');
        if(check.classList.contains('opacity-0')) { check.classList.remove('opacity-0'); if(navigator.vibrate) navigator.vibrate(30); } 
        else { check.classList.add('opacity-0'); }
    }

    const btnCheckIn = document.getElementById('btnCheckIn');
    if (btnCheckIn) {
        const todayStr = new Date().toDateString();
        if(localStorage.getItem('lastCheckInDate') === todayStr) {
            btnCheckIn.classList.add('btn-checkin-active');
            btnCheckIn.innerHTML = '<i class="fas fa-check"></i> Vitória Registrada!';
        }
        btnCheckIn.addEventListener('click', () => {
            if (btnCheckIn.classList.contains('btn-checkin-active')) return;
            btnCheckIn.classList.add('btn-checkin-active');
            btnCheckIn.innerHTML = '<i class="fas fa-check"></i> Vitória Registrada!';
            localStorage.setItem('lastCheckInDate', todayStr);
            if (navigator.vibrate) navigator.vibrate([50]);
        });
    }

    // --- TYPEWRITER ---
    function startTypewriter(phrases) {
        const el = document.getElementById('typewriter-text');
        if(!el) return;
        let pIndex = 0, cIndex = 0, isDeleting = false;
        function type() {
            const current = phrases[pIndex];
            el.textContent = current.substring(0, isDeleting ? cIndex - 1 : cIndex + 1);
            cIndex += isDeleting ? -1 : 1;
            if(!isDeleting && cIndex === current.length) { isDeleting = true; setTimeout(type, 2000); }
            else if(isDeleting && cIndex === 0) { isDeleting = false; pIndex = (pIndex + 1) % phrases.length; setTimeout(type, 500); }
            else setTimeout(type, isDeleting ? 50 : 100);
        }
        type();
    }

    // --- LISTENERS ---
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    if(menuBtn) menuBtn.addEventListener('click', openSidebar);
    if(overlay) overlay.addEventListener('click', closeSidebar);
    
    // Clique nas Ferramentas (COM REDIRECIONAMENTO PARA VENDA)
    document.querySelectorAll('.tool-item').forEach(i => i.addEventListener('click', (e) => { 
        if(e.currentTarget.classList.contains('is-locked')) {
            // Vai direto para a oferta com ancora de preço
            redirectToSales();
        } else {
            resetChat(); 
            switchTab('chat');
            closeSidebar(); 
        }
    }));
    
    // Botão de Stats na Jornada
    const btnLockedStats = document.getElementById('btnLockedStats');
    if(btnLockedStats) btnLockedStats.addEventListener('click', redirectToSales);

    // Inicializa
    resetChat();
});