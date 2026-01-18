import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';

// --- CONFIGURAÇÕES GLOBAIS ---
let chatHistory = [];
// AJUSTE 1: Mudamos o padrão para o Agente Único
let currentAgentKey = 'MENTOR'; 
let messageCount = 0;



let userStatus = 'DEMO';
try {
    const session = JSON.parse(localStorage.getItem('synapse_user'));
    if (session && session.status) {
        userStatus = session.status.toUpperCase(); 
    }
} catch (e) {}

const IS_DEMO_MODE = userStatus !== 'VIP' && userStatus !== 'PRO';

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
        // Ajuste para mobile/desktop focus
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
    // Se o agente não existir (ex: chaves antigas), força o MENTOR
    if (!AGENTS[key]) key = 'MENTOR';
    
    currentAgentKey = key;

    const messagesArea = document.getElementById('messagesArea');
    const viewChat = document.getElementById('viewChat');

    // Limpa classes antigas e adiciona a nova
    viewChat.className = 'view-section h-full flex flex-col bg-black relative'; // Reseta classes base
    if (AGENTS[key].themeClass) viewChat.classList.add(AGENTS[key].themeClass);

    if (messagesArea) messagesArea.innerHTML = '';

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

    // CARREGA HISTÓRICO DO SUPABASE
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

    setTimeout(() => {
        renderChatSidebar();
    }, 500);
}

// --- RENDERIZAR SIDEBAR ---
export function renderChatSidebar() {
    const container = document.getElementById('chatHistoryList');
    if (!container) return;

    const history = window.AppEstado?.chatHistory || {};
    const activeChats = Object.keys(history).filter(key => history[key] && history[key].length > 0);

    if (activeChats.length === 0) {
        container.innerHTML = '<span class="text-[8px] text-gray-700 font-mono px-2 italic">SEM REGISTROS</span>';
        return;
    }

    container.innerHTML = ''; 

    activeChats.forEach(agentKey => {
        const msgs = history[agentKey];
        const firstUserMsg = msgs.find(m => m.role === 'user');
        let themeTitle = "Sessão Iniciada";
        
        if (firstUserMsg && firstUserMsg.content) {
            themeTitle = firstUserMsg.content.substring(0, 25);
            if (firstUserMsg.content.length > 25) themeTitle += "...";
        }

        let icon = "fa-brain";
        let colorClass = "text-red-500"; // Padrão Synapse
        
        const isActive = window.currentAgentKey === agentKey;
        const activeBg = isActive ? "bg-[#1a1a1a] border-white/10" : "border-transparent hover:bg-[#111] hover:border-white/5";

        const item = document.createElement('div');
        item.className = `group flex flex-col gap-1 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 border ${activeBg}`;
        
        item.onclick = () => window.selectTool(agentKey);

        item.innerHTML = `
            <span class="text-[11px] font-medium text-gray-300 group-hover:text-white truncate leading-tight">
                ${themeTitle}
            </span>
            <div class="flex items-center gap-2 mt-1">
                <i class="fa-solid ${icon} text-[10px] ${colorClass} opacity-80"></i>
                <span class="text-[9px] font-black uppercase tracking-wider text-gray-600 group-hover:text-gray-400">
                    ${agentKey === 'MENTOR' ? 'SYNAPSE' : agentKey}
                </span>
            </div>
        `;

        container.appendChild(item);
    });
}

// --- LÓGICA DE ENVIO (O CÉREBRO) ---
async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();

    if (!val) return;

    // Bloqueio Hard caso o usuário tente burlar via Console
    if (typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE && currentAgentKey === 'MENTOR' && messageCount >= DEMO_LIMIT) {
        return;
    }

    addMessageUI('user', val, false);
    if (!text) input.value = '';

    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    if (currentAgentKey === 'MENTOR') messageCount++;

    // --- AJUSTE 2: LÓGICA DE INJEÇÃO (CLIFFHANGER) ---
    let systemInjection = "";
    if (currentAgentKey === 'MENTOR' && IS_DEMO_MODE) {
        if (messageCount <= DIAGNOSE_PHASE) {
            systemInjection = `(INSTRUÇÃO: Acolha o usuário. Faça uma pergunta investigativa sobre a rotina dele para entender a dor principal.)`;
        } else if (messageCount < PRE_LOCK_PHASE) {
            systemInjection = `(INSTRUÇÃO: Mostre autoridade. Comece a sugerir que existe um método para resolver isso, mas não entregue tudo ainda.)`;
        } else if (messageCount === PRE_LOCK_PHASE) {
            // O GANCHO: Promete, mas não entrega
            systemInjection = `(INSTRUÇÃO CRÍTICA: O usuário está engajado. Diga EXATAMENTE: "Eu analisei seu perfil e detectei o padrão exato que te trava. Desenvolvi um Protocolo de 3 passos para resolver isso hoje. Quer ver o plano?" NÃO entregue o plano ainda.)`;
        } else {
            // O BLOQUEIO: O usuário disse sim, a IA bloqueia
            systemInjection = `(INSTRUÇÃO FINAL: O usuário quer o plano. Diga: "Perfeito. Estou compilando seu Protocolo Personalizado..." e encerre IMEDIATAMENTE com a tag [[LOCKED_DIAGNOSIS: [Motivo/Dor Principal do Usuário]]].)`;
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
            { role: 'system', content: `[User Lvl ${rpg.level} | Rank ${rpg.currentRank}]` }, 
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
            let diagnosisReason = "Falta de Método"; // Motivo padrão

            // --- AJUSTE 3: CAPTURA DO MOTIVO PARA O PAYWALL ---
            // Procura por [[LOCKED_DIAGNOSIS: Motivo]] ou apenas [[LOCKED_DIAGNOSIS]]
            const lockMatch = aiText.match(/(\[\[|\()LOCKED_.*?:?(.*?)(\]\]|\))/i);
            
            if (lockMatch) {
                forceBlock = true;
                // Se tiver conteúdo depois dos dois pontos, usa como motivo
                if (lockMatch[2] && lockMatch[2].trim().length > 2) {
                    diagnosisReason = lockMatch[2].trim();
                }
                // Remove a tag da mensagem visível
                aiText = aiText.replace(lockMatch[0], '').trim(); 
            }
            
            // Botões Dinâmicos {{Opção 1|Opção 2}}
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            // Executa comandos (add mission/habit)
            aiText = handleCommands(aiText);
            
            if (aiText.trim() !== "") {
                addMessageUI('ai', aiText, true);
                chatHistory.push({ role: 'user', content: val });
                chatHistory.push({ role: 'assistant', content: aiText });
                
                if (window.Database && typeof window.Database.saveChatHistory === 'function') {
                    window.Database.saveChatHistory(currentAgentKey, chatHistory);
                    renderChatSidebar(); 
                }
            }

            const isDemo = typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE;
            const isLimitReached = (isDemo && currentAgentKey === 'MENTOR' && messageCount >= DEMO_LIMIT);
            const shouldBlockNow = (isLimitReached) || forceBlock;

            if(dynamicButtons.length > 0 && !shouldBlockNow) {
                renderReplies(dynamicButtons);
            }

            if (shouldBlockNow) {
                disableInput(); 
                // Passa o motivo diagnosticado para a sequência
                setTimeout(() => { triggerPaywallSequence(diagnosisReason); }, 2000);
            }
        }
    } catch (e) {
        removeLoading(loadingId);
        console.error(e);
        addMessageUI('system', "ERRO DE CONEXÃO NEURAL.", false);
    }
}

// --- COMANDOS E UI ---
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
        // Truque para decodificar html entities se necessário
        const txt = document.createElement('textarea');
        txt.innerHTML = text;
        text = txt.value;
    }

    const div = document.createElement('div');
    let safeText = escapeHTML(text);
    // Formatação básica Markdown like
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
        // Pula tags HTML para não quebrar a digitação
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
    if (input) { input.disabled = false; input.placeholder = "Digite sua mensagem..."; }
    if (btn) btn.disabled = false;
}

// --- SEQUÊNCIA DE PAYWALL (COM MOTIVO PERSONALIZADO) ---
function triggerPaywallSequence(diagnosisReason) {
    disableInput();
    const area = document.getElementById('messagesArea');
    
    // Remove loaders antigos
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
            showPaywallCard(diagnosisReason); // Chama o card com o motivo
        }, 800);
    }, 3500);
}

