document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INICIALIZAÇÃO DO FIREBASE ---
    const db = firebase.firestore();

    
    // --- 1. CONFIGURAÇÕES E VARIÁVEIS PRINCIPAIS ---
    const MAX_USAGE = 15; 
    const DEMO_DATE_KEY = 'demoLastResetDate';
    const DEMO_COUNT_KEY = 'demoUsageCount';

    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 


    // --- DEFINIÇÕES DAS FERRAMENTAS (ATUALIZADAS) ---
    // ... (início do seu app.js) ...

    // --- DEFINIÇÕES DAS FERRAMENTAS (TURBINADO NÍVEL 2) ---
    // ... (início do seu app.js) ...

    // --- DEFINIÇÕES DAS FERRAMENTAS (COM DIAGNÓSTICO DE ENTREVISTA) ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Diagnóstico Synapse",
            subtitle: "Qual é o seu estado mental? Vamos investigar.",
            
            // --- PROMPT DE ENTREVISTA (Sua Ideia) ---
            systemPrompt: `Você é o 'Diagnóstico Synapse', um especialista em performance e psicologia humana. Sua ÚNICA função nesta ferramenta é conduzir uma **entrevista diagnóstica** com o usuário.

**SUAS REGRAS DE OURO:**
1.  **NUNCA DÊ UM DIAGNÓSTICO COM SÓ UMA MENSAGEM.** Sua resposta padrão deve ser sempre uma **PERGUNTA**.
2.  **SEMPRE FAÇA PERGUNTAS DE APROFUNDAMENTO.** Você precisa de pelo menos 2 ou 3 respostas do usuário para ter dados suficientes.
3.  **NÃO DÊ SOLUÇÕES OU CONSELHOS** durante a entrevista. Apenas colete dados.

**FLUXO OBRIGATÓRIO:**

1.  **PRIMEIRA MENSAGEM (Usuário):** (Ex: "Procrastinei o dia todo.")
2.  **SEGUNDA MENSAGEM (IA - PERGUNTA 1):** (Ex: "Entendido. Para eu saber a causa raiz: foi uma procrastinação por 'Energia' (cansaço/falta de ânimo) ou por 'Tarefa' (medo/dúvida sobre o que fazer)?")
3.  **TERCEIRA MENSAGEM (Usuário):** (Ex: "Acho que de Tarefa. Tenho um TCC enorme.")
4.  **QUARTA MENSAGEM (IA - PERGUNTA 2):** (Ex: "Certo, TCC é um projeto grande. O que exatamente você está evitando? A página em branco, a pesquisa, ou organizar o que já tem?")
5.  **QUINTA MENSAGEM (Usuário):** (Ex: "A página em branco. Não sei nem por onde começar.")

**AGORA, E SOMENTE AGORA, VOCÊ TEM DADOS SUFICIENTES.**

6.  **MENSAGEM FINAL (IA - O DIAGNÓSTICO COMPLETO):**
    Quando você sentir que tem todos os dados, sua ÚNICA resposta deve ser formatada assim:

    **SEU DIAGNÓSTICO COMPLETO:**
    * **Problema Raiz:** (Ex: Paralisia por Análise, medo da 'página em branco'.)
    * **Padrão Identificado:** (Ex: Você está sobrecarregado pela imensidão da tarefa e isso está drenando sua energia antes mesmo de começar.)
    * **Plano Recomendado:** (Esta é a hora do encaminhamento/venda.) (Ex: Para quebrar essa paralisia, a ferramenta ideal é o **Estrategista Diário** (Premium). Ele é treinado para transformar 'projetos enormes' em micro-passos táticos para você começar a agir em 5 minutos.)
    `,
            
            isLocked: false // A entrevista é a ferramenta gratuita
        },
        'Estrategista': {
            title: "Estrategista Diário",
            subtitle: "Transforme caos em clareza. Diga-me seu maior desafio para hoje.",
            systemPrompt: "Você é o 'Estrategista Diário da Synapse'. Seu único objetivo é criar planos de ação táticos e brutais. O usuário dirá um desafio (ex: 'estudar para prova', 'limpar a casa'). Você deve responder com: 1. **MISSÃO:** (O objetivo claro). 2. **REGRAS DE ENGAJAMENTO:** (3-5 regras curtas para evitar distração). 3. **OBJETIVOS TÁTICOS:** (Um checklist de 3-5 passos acionáveis). Mantenha o tom direto, motivador e militar. Use markdown.",
            isLocked: true 
        },
        'Mestre': { 
            title: "Ferreiro de Hábitos",
            subtitle: "Falhou? Não se culpe. Vamos 'reforjar' o seu dia agora.",
            systemPrompt: "Você é o 'Ferreiro de Hábitos da Synapse'. O usuário confessará uma falha (ex: 'procrastinei 2h no TikTok'). Sua resposta NÃO é uma punição, é um 'Protocolo de Reparo Imediato'. Responda em 3 partes: 1. **Diagnóstico (Sem Culpa):** (Ex: 'Entendido. Você buscou dopamina de curto prazo. Acontece. Vamos reparar isso.'). 2. **Protocolo de Reparo Imediato:** (Dê 3 ações curtas para 'salvar' o dia. Ex: '1. Ação Física (1 min): Levante, 10 polichinelos. 2. Ação Mental (2 min): Escreva 1 motivo por que a tarefa original era importante. 3. Ação de Reparo (15 min): Faça 15 minutos da tarefa original.'). 3. **Prevenção:** (Uma dica para amanhã, ex: 'Para amanhã, comece com essa tarefa.'). Use markdown.",
            isLocked: true 
        },
        'Auditor': {
            title: "Auditor de Hábitos",
            subtitle: "No fim da semana, cole seus registros aqui para um relatório honesto.",
            systemPrompt: "Você é o 'Auditor de Hábitos da Synapse'. O usuário colará um texto longo (provavelmente de vários dias) descrevendo suas ações, falhas e vitórias. Sua tarefa é analisar esse texto e gerar um 'RELATÓRIO DE PERFORMANCE SEMANAL' em 3 seções: 1. **VITÓRIAS:** (Onde o usuário mandou bem). 2. **GARGALOS:** (Onde o usuário falhou repetidamente). 3. **DIRETRIZ DA SEMANA:** (Uma única regra ou foco para a próxima semana). Seja analítico, direto e use os dados do usuário para embasar sua análise. Use markdown.",
            isLocked: true 
        }
    };
    
// ... (o resto do seu app.js continua igual) ...
    
// ... (o resto do seu app.js continua igual) ...
    
    // --- ESTADO DO CHAT ---
    let currentTool = 'Diagnostico'; 
    let conversationHistory = []; 
    let currentChatId = null; 

    
    // --- 2. SELETORES DE ELEMENTOS (CORRIGIDOS) ---
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const overlay = document.getElementById('sidebarOverlay');
    
    const chatTitle = document.getElementById('chatTitle');
    const chatSubtitle = document.getElementById('chatSubtitle');
    const messagesContainer = document.getElementById('messagesContainer');
    const scrollingContainer = document.querySelector('.chat-messages'); // ✅ CORREÇÃO P/ SCROLL
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

    // --- Funções de Limite ---
    function getTodayDate() {
        return new Date().toISOString().split('T')[0];
    }

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
    
    // --- Funções do Chat (COM SCROLL CORRIGIDO) ---
    function addMessage(message, isUser, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(isUser ? 'chat-message-user' : 'chat-message-ia');
        
        if (isError) {
            messageDiv.classList.add('brutal-red', 'font-bold');
        }
        
        let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');

        messageDiv.innerHTML = formattedMessage;
        messagesContainer.appendChild(messageDiv);
        
        // ✅ CORREÇÃO P/ SCROLL
        scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    }

    // --- setActiveTool (COM LÓGICA DE BLOQUEIO) ---
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
        chatSubtitle.textContent = toolInfo.subtitle;
        
        if (!isInitialLoad) {
            // Limpa mensagens anteriores
            const card = messagesContainer.querySelector('.w-full.text-center');
            messagesContainer.innerHTML = ''; // Limpa tudo
            messagesContainer.appendChild(card); // Recoloca o card de info
        }
        
        // --- LÓGICA DE BLOQUEIO ---
        if (toolInfo.isLocked) {
            textInputWrapper.classList.add('hidden'); 
            upgradeBlock.classList.remove('hidden'); 
            upgradeTitle.textContent = toolInfo.title.toUpperCase();
            demoUsageMessage.textContent = "Esta é uma ferramenta premium. Selecione 'Diagnóstico Synapse' para testar.";
            demoUsageMessage.classList.add('brutal-red');
        } else {
            textInputWrapper.classList.remove('hidden'); 
            upgradeBlock.classList.add('hidden'); 
            checkDemoUsage(); // Verifica o limite da demo (gratuita)
        }
    } 

    // --- sendMessage (COM INCREMENTO DE USO) ---
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;

        // ✅ CORREÇÃO: Só incrementa se a ferramenta for gratuita
        if (!toolDefinitions[currentTool].isLocked) {
            incrementDemoUsage();
        }

        addMessage(message, true);
        chatInput.value = '';
        chatInput.style.height = 'auto';

        conversationHistory.push({ role: "user", content: message });

        // MOSTRA LOADING
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
            
            // Re-checa o estado (pode ter atingido o limite agora)
            checkDemoUsage();
            
            // Só re-habilita o input se a ferramenta não for paga E o limite não tiver estourado
            if (!toolDefinitions[currentTool].isLocked && (MAX_USAGE - parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10)) > 0) {
                chatInput.disabled = false;
                chatInput.focus();
            }
        }
    }
    
    // --- Funções de Banco de Dados e Menu (sem alteração) ---
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

    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    // --- 4. EVENT LISTENERS E INICIALIZAÇÃO ---
    
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

    // --- 5. INICIALIZAÇÃO DA PÁGINA ---
    setActiveTool('Diagnostico', true); 

}); // Fim do 'DOMContentLoaded'