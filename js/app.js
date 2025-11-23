/* app.js (VERSÃO FINAL - RESET DEV + CARD ESTRATÉGICO + ANIMAÇÃO) */

document.addEventListener('DOMContentLoaded', () => {
    
    // --- CONFIGURAÇÕES ---
    const db = firebase.firestore();
    const SAFETY_LIMIT = 20; 
    const DEMO_COUNT_KEY = 'demoUsageCount';
    const DEMO_DATE_KEY = 'demoLastResetDate';
    
    const API_URL = "https://long-block-7f38.kayquedamas.workers.dev"; 
    const API_MODEL = "llama-3.1-8b-instant"; 

    // --- DEFINIÇÕES DAS FERRAMENTAS ---
    const toolDefinitions = {
        'Diagnostico': {
            title: "Sessão de Diagnóstico",
            subtitle: "Analisando seu perfil...", 
            typewriterExamples: [ 
                "desabafa comigo...",
                "sem julgamentos...",
                "vamos resolver isso."
            ],
            // === O CÉREBRO DA ESTRATÉGIA ===
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
Fase 1: Investigação (3 a 5 perguntas)
- Pergunte o que está travando
- Botões: <<Preguiça>>, <<Medo>>, <<Cansaço>>, <<Vício>>, <<Outro>>
- Vá aprofundando até sentir que entendeu o padrão.

O GRANDE FINAL (GATILHO DE ENCERRAMENTO):
Quando você sentir que JÁ SABE qual é o problema (após 4 a 6 interações), faça o seguinte na ÚLTIMA MENSAGEM:

5. Diga: "Se você não eliminar esse Sabotador, nada vai mudar."
6. Termine com a tag: [FIM_DA_SESSAO]
7. NÃO COLOQUE BOTÕES NESSA ÚLTIMA MENSAGEM.`,
            isLocked: false 
        },

        // Ferramentas Vitrine
        'Estrategista': { title: "Estrategista Diário", subtitle: "Ferramenta PRO", typewriterExamples: ["Acesso Restrito"], systemPrompt: "Bloqueado.", isLocked: true },
        'Mestre': { title: "Ferreiro de Hábitos", subtitle: "Ferramenta PRO", typewriterExamples: ["Acesso Restrito"], systemPrompt: "Bloqueado.", isLocked: true },
        'Auditor': { title: "Auditor de Hábitos", subtitle: "Ferramenta PRO", typewriterExamples: ["Acesso Restrito"], systemPrompt: "Bloqueado.", isLocked: true }
    };
    
    // --- ESTADO ---
    let currentTool = 'Diagnostico'; 
    let conversationHistory = []; 
    let currentTypewriterTimeout = null;
    let isChatLocked = false;
    let capturedDiagnosis = "Padrão Identificado"; // Fallback
    let capturedDiagnosisText = "Análise comportamental concluída.";

    // --- ELEMENTOS DOM ---
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
    
    const textInputWrapper = document.getElementById('textInputWrapper');
    const demoUsageMessage = document.getElementById('demoUsageMessage');
    const upgradeBlock = document.getElementById('upgradeBlock');

    // --- UTILS ---
    function getUsageCount() { return parseInt(localStorage.getItem(DEMO_COUNT_KEY) || '0', 10); }
    function incrementUsageCount() {
        let count = getUsageCount();
        localStorage.setItem(DEMO_COUNT_KEY, (count + 1).toString());
        return count + 1;
    }

    // --- FUNÇÃO DE RESET (DEV TOOLS) ---
    const devResetBtn = document.getElementById('devResetBtn');
    if(devResetBtn) {
        devResetBtn.addEventListener('click', () => {
            if(confirm('Isso vai zerar sua contagem e recarregar a página. Confirmar?')) {
                localStorage.removeItem(DEMO_COUNT_KEY);
                localStorage.removeItem(DEMO_DATE_KEY);
                window.location.reload();
            }
        });
    }

    // --- FUNÇÃO TOGGLE DIAGNÓSTICO (EXPANDIR) ---
    window.toggleDiagnosis = function(element) {
        const content = element.nextElementSibling;
        const icon = element.querySelector('.fa-chevron-down');
        
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
            content.style.opacity = '0';
            content.style.marginTop = '0';
            icon.style.transform = 'rotate(0deg)';
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
            content.style.opacity = '1';
            content.style.marginTop = '10px';
            icon.style.transform = 'rotate(180deg)';
        }
    }

    // --- RENDERIZAÇÃO DO CARD (DOSSIÊ COM ANIMAÇÃO) ---
    function renderReportCard(diagnosisName, diagnosisText) {
        const reportDiv = document.createElement('div');
        reportDiv.className = 'report-card show-animate';
        
        reportDiv.innerHTML = `
            <!-- CABEÇALHO DO CARD -->
            <div class="flex items-center gap-3 mb-5 border-b border-gray-800 pb-4">
                <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-red-900 to-black border border-red-900/50 flex items-center justify-center shadow-[0_0_15px_rgba(204,0,0,0.2)]">
                    <i class="fas fa-file-medical-alt text-brutal-red"></i>
                </div>
                <div>
                    <h3 class="font-black text-white uppercase text-sm tracking-wide">Dossiê do Diagnóstico</h3>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest">Análise Finalizada</p>
                </div>
            </div>
            
            <div class="space-y-3">
                
                <!-- ITEM 1: SINTOMA (ESTÁTICO, SEM CLIQUE) -->
                <div>
                    <div class="report-item unlocked border border-green-500/20 bg-green-500/5">
                        <div class="flex items-center justify-between w-full">
                            <div class="flex items-center gap-4">
                                <!-- Ícone de Check Verde -->
                                <div class="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 border border-green-500/20">
                                    <i class="fas fa-check text-green-500 text-xs"></i>
                                </div>
                                <div>
                                    <span class="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-0.5 block">Sintoma Superficial</span>
                                    <span class="text-sm font-bold text-white leading-tight block">${diagnosisName}</span>
                                </div>
                            </div>
                            <!-- AQUI FOI REMOVIDO O ÍCONE DO OLHO/SETA -->
                        </div>
                    </div>
                    
                    <!-- EXPLICAÇÃO SEMPRE VISÍVEL -->
                    <div class="diagnosis-content text-gray-400 text-sm leading-relaxed border-l-2 border-green-500/30 ml-4 mt-2 pl-4 py-2">
                        <p class="italic relative">
                            <span class="text-green-800 font-serif text-2xl absolute -left-2 -top-2 opacity-50">“</span>
                            ${diagnosisText}
                        </p>
                    </div>
                </div>

                <!-- ITEM 2: RAIZES (BLOQUEADO) -->
                <div class="report-item locked relative overflow-hidden group cursor-pointer opacity-60 hover:opacity-80 transition-opacity" onclick="window.open('pag.html', '_blank')">
                    <div class="flex items-center gap-4">
                        <div class="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shrink-0">
                            <i class="fas fa-lock text-gray-500 text-xs"></i>
                        </div>
                        <div>
                            <span class="text-sm font-bold text-gray-300 block">2 Raízes Profundas</span>
                            <span class="text-[10px] text-gray-500 uppercase tracking-wide">Origem Emocional</span>
                        </div>
                    </div>
                </div>

                <!-- ITEM 3: SABOTADOR (BLOQUEADO - DESTAQUE) -->
                <div class="report-item locked-danger relative overflow-hidden group cursor-pointer transition-transform hover:scale-[1.01]" style="border: 1px solid rgba(204,0,0,0.3); background: rgba(204,0,0,0.05);" onclick="window.open('pag.html', '_blank')">
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-red-900/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                    
                    <div class="flex items-center justify-between relative z-10">
                        <div class="flex items-center gap-4">
                            <div class="w-8 h-8 rounded bg-brutal-red flex items-center justify-center text-white shadow-lg shadow-red-900/30">
                                <i class="fas fa-user-secret"></i>
                            </div>
                            <div>
                                <span class="text-sm font-bold text-white block">Nome do Seu Sabotador</span>
                                <span class="text-[10px] text-red-400 uppercase tracking-wider font-bold">Revelar Identidade</span>
                            </div>
                        </div>
                        <div class="bg-black/40 px-2 py-1 rounded border border-red-500/30">
                            <i class="fas fa-lock text-xs text-red-500"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mt-6 pt-4 border-t border-gray-800 text-center">
                <p class="text-xs text-gray-500 italic mb-1">
                    "Para parar de falhar, elimine o <strong class="text-gray-300">Sabotador</strong>."
                </p>
            </div>
        `;
        messagesContainer.appendChild(reportDiv);
        scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    }

    // --- BARRA DE AÇÃO ---
    function transformInputToActionBar() {
        if(textInputWrapper) textInputWrapper.style.display = 'none';
        
        const actionBar = document.createElement('div');
        actionBar.className = 'action-bar';
        
        actionBar.innerHTML = `
            <button id="btnExplore" class="btn-explore">
                <i class="fas fa-bars"></i> Menu
            </button>
            <a href="pag.html" target="_blank" class="btn-upgrade" onclick="fbq('track', 'InitiateCheckout');">
                <span>Revelar Sabotador</span> <i class="fas fa-unlock"></i>
            </a>
        `;
        
        const container = document.querySelector('.chat-input-container .w-full');
        const existingBar = container.querySelector('.action-bar');
        if(existingBar) existingBar.remove();
        if(container) container.appendChild(actionBar);

        document.getElementById('btnExplore').addEventListener('click', (e) => {
            e.preventDefault();
            if (window.innerWidth <= 768) openSidebar();
            else {
                sidebar.style.transition = "border-color 0.3s";
                sidebar.style.borderColor = '#CC0000';
                setTimeout(() => sidebar.style.borderColor = '#333', 800);
            }
        });
    }

    function triggerLockState() {
        isChatLocked = true;
        if (demoUsageMessage) {
            demoUsageMessage.textContent = "Diagnóstico Concluído.";
            demoUsageMessage.className = "text-red-500 font-bold text-xs mt-2";
        }
        transformInputToActionBar();
        renderReportCard(capturedDiagnosis, capturedDiagnosisText);
    }

    // --- CORE CHAT ---
    function addMessage(message, isUser, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add(isUser ? 'chat-message-user' : 'chat-message-ia');
        if (isError) messageDiv.classList.add('brutal-red', 'font-bold');
        
        const buttonRegex = /<<(.+?)>>/g;
        const buttons = [];
        let match;

        while ((match = buttonRegex.exec(message)) !== null) {
            buttons.push(match[1]);
        }

        let cleanMessage = message.replace(buttonRegex, '').trim();
        cleanMessage = cleanMessage.replace('[FIM_DA_SESSAO]', '').trim();
        
        // Limpa as chaves do diagnóstico visualmente
        cleanMessage = cleanMessage.replace(/\{/g, '<strong>').replace(/\}/g, '</strong>');

        let formattedMessage = cleanMessage.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formattedMessage = formattedMessage.replace(/\n/g, '<br>');

        messageDiv.innerHTML = formattedMessage;

        if (buttons.length > 0) {
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'quick-reply-container'; 
            buttons.forEach(btnText => {
                const btn = document.createElement('button');
                btn.className = 'cyber-btn';
                btn.innerText = btnText;
                btn.onclick = () => window.sendQuickReply(btnText);
                scrollContainer.appendChild(btn);
            });
            messageDiv.appendChild(scrollContainer);
        }
        messagesContainer.appendChild(messageDiv);
        scrollingContainer.scrollTop = scrollingContainer.scrollHeight;
    }

    async function sendMessage() {
        if (isChatLocked) return; 

        const message = chatInput.value.trim();
        if (message === '') return;
        
        const usageCount = incrementUsageCount();
        
        let systemInstruction = "";
        if (usageCount >= SAFETY_LIMIT) {
            systemInstruction = " [SISTEMA: O limite de segurança foi atingido. ENCERRE AGORA. Defina o sintoma entre chaves {Sintoma} e coloque a tag [FIM_DA_SESSAO].]";
        }

        addMessage(message, true);
        chatInput.value = '';
        chatInput.disabled = true;
        sendBtn.innerHTML = '<div id="loadingSpinner"></div>';
        
        conversationHistory.push({ role: "user", content: message + systemInstruction });
        
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
            let iaMessage = data.choices?.[0]?.message?.content;
            
            if (iaMessage) {
                // CAPTURA DO DIAGNÓSTICO ENTRE CHAVES
                const diagnosisMatch = iaMessage.match(/\{([^}]+)\}/);
                if (diagnosisMatch && diagnosisMatch[1]) {
                    capturedDiagnosis = diagnosisMatch[1];
                    // Pega o texto para o resumo, limpando as chaves e a tag
                    capturedDiagnosisText = iaMessage.replace('[FIM_DA_SESSAO]', '').replace(/\{/g, '').replace(/\}/g, '').replace(/\*\*/g, '').trim();
                    // Limita o tamanho para não quebrar o card
                    if(capturedDiagnosisText.length > 250) capturedDiagnosisText = capturedDiagnosisText.substring(0, 250) + "...";
                }

                if (iaMessage.includes('[FIM_DA_SESSAO]')) {
                    addMessage(iaMessage, false);
                    triggerLockState();
                } else {
                    addMessage(iaMessage, false);
                    chatInput.disabled = false;
                    if(window.innerWidth > 768) chatInput.focus();
                }
                
                conversationHistory.push({ role: "assistant", content: iaMessage });
            }
            
        } catch (error) {
            addMessage("Erro de conexão.", false, true);
            chatInput.disabled = false;
        } finally {
            if (!isChatLocked) {
                sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
            } else {
                sendBtn.style.display = 'none';
            }
        }
    }

    // --- NAVEGAÇÃO ---
    function setActiveTool(toolName, isInitialLoad = false) { 
        currentTool = toolName;
        const toolInfo = toolDefinitions[toolName];
        
        if (!isInitialLoad) {
            const card = messagesContainer.querySelector('.w-full.text-center');
            messagesContainer.innerHTML = ''; 
            if(card) messagesContainer.appendChild(card);
        }

        chatTitle.textContent = toolInfo.title.toUpperCase();
        if (chatSubtitle) {
             chatSubtitle.innerHTML = `${toolInfo.subtitle} <span id="typewriter-text" class="brutal-red font-bold"></span>`;
             startTypewriterAnimation(toolInfo.typewriterExamples || []);
        }

        if (toolInfo.isLocked) {
            if(textInputWrapper) textInputWrapper.style.display = 'none';
            const existingAction = document.querySelector('.action-bar');
            if(existingAction) existingAction.style.display = 'none';
            if(upgradeBlock) {
                upgradeBlock.classList.remove('hidden');
                document.getElementById('upgradeTitle').textContent = toolInfo.title;
            }
        } else {
            if(upgradeBlock) upgradeBlock.classList.add('hidden');
            if (isChatLocked) {
                transformInputToActionBar();
            } else {
                if(textInputWrapper) textInputWrapper.style.display = 'flex';
                const existingAction = document.querySelector('.action-bar');
                if(existingAction) existingAction.style.display = 'none';
                chatInput.disabled = false;
                if(demoUsageMessage) {
                    demoUsageMessage.textContent = "Sessão em andamento...";
                    demoUsageMessage.className = "text-gray-500 text-xs mt-2";
                }
            }
            conversationHistory = [{ role: "system", content: toolInfo.systemPrompt }];
        }
        document.querySelectorAll('.tool-item').forEach(item => {
            item.classList.toggle('active', item.id === `tool${toolName}`);
        });
    }

    // --- FUNÇÕES GLOBAIS ---
    function openSidebar() { if(sidebar) sidebar.classList.add('open'); if(overlay) { overlay.classList.add('open'); overlay.style.visibility = 'visible'; } }
    function closeSidebar() { if(sidebar) sidebar.classList.remove('open'); if(overlay) { overlay.classList.remove('open'); setTimeout(() => { if (!overlay.classList.contains('open')) overlay.style.visibility = 'hidden'; }, 300); } }

    // --- LISTENERS ---
    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (chatInput) chatInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    if (openBtn) openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
    document.querySelectorAll('.tool-item').forEach(item => { item.addEventListener('click', (e) => { const toolName = item.id.replace('tool', ''); if (toolDefinitions[toolName]) { setActiveTool(toolName, false); if (window.innerWidth <= 768) closeSidebar(); } }); });

    function startTypewriterAnimation(examples = []) { 
        if (currentTypewriterTimeout) clearTimeout(currentTypewriterTimeout);
        const targetElement = document.getElementById('typewriter-text');
        if (!targetElement || examples.length === 0) return;
        let exampleIndex = 0, charIndex = 0, isDeleting = false;
        function type() {
            const currentText = examples[exampleIndex];
            targetElement.textContent = currentText.substring(0, isDeleting ? charIndex - 1 : charIndex + 1);
            charIndex += isDeleting ? -1 : 1;
            if (!isDeleting && charIndex === currentText.length) { isDeleting = true; setTimeout(type, 2000); }
            else if (isDeleting && charIndex === 0) { isDeleting = false; exampleIndex = (exampleIndex + 1) % examples.length; setTimeout(type, 500); }
            else setTimeout(type, isDeleting ? 40 : 80);
        }
        type(); 
    }

    setActiveTool('Diagnostico', true);
    window.sendQuickReply = function(text) { const input = document.getElementById('chatInput'); if(input && !input.disabled) { input.value = text; document.getElementById('sendBtn').click(); } };
});