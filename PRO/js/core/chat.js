import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
import { saveChatHistory, loadChatHistory } from '../modules/database.js';
import { showPaywallModal } from '../modules/features.js';

// chat.js
let chatHistory = [];
let currentAgentKey = 'Diagnostico';

// --- NOVAS VARIÁVEIS ---
let messageCount = 0;
const DEMO_LIMIT = 6; // O usuário troca 3 mensagens e depois bloqueia
const IS_DEMO_MODE = localStorage.getItem('synapse_access') !== 'PRO';
// ARQUIVO: PRO/js/core/chat.js (Topo)
const MIN_QUESTIONS = 3;  // Mínimo para criar engajamento
const MAX_QUESTIONS = 8;  // Máximo para não ficar chato

// --- INICIALIZAÇÃO ---
export async function initChat() {
    const btn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('chatInput');

    // Botão de Reset (Lixeira)
    const resetBtn = document.getElementById('resetChatBtn');
    if (resetBtn) {
        resetBtn.onclick = () => resetCurrentChat();
    }

    if (btn && input) {
        btn.onclick = () => sendMessage();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
        // Scroll ao focar no mobile/desktop
        if (window.innerWidth > 768) {
            input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
}


// --- RESETAR CONVERSA ---
async function resetCurrentChat() {
    const area = document.getElementById('messagesArea');

    // Efeito visual (Fade out)
    if (area) {
        area.style.transition = 'opacity 0.3s';
        area.style.opacity = '0';
    }

    setTimeout(async () => {
        chatHistory = []; // Limpa RAM
        messageCount = 0; // <--- ADICIONE ISSO: Reseta o contador
        enableInput();    // <--- ADICIONE ISSO: Garante que o input volte a funcionar
        await saveChatHistory(currentAgentKey, []); // Limpa Banco de Dados

        if (area) {
            area.innerHTML = '';
            area.style.opacity = '1';
        }

        // Recarrega o Agente do zero
        await loadAgent(currentAgentKey);
    }, 300);
}

// --- CARREGAR AGENTE ---
export async function loadAgent(key) {
    if (!AGENTS[key]) return;
    currentAgentKey = key;

    const messagesArea = document.getElementById('messagesArea');
    const viewChat = document.getElementById('viewChat');

    // 1. Aplica Atmosfera (Skin)
    viewChat.classList.remove('theme-diagnostico', 'theme-comandante', 'theme-general', 'theme-tatico');
    if (AGENTS[key].themeClass) viewChat.classList.add(AGENTS[key].themeClass);

    // 2. Limpa Tela
    if (messagesArea) messagesArea.innerHTML = '';

    // 3. Cabeçalho
    const headerHTML = `
        <div class="w-full text-center mt-8 mb-6 animate-fade-in opacity-0" style="animation-delay: 0.2s; opacity: 1;">
            <div class="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                <img src="logo_synapse.png" class="chat-header-img w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" alt="Synapse Octopus">
            </div>
            <p class="text-[10px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                CONEXÃO: <span id="header-dynamic-text" class="text-red-600 font-bold">ESTABELECIDA</span>
            </p>
        </div>
    `;
    messagesArea.insertAdjacentHTML('beforeend', headerHTML);

    // 4. Carrega Histórico
    const savedHistory = await loadChatHistory(key);

    if (savedHistory && savedHistory.length > 0) {
        chatHistory = savedHistory;
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                addMessageUI(msg.role === 'assistant' ? 'ai' : msg.role, msg.content, false);
            }
        });
        messagesArea.insertAdjacentHTML('beforeend', `<div class="w-full text-center my-4 opacity-50"><span class="text-[8px] text-gray-700 uppercase tracking-widest border-b border-gray-800 pb-1">Memória Restaurada</span></div>`);
    } else {
        // Novo Chat
        chatHistory = [{ role: 'system', content: AGENTS[key].prompt }];

        setTimeout(() => {
            addMessageUI('ai', AGENTS[key].welcome, true);
            if (AGENTS[key].initialButtons) {
                setTimeout(() => renderReplies(AGENTS[key].initialButtons), 1000);
            }
        }, 500);
    }

    // Atualiza Menu Lateral
    document.querySelectorAll('.tool-item').forEach(el => {
        if (el.textContent.includes(AGENTS[key].name)) el.classList.add('active');
        else el.classList.remove('active');
    });
}


// ARQUIVO: PRO/js/core/chat.js
// Substitua a função sendMessage inteira por esta versão corrigida:

async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();

    // 1. VALIDAÇÃO DE INPUT
    if (!val) return;

    // 2. BLOQUEIO DE SEGURANÇA (DEMO) 
    if (typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT) {
        return;
    }

    // 3. UI DO USUÁRIO
    addMessageUI('user', val, false);
    if (!text) input.value = '';

    // Remove botões antigos
    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    // 4. INCREMENTA O CONTADOR
    if (currentAgentKey === 'Diagnostico') {
        messageCount++;
    }

    // --- A LÓGICA DO DIRETOR INVISÍVEL (CORRIGIDA) ---
    let systemInjection = "";

    if (currentAgentKey === 'Diagnostico') {
        if (messageCount < 3) {
            // FASE 1: ESCUTA (O usuário fala, IA valida)
            systemInjection = `(INSTRUÇÃO: Apenas ouça e valide a dor do usuário. Mostre que você entende o problema. Faça uma pergunta curta para ele falar mais.)`;
        } 
        else if (messageCount < 6) {
            // FASE 2: TIRAR A CULPA (A IA explica que o problema é o método)
            systemInjection = `(INSTRUÇÃO: Agora tire a culpa das costas dele. Diga que o cérebro humano falha sem organização externa. Use lógica para acalmá-lo.)`;
        } 
        else if (messageCount < 9) {
            // FASE 3: A INDUÇÃO (Preparando a venda)
            systemInjection = `(INSTRUÇÃO: Comece a perguntar: "E se você tivesse um sistema que lembrasse de tudo por você?". Faça ele desejar a organização.)`;
        } 
        else {
            // FASE 4: O FECHAMENTO (Bloqueio)
            systemInjection = `(INSTRUÇÃO FINAL: Diga que o Synapse é a solução exata para isso. Encerre com a tag [[LOCKED_DIAGNOSIS]].)`;
        }
    }

    const loadingId = showLoading();
    const rpg = getRPGState();

    const context = {
        role: 'system',
        content: `[SISTEMA] Usuário Nível ${rpg.level} | Rank: ${rpg.currentRank}.`
    };

    try {
        const MAX_CONTEXT = 15;
        const recentHistory = chatHistory.slice(1).slice(-MAX_CONTEXT);

        const apiMessages = [
            chatHistory[0], 
            { role: 'system', content: systemInjection }, 
            context, 
            ...recentHistory, 
            { role: 'user', content: val }
        ];

        const res = await fetch(CONFIG.AI_WORKER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: CONFIG.API_MODEL,
                messages: apiMessages
            })
        });

        const data = await res.json();
        removeLoading(loadingId);

        if (data.choices && data.choices[0]) {
            let aiText = data.choices[0].message.content;
            // (Logo após receber 'aiText')

            let forceBlock = false;

            // --- CORREÇÃO DO BUG AQUI ---
            // Essa linha aceita tanto [[LOCKED...]] quanto (LOCKED...)
            const lockRegex = /(\[\[|\()LOCKED_DIAGNOSIS(\]\]|\))/i;

            if (lockRegex.test(aiText)) {
                aiText = aiText.replace(lockRegex, ''); // Apaga a tag do texto visual
                forceBlock = true; // Ativa o modal
            }
            
            // Tratamento de botões (JSON)
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);
            
            // Exibe a resposta (sem a tag LOCKED)
            if (aiText.trim() !== "") {
                addMessageUI('ai', aiText, true);
            }
            
            // Verifica se deve bloquear
            const isDemo = typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE;
            const isLimitReached = (isDemo && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT);
            const shouldBlockNow = (isLimitReached) || forceBlock;

            if(dynamicButtons.length > 0 && !shouldBlockNow) {
                renderReplies(dynamicButtons);
            }

            // Salva histórico (opcional, adicione sua função de salvar aqui se necessário)
            // chatHistory.push({ role: 'assistant', content: aiText });

            // DISPARAR PAYWALL
            if (shouldBlockNow) {
                console.log("🔒 Bloqueio ativado via Tag ou Limite!");
                disableInput(); 
                
                // Pequeno delay para o usuário ler a última frase antes da animação
                setTimeout(() => {
                    triggerPaywallSequence(); 
                }, 2000);
            }
        }
    } catch (e) {
        removeLoading(loadingId);
        console.error(e);
        addMessageUI('system', "ERRO DE CONEXÃO.", false);
    }
}

// --- COMANDOS ESPECIAIS ---
function handleCommands(text) {
    const regex = /\[\[(ADD_MISSION|ADD_HABIT):(.*?)\]\]/g;
    let match;
    let clean = text;
    while ((match = regex.exec(text)) !== null) {
        if (match[1] === 'ADD_MISSION') addMissionFromAI(match[2]);
        if (match[1] === 'ADD_HABIT') addHabitFromAI(match[2]);
        clean = clean.replace(match[0], '');
    }
    return clean;
}

// --- SEGURANÇA (Sanitização) ---
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g,
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag]));
}

// --- RENDERIZAÇÃO DE MENSAGENS (UI) ---
function addMessageUI(role, text, animate = true) {
    const area = document.getElementById('messagesArea');
    if (!area) return;

    // --- LIMPEZA PROFUNDA ---
    if (text) {
        // Transforma códigos quebrados de volta em texto real antes de processar
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        text = txt.value;
    }

    const div = document.createElement('div');

    // 1. Sanitiza (Segurança)
    let safeText = escapeHTML(text);

    // 2. Formatação Rica (Markdown simples)
    let formattedText = safeText
        .replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>') // Negrito
        .replace(/\*(.*?)\*/g, '<i class="text-gray-400">$1</i>') // Itálico
        .replace(/\n/g, '<br>'); // Quebra de linha (Importante para listas)
    div.style.whiteSpace = 'pre-wrap';



    if (role === 'user') {
        div.className = 'chat-message-user';
        div.innerHTML = formattedText;
    } else if (role === 'ai') {
        div.className = 'chat-message-ia';
        if (animate) typeWriterBubble(div, formattedText);
        else div.innerHTML = formattedText;
    } else {
        div.className = 'self-center text-[10px] text-red-500 font-bold my-2 opacity-70';
        div.innerHTML = formattedText;
    }

    area.appendChild(div);
    scrollToBottom();
}

// --- ANIMAÇÃO DE DIGITAÇÃO ---
// Verifique se sua função typeWriterBubble está assim:
// --- ANIMAÇÃO DE DIGITAÇÃO (VERSÃO CORRIGIDA) ---
// --- ANIMAÇÃO DE DIGITAÇÃO BLINDADA (Tags + Símbolos) ---
function typeWriterBubble(element, html, speed = 10) {
    let i = 0;
    element.innerHTML = ''; // Limpa antes de começar

    function type() {
        if (i >= html.length) return;

        const char = html.charAt(i);

        // 1. DETECTA TAGS HTML (<b class="...">, </b>, etc)
        if (char === '<') {
            let tagEnd = html.indexOf('>', i);
            if (tagEnd !== -1) {
                // Cola a tag inteira (invisível para o usuário, mas ativa o estilo)
                element.innerHTML += html.substring(i, tagEnd + 1);
                i = tagEnd + 1;
                setTimeout(type, 0); // Sem pausa
                return;
            }
        }

        // 2. DETECTA CÓDIGOS ESPECIAIS (&quot;, &amp;, &#39;)
        if (char === '&') {
            let entityEnd = html.indexOf(';', i);
            // Se encontrar um ; perto (máx 10 chars), assume que é um código
            if (entityEnd !== -1 && entityEnd - i < 10) {
                element.innerHTML += html.substring(i, entityEnd + 1);
                i = entityEnd + 1;
                setTimeout(type, 0); // Sem pausa
                return;
            }
        }

        // 3. TEXTO NORMAL (Digita letra por letra)
        element.innerHTML += char;
        i++;

        // Mantém o scroll descendo
        scrollToBottom();
        setTimeout(type, speed);
    }

    type();
}

function renderReplies(btns) {
    const area = document.getElementById('messagesArea');
    const div = document.createElement('div');
    div.className = "quick-reply-container animate-fade-in-up";
    btns.forEach(b => {
        const btn = document.createElement('button');
        btn.className = "cyber-btn";
        btn.innerText = b.trim();
        btn.onclick = () => sendMessage(b.trim());
        div.appendChild(btn);
    });
    area.appendChild(div);
    scrollToBottom();
}

// --- ANIMAÇÃO DE LOADING ---
function showLoading() {
    const area = document.getElementById('messagesArea');
    const id = 'l' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "animate-fade-in my-2"; // Animação de entrada suave

    // ESCOLHA SUA VERSÃO AQUI (1, 2 ou 3):
    const VERSION = 1;

    if (VERSION === 1) {
        // OPÇÃO 1: Neural Pulse (3 bolinhas vermelhas)
        div.innerHTML = `
            <div class="loading-neural">
                <span></span><span></span><span></span>
            </div>`;
    }
    else if (VERSION === 2) {
        // OPÇÃO 2: Tactical Terminal (Texto mudando)
        div.innerHTML = `
            <div class="loading-tactical">
                <i class="fa-solid fa-terminal mr-2"></i>SYSTEM
            </div>`;
    }
    else if (VERSION === 3) {
        // OPÇÃO 3: Synapse Ring (Anel girando)
        div.innerHTML = `
            <div class="loading-ring-container">
                <div class="loading-ring"></div>
                <span class="loading-text">Sincronizando Neural...</span>
            </div>`;
    }

    area.appendChild(div);
    scrollToBottom();
    return id;
}

function removeLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- SCROLL INTELIGENTE ---
// --- SCROLL INTELIGENTE (VERSÃO CORRIGIDA) ---
function scrollToBottom() {
    const messagesContainer = document.querySelector('.chat-messages'); // Pega o container, não a área interna
    const area = document.getElementById('messagesArea');

    if (messagesContainer) {
        // Opção 1: Tenta scroll suave nativo
        messagesContainer.scrollTo({
            top: messagesContainer.scrollHeight,
            behavior: 'smooth'
        });

        // Opção 2 (Fallback): Força bruta caso o suave falhe (com pequeno delay)
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 100);
    }
}
// --- FUNÇÕES DE UI AUXILIARES (Mantenha apenas uma vez!) ---

function disableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) {
        input.disabled = true;
        input.placeholder = "AGUARDANDO UPGRADE";
    }
    if (btn) btn.disabled = true;
}

function enableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) {
        input.disabled = false;
        input.placeholder = "Digite sua mensagem...";
    }
    if (btn) btn.disabled = false;
}

// --- FUNÇÃO DO PAYWALL ---

// =========================================================================
// NOVA SEQUÊNCIA DE PAYWALL PROFISSIONAL (COLE NO FINAL DO CHAT.JS)
// =========================================================================

// =========================================================================
// SEQUÊNCIA DE GERAÇÃO DE PLANO + PAYWALL INSPIRADOR
// =========================================================================

// =========================================================================
// SEQUÊNCIA VISUAL "NEURAL CORE" (COM O POLVO PULSANDO)
// =========================================================================

function triggerPaywallSequence() {
    disableInput();

    const area = document.getElementById('messagesArea');

    // Remove qualquer loading anterior
    const oldLoad = document.querySelector('.synapse-loader-wrapper');
    if (oldLoad) oldLoad.parentElement.remove();

    // ID único para manipular
    const sequenceId = 'seq-' + Date.now();

    // HTML: O Polvo centralizado com texto mudando embaixo
    // Usamos as mesmas classes de animação que criamos antes, mas maiores (text-lg)
    const sequenceHTML = `
        <div id="${sequenceId}" class="my-8 flex flex-col items-center justify-center animate-fade-in transition-all duration-500">
            
            <div class="relative w-24 h-24 mb-4 flex items-center justify-center">
                <div class="absolute inset-0 bg-red-600 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
                
                <img src="logo_synapse.png" 
                     class="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(204,0,0,0.5)] animate-pulse-slow" 
                     style="animation-duration: 1s;"
                     alt="Synapse Core">
            </div>

            <div id="status-text-${sequenceId}" class="font-mono text-xs font-bold tracking-[0.2em] text-red-500 text-center uppercase">
                <i class="fa-solid fa-satellite-dish fa-spin mr-2"></i>Sincronizando...
            </div>

            <div class="w-48 h-1 bg-gray-900 rounded-full mt-3 overflow-hidden border border-gray-800">
                <div id="progress-bar-${sequenceId}" class="h-full bg-red-600 w-0 transition-all duration-[3000ms] ease-out"></div>
            </div>

        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = sequenceHTML;
    area.appendChild(div);
    scrollToBottom();

    // --- A COREOGRAFIA DA ANIMAÇÃO ---

    // 1. Inicia a barra de progresso
    setTimeout(() => {
        document.getElementById(`progress-bar-${sequenceId}`).style.width = "100%";
    }, 100);

    // 2. Muda o Texto: "Compilando"
    setTimeout(() => {
        const textEl = document.getElementById(`status-text-${sequenceId}`);
        if (textEl) {
            textEl.className = "font-mono text-xs font-bold tracking-[0.2em] text-yellow-500 text-center uppercase";
            textEl.innerHTML = `<i class="fa-solid fa-microchip animate-pulse mr-2"></i>Compilando Dossiê...`;
        }
    }, 1500);

    // 3. Muda o Texto: "Concluído"
    setTimeout(() => {
        const textEl = document.getElementById(`status-text-${sequenceId}`);
        if (textEl) {
            textEl.className = "font-mono text-xs font-bold tracking-[0.2em] text-green-500 text-center uppercase";
            textEl.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i>Protocolo Pronto.`;

            // Explosão visual (Scale Up e Fade Out)
            const container = document.getElementById(sequenceId);
            container.style.transform = "scale(1.1)";
            container.style.opacity = "0";
        }

        // 4. Mostra o Card Final
        setTimeout(() => {
            document.getElementById(sequenceId).remove(); // Remove a animação
            showPaywallCard(); // Mostra o card
        }, 800);

    }, 3500);
}

function showPaywallCard() {
    const area = document.getElementById('messagesArea');
    const CHECKOUT_LINK = "../index.html#planos";

    const cardHTML = `
        <div class="w-full max-w-md mx-auto mt-8 mb-12 relative z-0 animate-fade-in-up">
            
            <div class="bg-[#080808] rounded-xl border border-gray-800 p-8 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-900 via-red-600 to-gray-900"></div>

                <div class="relative z-10 text-center">
                    <p class="text-gray-500 text-xs uppercase tracking-widest mb-4">Relatório Finalizado</p>
                    
                    <h2 class="text-2xl text-white font-serif italic mb-6">"Você está a um passo de <span class="text-red-500 not-italic font-bold">quebrar o ciclo.</span>"</h2>
                    
                    <div class="bg-gray-900/50 rounded-lg p-4 text-left mb-6 border-l-2 border-red-500">
                        <p class="text-gray-300 text-sm leading-relaxed">
                            <i class="fa-solid fa-quote-left text-gray-600 mr-2 text-xs"></i>
                            Identifiquei exatamente onde você falha. Não é falta de capacidade, é falta de método. O protocolo que gerei corrige isso em 3 dias.
                        </p>
                    </div>

                    <a href="${CHECKOUT_LINK}" class="block w-full bg-white text-black font-extrabold py-4 rounded hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] text-sm tracking-wide uppercase">
                        Ver meu Plano de Ação
                    </a>
                    
                    <p class="mt-4 text-xs text-gray-600">
                        <i class="fa-solid fa-clock mr-1"></i> Oferta por tempo limitado
                    </p>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = cardHTML;
    area.appendChild(div);
    setTimeout(() => { if (typeof scrollToBottom === 'function') scrollToBottom(); }, 300);
}
async function processAIResponse(aiText) {
    const chatHistory = document.getElementById('chatHistory');

    // 1. VERIFICAÇÃO DE COMANDO OCULTO
    if (aiText.includes('[[LOCKED_DIAGNOSIS]]')) {

        // Remove a tag do texto para o usuário não ver "[[LOCKED...]]"
        const cleanText = aiText.replace('[[LOCKED_DIAGNOSIS]]', '');

        // Mostra a mensagem final da IA (se houver texto antes da tag)
        if (cleanText.trim().length > 0) {
            appendMessage('ai', cleanText);
        }

        // 2. DISPARA O MODAL (Gatilho)
        console.log("🔒 Diagnóstico Bloqueado Detectado - Abrindo Modal");

        setTimeout(() => {
            // Tenta chamar a função importada ou global
            if (typeof showPaywallModal === 'function') {
                showPaywallModal();
            } else if (window.showPaywallModal) {
                window.showPaywallModal();
            } else {
                console.error("Erro: Função showPaywallModal não encontrada!");
            }
        }, 1500); // Delay dramático de 1.5s para ele ler a última frase

        return; // Para a execução aqui, não faz mais nada
    }

    // Se não tiver a tag, segue normal
    appendMessage('ai', aiText);
}