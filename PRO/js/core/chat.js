import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';
// AQUI ESTÁ A CORREÇÃO: Importando as funções que agora existem no database.js
import { saveChatHistory, loadChatHistory } from '../modules/database.js'; 

let chatHistory = [];
let currentAgentKey = 'Diagnostico'; 

export async function initChat() {
    const btn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('chatInput');
    
    if (btn && input) {
        btn.onclick = () => sendMessage();
        input.onkeydown = (e) => { 
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                sendMessage(); 
            } 
        };
        
        // Proteção para mobile: só foca se for desktop (largura > 768px)
        if(window.innerWidth > 768) {
             input.addEventListener('focus', () => setTimeout(scrollToBottom, 300));
        }
    }
}

export async function loadAgent(key) {
    if (!AGENTS[key]) return;
    currentAgentKey = key;

    const messagesArea = document.getElementById('messagesArea');
    if(messagesArea) messagesArea.innerHTML = '';
    
    // Cabeçalho Visual
    const headerHTML = `
        <div class="w-full text-center mt-8 mb-6 animate-fade-in opacity-0" style="animation-delay: 0.2s; opacity: 1;">
            <div class="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                <img src="logo_synapse.png" class="w-full h-full object-contain animate-pulse-slow drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" alt="Synapse Octopus">
            </div>
            <p class="text-[10px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                CONEXÃO: <span id="header-dynamic-text" class="text-red-600 font-bold">ESTABELECIDA</span>
            </p>
        </div>
    `;
    messagesArea.insertAdjacentHTML('beforeend', headerHTML);

    // Tenta carregar histórico LOCAL
    const savedHistory = await loadChatHistory(key);

    if (savedHistory && savedHistory.length > 0) {
        // --- CENÁRIO A: TEM HISTÓRICO ---
        chatHistory = savedHistory;
        
        chatHistory.forEach(msg => {
            if (msg.role !== 'system') {
                // False = Carrega instantâneo (sem digitar)
                addMessageUI(msg.role === 'assistant' ? 'ai' : msg.role, msg.content, false);
            }
        });
        
        messagesArea.insertAdjacentHTML('beforeend', `<div class="w-full text-center my-4 opacity-50"><span class="text-[8px] text-gray-700 uppercase tracking-widest border-b border-gray-800 pb-1">Memória Restaurada</span></div>`);

    } else {
        // --- CENÁRIO B: NOVO CHAT ---
        chatHistory = [{ role: 'system', content: AGENTS[key].prompt }];
        
        setTimeout(() => {
            // True = Com animação de digitação
            addMessageUI('ai', AGENTS[key].welcome, true); 
            if (AGENTS[key].initialButtons) renderReplies(AGENTS[key].initialButtons);
        }, 500);
    }

    // Atualiza a classe ativa no menu lateral
    document.querySelectorAll('.tool-item').forEach(el => {
        if(el.textContent.includes(AGENTS[key].name)) el.classList.add('active');
        else el.classList.remove('active');
    });
}

// --- ENVIO DE MENSAGEM ---
async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();
    if (!val) return;
    
    addMessageUI('user', val, false); 
    if(!text) input.value = '';
    
    // Remove botões antigos
    const old = document.querySelector('.quick-reply-container');
    if(old) old.remove();
    
    const loadingId = showLoading();
    const rpg = getRPGState();
    
    // Contexto do sistema
    const context = { 
        role: 'system', 
        content: `[SISTEMA] Usuário Nível ${rpg.level} | Rank: ${rpg.currentRank}. Responda de acordo com sua persona.` 
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
            
            // Verifica botões dinâmicos no formato {{opcao1|opcao2}}
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);
            
            // Exibe resposta da IA (com animação)
            addMessageUI('ai', aiText, true);
            
            if(dynamicButtons.length > 0) renderReplies(dynamicButtons);

            // SALVA NO LOCALSTORAGE
            chatHistory.push({ role: 'user', content: val }, { role: 'assistant', content: aiText });
            saveChatHistory(currentAgentKey, chatHistory);
        }
    } catch (e) { 
        removeLoading(loadingId); 
        addMessageUI('system', "ERRO DE CONEXÃO. TENTE NOVAMENTE.", false); 
        console.error(e);
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

// --- INTERFACE (UI) ---
function addMessageUI(role, text, animate = true) {
    const area = document.getElementById('messagesArea');
    if(!area) return;
    
    const div = document.createElement('div');
    
    // 1. Apenas processamos negrito. NÃO substituímos \n por <br>.
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<b class="text-white">$1</b>');

    // 2. CSS MÁGICO: Isso faz o navegador respeitar os "Enters" do texto automaticamente
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
        
        // Se encontrar tag HTML (como <b>), pula ela inteira para não quebrar a tag no meio
        if (char === '<') {
            let tag = '';
            while (i < html.length && html.charAt(i) !== '>') { 
                tag += html.charAt(i); 
                i++; 
            }
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
    // Remove a última mensagem se for o loading
    if(area.lastElementChild && area.lastElementChild.textContent.includes('PROCESSANDO')) {
        area.lastElementChild.remove();
    }
}

function scrollToBottom() {
    const scroller = document.getElementById('chatContainer'); 
    if(scroller) {
        scroller.scrollTop = scroller.scrollHeight;
    }
    window.scrollTo(0, document.body.scrollHeight);
}