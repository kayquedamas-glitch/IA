import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
import { saveChatHistory, loadChatHistory } from '../modules/database.js';

// --- CONFIGURAÇÕES ---
let chatHistory = [];
let currentAgentKey = 'Diagnostico';
let messageCount = 0;

// TIMING DO PLANO (DEMO)
const DEMO_LIMIT = 7;     // Limite de mensagens para visitantes
const DIAGNOSE_PHASE = 3; 
const SELL_PHASE = 5;

// --- INICIALIZAÇÃO ---
export async function initChat() {
    const btn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('chatInput');
    const resetBtn = document.getElementById('resetChatBtn');

    if (resetBtn) resetBtn.onclick = () => resetCurrentChat();

    if (btn && input) {
        btn.onclick = () => sendMessage();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
        
        // Ajuste para mobile/teclado
        if (window.innerWidth > 768) {
            input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
}

// --- CHECAGEM DE STATUS (DINÂMICA) ---
function isDemoUser() {
    // 1. Tenta usar a variável global definida no main.js
    if (typeof window.IS_DEMO !== 'undefined') return window.IS_DEMO;
    
    // 2. Fallback: verifica se não tem sessão salva
    const hasSession = localStorage.getItem('synapse_session_v2') || localStorage.getItem('synapse_user');
    return !hasSession;
}

// --- RESETAR ---
async function resetCurrentChat() {
    const area = document.getElementById('messagesArea');
    if (area) {
        area.style.transition = 'opacity 0.3s';
        area.style.opacity = '0';
    }
    setTimeout(async () => {
        chatHistory = [];
        messageCount = 0;
        enableInput();
        await saveChatHistory(currentAgentKey, []);
        if (area) {
            area.innerHTML = '';
            area.style.opacity = '1';
        }
        await loadAgent(currentAgentKey);
    }, 300);
}

// --- CARREGAR AGENTE ---
export async function loadAgent(key) {
    if (!AGENTS[key]) return;
    currentAgentKey = key;

    const messagesArea = document.getElementById('messagesArea');
    const viewChat = document.getElementById('viewChat');

    // Limpa temas antigos
    viewChat.className = viewChat.className.replace(/theme-\w+/g, '').trim();
    if (AGENTS[key].themeClass) viewChat.classList.add(AGENTS[key].themeClass);

    if (messagesArea) messagesArea.innerHTML = '';

    // HEADER VISUAL
    const headerHTML = `
        <div class="w-full text-center mt-8 mb-6 animate-fade-in opacity-0" style="animation-delay: 0.2s; opacity: 1;">
            <div class="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                <img src="PRO/logo_synapse.png" onerror="this.src='logo_synapse.png'" class="chat-header-img w-full h-full object-contain drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" alt="Synapse AI">
            </div>
            <p class="text-[10px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                CONEXÃO: <span id="header-dynamic-text" class="text-red-600 font-bold">ESTABELECIDA</span>
            </p>
        </div>
    `;
    messagesArea.insertAdjacentHTML('beforeend', headerHTML);

    const savedHistory = await loadChatHistory(key);
    if (savedHistory && savedHistory.length > 0) {
        chatHistory = savedHistory;
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') addMessageUI(msg.role === 'assistant' ? 'ai' : msg.role, msg.content, false);
        });
        messagesArea.insertAdjacentHTML('beforeend', `<div class="w-full text-center my-4 opacity-50"><span class="text-[8px] text-gray-700 uppercase tracking-widest border-b border-gray-800 pb-1">Memória Restaurada</span></div>`);
        scrollToBottom();
    } else {
        chatHistory = [{ role: 'system', content: AGENTS[key].prompt }];
        setTimeout(() => {
            addMessageUI('ai', AGENTS[key].welcome, true);
            if (AGENTS[key].initialButtons) {
                setTimeout(() => renderReplies(AGENTS[key].initialButtons), 1000);
            }
        }, 500);
    }
}

// --- LÓGICA DE ENVIO ---
async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();

    if (!val) return;

    // Trava de segurança numérica para DEMO
    if (isDemoUser() && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT) {
        return; // Já deveria estar bloqueado, mas garante
    }

    addMessageUI('user', val, false);
    if (!text) input.value = '';

    // Remove botões de resposta rápida anteriores
    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    if (currentAgentKey === 'Diagnostico') messageCount++;

    // --- O DIRETOR DA CONVERSA (Instruções Naturais) ---
    // Injeção de sistema apenas para o fluxo de Diagnóstico
    let systemInjection = "";
    if (currentAgentKey === 'Diagnostico') {
        if (messageCount <= DIAGNOSE_PHASE) {
            systemInjection = `(Contexto: Fase de Sondagem. Faça apenas 1 pergunta curta sobre a rotina.)`;
        } 
        else if (messageCount <= SELL_PHASE) {
            systemInjection = `(Contexto: Fase de Identificação. Valide a dor dele. Diga que é falta de método.)`;
        } 
        else if (messageCount < DEMO_LIMIT) {
            systemInjection = `(Contexto: Oferta. Diga: "Criei um plano pra você resolver isso. Quer ver?")`;
        } 
        else {
            systemInjection = `(Contexto: Fechamento. Diga que o plano está pronto. Encerre com [[LOCKED_DIAGNOSIS]].)`;
        }
    }

    const loadingId = showLoading();
    const rpg = getRPGState();
    
    try {
        const MAX_CONTEXT = 12;
        const recentHistory = chatHistory.slice(1).slice(-MAX_CONTEXT); // Pega as últimas mensagens ignorando o prompt inicial antigo
        
        // Monta o payload para a API
        const apiMessages = [
            chatHistory[0], // Prompt original (System)
            { role: 'system', content: systemInjection }, 
            { role: 'system', content: `[User Level: ${rpg.level}]` }, 
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
            
            // --- VERIFICAÇÃO DE COMANDOS ESPECIAIS ---
            let triggerLock = false;

            // 1. Detecta Tag de Bloqueio
            const lockRegex = /(\[\[|\()LOCKED_.*?(\]\]|\))/i;
            if (lockRegex.test(aiText)) {
                triggerLock = true;
                aiText = aiText.replace(lockRegex, ''); // Remove a tag do texto visível
            }
            
            // 2. Detecta Botões Dinâmicos {{Opção1|Opção2}}
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            // 3. Processa Missões e Hábitos
            aiText = handleCommands(aiText);
            
            // Exibe a resposta
            if (aiText.trim() !== "") {
                addMessageUI('ai', aiText, true);
                
                // Salva no histórico
                chatHistory.push({ role: 'user', content: val });
                chatHistory.push({ role: 'assistant', content: aiText });
                
                // Persiste no banco de dados (apenas se não for demo ou se quiser salvar demo também)
                saveChatHistory(currentAgentKey, chatHistory);
            }
            
            // --- LÓGICA DE BLOQUEIO / AÇÃO ---
            
            // Se for DEMO e a IA mandou bloquear (ou atingiu limite) -> BLOQUEIA
            const shouldBlock = isDemoUser() && (triggerLock || (currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT));

            if (shouldBlock) {
                console.log("🔒 Paywall Ativado (Modo Demo)");
                disableInput(); 
                setTimeout(() => { triggerPaywallSequence(); }, 1500);
            } 
            else if (triggerLock && !isDemoUser()) {
                // Se for PRO e a IA mandou bloquear -> IGNORA O BLOQUEIO
                console.log("🔓 Usuário PRO: Tag de bloqueio ignorada.");
                // Opcional: Mostrar um toast dizendo "Plano Atualizado"
            }

            // Renderiza botões se não bloqueou
            if(dynamicButtons.length > 0 && !shouldBlock) {
                renderReplies(dynamicButtons);
            }
        }
    } catch (e) {
        removeLoading(loadingId);
        console.error(e);
        addMessageUI('system', "FALHA NA CONEXÃO NEURAL. TENTE NOVAMENTE.", false);
    }
}

// --- COMANDOS E VISUAL ---
function handleCommands(text) {
    const regex = /\[\[(ADD_MISSION|ADD_HABIT):(.*?)\]\]/g;
    let match;
    let clean = text;
    
    while ((match = regex.exec(text)) !== null) {
        const type = match[1];
        const value = match[2].trim();
        
        if (type === 'ADD_MISSION') {
            addMissionFromAI(value);
            // Opcional: Avisar no chat que adicionou
        }
        if (type === 'ADD_HABIT') {
            addHabitFromAI(value);
        }
        
        clean = clean.replace(match[0], ''); // Remove do texto final
    }
    return clean;
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

function addMessageUI(role, text, animate = true) {
    const area = document.getElementById('messagesArea');
    if (!area) return;

    // Normaliza texto
    if (typeof text !== 'string') text = String(text);

    const div = document.createElement('div');
    
    // Formatação simples Markdown-like
    let safeText = escapeHTML(text);
    let formattedText = safeText
        .replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>') // Negrito
        .replace(/\*(.*?)\*/g, '<i class="text-gray-400">$1</i>') // Itálico
        .replace(/\n/g, '<br>');

    if (role === 'user') {
        div.className = 'chat-message-user';
        div.innerHTML = formattedText;
    } else if (role === 'ai') {
        div.className = 'chat-message-ia';
        if (animate) typeWriterBubble(div, formattedText);
        else div.innerHTML = formattedText;
    } else {
        // System message
        div.className = 'self-center text-[10px] text-red-500 font-bold my-2 opacity-70 border border-red-900/30 px-3 py-1 rounded bg-red-900/10';
        div.innerHTML = `<i class="fa-solid fa-triangle-exclamation mr-1"></i> ${formattedText}`;
    }

    area.appendChild(div);
    scrollToBottom();
}

function typeWriterBubble(element, html, speed = 8) {
    let i = 0;
    element.innerHTML = '';
    
    // Detecta se é HTML para não quebrar tags
    function type() {
        if (i >= html.length) return;
        
        const char = html.charAt(i);
        
        if (char === '<') {
            const tagEnd = html.indexOf('>', i);
            if (tagEnd !== -1) {
                element.innerHTML += html.substring(i, tagEnd + 1);
                i = tagEnd + 1;
                setTimeout(type, 0); // Tags renderizam instantaneamente
                return;
            }
        }
        
        // Tratamento de entidades html (&amp;, etc)
        if (char === '&') {
            const entityEnd = html.indexOf(';', i);
            if (entityEnd !== -1 && entityEnd - i < 10) {
                element.innerHTML += html.substring(i, entityEnd + 1);
                i = entityEnd + 1;
                setTimeout(type, 0);
                return;
            }
        }

        element.innerHTML += char;
        i++;
        
        // Scrolla conforme digita
        if (i % 5 === 0) scrollToBottom(); 
        
        setTimeout(type, speed);
    }
    type();
}

function renderReplies(btns) {
    const area = document.getElementById('messagesArea');
    const div = document.createElement('div');
    div.className = "quick-reply-container animate-fade-in-up";
    
    btns.forEach(b => {
        if(!b) return;
        const btn = document.createElement('button');
        btn.className = "cyber-btn";
        btn.innerText = b.trim();
        btn.onclick = () => sendMessage(b.trim());
        div.appendChild(btn);
    });
    
    area.appendChild(div);
    scrollToBottom();
}

function showLoading() {
    const area = document.getElementById('messagesArea');
    const id = 'l' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "animate-fade-in my-2 ml-1";
    // Loading estilo "Digitando..." mais clean
    div.innerHTML = `
        <div class="loading-neural">
            <span></span><span></span><span></span>
        </div>`;
    area.appendChild(div);
    scrollToBottom();
    return id;
}

function removeLoading(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    const messagesContainer = document.querySelector('.chat-messages');
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

function disableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { 
        input.disabled = true; 
        input.placeholder = "PROCESSAMENTO CONCLUÍDO."; 
        input.parentElement.classList.add('opacity-50', 'grayscale');
    }
    if (btn) btn.disabled = true;
}

function enableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { 
        input.disabled = false; 
        input.placeholder = "Comando neural..."; 
        input.parentElement.classList.remove('opacity-50', 'grayscale');
        input.focus();
    }
    if (btn) btn.disabled = false;
}

// --- SEQUÊNCIA DE BLOQUEIO (PAYWALL) ---
function triggerPaywallSequence() {
    const area = document.getElementById('messagesArea');
    const sequenceId = 'seq-' + Date.now();
    
    const sequenceHTML = `
        <div id="${sequenceId}" class="my-8 flex flex-col items-center justify-center animate-fade-in transition-all duration-500">
            <div class="relative w-24 h-24 mb-4 flex items-center justify-center">
                <div class="absolute inset-0 bg-red-600 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
                <img src="PRO/logo_synapse.png" onerror="this.src='logo_synapse.png'" class="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(204,0,0,0.5)] animate-pulse-slow" alt="Synapse Locked">
            </div>
            <div id="status-text-${sequenceId}" class="font-mono text-xs font-bold tracking-[0.2em] text-red-500 text-center uppercase">
                <i class="fa-solid fa-lock mr-2"></i>Compilando Dossiê...
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

    // Animação da barra
    setTimeout(() => { 
        const bar = document.getElementById(`progress-bar-${sequenceId}`);
        if(bar) bar.style.width = "100%"; 
    }, 100);

    setTimeout(() => {
        const textEl = document.getElementById(`status-text-${sequenceId}`);
        if (textEl) {
            textEl.className = "font-mono text-xs font-bold tracking-[0.2em] text-green-500 text-center uppercase";
            textEl.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i>Plano Pronto.`;
            
            const container = document.getElementById(sequenceId);
            if(container) {
                container.style.transform = "scale(0.95)";
                container.style.opacity = "0";
            }
        }
        setTimeout(() => {
            const container = document.getElementById(sequenceId);
            if(container) container.remove();
            showPaywallCard();
        }, 600);
    }, 3200);
}

// --- CARD DE VENDA (HUMANIZADO) ---
function showPaywallCard() {
    const area = document.getElementById('messagesArea');
    const CHECKOUT_LINK = "https://pay.kiwify.com.br/YzOIskc"; // Seu link

    const cardHTML = `
        <div class="w-full max-w-md mx-auto mt-4 mb-24 relative z-0 animate-fade-in-up">
            <div class="bg-[#0a0a0a] rounded-xl border border-white/10 p-6 shadow-2xl relative overflow-hidden group hover:border-red-500/30 transition-colors">
                
                <div class="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
                
                <div class="relative z-10 text-center">
                    <div class="inline-block p-3 rounded-full bg-red-900/10 mb-4 text-red-500 border border-red-500/20">
                        <i class="fa-solid fa-file-shield text-xl"></i>
                    </div>
                    
                    <h2 class="text-xl text-white font-bold italic mb-2 tracking-tight">SEU PLANO ESTÁ PRONTO</h2>
                    
                    <p class="text-gray-400 text-xs mb-6 leading-relaxed px-4">
                        A análise identificou seus pontos cegos. O <b class="text-white">Synapse PRO</b> gerou um protocolo personalizado para eliminar sua procrastinação.
                    </p>

                    <a href="${CHECKOUT_LINK}" target="_blank" class="flex items-center justify-center gap-2 w-full bg-white text-black font-black py-4 rounded-lg hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] text-xs tracking-widest uppercase active:scale-95">
                        <span>Desbloquear Meu Plano</span>
                        <i class="fa-solid fa-arrow-right"></i>
                    </a>
                    
                    <p class="mt-4 text-[10px] text-gray-600 uppercase tracking-wider">
                        <i class="fa-solid fa-lock mr-1"></i> Acesso Seguro & Imediato
                    </p>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = cardHTML;
    area.appendChild(div);
    scrollToBottom();
}