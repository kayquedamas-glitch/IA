import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';

// --- CONFIGURAÇÕES GLOBAIS ---
let currentSessionId = null;
let chatHistory = [];
let currentAgentKey = 'MENTOR';
const DIAGNOSE_PHASE = 2;
const PRE_LOCK_PHASE = 4;




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

window.startNewChat = async function () {
    console.log("✨ Iniciando Nova Sessão...");

    // Verifica se já estourou o limite antes mesmo de carregar
    if (IS_DEMO_MODE && getDemoUsage() >= DEMO_MSG_LIMIT) {
        // Permite carregar a interface, mas já prepara o bloqueio ou aviso visual
        console.warn("⚠️ Limite Demo já atingido.");
    }

    currentSessionId = 'sessao_' + Date.now();
    chatHistory = [];
    currentAgentKey = 'MENTOR';

    enableInput();

    const area = document.getElementById('messagesArea');

    if (area) {
        area.style.transition = 'opacity 0.2s';
        area.style.opacity = '0';
        setTimeout(async () => {
            await loadAgent('MENTOR');
            area.style.opacity = '1';
        }, 200);
    } else {
        await loadAgent('MENTOR');
    }

    if (window.renderChatSidebar) window.renderChatSidebar();
};

window.loadSession = async function (sessionId) {
    const session = window.AppEstado?.chatSessions?.[sessionId];
    if (!session) return;

    console.log("📂 Carregando Sessão:", sessionId);

    currentSessionId = sessionId;
    currentAgentKey = session.agentKey || 'MENTOR';
    chatHistory = session.messages || [];

    const area = document.getElementById('messagesArea');
    if (area) area.innerHTML = '';

    enableInput();

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

    addMessageUI('user', val, false);
    if (!text) input.value = '';

    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    const loadingId = showLoading();
    const rpg = getRPGState();

    try {
        // Pega o system prompt do primeiro item do histórico
        const systemPrompt = chatHistory[0]?.content || '';
        const levelContext = `Usuário está no Nível ${rpg.level}. Streak atual: ${rpg.streak} dias.`;

        // Monta histórico no formato Gemini (role: user | model)
        const MAX_CONTEXT = 12;
        const recentHistory = chatHistory.slice(1).slice(-MAX_CONTEXT);

        const geminiContents = [];

        for (const msg of recentHistory) {
            if (msg.role === 'system') continue; // Gemini não aceita system no contents
            geminiContents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }

        // Adiciona a mensagem atual
        geminiContents.push({
            role: 'user',
            parts: [{ text: val }]
        });

        const geminiKey = CONFIG.AI.GEMINI_KEY;
        const geminiModel = CONFIG.AI.MODEL || 'gemini-2.0-flash';
        const geminiUrl = `${CONFIG.AI.GEMINI_URL}/${geminiModel}:generateContent?key=${geminiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

        const res = await fetch(geminiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: `${systemPrompt}\n\n${levelContext}` }]
                },
                contents: geminiContents,
                generationConfig: {
                    temperature: 0.85,
                    maxOutputTokens: 800,
                    topP: 0.95
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        removeLoading(loadingId);

        // Extrai texto da resposta Gemini
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawText) {
            let aiText = rawText;
            let dynamicButtons = [];

            // Checa tag de bloqueio (compatibilidade)
            const lockMatch = aiText.match(/(\[\[|\()LOCKED_.*?:?(.*?)(\]\]|\))/i);
            if (lockMatch) {
                aiText = aiText.replace(lockMatch[0], '').trim();
            }

            // Botões dinâmicos {{btn1|btn2}}
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if (btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);

            if (aiText.trim() !== '') {
                addMessageUI('ai', aiText, true);

                chatHistory.push({ role: 'user', content: val });
                chatHistory.push({ role: 'assistant', content: aiText });

                // Define título da sessão
                let sessionTitle = 'Nova Conversa';
                const existing = window.AppEstado?.chatSessions?.[currentSessionId];
                if (existing && existing.title && existing.title !== 'Nova Conversa') {
                    sessionTitle = existing.title;
                } else {
                    const userMsg = chatHistory.find(m => m.role === 'user');
                    if (userMsg) sessionTitle = userMsg.content.substring(0, 30) + '...';
                }

                // Salva sessão
                const userMsgCount = chatHistory.filter(m => m.role === 'user').length;
                const sessionExists = !!window.AppEstado?.chatSessions?.[currentSessionId];

                if (window.Database && (userMsgCount >= 3 || sessionExists)) {
                    window.Database.saveSession(currentSessionId, {
                        id: currentSessionId,
                        agentKey: currentAgentKey,
                        title: sessionTitle,
                        messages: chatHistory,
                        updatedAt: new Date().toISOString()
                    });
                    if (window.renderChatSidebar) window.renderChatSidebar();
                }
            }

            if (dynamicButtons.length > 0) renderReplies(dynamicButtons);
        } else {
            throw new Error('Resposta vazia do Gemini.');
        }

    } catch (e) {
        removeLoading(loadingId);
        console.error('Gemini Error:', e);

        let msg = 'ERRO DE CONEXÃO NEURAL.';
        if (e.name === 'AbortError') {
            msg = 'TEMPO LIMITE EXCEDIDO. TENTE NOVAMENTE.';
        } else if (e.message) {
            msg = `FALHA NA IA: ${e.message}`;
        }

        addMessageUI('system', msg, false);
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


// --- RENDERIZAR SIDEBAR (HISTÓRICO) ---
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
window.deleteSession = async function (sessionId) {
    if (!confirm("Deseja apagar este histórico permanentemente?")) return;

    if (window.Database && window.Database.deleteSession) {
        await window.Database.deleteSession(sessionId);
    } else {
        if (window.AppEstado.chatSessions[sessionId]) {
            delete window.AppEstado.chatSessions[sessionId];
            if (window.Database) window.Database.forceSave();
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