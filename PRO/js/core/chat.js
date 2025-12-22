import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';

let chatHistory = [];

export function initChat() {
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
        // Scroll ao focar no input (Mobile fix)
        input.addEventListener('focus', () => {
            setTimeout(scrollToBottom, 300);
        });
    }
    loadAgent('Diagnostico');
}

export function loadAgent(key) {
    if (!AGENTS[key]) return;
    const messagesArea = document.getElementById('messagesArea');
    if(messagesArea) messagesArea.innerHTML = '';
    chatHistory = [{ role: 'system', content: AGENTS[key].prompt }];
    
    document.querySelectorAll('.tool-item').forEach(el => {
        if(el.textContent.includes(AGENTS[key].name)) el.classList.add('active');
        else el.classList.remove('active');
    });

    setTimeout(() => {
        addMessageUI('ai', AGENTS[key].welcome);
        if (AGENTS[key].initialButtons) renderReplies(AGENTS[key].initialButtons);
    }, 400);
}

async function sendMessage(text = null) {
    const input = document.getElementById('chatInput');
    const val = text || input.value.trim();
    if (!val) return;
    addMessageUI('user', val);
    if(!text) input.value = '';
    
    const old = document.querySelector('.quick-reply-container');
    if(old) old.remove();
    
    const loadingId = showLoading();
    const rpg = getRPGState();
    
    // Contexto enriquecido
    const context = { 
        role: 'system', 
        content: `[CONTEXTO] Usuário XP: ${rpg.xp} | Nível: ${rpg.level}. Responda curto. Use {{Botão1|Botão2}} para sugerir ações.` 
    };
    
    try {
        const res = await fetch(CONFIG.AI_WORKER, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: CONFIG.API_MODEL, messages: [chatHistory[0], context, ...chatHistory.slice(1), { role: 'user', content: val }] })
        });
        const data = await res.json();
        removeLoading(loadingId);
        if (data.choices && data.choices[0]) {
            let aiText = data.choices[0].message.content;
            
            // Botões dinâmicos
            let dynamicButtons = [];
            const btnMatch = aiText.match(/\{\{(.*?)\}\}/);
            if(btnMatch) {
                dynamicButtons = btnMatch[1].split('|');
                aiText = aiText.replace(btnMatch[0], '').trim();
            }

            aiText = handleCommands(aiText);
            addMessageUI('ai', aiText);
            
            if(dynamicButtons.length > 0) renderReplies(dynamicButtons);

            chatHistory.push({ role: 'user', content: val }, { role: 'assistant', content: aiText });
        }
    } catch (e) { removeLoading(loadingId); addMessageUI('system', "Falha neural."); }
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

function addMessageUI(role, text) {
    const area = document.getElementById('messagesArea');
    if(!area) return;
    const div = document.createElement('div');
    
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');

    div.className = role === 'user' ? 'chat-message-user' : role === 'ai' ? 'chat-message-ia' : 'self-center text-[10px] text-red-500 uppercase font-black';
    div.innerHTML = formattedText;
    area.appendChild(div);
    scrollToBottom();
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
    addMessageUI('system', `<i class="fa-solid fa-spinner fa-spin mr-2" id="${id}"></i>`);
    return id;
}
function removeLoading(id) { const el = document.getElementById(id); if(el) el.parentElement.remove(); }

function scrollToBottom() {
    // Scrolla tanto o container de mensagens quanto a janela para garantir visibilidade
    const scroller = document.getElementById('chatContainer');
    if(scroller) {
        scroller.scrollTop = scroller.scrollHeight;
        // Pequeno hack para mobile: scrolla um pouco mais para compensar a navbar
        window.scrollTo(0, document.body.scrollHeight);
    }
}