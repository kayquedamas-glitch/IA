import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
import { saveChatHistory, loadChatHistory } from '../modules/database.js'; 

// chat.js
let chatHistory = [];
let currentAgentKey = 'Diagnostico'; 

// --- NOVAS VARIÁVEIS ---
let messageCount = 0; 
const DEMO_LIMIT = 3; // O usuário troca 3 mensagens e depois bloqueia
const IS_DEMO_MODE = localStorage.getItem('synapse_access') !== 'PRO';

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
        messageCount = 0; // <--- ADICIONE ISSO: Reseta o contador
        enableInput();    // <--- ADICIONE ISSO: Garante que o input volte a funcionar
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
// --- ENVIAR MENSAGEM (Com Economia de Tokens + Lógica de Demo) ---
async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();
    
    // 1. VALIDAÇÃO DE INPUT
    if (!val) return;

    // 2. BLOQUEIO DE SEGURANÇA (DEMO) 
    // Se já atingiu o limite, não deixa enviar mais nada antes mesmo de processar
    if (typeof IS_DEMO_MODE !== 'undefined' && IS_DEMO_MODE && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT) {
        return; 
    }
    
    // 3. UI DO USUÁRIO
    addMessageUI('user', val, false); 
    if(!text) input.value = '';
    
    // Remove botões antigos
    const old = document.querySelector('.quick-reply-container');
    if(old) old.remove();

    // 4. INCREMENTA O CONTADOR (Apenas se for o Diagnóstico)
    if (currentAgentKey === 'Diagnostico') {
        messageCount++;
    }
    
    const loadingId = showLoading();
    const rpg = getRPGState();
    
    const context = { 
        role: 'system', 
        content: `[SISTEMA] Usuário Nível ${rpg.level} | Rank: ${rpg.currentRank}.` 
    };
    
    try {
        // --- OTIMIZAÇÃO DE TOKENS ---
        const MAX_CONTEXT = 15; 
        const recentHistory = chatHistory.slice(1).slice(-MAX_CONTEXT);
        
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
            
            // Exibe resposta da IA
            addMessageUI('ai', aiText, true);
            
            // Renderiza botões apenas se NÃO for bloquear agora
            const isBlockingNow = (IS_DEMO_MODE && currentAgentKey === 'Diagnostico' && messageCount >= DEMO_LIMIT);
            
            if(dynamicButtons.length > 0 && !isBlockingNow) {
                renderReplies(dynamicButtons);
            }

            // Salva histórico
            chatHistory.push({ role: 'user', content: val }, { role: 'assistant', content: aiText });
            saveChatHistory(currentAgentKey, chatHistory);

            // 5. GATILHO DO PAYWALL (O Grande Final)
            // Se for modo Demo, no agente Diagnóstico, e atingiu o limite:
            if (isBlockingNow) {
                console.log("Limite de Demo atingido. Iniciando protocolo de bloqueio...");
                // Espera 2.5s (tempo da pessoa ler o começo da resposta) e trava
                setTimeout(() => {
                    triggerPaywallSequence(); 
                }, 2500);
            }
        }
    } catch (e) { 
        removeLoading(loadingId); 
        console.error(e); // Bom para debug
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
function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    const lastMessage = area.lastElementChild;
    if (lastMessage) {
        lastMessage.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
}