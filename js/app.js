/* app.js - VERSÃO: SABOTADOR & PAYWALL + LOCK SCREEN */

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
    const viewLocked = document.getElementById('viewLocked'); // Novo Elemento
    const tabChat = document.getElementById('tabChat');
    const tabProtocolo = document.getElementById('tabJornada') || document.getElementById('tabProtocolo');
    const menuBtn = document.getElementById('menuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    // --- DEFINIÇÃO DAS FERRAMENTAS E PROMPTS ---
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

    // INICIALIZAÇÃO DO HISTÓRICO COM O PROMPT DO DIAGNÓSTICO
    let conversationHistory = [{ 
        role: "system", 
        content: toolDefinitions['Diagnostico'].systemPrompt
    }];

    // --- FUNÇÕES DE NAVEGAÇÃO ---
    window.switchTab = function(tab) {
        tabChat.classList.remove('active');
        tabChat.style.color = '#666';
        if(tabProtocolo) {
            tabProtocolo.classList.remove('active');
            tabProtocolo.style.color = '#666';
        }
        
        // Esconde tudo primeiro
        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');
        if(viewLocked) viewLocked.classList.add('hidden');

        if (tab === 'chat') {
            viewChat.classList.remove('hidden');
            tabChat.classList.add('active');
            tabChat.style.color = '#CC0000';
        } else {
            viewProtocolo.classList.remove('hidden');
            if(tabProtocolo) {
                tabProtocolo.classList.add('active');
                tabProtocolo.style.color = '#CC0000';
            }
        }
    }

    function openSidebar() { sidebar.classList.add('open'); overlay.classList.add('open'); }
    function closeSidebar() { sidebar.classList.remove('open'); overlay.classList.remove('open'); }

    // --- FUNÇÃO PARA ABRIR A TELA DE BLOQUEIO ---
    function showLockedScreen() {
        // Esconde as outras telas
        viewChat.classList.add('hidden');
        viewProtocolo.classList.add('hidden');
        
        // Remove destaque dos botões inferiores
        tabChat.classList.remove('active');
        tabChat.style.color = '#666';
        if(tabProtocolo) {
            tabProtocolo.classList.remove('active');
            tabProtocolo.style.color = '#666';
        }

        // Mostra a tela de bloqueio
        if (viewLocked) {
            viewLocked.classList.remove('hidden');
            // Animaçãozinha de entrada suave
            viewLocked.style.opacity = '0';
            setTimeout(() => {
                viewLocked.style.transition = 'opacity 0.3s ease';
                viewLocked.style.opacity = '1';
            }, 10);
            
        }
        
        // Fecha sidebar no mobile se estiver aberta
        closeSidebar();
    }

    // --- LÓGICA DO CHAT ---
    function addMessage(message, isUser, isError = false) {
        // Regex para capturar botões <<Texto>>
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;
        while ((match = buttonRegex.exec(message)) !== null) buttons.push(match[1]);

        // Limpa a mensagem (remove botões e tags de sistema)
        let cleanMessage = message.replace(buttonRegex, '').trim();
        
        // VERIFICAÇÃO DO GATILHO DE VENDA (PAYWALL)
        const isSalesTrigger = cleanMessage.includes('[FIM_DA_SESSAO]');
        cleanMessage = cleanMessage.replace('[FIM_DA_SESSAO]', '').trim();

        // Formatação simples (negrito e quebra de linha)
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

        if (cleanMessage) {
            const div = document.createElement('div');
            div.className = isUser ? 'chat-message-user' : 'chat-message-ia';
            if(isError) div.style.color = '#ff4d4d';
            div.innerHTML = cleanMessage;
            messagesContainer.appendChild(div);
        }

        // RENDERIZAÇÃO DOS BOTÕES DE RESPOSTA RÁPIDA
        if (buttons.length > 0 && !isUser && !isSalesTrigger) {
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

        // RENDERIZAÇÃO DO BOTÃO DE VENDA (SE A TAG FOR ENCONTRADA)
        if (isSalesTrigger && !isUser) {
            const saleContainer = document.createElement('div');
            saleContainer.className = 'w-full mt-4 mb-8 animate-pulse';
            saleContainer.innerHTML = `
                <div class="bg-[#111] border border-red-900/50 rounded-xl p-4 text-center shadow-[0_0_20px_rgba(204,0,0,0.2)]">
                    <p class="text-gray-400 text-xs uppercase tracking-widest mb-3 font-bold">Dossiê Bloqueado</p>
                    <i class="fas fa-file-medical-alt text-4xl text-[#CC0000] mb-4"></i>
                    <p class="text-white text-sm mb-4 font-medium">O Synapse identificou o nome do seu Sabotador.</p>
                    <a href="pag.html?source=chat_sabotador" class="block w-full py-3 bg-[#CC0000] hover:bg-red-700 text-white font-bold rounded-lg text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-900/40 no-underline">
                        REVELAR IDENTIDADE <i class="fas fa-unlock ml-2"></i>
                    </a>
                </div>
            `;
            messagesContainer.appendChild(saleContainer);
            
            // Opcional: Desabilitar input para forçar a ação
            chatInput.disabled = true;
            chatInput.placeholder = "Sessão finalizada. Desbloqueie para continuar.";
        }

        // Scroll automático para o final
        const scroller = document.querySelector('.chat-messages');
        if(scroller) setTimeout(() => { scroller.scrollTop = scroller.scrollHeight; }, 50);
    }

    function sendQuickReply(text) {
        // Seleciona o container de botões para escondê-lo
        const lastBtns = messagesContainer.querySelector('.quick-reply-container:last-child');
        
        // Lógica Especial para o botão "Outro"
        if (text.toLowerCase().includes('outro')) {
            if(lastBtns) lastBtns.style.display = 'none'; // Limpa a tela
            
            chatInput.value = ""; // Garante que o campo esteja vazio
            chatInput.placeholder = "Digite aqui qual é o problema..."; // O indicador visual
            chatInput.focus(); // Abre o teclado (no mobile) ou foca o cursor
            
            // Adiciona um efeito visual temporário no input para chamar atenção
            chatInput.parentElement.style.borderColor = "#CC0000";
            setTimeout(() => {
                chatInput.parentElement.style.borderColor = "#333";
            }, 1000);
            
            return; // PARA AQUI. Não envia a mensagem.
        }

        // Comportamento Padrão (para as outras opções)
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
            // Tenta conectar na API Real
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: API_MODEL,
                    messages: conversationHistory,
                    temperature: 0.7 
                })
            });

            if (!response.ok) throw new Error("API Error");

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content;
            
            if (!reply) throw new Error("Empty Response");

            addMessage(reply, false);
            conversationHistory.push({ role: "assistant", content: reply });

        } catch (e) {
            console.warn("API Offline. Ativando Modo de Emergência (Simulação).");
            
            // --- MODO DE SEGURANÇA (Garante a Venda mesmo sem Internet) ---
            setTimeout(() => {
            const lastUserMsg = text.toLowerCase();
            let fakeReply = "";

            // --- 1. LÓGICA DA RESPOSTA DO USUÁRIO (A BIFURCAÇÃO) ---
            
            // CENÁRIO A: Ele disse "NÃO" (Gatilho da Dor)
            if (lastUserMsg.includes('não') || lastUserMsg.includes('prefiro') || lastUserMsg.includes('medo')) {
                // Chama a Tela de Bloqueio imediatamente e ENCERRA
                showLockedScreen(); 
                return; 
            }

            // CENÁRIO B: Ele disse "SIM" (Gatilho da Venda)
            if (lastUserMsg.includes('sim') || lastUserMsg.includes('revelar') || lastUserMsg.includes('quero saber')) {
                // Aqui entregamos a oferta
                fakeReply = "Ok. Prepare-se. Analisei seus padrões e o resultado é chocante. Vou gerar seu Dossiê Completo agora. Ele revela exatamente como sua mente está te enganando. [FIM_DA_SESSAO]";
            } 
            
            // --- 2. ROTEIRO DE PERGUNTAS (Se ele ainda não chegou no final) ---
            
            // Pergunta 1 (Investigação)
            else if (conversationHistory.length <= 3) {
                fakeReply = "Entendi perfeitamente. Muita gente sente isso. E me diz, o que você sente que é a maior consequência disso hoje? <<Perco Dinheiro>> <<Me Sinto Frustrado>> <<Estou Estagnado>> <<Outro>>";
            } 
            // Pergunta 2 (Aprofundamento)
            else if (conversationHistory.length <= 5) {
                fakeReply = "Certo. Isso é um sintoma clássico de desregulação dopaminérgica. Mas deixa eu te perguntar: você sente que isso acontece todo dia ou só às vezes? <<Todo Santo Dia>> <<Às Vezes>> <<Raramente>> <<Outro>>";
            } 
            // O GRANDE FINAL (A Pergunta de Sim ou Não)
            else {
                fakeReply = "Interessante. O quadro está ficando claro. Parece que existe um bloqueio invisível agindo contra você. Você tem coragem de descobrir quem é esse Sabotador agora? <<Sim, revelar agora>> <<Não, prefiro continuar assim>>";
            }
            
            // Envia a mensagem para a tela
            addMessage(fakeReply, false);
            conversationHistory.push({ role: "assistant", content: fakeReply });
            
            // Só libera o teclado se NÃO for a mensagem de venda
            if (!fakeReply.includes('[FIM_DA_SESSAO]')) {
                chatInput.disabled = false;
                chatInput.focus();
            }

        }, 500); // <--- MUDEI PARA 500ms (Mais rápido)
            return; // Sai da função para não executar o finally padrão
        } finally {
            // Só executa se NÃO entrou no catch (sucesso da API real)
            if (!document.querySelector('.fa-unlock') && !document.querySelector('.animate-pulse')) {
                chatInput.disabled = false;
                chatInput.focus();
            }
        }
    }

    // CHECK-IN GAMIFICADO (LÓGICA DO BOTÃO VERDE NA ABA JORNADA)
    const btnCheckIn = document.getElementById('btnCheckIn');
    const streakDisplay = document.getElementById('streakDisplay');
    const checkIconBox = document.getElementById('checkIconBox');
    const checkIcon = document.getElementById('checkIcon');
    const checkText = document.getElementById('checkText');

    const today = new Date().toDateString();
    const lastCheckIn = localStorage.getItem('lastCheckInDate');
    let currentStreak = parseInt(localStorage.getItem('userStreak') || '0');
    
    if(streakDisplay) streakDisplay.textContent = currentStreak;

    function markCheckInComplete() {
        btnCheckIn.classList.add('btn-checkin-active');
        checkIconBox.classList.remove('border-gray-600');
        checkIconBox.classList.add('bg-green-500', 'border-green-500');
        checkIcon.classList.remove('opacity-0', 'scale-50');
        checkIcon.classList.add('opacity-100', 'scale-100');
        checkText.textContent = "Vitória Registrada!";
        checkText.classList.add('text-green-500');
        
        const todayBubble = document.querySelector('#calendarGrid .bg-white');
        if(todayBubble) {
            todayBubble.classList.remove('bg-white', 'text-black');
            todayBubble.classList.add('calendar-day-done');
            todayBubble.innerHTML = '<i class="fas fa-check text-[10px]"></i>';
        }
    }

    if (lastCheckIn === today && btnCheckIn) markCheckInComplete();

    if (btnCheckIn) {
        btnCheckIn.addEventListener('click', () => {
            if (btnCheckIn.classList.contains('btn-checkin-active')) return;
            markCheckInComplete();
            currentStreak++;
            localStorage.setItem('userStreak', currentStreak);
            localStorage.setItem('lastCheckInDate', today);
            if(streakDisplay) {
                streakDisplay.textContent = currentStreak;
                streakDisplay.style.color = "#22c55e";
            }
            if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        });
    }

    // ANIMAÇÃO DE DIGITAÇÃO NO TOPO (TYPEWRITER)
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
    // Inicia com as frases da ferramenta Diagnóstico
    startTypewriter(toolDefinitions['Diagnostico'].typewriterExamples);

    // LISTENERS GERAIS
    if(sendBtn) sendBtn.addEventListener('click', sendMessage);
    if(chatInput) chatInput.addEventListener('keydown', e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    if(menuBtn) menuBtn.addEventListener('click', openSidebar);
    if(overlay) overlay.addEventListener('click', closeSidebar);
    
    // LÓGICA DO CLIQUE NAS FERRAMENTAS
    document.querySelectorAll('.tool-item').forEach(i => i.addEventListener('click', (e) => { 
        // Se clicar em um bloqueado, ABRE A TELA DE VENDAS (Skin in the Game)
        if(e.currentTarget.classList.contains('is-locked')) {
            showLockedScreen();
        } else {
            // Se for o Diagnóstico (livre), volta pro chat
            switchTab('chat');
            closeSidebar(); 
        }
    }));
});