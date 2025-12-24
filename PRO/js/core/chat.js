import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
import { saveChatHistory, loadChatHistory } from '../modules/database.js'; 

let chatHistory = [];
let currentAgentKey = 'Diagnostico'; 

export async function initChat() {
    const btn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('chatInput');
    
    // --- NOVO: LÓGICA DO BOTÃO RESET ---
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
        if(window.innerWidth > 768) {
             input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
}

// --- NOVA FUNÇÃO DE RESET ---
async function resetCurrentChat() {
    const area = document.getElementById('messagesArea');
    
    // 1. Efeito visual de limpeza (Fade out)
    if(area) {
        area.style.transition = 'opacity 0.3s';
        area.style.opacity = '0';
    }

    setTimeout(async () => {
        // 2. Limpa memória RAM
        chatHistory = [];
        
        // 3. Limpa memória do Navegador (Database)
        // Salvamos um array vazio para sobrescrever o antigo
        await saveChatHistory(currentAgentKey, []);
        
        // 4. Reinicia visual
        if(area) {
            area.innerHTML = '';
            area.style.opacity = '1';
        }
        
        // 5. Recarrega o Agente (Vai disparar o Welcome + Botões de novo)
        await loadAgent(currentAgentKey);
        
    }, 300);
}

export async function loadAgent(key) {
    if (!AGENTS[key]) return;
    currentAgentKey = key;

    const messagesArea = document.getElementById('messagesArea');
    const viewChat = document.getElementById('viewChat');
    
    // Tema Visual
    viewChat.classList.remove('theme-diagnostico', 'theme-comandante', 'theme-general', 'theme-tatico');
    if (AGENTS[key].themeClass) viewChat.classList.add(AGENTS[key].themeClass);

    if(messagesArea) messagesArea.innerHTML = '';
    
    // Cabeçalho
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

    document.querySelectorAll('.tool-item').forEach(el => {
        if(el.textContent.includes(AGENTS[key].name)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

// ... (MANTENHA AS OUTRAS FUNÇÕES: sendMessage, handleCommands, addMessageUI, renderReplies, showLoading, etc.) ...
// Copie o restante do arquivo anterior aqui embaixo se precisar, ou apenas substitua a parte de cima e mantenha o final.
// Para garantir, vou colocar as funções auxiliares aqui para você copiar tudo de uma vez:

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
        content: `[SISTEMA] Usuário Nível ${rpg.level}. Responda curto e direto.` 
    };
    
    try {
        const res = await fetch(CONFIG.AI_WORKER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                model: CONFIG.API_MODEL, 
                messages: [chatHistory[0], context, ...chatHistory.slice(1), { role: 'user', content: val }] 
            })
        });
        
        const data = await res.json();
        removeLoading(loadingId);
        
        if (data.choices && data.choices[0]) {
            let aiText = data.choices[0].message.content;
            
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);
            
            addMessageUI('ai', aiText, true);
            if(dynamicButtons.length > 0) renderReplies(dynamicButtons);

            chatHistory.push({ role: 'user', content: val }, { role: 'assistant', content: aiText });
            saveChatHistory(currentAgentKey, chatHistory);
        }
    } catch (e) { 
        removeLoading(loadingId); 
        addMessageUI('system', "ERRO DE CONEXÃO.", false); 
    }
}

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

function addMessageUI(role, text, animate = true) {
    const area = document.getElementById('messagesArea');
    if(!area) return;
    
    const div = document.createElement('div');
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>');
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
        let char = html.charAt(i);
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

function scrollToBottom() {
    const scroller = document.getElementById('chatContainer'); 
    if(scroller) scroller.scrollTop = scroller.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
}