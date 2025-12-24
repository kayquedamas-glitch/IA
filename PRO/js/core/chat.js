import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
import { saveChatHistory, loadChatHistory } from '../modules/database.js'; 

let chatHistory = [];
let currentAgentKey = 'Diagnostico'; 

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
        if(window.innerWidth > 768) {
             input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
}

// --- RESETAR CONVERSA ---
async function resetCurrentChat() {
    const area = document.getElementById('messagesArea');
    
    // Efeito visual (Fade out)
    if(area) {
        area.style.transition = 'opacity 0.3s';
        area.style.opacity = '0';
    }

    setTimeout(async () => {
        chatHistory = []; // Limpa RAM
        await saveChatHistory(currentAgentKey, []); // Limpa Banco de Dados
        
        if(area) {
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
    if(messagesArea) messagesArea.innerHTML = '';
    
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
        if(el.textContent.includes(AGENTS[key].name)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

// --- ENVIAR MENSAGEM (Com Economia de Tokens) ---
async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();
    if (!val) return;
    
    addMessageUI('user', val, false); 
    if(!text) input.value = '';
    
    const old = document.querySelector('.quick-reply-container');
    if(old) old.remove();
    
    const loadingId = showLoading();
    const rpg = getRPGState();
    
    const context = { 
        role: 'system', 
        content: `[SISTEMA] Usuário Nível ${rpg.level} | Rank: ${rpg.currentRank}.` 
    };
    
    try {
        // --- OTIMIZAÇÃO DE TOKENS ---
        const MAX_CONTEXT = 15; // Lembra apenas das últimas 15 mensagens
        // Pega o histórico recente (ignorando o system prompt antigo que está no índice 0)
        const recentHistory = chatHistory.slice(1).slice(-MAX_CONTEXT);
        
        // Reconstrói o array para a API: [System Atual, Contexto RPG, ...Mensagens Recentes, Nova Msg]
        const apiMessages = [
            chatHistory[0], 
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
            
            // Botões dinâmicos {{A|B}}
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);
            
            addMessageUI('ai', aiText, true);
            if(dynamicButtons.length > 0) renderReplies(dynamicButtons);

            // Salva histórico completo localmente
            chatHistory.push({ role: 'user', content: val }, { role: 'assistant', content: aiText });
            saveChatHistory(currentAgentKey, chatHistory);
        }
    } catch (e) { 
        removeLoading(loadingId); 
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
    if(!area) return;
    
    const div = document.createElement('div');
    
    // 1. Sanitiza (Segurança)
    let safeText = escapeHTML(text);

    // 2. Formatação Rica (Markdown simples)
    let formattedText = safeText
        .replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>') // Negrito
        .replace(/\*(.*?)\*/g, '<i class="text-gray-400">$1</i>') // Itálico
        .replace(/^- (.*)/gm, '<li class="ml-4 list-disc text-gray-300">$1</li>'); // Listas

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
function typeWriterBubble(element, html, speed = 10) { 
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i >= html.length) return;
        let char = html.charAt(i);
        // Se for tag HTML, insere inteira
        if (char === '<') {
            let tag = '';
            while (i < html.length && html.charAt(i) !== '>') { tag += html.charAt(i); i++; }
            tag += '>';
            element.innerHTML += tag;
        } else {
            element.innerHTML += char;
        }
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
    const id = 'l' + Date.now();
    addMessageUI('system', `<i class="fa-solid fa-microchip fa-pulse mr-2"></i> PROCESSANDO...`, false);
    return id; 
}

function removeLoading(id) { 
    const area = document.getElementById('messagesArea');
    if(area.lastElementChild && area.lastElementChild.textContent.includes('PROCESSANDO')) {
        area.lastElementChild.remove();
    }
}

// --- SCROLL INTELIGENTE ---
function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    const lastMessage = area.lastElementChild;
    if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}