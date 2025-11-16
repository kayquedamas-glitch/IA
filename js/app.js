
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INICIALIZAÇÃO DO FIREBASE ---
    // (O firebaseConfig já foi definido no index.html)
    // Pega a instância do banco de dados (funciona por causa dos scripts v8 no index.html)
    const db = firebase.firestore();

    
    // --- 1. CONFIGURAÇÕES E VARIÁVEIS PRINCIPAIS ---
    
    const MAX_USAGE = 5; // ✅ Limite da demo para 10 usos
    const DEMO_DATE_KEY = 'demoLastResetDate';
    const DEMO_COUNT_KEY = 'demoUsageCount';

    // --- CONFIGURAÇÃO DA API GROQ ---
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; // ✅ seu proxy seguro
    const API_MODEL = "llama-3.1-8b-instant"; 


    // --- DEFINIÇÕES DAS FERRAMENTAS ---
    const toolDefinitions = {
        'Diagnostico': {
            // --- MUDANÇA (IDEIA 4) ---
            title: "Diagnóstico Synapse",
            subtitle: "Qual é o seu estado mental? Comece por aqui.",
            systemPrompt: "Você é o 'Diagnóstico Synapse', a IA de triagem. O usuário descreverá seu estado mental, problema ou sentimento (ex: 'ansioso', 'procrastinei', 'preciso de um plano'). Sua ÚNICA tarefa é analisar a intenção e encaminhar para a ferramenta correta. Responda em 2 partes: 1. **Diagnóstico:** (Uma breve análise, ex: 'Entendido. Você está com paralisia de análise.') 2. **Encaminhamento:** (Sugira a ferramenta ideal, ex: 'Recomendo usar o **Estrategista Diário** para criar um plano.' ou 'Recomendo o **Ferreiro de Hábitos** para reparar sua procrastinação.'). Ferramentas disponíveis: [Estrategista Diário], [Gerente de Energia], [Ferreiro de Hábitos], [Auditor de Hábitos].",
            isLocked: false // Continua sendo a ferramenta gratuita
        },
        'Estrategista': {
            title: "Estrategista Diário",
            subtitle: "Transforme caos em clareza. Diga-me seu maior desafio para hoje e eu criarei um plano de batalha focado.",
            systemPrompt: "Você é o 'Estrategista Diário da Synapse'. Seu único objetivo é criar planos de ação táticos e brutais. O usuário dirá um desafio (ex: 'estudar para prova', 'limpar a casa'). Você deve responder com: 1. **MISSÃO:** (O objetivo claro). 2. **REGRAS DE ENGAJAMENTO:** (3-5 regras curtas para evitar distração). 3. **OBJETIVOS TÁTICOS:** (Um checklist de 3-5 passos acionáveis). Mantenha o tom direto, motivador e militar. Use markdown.",
            isLocked: true // Ferramenta Paga
        },
        'Mestre': { // O ID 'Mestre' é mantido para não quebrar seu HTML (toolMestre)
            // --- MUDANÇA (IDEIA 2) ---
            title: "Ferreiro de Hábitos", // Nome mudou
            subtitle: "Falhou? Não se culpe. Vamos 'reforjar' o seu dia agora.", // Subtítulo mudou
            systemPrompt: "Você é o 'Ferreiro de Hábitos da Synapse'. O usuário confessará uma falha (ex: 'procrastinei 2h no TikTok'). Sua resposta NÃO é uma punição, é um 'Protocolo de Reparo Imediato'. Responda em 3 partes: 1. **Diagnóstico (Sem Culpa):** (Ex: 'Entendido. Você buscou dopamina de curto prazo. Acontece. Vamos reparar isso.'). 2. **Protocolo de Reparo Imediato:** (Dê 3 ações curtas para 'salvar' o dia. Ex: '1. Ação Física (1 min): Levante, 10 polichinelos. 2. Ação Mental (2 min): Escreva 1 motivo por que a tarefa original era importante. 3. Ação de Reparo (15 min): Faça 15 minutos da tarefa original.'). 3. **Prevenção:** (Uma dica para amanhã, ex: 'Para amanhã, comece com essa tarefa.'). Use markdown.",
            isLocked: true // Continua Paga
        },
        'Auditor': {
            title: "Auditor de Hábitos",
            subtitle: "No fim da semana, cole seus registros diários aqui. Eu analisarei seus padrões e entregarei um relatório honesto sobre sua performance.",
            systemPrompt: "Você é o 'Auditor de Hábitos da Synapse'. O usuário colará um texto longo (provavelmente de vários dias) descrevendo suas ações, falhas e vitórias. Sua tarefa é analisar esse texto e gerar um 'RELATÓRIO DE PERFORMANCE SEMANAL' em 3 seções: 1. **VITÓRIAS:** (Onde o usuário mandou bem). 2. **GARGALOS:** (Onde o usuário falhou repetidamente). 3. **DIRETRIZ DA SEMANA:** (Uma única regra ou foco para a próxima semana). Seja analítico, direto e use os dados do usuário para embasar sua análise. Use markdown.",
            isLocked: true // Ferramenta Paga
        }
    };
    
    // --- ESTADO DO CHAT ---
    let currentTool = 'Diagnostico'; // ✅ Alterado para a nova ferramenta padrão
    let conversationHistory = []; // Começa vazio
    let currentChatId = null; // ID do chat no banco de dados

    
    // --- 2. SELETORES DE ELEMENTOS ---
    const sidebar = document.getElementById('sidebar');
    const openBtn = document.getElementById('openSidebarBtn');
    const closeBtn = document.getElementById('closeSidebarBtn');
    const overlay = document.getElementById('sidebarOverlay');
    
    const chatTitle = document.getElementById('chatTitle');
    const chatSubtitle = document.getElementById('chatSubtitle');
    const messagesContainer = document.getElementById('messagesContainer');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');

    const demoLimitSidebar = document.getElementById('demoLimitSidebar');
    const demoUsageMessage = document.getElementById('demoUsageMessage');
    const demoProgress = document.getElementById('demoProgress');
    const demoUsageText = document.getElementById('demoUsageText');
    
    // ✅ NOVOS SELETORES PARA O BLOQUEIO DE INPUT
    const textInputWrapper = document.getElementById('textInputWrapper');
    const upgradeBlock = document.getElementById('upgradeBlock');
    const upgradeTitle = document.getElementById('upgradeTitle');


    // --- 3. FUNÇÕES ---

    // --- Funções de Limite (sem alteração) ---
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
    
    // --- Funções do Chat (sem alteração) ---
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
        
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // --- setActiveTool (ATUALIZADA) ---
    // --- setActiveTool (ATUALIZADA) ---
function setActiveTool(toolName, isInitialLoad = false) { 
    currentTool = toolName;
    currentChatId = null; // Reseta o ID do chat
    const toolInfo = toolDefinitions[toolName];
    
    // Define o histórico inicial
    conversationHistory = [
        { 
            role: "system", 
            content: toolInfo.systemPrompt 
        }
    ];

    // Atualiza o menu lateral
    document.querySelectorAll('.tool-item').forEach(item => {
        item.classList.toggle('active', item.id === `tool${toolName}`);
    });
    
    // Atualiza os títulos
    chatTitle.textContent = toolInfo.title.toUpperCase();
    chatSubtitle.textContent = toolInfo.subtitle;
    
    // Limpa as mensagens (exceto no primeiro load)
    if (!isInitialLoad) {
        messagesContainer.innerHTML = '';
    }
    
    // --- LÓGICA DE BLOQUEIO (A PARTE QUE FALTAVA) ---
    if (toolInfo.isLocked) {
        // Se a ferramenta for PAGA (bloqueada)
        textInputWrapper.classList.add('hidden'); // Esconde o input
        upgradeBlock.classList.remove('hidden'); // Mostra o bloco de upgrade
        upgradeTitle.textContent = toolInfo.title.toUpperCase(); // Coloca o nome da ferramenta no bloco
        
        // Atualiza a mensagem da demo para refletir o bloqueio
        demoUsageMessage.textContent = "Esta é uma ferramenta premium. Selecione 'Diagnóstico Bruto' para testar.";
        demoUsageMessage.classList.add('brutal-red');
        
    } else {
        // Se a ferramenta for GRATUITA (desbloqueada)
        textInputWrapper.classList.remove('hidden'); // Mostra o input
        upgradeBlock.classList.add('hidden'); // Esconde o bloco de upgrade
        
        // Verifica o limite GERAL da demo
        checkDemoUsage(); 
    }
}
async function sendMessage() {
    const message = chatInput.value.trim();
    if (message === '') return;

    addMessage(message, true);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    conversationHistory.push({ role: "user", content: message });

    // MOSTRA LOADING
    sendBtn.classList.add('loading');
    sendBtn.disabled = true;
    chatInput.disabled = true;

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
            body: JSON.stringify(payload)
        });

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
        addMessage("Erro de conexão: " + error.message, false, true);
    }

    // REMOVE LOADING
    sendBtn.classList.remove('loading');
    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
}
// <-- FIM DO ASYNC FUNCTION SENDMESSAGE()
    
    // --- NOVA FUNÇÃO DE BANCO DE DADOS ---
    async function saveChatToFirestore() {
        const chatData = {
            ferramenta: currentTool,
            historico: conversationHistory,
            ultimaAtualizacao: firebase.firestore.FieldValue.serverTimestamp() // Usa o tempo do servidor
        };

        try {
            if (currentChatId) {
                // Se já temos um ID, só atualizamos o chat existente
                const chatRef = db.collection("chats").doc(currentChatId);
                await chatRef.update(chatData);
                console.log("Chat atualizado no Firestore (ID:", currentChatId, ")");
            } else {
                // Se for um chat novo, criamos um novo documento
                const docRef = await db.collection("chats").add(chatData);
                currentChatId = docRef.id; // Salvamos o ID para futuras atualizações
                console.log("Chat novo salvo no Firestore (ID:", currentChatId, ")");
            }
        } catch (dbError) {
            console.error("Erro ao salvar no Firestore:", dbError);
            addMessage("Aviso: Falha ao salvar o histórico do chat.", false, true);
        }
    }


    // --- Funções do Menu (sem alteração) ---
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }

    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

    // --- 4. EVENT LISTENERS E INICIALIZAÇÃO ---
    
    openBtn.addEventListener('click', openSidebar);
    closeBtn.addEventListener('click', closeSidebar);
    overlay.addEventListener('click', closeSidebar);
    
    // ✅ O listener de clique nas ferramentas AGORA SÓ TROCA A FERRAMENTA
    // A lógica de bloqueio está DENTRO da setActiveTool
    document.querySelectorAll('.tool-item').forEach(item => {
        item.addEventListener('click', (e) => {
            
            const toolName = item.id.replace('tool', '');
            
            // Se o item clicado for um item de ferramenta real
            if (toolDefinitions[toolName]) { 
                
                // Apenas impede a troca se já estiver ativo
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

    sendBtn.addEventListener('click', sendMessage);
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

    // --- newChatBtn (Atualizado) ---
    newChatBtn.addEventListener('click', () => {
        // Reseta o chat para o estado inicial da ferramenta atual
        setActiveTool(currentTool, false);
        
        if (window.innerWidth <= 768) {
            closeSidebar();
        }
    });

    // --- 5. INICIALIZAÇÃO DA PÁGINA ---
    setActiveTool('Diagnostico', true); // ✅ Inicia com a nova ferramenta
    checkDemoUsage(); 

    const PROXY_URL = "https://b066147f.synapse-dcq.pages.dev/";


}); // Fim do 'DOMContentLoaded'