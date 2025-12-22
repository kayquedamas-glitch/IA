import { CONFIG } from '../config.js';
import { AGENTS } from '../data/agents.js';
import { addMissionFromAI } from '../modules/dashboard.js';
import { getRPGState, addHabitFromAI } from '../modules/gamification.js';

let chatHistory = [];
let headerTypewriterInterval; // Variável para controlar o loop do cabeçalho

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
        input.addEventListener('focus', () => {
            setTimeout(scrollToBottom, 300);
        });
    }

    // Carrega o primeiro agente
    loadAgent('Diagnostico');
}

export function loadAgent(key) {
    if (!AGENTS[key]) return;
    const messagesArea = document.getElementById('messagesArea');
    if(messagesArea) messagesArea.innerHTML = '';
    
    // 1. CRIA O CABEÇALHO COM O EFEITO DE DIGITAÇÃO (MENSAGEM INICIAL)
    // 1. CABEÇALHO COM O POLVO PULSANTE + STATUS
    const headerHTML = `
        <div class="w-full text-center mt-8 mb-6 animate-fade-in opacity-0" style="animation-delay: 0.2s; opacity: 1;">
            
            <div class="relative w-24 h-24 mx-auto mb-2 flex items-center justify-center">
                <img src="logo_synapse.png" 
                     class="w-full h-full object-contain animate-pulse-slow drop-shadow-[0_0_15px_rgba(0,0,0,0.8)]" 
                     alt="Synapse Octopus">
            </div>

            <p class="text-[10px] text-gray-600 tracking-[0.3em] uppercase font-mono">
                STATUS: <span id="header-dynamic-text" class="text-red-600 font-bold"></span><span class="animate-pulse text-red-600">_</span>
            </p>
        </div>
    `;
    messagesArea.insertAdjacentHTML('beforeend', headerHTML);

    // 2. INICIA O LOOP DAS 3 FRASES DE INSTRUÇÃO
    // Você pode mudar as frases aqui embaixo
    const instrucoes = [
        "AGUARDANDO SEUS DADOS...",
        "DIGA O QUE TE TRAVA HOJE...",
        "SEM JULGAMENTOS. APENAS LÓGICA."
    ];
    startHeaderLoop(instrucoes);

    // 3. CONFIGURA O RESTO DO CHAT
    chatHistory = [{ role: 'system', content: AGENTS[key].prompt }];
    
    // Atualiza Sidebar
    document.querySelectorAll('.tool-item').forEach(el => {
        if(el.textContent.includes(AGENTS[key].name)) el.classList.add('active');
        else el.classList.remove('active');
    });

    // Envia a mensagem de boas-vindas da IA
    setTimeout(() => {
        addMessageUI('ai', AGENTS[key].welcome);
        if (AGENTS[key].initialButtons) renderReplies(AGENTS[key].initialButtons);
    }, 800);
}

// --- FUNÇÃO DO LOOP DE CABEÇALHO (ESCREVE E APAGA) ---
function startHeaderLoop(frases) {
    const el = document.getElementById('header-dynamic-text');
    if(!el) return;

    // Limpa intervalos anteriores para não encavalar
    if(window.headerInterval) clearTimeout(window.headerInterval);

    let fraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    const typeSpeed = 50;    // Velocidade escrevendo
    const deleteSpeed = 20;  // Velocidade apagando (rápido)
    const pauseEnd = 2000;   // Tempo lendo a frase
    const pauseStart = 500;  // Tempo antes de começar a próxima

    function loop() {
        // Verifica se o elemento ainda existe (se mudou de página, para)
        if(!document.getElementById('header-dynamic-text')) return;

        const currentFrase = frases[fraseIndex];

        if (isDeleting) {
            el.innerText = currentFrase.substring(0, charIndex - 1);
            charIndex--;
        } else {
            el.innerText = currentFrase.substring(0, charIndex + 1);
            charIndex++;
        }

        let nextSpeed = isDeleting ? deleteSpeed : typeSpeed;

        if (!isDeleting && charIndex === currentFrase.length) {
            isDeleting = true;
            nextSpeed = pauseEnd;
        } else if (isDeleting && charIndex === 0) {
            isDeleting = false;
            fraseIndex = (fraseIndex + 1) % frases.length;
            nextSpeed = pauseStart;
        }

        window.headerInterval = setTimeout(loop, nextSpeed);
    }

    loop();
}

// --- FUNÇÕES DE CHAT PADRÃO ---

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
    
    const context = { 
        role: 'system', 
        content: `[CONTEXTO] Usuário XP: ${rpg.xp} | Nível: ${rpg.level}. Responda curto e direto.` 
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
            addMessageUI('ai', aiText);
            
            if(dynamicButtons.length > 0) renderReplies(dynamicButtons);

            chatHistory.push({ role: 'user', content: val }, { role: 'assistant', content: aiText });
        }
    } catch (e) { 
        removeLoading(loadingId); 
        addMessageUI('system', "FALHA NA CONEXÃO NEURAL."); 
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

function addMessageUI(role, text) {
    const area = document.getElementById('messagesArea');
    if(!area) return;
    
    const div = document.createElement('div');
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

    if (role === 'user') {
        div.className = 'chat-message-user';
        div.innerHTML = formattedText;
    } else if (role === 'ai') {
        div.className = 'chat-message-ia';
        typeWriterBubble(div, formattedText); // Efeito de digitação da mensagem da IA
    } else {
        div.className = 'self-center text-[10px] text-red-500 uppercase font-black my-2 animate-pulse';
        div.innerHTML = formattedText;
    }

    area.appendChild(div);
    scrollToBottom();
}

// Efeito de digitação APENAS para o balão da IA (não é o loop)
function typeWriterBubble(element, html, speed = 15) {
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i >= html.length) return;
        let char = html.charAt(i);
        element.innerHTML += char;
        if (char === '<') {
            i++;
            while (i < html.length && html.charAt(i) !== '>') { element.innerHTML += html.charAt(i); i++; }
            if (i < html.length) element.innerHTML += '>';
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
    addMessageUI('system', `<i class="fa-solid fa-spinner fa-spin mr-2" id="${id}"></i> Processando...`);
    return id;
}

function removeLoading(id) { const el = document.getElementById(id); if(el) el.parentElement.remove(); }

function scrollToBottom() {
    const scroller = document.getElementById('chatContainer');
    if(scroller) {
        scroller.scrollTop = scroller.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
    }
}