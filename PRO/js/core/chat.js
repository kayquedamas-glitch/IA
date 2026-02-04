import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';

// --- CONFIGURAÇÕES GLOBAIS ---
let currentSessionId = null;
let chatHistory = [];
let currentAgentKey = 'MENTOR'; 
let messageCount = 0;
const DIAGNOSE_PHASE = 2; 
const PRE_LOCK_PHASE = 4; 
const DEMO_LIMIT = 5;

// --- VERIFICAÇÃO DE STATUS (CORREÇÃO DE ERRO DE CONEXÃO) ---
let userStatus = 'DEMO';
try {
    const session = JSON.parse(localStorage.getItem('synapse_user'));
    if (session && session.status) {
        userStatus = session.status.toUpperCase(); 
    }
} catch (e) {}

const IS_DEMO_MODE = userStatus !== 'VIP' && userStatus !== 'PRO';
// -----------------------------------------------------------

// --- INICIALIZAÇÃO ---
export async function initChat() {
    const btn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('chatInput');
    const resetBtn = document.getElementById('resetChatBtn');

    if (resetBtn) resetBtn.onclick = () => window.startNewChat();

    if (btn && input) {
        btn.onclick = () => sendMessage();
        input.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        };
        if (window.innerWidth > 768) {
            input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
}

// --- FUNÇÕES GLOBAIS DE SESSÃO ---

window.startNewChat = async function() {
    console.log("✨ Iniciando Nova Sessão...");
    
    // 1. Gera ID e Reseta Variáveis
    currentSessionId = 'sessao_' + Date.now();
    chatHistory = [];
    currentAgentKey = 'MENTOR'; 
    messageCount = 0; 
    
    enableInput(); 
    
    const area = document.getElementById('messagesArea');
    
    // 2. Transição Suave Corrigida
    if (area) {
        // Apaga a tela (Fade Out)
        area.style.transition = 'opacity 0.2s';
        area.style.opacity = '0';
        
        // AGUARDA a tela apagar antes de carregar o novo conteúdo
        setTimeout(async () => {
            // O loadAgent já limpa o HTML, então chamamos ele aqui dentro
            await loadAgent('MENTOR');
            
            // Acende a tela (Fade In) com o conteúdo novo e a LOGO já carregados
            area.style.opacity = '1';
        }, 200);
    } else {
        await loadAgent('MENTOR');
    }
    
    // 3. Atualiza sidebar
    if (window.renderChatSidebar) window.renderChatSidebar();
};

window.loadSession = async function(sessionId) {
    const session = window.AppEstado?.chatSessions?.[sessionId];
    if (!session) return;

    console.log("📂 Carregando Sessão:", sessionId);

    currentSessionId = sessionId;
    currentAgentKey = session.agentKey || 'MENTOR';
    chatHistory = session.messages || [];

    // Limpa e prepara
    const area = document.getElementById('messagesArea');
    if (area) area.innerHTML = '';
    
    enableInput(); // Garante que ao carregar um chat antigo, o input funcione

    // Renderiza Header
    const headerHTML = `
        <div class="w-full text-center mt-8 mb-6 animate-fade-in opacity-0" style="animation-delay: 0.2s; opacity: 1;">
            <div class="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                <img src="logo_synapse.png" class="chat-header-img w-full h-full object-contain drop-shadow-[0_0_15px_rgba(200,0,0,0.3)]" alt="Synapse Free">
            </div>
            <p class="text-[10px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                CONEXÃO: <span id="header-dynamic-text" class="text-red-600 font-bold">RESTAURADA</span>
            </p>
        </div>
    `;
    if (area) area.insertAdjacentHTML('beforeend', headerHTML);

    // Renderiza Mensagens
    if (chatHistory.length > 0) {
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                const uiRole = msg.role === 'assistant' ? 'ai' : msg.role;
                addMessageUI(uiRole, msg.content, false);
            }
        });
        if (area) {
            area.insertAdjacentHTML('beforeend', `<div class="w-full text-center my-6 opacity-40"><span class="text-[9px] text-gray-500 uppercase tracking-widest border-b border-gray-800 pb-1"><i class="fa-solid fa-clock-rotate-left mr-1"></i> Fim do Histórico</span></div>`);
        }
    }

    window.switchTab('chat');
    if (window.renderChatSidebar) window.renderChatSidebar();
    
    setTimeout(() => {
        const container = document.querySelector('.chat-messages');
        if (container) container.scrollTop = container.scrollHeight;
    }, 100);
};

// --- CARREGAR AGENTE ---
export async function loadAgent(key) {
    if (!AGENTS[key]) key = 'MENTOR';
    currentAgentKey = key;

    const messagesArea = document.getElementById('messagesArea');
    const viewChat = document.getElementById('viewChat');

    if (AGENTS[key].themeClass) {
        viewChat.className = 'view-section h-full flex flex-col bg-black relative ' + AGENTS[key].themeClass;
    }

    if (messagesArea && chatHistory.length === 0) {
        messagesArea.innerHTML = '';
        const headerHTML = `
            <div class="w-full text-center mt-8 mb-6 animate-fade-in opacity-0" style="animation-delay: 0.2s; opacity: 1;">
                <div class="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                    <img src="logo_synapse.png" class="chat-header-img w-full h-full object-contain drop-shadow-[0_0_15px_rgba(200,0,0,0.3)]" alt="Synapse Free">
                </div>
                <p class="text-[10px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                    CONEXÃO: <span id="header-dynamic-text" class="text-red-600 font-bold">ESTABELECIDA</span>
                </p>
            </div>
        `;
        messagesArea.insertAdjacentHTML('beforeend', headerHTML);
        
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

    // Bloqueio Demo
    if (typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE && currentAgentKey === 'MENTOR' && messageCount >= DEMO_LIMIT) {
        if (typeof triggerPaywallSequence === 'function') triggerPaywallSequence("Limite Demo Atingido");
        return;
    }

    addMessageUI('user', val, false);
    if (!text) input.value = '';

    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    if (currentAgentKey === 'MENTOR') messageCount++;

    // Injeção de Contexto (Mantida)
    let systemInjection = "";
    if (currentAgentKey === 'MENTOR' && typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE) {
        if (messageCount <= DIAGNOSE_PHASE) {
            systemInjection = `(INSTRUÇÃO: Acolha. Pergunte a rotina.)`;
        } else if (messageCount < PRE_LOCK_PHASE) {
            systemInjection = `(INSTRUÇÃO: Sugira um método, mas faça suspense.)`;
        } else if (messageCount === PRE_LOCK_PHASE) {
            systemInjection = `(INSTRUÇÃO: Diga sobre o protocolo de 3 passos. Não entregue ainda.)`;
        } else {
            systemInjection = `(INSTRUÇÃO: Use tag [[LOCKED_DIAGNOSIS: Falta de Método]].)`;
        }
    }

    const loadingId = showLoading();
    const rpg = getRPGState(); 
    
    try {
        const MAX_CONTEXT = 12;
        const recentHistory = chatHistory.slice(1).slice(-MAX_CONTEXT);
        const apiMessages = [
            chatHistory[0], 
            { role: 'system', content: systemInjection }, 
            { role: 'system', content: `[User Lvl ${rpg.level}]` }, 
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
            let forceBlock = false;
            let diagnosisReason = "Plano Pro";

            // Checa bloqueio
            const lockMatch = aiText.match(/(\[\[|\()LOCKED_.*?:?(.*?)(\]\]|\))/i);
            if (lockMatch) {
                forceBlock = true;
                if (lockMatch[2] && lockMatch[2].trim().length > 2) diagnosisReason = lockMatch[2].trim();
                aiText = aiText.replace(lockMatch[0], '').trim(); 
            }
            
            // Botões
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);
            
            if (aiText.trim() !== "") {
                addMessageUI('ai', aiText, true);
                
                chatHistory.push({ role: 'user', content: val });
                chatHistory.push({ role: 'assistant', content: aiText });
                
                // --- DEFINIR TÍTULO ---
                let sessionTitle = "Nova Conversa";
                const existing = window.AppEstado?.chatSessions?.[currentSessionId];
                if (existing && existing.title && existing.title !== "Nova Conversa") {
                    sessionTitle = existing.title;
                } else {
                    const userMsg = chatHistory.find(m => m.role === 'user');
                    if (userMsg) sessionTitle = userMsg.content.substring(0, 30) + "...";
                }

                // --- MODIFICAÇÃO DE SALVAMENTO (REGRA DAS 3 MENSAGENS) ---
                const userMsgCount = chatHistory.filter(m => m.role === 'user').length;
                const sessionExists = !!window.AppEstado?.chatSessions?.[currentSessionId];

                // Só salva se:
                // 1. O usuário enviou 3 ou mais mensagens AGORA
                // 2. OU se a sessão já existia no banco (para continuar salvando sessões antigas que você reabriu)
                if (window.Database && (userMsgCount >= 3 || sessionExists)) {
                    window.Database.saveSession(currentSessionId, {
                        id: currentSessionId,
                        agentKey: currentAgentKey,
                        title: sessionTitle,
                        messages: chatHistory,
                        updatedAt: new Date().toISOString()
                    });
                    if (window.renderChatSidebar) window.renderChatSidebar();
                } else {
                    console.log(`⏳ Chat em buffer: ${userMsgCount}/3 mensagens para salvar.`);
                }
            }

            const isDemo = typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE;
            const shouldBlockNow = (isDemo && currentAgentKey === 'MENTOR' && messageCount >= DEMO_LIMIT) || forceBlock;

            if(dynamicButtons.length > 0 && !shouldBlockNow) renderReplies(dynamicButtons);

            if (shouldBlockNow) {
                setTimeout(() => { 
                    if (typeof triggerPaywallSequence === 'function') triggerPaywallSequence(diagnosisReason);
                }, 2000);
            }
        }
    } catch (e) {
        removeLoading(loadingId);
        console.error(e);
        addMessageUI('system', "ERRO DE CONEXÃO NEURAL.", false);
    }
}

// --- UTILITÁRIOS ---
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

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag]));
}

function addMessageUI(role, text, animate = true) {
    const area = document.getElementById('messagesArea');
    if (!area) return;
    
    // Decodifica HTML entities se precisar
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    text = txt.value;

    const div = document.createElement('div');
    let formattedText = escapeHTML(text)
        .replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>')
        .replace(/\*(.*?)\*/g, '<i class="text-gray-400">$1</i>')
        .replace(/\n/g, '<br>');
    
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

function typeWriterBubble(element, html, speed = 10) {
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i >= html.length) return;
        const char = html.charAt(i);
        if (char === '<') {
            let tagEnd = html.indexOf('>', i);
            if (tagEnd !== -1) {
                element.innerHTML += html.substring(i, tagEnd + 1);
                i = tagEnd + 1;
                setTimeout(type, 0);
                return;
            }
        }
        if (char === '&') {
            let entityEnd = html.indexOf(';', i);
            if (entityEnd !== -1 && entityEnd - i < 10) {
                element.innerHTML += html.substring(i, entityEnd + 1);
                i = entityEnd + 1;
                setTimeout(type, 0);
                return;
            }
        }
        element.innerHTML += char;
        i++;
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

function showLoading() {
    const area = document.getElementById('messagesArea');
    const id = 'l' + Date.now();
    const div = document.createElement('div');
    div.id = id;
    div.className = "animate-fade-in my-2";
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
        messagesContainer.scrollTo({ top: messagesContainer.scrollHeight, behavior: 'smooth' });
    }
}

function disableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { input.disabled = true; input.placeholder = "ACESSO RESTRITO // PLANO GERADO"; }
    if (btn) btn.disabled = true;
}

function enableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { 
        input.disabled = false; 
        input.placeholder = "Comando neural..."; 
        input.focus();
    }
    if (btn) btn.disabled = false;
}

function triggerPaywallSequence(diagnosisReason) {
    disableInput();
    const area = document.getElementById('messagesArea');
    const oldLoad = document.querySelector('.synapse-loader-wrapper');
    if (oldLoad) oldLoad.parentElement.remove();

    const sequenceId = 'seq-' + Date.now();
    const sequenceHTML = `
        <div id="${sequenceId}" class="my-8 flex flex-col items-center justify-center animate-fade-in transition-all duration-500">
            <div class="relative w-24 h-24 mb-4 flex items-center justify-center">
                <div class="absolute inset-0 bg-red-600 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
                <img src="logo_synapse.png" class="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(204,0,0,0.5)] animate-pulse-slow" style="animation-duration: 1s;" alt="Synapse Free">
            </div>
            <div id="status-text-${sequenceId}" class="font-mono text-xs font-bold tracking-[0.2em] text-red-500 text-center uppercase">
                <i class="fa-solid fa-satellite-dish fa-spin mr-2"></i>Compilando Protocolo...
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

    setTimeout(() => { 
        const bar = document.getElementById(`progress-bar-${sequenceId}`);
        if(bar) bar.style.width = "100%"; 
    }, 100);

    setTimeout(() => {
        const textEl = document.getElementById(`status-text-${sequenceId}`);
        if (textEl) {
            textEl.className = "font-mono text-xs font-bold tracking-[0.2em] text-yellow-500 text-center uppercase";
            textEl.innerHTML = `<i class="fa-solid fa-microchip animate-pulse mr-2"></i>Finalizando Estratégia...`;
        }
    }, 1500);

    setTimeout(() => {
        const textEl = document.getElementById(`status-text-${sequenceId}`);
        if (textEl) {
            textEl.className = "font-mono text-xs font-bold tracking-[0.2em] text-green-500 text-center uppercase";
            textEl.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i>Plano Pronto.`;
            const container = document.getElementById(sequenceId);
            container.style.transform = "scale(1.1)";
            container.style.opacity = "0";
        }
        setTimeout(() => {
            const el = document.getElementById(sequenceId);
            if(el) el.remove();
            if (typeof showPaywallCard === 'function') showPaywallCard(diagnosisReason);
            else console.log("Paywall Triggered:", diagnosisReason);
        }, 800);
    }, 3500);
}
// --- RENDERIZAR SIDEBAR (HISTÓRICO) ---
export function renderChatSidebar() {
    const container = document.getElementById('chatHistoryList');
    if (!container) return;

    const sessions = window.AppEstado?.chatSessions || {};
    
    // Converte objeto em array e ordena por data (mais recente primeiro)
    const sortedSessions = Object.values(sessions).sort((a, b) => {
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    container.innerHTML = ''; 

    if (sortedSessions.length === 0) {
        container.innerHTML = '<div class="text-center p-4 text-[10px] text-gray-600 italic">Nenhum histórico recente.</div>';
        return;
    }

    sortedSessions.forEach(session => {
        const isActive = currentSessionId === session.id;
        const activeClass = isActive 
            ? 'bg-white/10 border-red-500/50 opacity-100' 
            : 'bg-transparent border-transparent hover:bg-white/5 opacity-60 hover:opacity-100';
        
        const div = document.createElement('div');
        div.className = `relative group cursor-pointer w-full transition-all duration-200 ${activeClass} rounded-lg border p-3 mb-2`;
        
        const dataFormatada = new Date(session.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

        div.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-red-900/20 flex items-center justify-center border border-red-500/20 text-red-500 shrink-0">
                    <i class="fa-solid fa-message text-xs"></i>
                </div>
                <div class="flex flex-col overflow-hidden w-full">
                    <span class="text-[11px] font-bold text-gray-200 truncate group-hover:text-white leading-tight">
                        ${session.title || 'Nova Conversa'}
                    </span>
                    <span class="text-[8px] text-gray-500 uppercase tracking-wider mt-0.5">
                        ${dataFormatada} • ${session.agentKey || 'IA'}
                    </span>
                </div>
            </div>
            
            <button class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 z-10"
                onclick="event.stopPropagation(); window.deleteSession('${session.id}')" title="Apagar Conversa">
                <i class="fa-solid fa-trash-can text-[10px]"></i>
            </button>
        `;
        
        div.onclick = () => window.loadSession(session.id);
        
        container.appendChild(div);
    });
}

// Funcao Global para Deletar Sessão
window.deleteSession = async function(sessionId) {
    if(!confirm("Deseja apagar este histórico permanentemente?")) return;
    
    if (window.Database && window.Database.deleteSession) {
        await window.Database.deleteSession(sessionId);
    } else {
        if (window.AppEstado.chatSessions[sessionId]) {
            delete window.AppEstado.chatSessions[sessionId];
            if(window.Database) window.Database.forceSave();
        }
    }
    
    if (currentSessionId === sessionId) {
        window.startNewChat();
    } else {
        renderChatSidebar();
    }
};

// EXPORTA A FUNÇÃO PARA O WINDOW TAMBÉM (GARANTIA)
window.renderChatSidebar = renderChatSidebar;