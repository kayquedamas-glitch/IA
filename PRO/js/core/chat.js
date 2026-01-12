import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';

// --- ESTADO GLOBAL ---
let chatHistory = [];
let sessionList = []; 
let currentSessionId = null; 
let currentAgentKey = 'SYNAPSE'; // Padrão Absoluto
let messageCount = 0;

// Configurações de Demo/Venda
const DEMO_LIMIT = 7;    
const DIAGNOSE_PHASE = 3; 
const SELL_PHASE = 5;     

let userStatus = 'DEMO';
try {
    const session = JSON.parse(localStorage.getItem('synapse_user'));
    if (session && session.status) userStatus = session.status.toUpperCase(); 
} catch (e) {}

const IS_DEMO_MODE = userStatus !== 'VIP' && userStatus !== 'PRO';

// --- INICIALIZAÇÃO ---
export async function initChat() {
    const btn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('chatInput');
    const resetBtn = document.getElementById('resetChatBtn');

    // Expõe funções globais para o Sidebar funcionar
    window.resetCurrentChat = startNewSession; 
    window.loadSessionById = loadSessionById;

    if (resetBtn) resetBtn.onclick = () => startNewSession();

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

    // 1. Carrega lista de sessões antigas
    await fetchSessionList();

    // 2. Inicia o Super-Agente
    if (sessionList.length > 0) {
        await loadSessionById(sessionList[0].id);
    } else {
        await startNewSession();
    }
}

// --- ADAPTADOR DE AGENTES (Para compatibilidade) ---
export async function loadAgent(key) {
    // Não importa qual chave venha (Diagnostico, General, etc),
    // nós forçamos o SYNAPSE, pois ele agora é o único "cérebro".
    currentAgentKey = 'SYNAPSE';
    
    // Se não tem sessão ativa, cria uma.
    if (!currentSessionId) {
        await startNewSession();
    } else {
        // Se já tem, apenas garante que a UI está certa
        renderChatSidebar();
    }
}

// --- GERENCIAMENTO DE SESSÕES (Supabase) ---
async function fetchSessionList() {
    if (!window._supabase) return;
    
    const { data: { user } } = await window._supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await window._supabase
        .from('synapse_chats')
        .select('id, title, created_at')
        .order('updated_at', { ascending: false });

    if (!error && data) {
        sessionList = data;
        renderChatSidebar();
    }
}

// Cria uma NOVA memória (Chat Limpo) e Arquiva a Antiga
async function startNewSession() {
    console.log("Arquivando sessão anterior e iniciando nova...");
    
    const area = document.getElementById('messagesArea');
    
    // 1. SALVA A SESSÃO ATUAL ANTES DE LIMPAR (ARQUIVAMENTO)
    // Se já tiver um ID e mensagens, salva no banco com o estado atual
    if (currentSessionId && chatHistory.length > 0) {
        await saveSessionToSupabase(); 
        console.log("Sessão anterior arquivada com sucesso.");
    }

    // Efeito visual de limpeza
    if (area) {
        area.style.transition = 'opacity 0.2s';
        area.style.opacity = '0';
    }

    setTimeout(async () => {
        // 2. RESETA VARIÁVEIS PARA O NOVO CHAT
        currentSessionId = crypto.randomUUID(); // Gera um ID totalmente novo
        chatHistory = []; // Limpa o array local
        messageCount = 0;
        
        // Limpa UI
        if (area) {
            area.innerHTML = '';
            area.style.opacity = '1';
            renderHeader(); // Mostra logo
        }
        enableInput();

        // 3. CARREGA BOAS VINDAS DO AGENTE
        const agentData = AGENTS['SYNAPSE']; // Agente Único
        if (agentData) {
            chatHistory = [{ role: 'system', content: agentData.prompt }];
            addMessageUI('ai', agentData.welcome, true);
            
            if (agentData.initialButtons) {
                setTimeout(() => renderReplies(agentData.initialButtons), 1000);
            }
        }
        
        // 4. CRIA A NOVA SESSÃO NO BANCO (Para ela aparecer na lista como "Ativa" ou "Nova")
        // Usamos um título provisório até o usuário falar algo
        await saveSessionToSupabase("Nova Auditoria");
        
        // 5. ATUALIZA A BARRA LATERAL (Isso faz o chat antigo aparecer na lista!)
        await fetchSessionList();

    }, 200);
}

async function loadSessionById(sessionId) {
    if (!sessionId) return;
    
    const { data, error } = await window._supabase
        .from('synapse_chats')
        .select('*')
        .eq('id', sessionId)
        .single();

    if (error || !data) return;

    currentSessionId = sessionId;
    chatHistory = data.messages || [];
    messageCount = chatHistory.length;

    const area = document.getElementById('messagesArea');
    if (area) area.innerHTML = '';

    renderHeader();

    chatHistory.forEach(msg => {
        if (msg.role !== 'system') {
            addMessageUI(msg.role === 'assistant' ? 'ai' : msg.role, msg.content, false);
        }
    });

    renderChatSidebar(); 
    scrollToBottom();
}

async function saveSessionToSupabase(customTitle = null) {
    if (!window._supabase || !currentSessionId) return;

    const { data: { user } } = await window._supabase.auth.getUser();
    if (!user) return;

    let title = customTitle;
    if (!title) {
        const firstUserMsg = chatHistory.find(m => m.role === 'user');
        // Título inteligente baseado na primeira mensagem do usuário
        title = firstUserMsg ? firstUserMsg.content.substring(0, 25) : "Sessão Neural";
    }

    const payload = {
        id: currentSessionId,
        user_id: user.id,
        messages: chatHistory,
        title: title,
        updated_at: new Date()
    };

    window._supabase.from('synapse_chats').upsert(payload).then(() => {
        if (customTitle === null && chatHistory.length <= 4) fetchSessionList(); 
    });
}

// --- RENDERIZAR BARRA LATERAL (Histórico) ---
export function renderChatSidebar() {
    const container = document.getElementById('chatHistoryList');
    if (!container) return; // Se o container não existir no HTML, ignora sem erro

    container.innerHTML = '';

    if (sessionList.length === 0) {
        container.innerHTML = `<p class="text-[10px] text-gray-600 text-center italic mt-2 opacity-50 font-mono">MEMÓRIA VAZIA</p>`;
        return;
    }

    sessionList.forEach(session => {
        const isActive = session.id === currentSessionId;
        const activeClass = isActive ? "bg-[#1a1a1a] border-red-900/30 text-white" : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-[#111]";
        
        const dateObj = new Date(session.created_at);
        const dateStr = dateObj.toLocaleDateString('pt-BR', {day: '2-digit', month: '2-digit'});

        const div = document.createElement('div');
        div.className = `group flex flex-col gap-1 px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 border ${activeClass}`;
        div.onclick = () => loadSessionById(session.id);
        
        div.innerHTML = `
            <div class="flex justify-between w-full items-center">
                <span class="text-[10px] font-bold uppercase tracking-wide truncate w-[75%] font-mono">
                    ${session.title || 'SESSÃO'}
                </span>
                <span class="text-[8px] opacity-40 font-mono">${dateStr}</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderHeader() {
    const messagesArea = document.getElementById('messagesArea');
    // Header minimalista e militar
    const headerHTML = `
        <div class="w-full text-center mt-6 mb-6 animate-fade-in opacity-50 hover:opacity-100 transition-opacity">
            <div class="relative w-16 h-16 mx-auto mb-2 flex items-center justify-center grayscale">
                <img src="logo_synapse.png" class="chat-header-img w-full h-full object-contain" alt="Synapse AI">
            </div>
            <p class="text-[9px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                STATUS: <span class="text-green-900 font-bold">ONLINE</span>
            </p>
        </div>
    `;
    messagesArea.insertAdjacentHTML('beforeend', headerHTML);
}

// --- LÓGICA DE ENVIO (AI) ---
async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();

    if (!val) return;

    // Verificação de Demo (Paywall)
    if (typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE && messageCount >= DEMO_LIMIT) {
        triggerPaywallSequence(); return;
    }

    addMessageUI('user', val, false);
    if (!text) input.value = '';

    const old = document.querySelector('.quick-reply-container');
    if (old) old.remove();

    messageCount++;

    // Injeção de Sistema para Demo (Adaptada para tom militar)
    let systemInjection = "";
    if (IS_DEMO_MODE) {
        if (messageCount <= DIAGNOSE_PHASE) {
            systemInjection = `(SISTEMA: Usuário em modo DEMO. Seja breve. Extraia o problema principal rapidamente.)`;
        } else if (messageCount <= SELL_PHASE) {
            systemInjection = `(SISTEMA: Valide a falha do usuário. Mostre que ele precisa de um método (Synapse).)`;
        } else if (messageCount < DEMO_LIMIT) {
            systemInjection = `(SISTEMA: Prepare o bloqueio. Gere urgência para o plano completo.)`;
        } else {
            systemInjection = `(SISTEMA: BLOQUEIO IMINENTE. Encerre com [[LOCKED_DIAGNOSIS]].)`;
        }
    }

    const loadingId = showLoading();
    const rpg = getRPGState(); 
    
    try {
        const MAX_CONTEXT = 12; // Contexto curto para manter foco
        const recentHistory = chatHistory.filter(m => m.role !== 'system').slice(-MAX_CONTEXT);
        
        const apiMessages = [
            { role: 'system', content: AGENTS['SYNAPSE'].prompt }, // Prompt do Auditor
            { role: 'system', content: systemInjection }, 
            { role: 'system', content: `[User Level: ${rpg.level} | SessionID: ${currentSessionId}]` }, 
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
            
            // Tratamento de botões dinâmicos {{Botão}}
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            // Executa comandos [[ADD_MISSION]]
            aiText = handleCommands(aiText);
            
            if (aiText.trim() !== "") {
                addMessageUI('ai', aiText, true);
                chatHistory.push({ role: 'user', content: val });
                chatHistory.push({ role: 'assistant', content: aiText });
                saveSessionToSupabase();
            }

            const isLimitReached = (IS_DEMO_MODE && messageCount >= DEMO_LIMIT);
            
            if (dynamicButtons.length > 0 && !isLimitReached) {
                renderReplies(dynamicButtons);
            }

            if (isLimitReached || forceBlock) {
                disableInput(); 
                setTimeout(() => { triggerPaywallSequence(); }, 2000);
            }
        }
    } catch (e) {
        removeLoading(loadingId);
        console.error(e);
        addMessageUI('system', "ERRO DE CONEXÃO. REINICIANDO LINK...", false);
    }
}

// --- FUNÇÕES UI ---
function handleCommands(text) {
    // Detecta comandos vindos do prompt do Agente
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
    
    // Formatação Markdown básica para visual militar
    let formattedText = safeText
        .replace(/\*\*(.*?)\*\*/g, '<b class="text-white font-mono">$1</b>') // Negrito vira monoespaçado branco
        .replace(/\*(.*?)\*/g, '<i class="text-gray-500">$1</i>')
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
        div.className = 'self-center text-[9px] text-red-600 font-mono tracking-widest my-2 opacity-80';
        div.innerHTML = formattedText.toUpperCase();
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
        btn.className = "cyber-btn"; // Certifique-se que essa classe existe no CSS ou use classes tailwind
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
    // Loading minimalista
    div.innerHTML = `
        <div class="flex items-center gap-1 ml-2">
            <span class="w-1 h-1 bg-red-500 rounded-full animate-ping"></span>
            <span class="text-[9px] text-red-500 font-mono tracking-widest">PROCESSANDO</span>
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
    if (input) { input.disabled = true; input.placeholder = "SISTEMA TRAVADO"; }
    if (btn) btn.disabled = true;
}

function enableInput() {
    const input = document.getElementById('chatInput');
    const btn = document.getElementById('sendMessageBtn');
    if (input) { input.disabled = false; input.placeholder = "Inserir dados..."; }
    if (btn) btn.disabled = false;
}

function triggerPaywallSequence() {
    disableInput();
    const area = document.getElementById('messagesArea');
    const sequenceId = 'seq-' + Date.now();
    
    // Animação de bloqueio militar
    const sequenceHTML = `
        <div id="${sequenceId}" class="my-8 flex flex-col items-center justify-center animate-fade-in">
            <div class="text-red-600 font-black text-4xl mb-2"><i class="fa-solid fa-lock"></i></div>
            <div class="font-mono text-xs font-bold tracking-[0.2em] text-red-500 text-center uppercase mb-4">
                ACESSO NEGADO
            </div>
            <div class="w-48 h-0.5 bg-gray-900 rounded-full overflow-hidden">
                <div class="h-full bg-red-600 w-full animate-pulse"></div>
            </div>
        </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = sequenceHTML;
    area.appendChild(div);
    scrollToBottom();

    setTimeout(() => {
        const el = document.getElementById(sequenceId);
        if(el) el.remove();
        showPaywallCard();
    }, 2000);
}

function showPaywallCard() {
    const area = document.getElementById('messagesArea');
    const CHECKOUT_LINK = "../index.html#planos";
    const cardHTML = `
        <div class="w-full max-w-md mx-auto mt-4 mb-12 relative z-0 animate-fade-in-up">
            <div class="bg-[#050505] rounded border border-red-900/40 p-6 relative overflow-hidden">
                <div class="absolute top-0 left-0 w-1 h-full bg-red-600"></div>
                <div class="text-left">
                    <p class="text-red-500 text-[9px] uppercase tracking-[0.3em] font-bold mb-2">RELATÓRIO BLOQUEADO</p>
                    <h2 class="text-lg text-white font-bold uppercase italic mb-4">SISTEMA REQUER UPGRADE</h2>
                    <a href="${CHECKOUT_LINK}" class="block w-full bg-red-700 text-white font-bold py-3 text-center text-xs uppercase tracking-widest hover:bg-red-600 transition-colors">
                        DESBLOQUEAR AGORA
                    </a>
                </div>
            </div>
        </div>
    `;
    const div = document.createElement('div');
    div.innerHTML = cardHTML;
    area.appendChild(div);
    scrollToBottom();
}