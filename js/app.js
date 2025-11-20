/* app.js (VERSÃO FINAL - TECLADO FIXO) */
document.addEventListener('DOMContentLoaded', () => {
    
    const db = firebase.firestore();
    const MAX_USAGE = 5; 
    const DEMO_DATE_KEY = 'demoLastResetDate';
    const DEMO_COUNT_KEY = 'demoUsageCount';
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 

    // --- DEFINIÇÕES DAS FERRAMENTAS ---
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
            systemPrompt: `Você é o Synapse OS. Uma IA de análise comportamental.
Tom: TÉCNICO, CURIOSO e LEVEMENTE PROVOCATIVO.

REGRA DE OURO DA INTERFACE:
O usuário tem preguiça de digitar. Facilite a vida dele.
Sempre termine suas perguntas oferecendo opções em botões no formato <<OPÇÃO>>.
E OBRIGATORIAMENTE a última opção deve ser sempre: <<Outro>>.

EXEMPLO DE DIÁLOGO:
Synapse: "Detectei queda de produtividade. Qual o motivo?

<<Cansaço mental>>
<<Distração com celular>>
<<Não sei começar>>
<<Outro>>"

ESTRUTURA:
1. Identifique o bloqueio (Use botões + Outro).
2. Aprofunde a causa (Use botões + Outro).
3. Dê o Diagnóstico Final (Curto).
4. Encerre recomendando o protocolo pago.

Se o usuário escolher "Outro" e digitar algo, analise a resposta dele normalmente e continue o fluxo.`,
            isLocked: false 
        },
        'Estrategista': {
            title: "Estrategista Diário",
            subtitle: "Defina o alvo...",
            typewriterExamples: [
                "concluir TCC.",
                "estudar para prova.",
                "limpar a casa."
            ],
            systemPrompt: "Você é o 'Estrategista Diário'. O usuário dirá um desafio. Responda com: 1. MISSÃO. 2. REGRAS DE ENGAJAMENTO. 3. OBJETIVOS TÁTICOS. Tom militar.",
            isLocked: true 
        },
        'Mestre': { 
            title: "Ferreiro de Hábitos",
            subtitle: "Confesse a falha...",
            typewriterExamples: [
                "fiquei 2h no TikTok.",
                "comi fast-food."
            ],
            systemPrompt: "Você é o 'Ferreiro de Hábitos'. O usuário confessará uma falha. Responda com um Protocolo de Reparo Imediato.",
            isLocked: true 
        },
        'Auditor': {
            title: "Auditor de Hábitos",
            subtitle: "Cole o relatório...",
            typewriterExamples: [
                "Segunda: falhei. Terça: venci."
            ],
            systemPrompt: "Você é o 'Auditor de Hábitos'. Analise o relato semanal. Gere um Relatório de Performance.",
            isLocked: true 
        }
    };
    
// --- ESTADO DO CHAT ---
    let currentTool = 'Diagnostico'; 
    let conversationHistory = []; 
    let currentChatId = null; 
    let currentTypewriterTimeout = null;

    // --- SELETORES ---
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

    // --- FUNÇÕES AUXILIARES ---
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
        const limitModal = document.getElementById('limitModal'); 

        if (demoLimitSidebar && demoUsageMessage && demoProgress && demoUsageText && sendBtn && chatInput) {
            const percentage = (count / MAX_USAGE) * 100;
            demoProgress.style.width = `${percentage}%`;
            demoUsageText.textContent = `${count} / ${MAX_USAGE} interações`;
            
            if (remaining <= 0) {
                if(limitModal) limitModal.classList.remove('hidden'); 
                demoUsageMessage.textContent = "Sistema Bloqueado.";
                demoUsageMessage.classList.add('brutal-red');
                sendBtn.disabled = true;
                chatInput.placeholder = "Acesso Bloqueado.";
                chatInput.disabled = true;
            } else {
                if(limitModal) limitModal.classList.add('hidden');
                if (remaining <= 3) {
                    demoUsageMessage.textContent = `Atenção: Restam ${remaining} interações.`;
                    demoUsageMessage.classList.remove('brutal-red');
                } else {
                    demoUsageMessage.textContent = `Modo Diagnóstico Ativo.`;
                    demoUsageMessage.classList.remove('brutal-red');
                }
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
    
    // --- FUNÇÃO DE MENSAGENS (CORRIGIDA: REMOVE ESPAÇO VAZIO) ---
    function addMessage(message, isUser, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(isUser ? 'chat-message-user' : 'chat-message-ia');
        if (isError) messageDiv.classList.add('brutal-red', 'font-bold');
        
        // 1. EXTRAIR BOTÕES PRIMEIRO (Antes de qualquer formatação)
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;

        while ((match = buttonRegex.exec(message)) !== null) {
            buttons.push(match[1]);
        }

        // 2. LIMPEZA INTELIGENTE (A Mágica)
        // Remove os códigos <<...>>
        let cleanMessage = message.replace(buttonRegex, '');
        // .trim() remove TODAS as quebras de linha e espaços inúteis do final
        cleanMessage = cleanMessage.trim(); 

        // 3. FORMATAÇÃO (Agora segura)
        let formattedMessage = cleanMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\*(.*?)\*/g, '<em>$1</em>');
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');

        // Insere o texto limpo e enxuto
        messageDiv.innerHTML = formattedMessage;

        // 4. CRIAR CONTAINER DE BOTÕES (Se houver)
        if (buttons.length > 0) {
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'quick-reply-container'; 

            buttons.forEach(btnText => {
                const btn = document.createElement('button');
                btn.className = 'cyber-btn';
                
                if (btnText.trim().toLowerCase().includes('outro') || btnText.trim().toLowerCase().includes('ver mais')) {
                     btn.classList.add('more-btn');
                }

                btn.innerText = btnText;
                btn.onclick = () => window.sendQuickReply(btnText);
                
                scrollContainer.appendChild(btn);
            });

            // Adiciona os botões logo abaixo do texto (colados, graças ao trim)
            messageDiv.appendChild(scrollContainer);
        }
        
        messagesContainer.appendChild(messageDiv);
        scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    }

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
        
        if (chatSubtitle) {
             chatSubtitle.innerHTML = `${toolInfo.subtitle} <span id="typewriter-text" class="brutal-red font-bold"></span>`;
             startTypewriterAnimation(toolInfo.typewriterExamples || []);
        }
        
        if (!isInitialLoad) {
            const card = messagesContainer.querySelector('.w-full.text-center');
            messagesContainer.innerHTML = ''; 
            if(card) messagesContainer.appendChild(card);
        }
        
        if (toolInfo.isLocked) {
            textInputWrapper.classList.add('hidden'); 
            upgradeBlock.classList.remove('hidden'); 
            upgradeTitle.textContent = toolInfo.title.toUpperCase();
            demoUsageMessage.textContent = "Ferramenta PRO Bloqueada.";
            demoUsageMessage.classList.add('brutal-red');
        } else {
            textInputWrapper.classList.remove('hidden'); 
            upgradeBlock.classList.add('hidden'); 
            checkDemoUsage(); 
        }
    } 

    // --- ENVIO DE MENSAGEM (TECLADO FIXO) ---
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (message === '') return;
        
        // FECHA O TECLADO NO MOBILE AO ENVIAR
        if (window.innerWidth <= 768) {
            chatInput.blur(); 
        }

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
        const timeoutId = setTimeout(() => controller.abort(), 25000); 
        
        try {
            const payload = {
                model: API_MODEL,
                messages: conversationHistory,
                temperature: 0.6, 
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
                addMessage(`Erro do Sistema: ${errorData.error.message}`, false, true);
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
            } else {
                addMessage("Erro: Resposta vazia.", false, true);
            }
        } catch (error) {
             clearTimeout(timeoutId); 
            if (error.name === 'AbortError') {
                addMessage("Erro: Tempo limite excedido.", false, true);
            } else {
                addMessage("Erro de conexão.", false, true);
            }
        } finally {
            clearTimeout(timeoutId);
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            checkDemoUsage();
            
            if (!toolDefinitions[currentTool].isLocked && (MAX_USAGE - parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10)) > 0) {
                chatInput.disabled = false;
                // SÓ ABRE TECLADO SE FOR DESKTOP
                if (window.innerWidth > 768) {
                    chatInput.focus();
                }
            }
        }
    }
    
    // --- MENU MOBILE ---
    function openSidebar() {
        sidebar.classList.add('open');
        overlay.classList.add('open');
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
    }

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

    function startTypewriterAnimation(examples = []) { 
        if (currentTypewriterTimeout) {
            clearTimeout(currentTypewriterTimeout);
        }

        const targetElement = document.getElementById('typewriter-text');
        if (!targetElement || examples.length === 0) {
            if(targetElement) targetElement.textContent = ""; 
            return; 
        }

        let exampleIndex = 0;
        let charIndex = 0;
        let isDeleting = false;
        const typeSpeed = 80; 
        const deleteSpeed = 40; 
        const delayBetween = 2000; 

        function type() {
            const currentText = examples[exampleIndex];
            
            if (isDeleting) {
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
        type(); 
    }

    setActiveTool('Diagnostico', true); 

    // --- CORREÇÃO DE SCROLL (TECLADO) ---
    window.addEventListener('resize', () => {
        if (document.activeElement === chatInput) {
            setTimeout(() => {
                scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
            }, 100);
        }
    });

});

// --- FUNÇÃO GLOBAL (MODO "OUTRO") ---
window.sendQuickReply = function(text) {
    const chatInput = document.getElementById('chatInput');
    if(!chatInput) return;

    if (text.trim().toLowerCase().includes('outro')) {
        chatInput.focus();
        chatInput.placeholder = "Digite aqui...";
        const originalBorder = chatInput.parentElement.style.border;
        chatInput.parentElement.style.border = "1px solid #CC0000";
        setTimeout(() => {
            chatInput.parentElement.style.border = originalBorder;
        }, 1000);
        return; 
    }

    chatInput.value = text;
    const sendBtn = document.getElementById('sendBtn');
    if(sendBtn) sendBtn.click();
};