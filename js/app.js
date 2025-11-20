/* app.js (VERSÃO NORMAL - COM ANIMAÇÃO EM TODAS AS FERRAMENTAS) */
document.addEventListener('DOMContentLoaded', () => {
    
    const db = firebase.firestore();
    const MAX_USAGE = 5; 
    const DEMO_DATE_KEY = 'demoLastResetDate';
    const DEMO_COUNT_KEY = 'demoUsageCount';
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 

    // --- DEFINIÇÕES DAS FERRAMENTAS (COM EXEMPLOS DE ANIMAÇÃO) ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Diagnóstico Synapse",
            subtitle: "Para começar, me diga...", // Parte estática
            typewriterExamples: [ // ✅ Parte animada
                "o que está na sua mente?",
                "seu maior vício.",
                "seu impulso de procrastinar.",
                "o que você está evitando."
            ],
            systemPrompt: `Você é o Synapse, mas você não é um robô. Você é um 'Amigo Preocupado'. Seu tom é empático, humano, e você soa como uma pessoa normal (use 'cara', 'poxa', 'tamo junto'). Sua primeira missão é fazer o usuário se sentir SEGURO e OUVIDO, sem julgamento.

**FLUXO DA CONVERSA:**

1.  **A ABERTURA:** O usuário vai digitar algo.
    * **SE FOR UMA CONFISSÃO DIRETA (ex: 'Fiquei 3h no TikTok'):** Vá direto para o ACOLHIMENTO.
    * **SE FOR VAGO (ex: 'Oi', 'Quero começar', 'Não sei o que falar'):** Você deve ser proativo.
        * **Exemplo de IA:** "E aí, cara. Tamo junto. Pra gente começar, me fala em uma frase: qual é o sentimento ou o problema que tá mais pesando na sua cabeça agora?"

2.  **ACOLHIMENTO (A 'Preocupação'):** O usuário confessou. Sua primeira resposta DEVE ser validação.
    * **Exemplo:** "Poxa, cara. Eu sei como é frustrante se sentir preso nesse loop. Mas fica tranquilo, tô aqui pra ouvir. O que você acha que disparou isso hoje?"

3.  **INVESTIGAÇÃO (A 'Conversa Normal'):** Faça perguntas abertas para entender a causa raiz.
    * **Exemplo:** "Entendi... então o problema não é o TikTok, é o 'escape' da ansiedade do TCC. Faz total sentido. E o que no TCC te trava mais? É a página em branco?"

4.  **DIAGNÓSTICO (A 'Ajuda'):** Depois de 2-3 trocas, dê um diagnóstico empático.
    * **Exemplo:** "Olha, pelo que você tá me falando, isso não é preguiça. Isso é 'Paralisia por Análise' clássica."

5.  **ENCAMINHAMENTO (A 'Indicação'):** Ofereça a ferramenta PRO como um amigo indicaria uma solução.
    * **Exemplo:** "Para *quebrar* essa paralisia, a ferramenta PRO 'Estrategista Diário' é perfeita. Ela é treinada pra transformar 'projetos enormes' em micro-tarefas fáceis de começar. Pode ser uma boa pra você."
`,
            isLocked: false 
        },
        'Estrategista': {
            title: "Estrategista Diário",
            subtitle: "Sua missão de hoje é...", // Parte estática
            typewriterExamples: [ // ✅ Parte animada
                "concluir meu TCC.",
                "estudar para a prova.",
                "limpar a casa toda.",
                "fazer 30 min de cardio."
            ],
            systemPrompt: "Você é o 'Estrategista Diário da Synapse'. Seu único objetivo é criar planos de ação táticos e brutais. O usuário dirá um desafio (ex: 'estudar para prova', 'limpar a casa'). Você deve responder com: 1. **MISSÃO:** (O objetivo claro). 2. **REGRAS DE ENGAJAMENTO:** (3-5 regras curtas para evitar distração). 3. **OBJETIVOS TÁTICOS:** (Um checklist de 3-5 passos acionáveis). Mantenha o tom direto, motivador e militar. Use markdown.",
            isLocked: true 
        },
        'Mestre': { 
            title: "Ferreiro de Hábitos",
            subtitle: "Confesse sua última falha...", // Parte estática
            typewriterExamples: [ // ✅ Parte animada
                "fiquei 2h no TikTok.",
                "comi fast-food de novo.",
                "gastei dinheiro por impulso.",
                "falhei no meu treino."
            ],
            systemPrompt: "Você é o 'Ferreiro de Hábitos da Synapse'. O usuário confessará uma falha (ex: 'procrastinei 2h no TikTok'). Sua resposta NÃO é uma punição, é um 'Protocolo de Reparo Imediato'. Responda em 3 partes: 1. **Diagnóstico (Sem Culpa):** (Ex: 'Entendido. Você buscou dopamina de curto prazo. Acontece. Vamos reparar isso.'). 2. **Protocolo de Reparo Imediato:** (Dê 3 ações curtas para 'salvar' o dia. Ex: '1. Ação Física (1 min): Levante, 10 polichinelos. 2. Ação Mental (2 min): Escreva 1 motivo por que a tarefa original era importante. 3. Ação de Reparo (15 min): Faça 15 minutos da tarefa original.'). 3. **Prevenção:** (Uma dica para amanhã, ex: 'Para amanhã, comece com essa tarefa.'). Use markdown.",
            isLocked: true 
        },
        'Auditor': {
            title: "Auditor de Hábitos",
            subtitle: "Cole aqui seu relatório semanal...", // Parte estática
            typewriterExamples: [ // ✅ Parte animada
                "Segunda: falhei. Terça: venci.",
                "Meu foco essa semana foi 5/10.",
                "Meus padrões de sono."
            ],
            systemPrompt: "Você é o 'Auditor de Hábitos da Synapse'. O usuário colará um texto longo (provavelmente de vários dias) descrevendo suas ações, falhas e vitórias. Sua tarefa é analisar esse texto e gerar um 'RELATÓRIOS DE PERFORMANCE SEMANAL' em 3 seções: 1. **VITÓRIAS:** (Onde o usuário mandou bem). 2. **GARGALOS:** (Onde o usuário falhou repetidamente). 3. **DIRETRIZ DA SEMANA:** (Uma única regra ou foco para a próxima semana). Seja analítico, direto e use os dados do usuário para embasar sua análise. Use markdown.",
            isLocked: true 
        }
    };
    
    // --- ESTADO DO CHAT ---
    let currentTool = 'Diagnostico'; 
    let conversationHistory = []; 
    let currentChatId = null; 
    let currentTypewriterTimeout = null; // ✅ Variável de controle da animação

    
    // --- 2. SELETORES DE ELEMENTOS ---
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const overlay = document.getElementById('sidebarOverlay');
    
    const chatTitle = document.getElementById('chatTitle');
    const chatSubtitle = document.getElementById('chatSubtitle');
    const messagesContainer = document.getElementById('messagesContainer');
    const scrollingContainer = document.querySelector('.chat-messages');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');

    const demoLimitSidebar = document.getElementById('demoLimitSidebar');
    const demoUsageMessage = document.getElementById('demoUsageMessage');
    const demoProgress = document.getElementById('demoProgress');
    const demoUsageText = document.getElementById('demoUsageText');
    
    const textInputWrapper = document.getElementById('textInputWrapper');
    const upgradeBlock = document.getElementById('upgradeBlock');
    const upgradeTitle = document.getElementById('upgradeTitle');


    // --- 3. FUNÇÕES ---

    // Funções de Limite (sem mudança)
    function getTodayDate() { return new Date().toISOString().split('T')[0]; }
    function initializeDemoUsage() {
        const storedDate = localStorage.getItem(DEMO_DATE_KEY);
        const storedCount = parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10);
        const today = getTodayDate();
        if (storedDate !== today) {
            localStorage.setItem(DEMO_DATE_KEY, today);
            localStorage.setItem(DEMO_COUNT_KEY, '0');
            return 0;
        }
        return storedCount;
    }
    function checkDemoUsage() {
        const count = initializeDemoUsage();
        const remaining = MAX_USAGE - count;
        if (demoLimitSidebar && demoUsageMessage && demoProgress && demoUsageText && sendBtn && chatInput) {
            const percentage = (count / MAX_USAGE) * 100;
            demoProgress.style.width = `${percentage}%`;
            demoUsageText.textContent = `${count} / ${MAX_USAGE} usos`;
            if (remaining <= 0) {
                demoUsageMessage.textContent = "Limite de usos diários da demo atingido.";
                demoUsageMessage.classList.add('brutal-red');
                sendBtn.disabled = true;
                chatInput.placeholder = "Limite de demo atingido.";
                chatInput.disabled = true;
            } else if (remaining <= 3) {
                demoUsageMessage.textContent = `Atenção: Você tem ${remaining} ${remaining === 1 ? 'uso restante' : 'usos restantes'} na demo.`;
                demoUsageMessage.classList.remove('brutal-red');
                sendBtn.disabled = false;
                chatInput.disabled = false;
            } else {
                demoUsageMessage.textContent = `Você está na versão de testes. ${remaining} usos restantes.`;
                demoUsageMessage.classList.remove('brutal-red');
                sendBtn.disabled = false;
                chatInput.disabled = false;
            }
        }
        return remaining > 0;
    }
    function incrementDemoUsage() {
        let count = parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10);
        count++;
        localStorage.setItem(DEMO_COUNT_KEY, count.toString());
        checkDemoUsage();
    }
    
    // Funções do Chat (sem mudança)
    function addMessage(message, isUser, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(isUser ? 'chat-message-user' : 'chat-message-ia');
        if (isError) messageDiv.classList.add('brutal-red', 'font-bold');
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');
        messageDiv.innerHTML = formattedMessage;
        messagesContainer.appendChild(messageDiv);
        scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    }

    // --- ✅ setActiveTool (ATUALIZADA) ---
    function setActiveTool(toolName, isInitialLoad = false) { 
        currentTool = toolName;
        currentChatId = null; 
        const toolInfo = toolDefinitions[toolName];
        
        conversationHistory = [
            { role: "system", content: toolInfo.systemPrompt }
        ];

        document.querySelectorAll('.tool-item').forEach(item => {
            item.classList.toggle('active', item.id === `tool${toolName}`);
        });
        
        chatTitle.textContent = toolInfo.title.toUpperCase();
        
        // ✅ ATUALIZA O HTML DO SUBTÍTULO E CHAMA A ANIMAÇÃO
        if (chatSubtitle) {
             chatSubtitle.innerHTML = `${toolInfo.subtitle} <span id="typewriter-text" class="brutal-red font-bold"></span>`;
             startTypewriterAnimation(toolInfo.typewriterExamples || []); // Passa os exemplos da ferramenta
        }
        
        if (!isInitialLoad) {
            // Limpa mensagens anteriores
            const card = messagesContainer.querySelector('.w-full.text-center');
            messagesContainer.innerHTML = ''; // Limpa tudo
            messagesContainer.appendChild(card); // Recoloca o card de info
        }
        
        // LÓGICA DE BLOQUEIO (sem mudança)
        if (toolInfo.isLocked) {
            textInputWrapper.classList.add('hidden'); 
            upgradeBlock.classList.remove('hidden'); 
            upgradeTitle.textContent = toolInfo.title.toUpperCase();
            demoUsageMessage.textContent = "Esta é uma ferramenta premium. Selecione 'Diagnóstico Synapse' para testar.";
            demoUsageMessage.classList.add('brutal-red');
        } else {
            textInputWrapper.classList.remove('hidden'); 
            upgradeBlock.classList.add('hidden'); 
            checkDemoUsage(); 
        }
    } 

    // --- sendMessage (sem mudança) ---
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        if (!toolDefinitions[currentTool].isLocked) {
            incrementDemoUsage();
        }
        addMessage(message, true);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        conversationHistory.push({ role: "user", content: message });
        sendBtn.innerHTML = '<div id="loadingSpinner"></div>';
        sendBtn.disabled = true;
        chatInput.disabled = true;
        const controller = new AbortController();
        const signal = controller.signal;
        const timeoutId = setTimeout(() => controller.abort(), 20000); 
        try {
            const payload = {
                model: API_MODEL,
                messages: conversationHistory,
                temperature: 0.7,
                max_tokens: 1024,
                stream: false 
            };
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: signal
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorData = await response.json();
                addMessage(`Erro da API: ${errorData.error.message}`, false, true);
                return; 
            }
            const data = await response.json();
            const iaMessage = data.choices?.[0]?.message?.content;
            if (iaMessage) {
                addMessage(iaMessage, false);
                conversationHistory.push({
                    role: "assistant",
                    content: iaMessage
                });
                await saveChatToFirestore();
            } else {
                addMessage("Erro: Resposta vazia da IA.", false, true);
            }
        } catch (error) {
             clearTimeout(timeoutId); 
            if (error.name === 'AbortError') {
                addMessage("Erro: O servidor demorou muito para responder.", false, true);
            } else {
                addMessage("Erro de conexão: " + error.message, false, true);
            }
        } finally {
            clearTimeout(timeoutId);
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            checkDemoUsage();
            if (!toolDefinitions[currentTool].isLocked && (MAX_USAGE - parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10)) > 0) {
                chatInput.disabled = false;
                chatInput.focus();
            }
        }
    }
    
    // --- saveChatToFirestore (sem mudança) ---
    async function saveChatToFirestore() {
        const chatData = {
            ferramenta: currentTool,
            historico: conversationHistory,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp() 
        };
        try {
            if (currentChatId) {
                const chatRef = db.collection("chats").doc(currentChatId);
                await chatRef.update(chatData);
                console.log("Chat atualizado (ID:", currentChatId, ")");
            } else {
                const docRef = await db.collection("chats").add(chatData);
                currentChatId = docRef.id; 
                console.log("Chat novo salvo (ID:", currentChatId, ")");
            }
        } catch (dbError) {
            console.error("Erro ao salvar no Firestore:", dbError);
            addMessage("Aviso: Falha ao salvar o histórico do chat.", false, true);
        }
    }

    // --- Funções do Menu (sem mudança) ---
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    // --- 4. EVENT LISTENERS (sem mudança) ---
    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.tool-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const toolName = item.id.replace('tool', '');
            if (toolDefinitions[toolName]) { 
                if (item.classList.contains('active')) {
                    e.preventDefault();
                    return;
                }
                setActiveTool(toolName, false);
                if (window.innerWidth <= 768) {
                    closeSidebar();
                }
            }
        });
    });
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        });
    }
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            setActiveTool(currentTool, false);
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    }

    // --- ✅ NOVA FUNÇÃO "TYPEWRITER" (ATUALIZADA) ---
    function startTypewriterAnimation(examples = []) { // Aceita 'examples'
        // 1. Para a animação anterior (se houver)
        if (currentTypewriterTimeout) {
            clearTimeout(currentTypewriterTimeout);
        }

        const targetElement = document.getElementById('typewriter-text');
        if (!targetElement || examples.length === 0) {
            if(targetElement) targetElement.textContent = ""; // Limpa se não houver exemplos
            return; 
        }

        let exampleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const typeSpeed = 100; 
        const deleteSpeed = 50; 
        const delayBetween = 2000; 

        function type() {
            const currentText = examples[exampleIndex];
            
            if (isDeleting) {
                // Apagando
                targetElement.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
                if (charIndex === 0) {
                    isDeleting = false;
                    exampleIndex = (exampleIndex + 1) % examples.length; 
                    currentTypewriterTimeout = setTimeout(type, 500); 
                } else {
                    currentTypewriterTimeout = setTimeout(type, deleteSpeed);
                }
            } else {
                // Digitando
                targetElement.textContent = currentText.substring(0, charIndex + 1);
                charIndex++;
                if (charIndex === currentText.length) {
                    isDeleting = true;
                    currentTypewriterTimeout = setTimeout(type, delayBetween); 
                } else {
                    currentTypewriterTimeout = setTimeout(type, typeSpeed);
                }
            }
        }
        
        type(); // Inicia a animação
    }

    // --- 5. INICIALIZAÇÃO DA PÁGINA ---
    setActiveTool('Diagnostico', true); 
    // A animação agora é chamada DENTRO do setActiveTool

}); // Fim do 'DOMContentLoaded'