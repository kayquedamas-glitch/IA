
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. INICIALIZAÇÃO DO FIREBASE ---
    // (O firebaseConfig já foi definido no index.html)
    // Pega a instância do banco de dados (funciona por causa dos scripts v8 no index.html)
    const db = firebase.firestore();

    
    // --- 1. CONFIGURAÇÕES E VARIÁVEIS PRINCIPAIS ---
    
    const MAX_USAGE = 10; // ✅ Limite da demo para 10 usos
    const DEMO_DATE_KEY = 'demoLastResetDate';
    const DEMO_COUNT_KEY = 'demoUsageCount';

    // --- CONFIGURAÇÃO DA API GROQ ---
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; // ✅ seu proxy seguro
    const API_MODEL = "llama-3.1-8b-instant"; 


    // --- DEFINIÇÕES DAS FERRAMENTAS ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Diagnóstico Bruto",
            subtitle: "Confesse. O que você está fazendo de errado *agora*?",
            systemPrompt: "Você é o 'Diagnóstico Bruto da Synapse'. O usuário vai confessar uma procrastinação ou falha imediata (ex: 'Tô há 1 hora no TikTok', 'Não consigo começar o relatório'). Sua ÚNICA resposta deve ser um diagnóstico de UMA FRASE, brutal, direta e psicológica sobre a causa raiz. Sem 'olá', sem 'bom dia', sem conselhos. Apenas o diagnóstico. Comece com 'DIAGNÓSTICO:'. Ex: 'DIAGNÓSTICO: Você está trocando seu futuro por dopamina barata.' ou 'DIAGNÓSTICO: Você está paralisado pelo perfeccionismo.'",
            isLocked: false // ✅ Ferramenta Gratuita (isca)
        },
        'Estrategista': {
            title: "Estrategista Diário",
            subtitle: "Transforme caos em clareza. Diga-me seu maior desafio para hoje e eu criarei um plano de batalha focado.",
            systemPrompt: "Você é o 'Estrategista Diário da Synapse'. Seu único objetivo é criar planos de ação táticos e brutais. O usuário dirá um desafio (ex: 'estudar para prova', 'limpar a casa'). Você deve responder com: 1. **MISSÃO:** (O objetivo claro). 2. **REGRAS DE ENGAJAMENTO:** (3-5 regras curtas para evitar distração). 3. **OBJETIVOS TÁTICOS:** (Um checklist de 3-5 passos acionáveis). Mantenha o tom direto, motivador e militar. Use markdown.",
            isLocked: true // ✅ Ferramenta Paga
        },
        'Gerente': {
            title: "Gerente de Energia",
            subtitle: "Sentindo-se sobrecarregado ou sem foco? Descreva seu estado mental e eu darei 3 ações imediatas para recuperar o controle.",
            systemPrompt: "Você é o 'Gerente da Synapse'. O usuário descreverá um estado negativo (ex: 'cansado', 'ansioso', 'sem foco'). Sua única resposta deve ser 3 AÇÕES IMEDIATAS para quebrar o padrão. As ações devem ser físicas ou mentais, simples e rápidas (ex: '1. Levante-se. Beba 500ml de água. 2. Respire fundo 10x. 3. Escreva 1 coisa que você pode fazer agora.'). Sem conversa fiada. Direto ao ponto.",
            isLocked: true // ✅ Ferramenta Paga
        },
        'Mestre': {
            title: "Mestre da Disciplina",
            subtitle: "Confesse sua falha. Diga-me onde você procrastinou hoje e eu darei um 'castigo' justo para recalibrar sua disciplina amanhã.",
            systemPrompt: "Você é o 'Mestre da Disciplina da Synapse'. O usuário confessará uma falha de disciplina (ex: 'fiquei 2h no TikTok', 'comi fast-food'). Sua resposta deve ser curta e ter duas partes: 1. **DIAGNÓSTICO BRUTAL:** (Uma frase curta sobre a causa raiz, ex: 'Você buscou dopamina fácil.'). 2. **PUNIÇÃO JUSTA:** (Uma tarefa simples, mas desconfortável, para o dia seguinte, ex: 'Amanhã, 10 minutos de meditação sem celular perto.' ou 'Amanhã, sua primeira hora de trabalho será sem música.'). O tom é severo, mas justo. Sem julgamento moral, apenas causa e efeito.",
            isLocked: true // ✅ Ferramenta Paga
        },
        'Auditor': {
            title: "Auditor de Hábitos",
            subtitle: "No fim da semana, cole seus registros diários aqui. Eu analisarei seus padrões e entregarei um relatório honesto sobre sua performance.",
            systemPrompt: "Você é o 'Auditor de Hábitos da Synapse'. O usuário colará um texto longo (provavelmente de vários dias) descrevendo suas ações, falhas e vitórias. Sua tarefa é analisar esse texto e gerar um 'RELATÓRIO DE PERFORMANCE SEMANAL' em 3 seções: 1. **VITÓRIAS:** (Onde o usuário mandou bem). 2. **GARGALOS:** (Onde o usuário falhou repetidamente). 3. **DIRETRIZ DA SEMANA:** (Uma única regra ou foco para a próxima semana). Seja analítico, direto e use os dados do usuário para embasar sua análise. Use markdown.",
            isLocked: true // ✅ Ferramenta Paga
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
    function setActiveTool(toolName, isInitialLoad = false) { 
        currentTool = toolName;
        currentChatId = null; // Começa um novo chat, então o ID é nulo
        const toolInfo = toolDefinitions[toolName];
        
        // Define o histórico inicial
        conversationHistory = [
            { 
                role: "system", 
                content: toolInfo.systemPrompt 
            }
        ];

        document.querySelectorAll('.tool-item').forEach(item => {
            item.classList.toggle('active', item.id === `tool${toolName}`);
        });
        
        chatTitle.textContent = toolInfo.title.toUpperCase();
        chatSubtitle.textContent = toolInfo.subtitle;
        chatInput.placeholder = "Digite sua mensagem aqui...";; // ✅ Atualiza o placeholder
        
        
        if (!isInitialLoad || (isInitialLoad && !isMobile)) {
            chatInput.focus();
        }

        // ✅ --- NOVA LÓGICA DE BLOQUEIO DE FERRAMENTA ---
        if (toolInfo.isLocked) {
            // Se a ferramenta for PAGA:
            
            // 1. Esconde o input de texto
            textInputWrapper.classList.add('hidden');
            
            // 2. Mostra o bloco de upgrade
            upgradeBlock.classList.remove('hidden');
            
            // 3. Personaliza a mensagem de upgrade
            upgradeTitle.textContent = `DESBLOQUEIE O ${toolInfo.title.toUpperCase()}`;
            
        } else {
            // Se a ferramenta for GRATUITA:
            
            // 1. Mostra o input de texto
            textInputWrapper.classList.remove('hidden');
            
            // 2. Esconde o bloco de upgrade
            upgradeBlock.classList.add('hidden');
        }
        // --- FIM DA LÓGICA DE BLOQUEIO ---

    } // <-- FIM DA FUNÇÃO setActiveTool

    // --- sendMessage (COM TIMEOUT DE 20 SEGUNDOS) ---
 // --- sendMessage (COM TIMEOUT DE 20 SEGUNDOS - VERSÃO PRO CORRIGIDA) ---
// --- sendMessage (VERSÃO CORRIGIDA E ROBUSTA PARA PRO) ---
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