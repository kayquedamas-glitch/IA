import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
// REMOVIDO: import { saveChatHistory... } (Isso causava a tela preta)

// --- CONFIGURAÇÕES ---
let chatHistory = [];
let currentAgentKey = 'Diagnostico';
let messageCount = 0;

const DEMO_LIMIT = 7;    
const DIAGNOSE_PHASE = 3; 
const SELL_PHASE = 5;     

const IS_DEMO_MODE = localStorage.getItem('synapse_access') !== 'PRO';

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
        if (window.innerWidth > 768) {
            input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
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
        
        // USANDO O NOVO BANCO DE DADOS
        if (window.Database) {
            await window.Database.saveChatHistory(currentAgentKey, []);
        }
        
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

    viewChat.classList.remove('theme-diagnostico', 'theme-comandante', 'theme-general', 'theme-tatico');
    if (AGENTS[key].themeClass) viewChat.classList.add(AGENTS[key].themeClass);

    if (messagesArea) messagesArea.innerHTML = '';

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

    // CARREGA HISTÓRICO DO SUPABASE (Via window.Database)
    let savedHistory = [];
    if (window.Database) {
        savedHistory = await window.Database.loadChatHistory(key);
    }

    if (savedHistory && savedHistory.length > 0) {
        chatHistory = savedHistory;
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') addMessageUI(msg.role === 'assistant' ? 'ai' : msg.role, msg.content, false);
        });
        messagesArea.insertAdjacentHTML('beforeend', `<div class="w-full text-center my-4 opacity-50"><span class="text-[8px] text-gray-700 uppercase tracking-widest border-b border-gray-800 pb-1">Memória Restaurada</span></div>`);
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

    if (typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT) {
        return;
    }

    addMessageUI('user', val, false);
    if (!text) input.value = '';

    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    if (currentAgentKey === 'Diagnostico') messageCount++;

    let systemInjection = "";
    if (currentAgentKey === 'Diagnostico') {
        if (messageCount <= DIAGNOSE_PHASE) {
            systemInjection = `(INSTRUÇÃO: Pergunte algo sobre a rotina dele. Seja natural, como uma conversa no WhatsApp. Uma pergunta só.)`;
        } else if (messageCount <= SELL_PHASE) {
            systemInjection = `(INSTRUÇÃO: Mostre que entende o problema dele. Diga que falta organização, mas sem culpar ele. Sugira que existe um jeito mais fácil.)`;
        } else if (messageCount < DEMO_LIMIT) {
            systemInjection = `(INSTRUÇÃO: Diga: "Eu montei um plano pra te ajudar com isso. Quer dar uma olhada?". Gere curiosidade.)`;
        } else {
            systemInjection = `(INSTRUÇÃO FINAL: Diga: "Seu plano está pronto. O Synapse vai te mostrar agora." Encerre OBRIGATORIAMENTE com [[LOCKED_DIAGNOSIS]].)`;
        }
    }

    const loadingId = showLoading();
    const rpg = getRPGState(); // Isso já pega do estado novo
    
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

            const lockRegex = /(\[\[|\()LOCKED_.*?(\]\]|\))/i;
            if (lockRegex.test(aiText)) {
                aiText = aiText.replace(lockRegex, ''); 
                forceBlock = true;
            }
            
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
                
                // SALVA NO SUPABASE
                if (window.Database) {
                    window.Database.saveChatHistory(currentAgentKey, chatHistory);
                }
            }
            
            const isDemo = typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE;
            const isLimitReached = (isDemo && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT);
            const shouldBlockNow = (isLimitReached) || forceBlock;

            if(dynamicButtons.length > 0 && !shouldBlockNow) {
                renderReplies(dynamicButtons);
            }

            if (shouldBlockNow) {
                disableInput(); 
                setTimeout(() => { triggerPaywallSequence(); }, 2000);
            }
        }
    } catch (e) {
        removeLoading(loadingId);
        console.error(e);
        addMessageUI('system', "ERRO DE CONEXÃO.", false);
    }
}

// --- RESTO DAS FUNÇÕES DE UI (Mantidas iguais) ---
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

    if (text) {
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        text = txt.value;
    }

    const div = document.createElement('div');
    let safeText = escapeHTML(text);
    let formattedText = safeText
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
        setTimeout(() => { messagesContainer.scrollTop = messagesContainer.scrollHeight; }, 100);
    }
}

function disableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { input.disabled = true; input.placeholder = "PLANO GERADO"; }
    if (btn) btn.disabled = true;
}

function enableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { input.disabled = false; input.placeholder = "Digite sua mensagem..."; }
    if (btn) btn.disabled = false;
}

function triggerPaywallSequence() {
    disableInput();
    const area = document.getElementById('messagesArea');
    const oldLoad = document.querySelector('.synapse-loader-wrapper');
    if (oldLoad) oldLoad.parentElement.remove();

    const sequenceId = 'seq-' + Date.now();
    
    const sequenceHTML = `
        <div id="${sequenceId}" class="my-8 flex flex-col items-center justify-center animate-fade-in transition-all duration-500">
            <div class="relative w-24 h-24 mb-4 flex items-center justify-center">
                <div class="absolute inset-0 bg-red-600 rounded-full blur-[40px] opacity-20 animate-pulse"></div>
                <img src="logo_synapse.png" class="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(204,0,0,0.5)] animate-pulse-slow" style="animation-duration: 1s;" alt="Synapse Core">
            </div>
            <div id="status-text-${sequenceId}" class="font-mono text-xs font-bold tracking-[0.2em] text-red-500 text-center uppercase">
                <i class="fa-solid fa-satellite-dish fa-spin mr-2"></i>Gerando Plano...
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
            textEl.innerHTML = `<i class="fa-solid fa-microchip animate-pulse mr-2"></i>Finalizando...`;
        }
    }, 1500);

    setTimeout(() => {
        const textEl = document.getElementById(`status-text-${sequenceId}`);
        if (textEl) {
            textEl.className = "font-mono text-xs font-bold tracking-[0.2em] text-green-500 text-center uppercase";
            textEl.innerHTML = `<i class="fa-solid fa-check-circle mr-2"></i>Tudo pronto.`;
            const container = document.getElementById(sequenceId);
            container.style.transform = "scale(1.1)";
            container.style.opacity = "0";
        }
        setTimeout(() => {
            const el = document.getElementById(sequenceId);
            if(el) el.remove();
            showPaywallCard();
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
                    <p class="text-gray-500 text-xs uppercase tracking-widest mb-4">Análise Concluída</p>
                    <h2 class="text-2xl text-white font-serif italic mb-6">"Chega de viver no <span class="text-red-500 not-italic font-bold">automático.</span>"</h2>
                    <div class="bg-gray-900/50 rounded-lg p-4 text-left mb-6 border-l-2 border-red-500">
                        <p class="text-gray-300 text-sm leading-relaxed">
                            <i class="fa-solid fa-quote-left text-gray-600 mr-2 text-xs"></i>
                            O problema não é você, é a falta de método. Criei um plano passo a passo pra você assumir o controle da sua rotina de vez.
                        </p>
                    </div>
                    <a href="${CHECKOUT_LINK}" class="block w-full bg-white text-black font-extrabold py-4 rounded hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.1)] text-sm tracking-wide uppercase">
                        Ver meu Plano
                    </a>
                    <p class="mt-4 text-xs text-gray-600">
                        <i class="fa-solid fa-clock mr-1"></i> Acesso imediato
                    </p>
                </div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = cardHTML;
    area.appendChild(div);
    if (typeof scrollToBottom === 'function') scrollToBottom();
}